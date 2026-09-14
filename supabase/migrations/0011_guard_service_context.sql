-- East-Market :: 0011 :: Let trusted server-side callers past the guard triggers
--
-- Found by running the schema against real users rather than as postgres.
--
-- The guards in 0009 only exempted public.is_admin(), which reads the caller's
-- JWT. The backend acts with the service role and carries no end-user JWT, so
-- auth.uid() is null and every guard treated it as an untrusted user: role
-- promotions, moderation decisions and verification outcomes were all silently
-- reverted, and there was no way to create the first admin account at all.
--
-- RLS already denies anon every write path these guards sit on, so "an UPDATE
-- arriving with no JWT" can only be the service role or a direct database
-- connection. Both are trusted.

create or replace function public.is_trusted_context()
returns boolean
language sql
stable
set search_path = public
as $fn$
  select auth.uid() is null or public.is_admin();
$fn$;

comment on function public.is_trusted_context is
  'True for platform moderators, and for server-side callers using the service role (no end-user JWT). Used by the guard triggers.';

grant execute on function public.is_trusted_context() to anon, authenticated;

-- Every guard below switches from is_admin() to is_trusted_context().
-- Bodies are otherwise unchanged from 0009; 0014 trims them further once
-- column privileges take over protection of the derived columns.

create or replace function public.profiles_guard()
returns trigger language plpgsql security definer set search_path = public
as $fn$
begin
  if public.is_trusted_context() then return new; end if;
  new.role       := old.role;
  new.is_banned  := old.is_banned;
  new.ban_reason := old.ban_reason;
  new.created_at := old.created_at;
  return new;
end;
$fn$;

create or replace function public.seller_profiles_guard()
returns trigger language plpgsql security definer set search_path = public
as $fn$
begin
  if public.is_trusted_context() then return new; end if;
  new.verification_status  := old.verification_status;
  new.verified_at          := old.verified_at;
  new.rating_avg           := old.rating_avg;
  new.rating_count         := old.rating_count;
  new.listing_count        := old.listing_count;
  new.active_listing_count := old.active_listing_count;
  new.sold_count           := old.sold_count;
  new.follower_count       := old.follower_count;
  return new;
end;
$fn$;

create or replace function public.business_profiles_guard()
returns trigger language plpgsql security definer set search_path = public
as $fn$
begin
  if public.is_trusted_context() then return new; end if;
  new.verification_status := old.verification_status;
  new.rating_avg     := old.rating_avg;
  new.rating_count   := old.rating_count;
  new.product_count  := old.product_count;
  new.follower_count := old.follower_count;
  new.owner_id       := old.owner_id;
  return new;
end;
$fn$;

create or replace function public.products_guard()
returns trigger language plpgsql security definer set search_path = public
as $fn$
declare
  v_moderation boolean;
  v_allowed public.product_status[] := array['draft', 'pending_approval', 'active', 'sold', 'deleted']::public.product_status[];
begin
  if public.is_trusted_context() then return new; end if;

  select coalesce((value->>'require_approval')::boolean, true) into v_moderation
    from public.app_settings where key = 'moderation';
  v_moderation := coalesce(v_moderation, true);

  if tg_op = 'INSERT' then
    new.status := case
      when new.status = 'draft' then 'draft'
      when v_moderation then 'pending_approval'
      else 'active'
    end;
    new.is_featured      := false;
    new.featured_until   := null;
    new.view_count       := 0;
    new.favorite_count   := 0;
    new.message_count    := 0;
    new.rejection_reason := null;
    return new;
  end if;

  if old.status in ('suspended', 'rejected') and new.status <> old.status then
    raise exception 'This listing is locked by moderation' using errcode = '42501';
  end if;

  if not (new.status = any(v_allowed)) then
    new.status := old.status;
  end if;

  if new.status = 'active' and old.status not in ('active', 'sold', 'expired') and v_moderation then
    new.status := 'pending_approval';
  end if;

  if v_moderation and old.status = 'active' and new.status = 'active'
     and (new.title is distinct from old.title
          or new.description is distinct from old.description
          or new.category_id is distinct from old.category_id) then
    new.status := 'pending_approval';
  end if;

  new.is_featured      := old.is_featured;
  new.featured_until   := old.featured_until;
  new.view_count       := old.view_count;
  new.favorite_count   := old.favorite_count;
  new.message_count    := old.message_count;
  new.seller_id        := old.seller_id;
  new.rejection_reason := old.rejection_reason;
  return new;
end;
$fn$;

create or replace function public.reviews_moderation_guard()
returns trigger language plpgsql security definer set search_path = public
as $fn$
declare v_is_seller boolean;
begin
  if public.is_trusted_context() then return new; end if;

  select exists (
    select 1 from public.seller_profiles s where s.id = new.seller_id and s.user_id = auth.uid()
  ) into v_is_seller;

  if tg_op = 'INSERT' then
    new.status := 'pending';
    new.seller_reply := null;
    new.seller_replied_at := null;
    return new;
  end if;

  new.status          := old.status;
  new.moderated_by    := old.moderated_by;
  new.moderated_at    := old.moderated_at;
  new.moderation_note := old.moderation_note;

  if v_is_seller then
    new.rating      := old.rating;
    new.comment     := old.comment;
    new.reviewer_id := old.reviewer_id;
    if new.seller_reply is distinct from old.seller_reply then
      new.seller_replied_at := now();
    end if;
  else
    new.seller_reply      := old.seller_reply;
    new.seller_replied_at := old.seller_replied_at;
  end if;
  return new;
end;
$fn$;

create or replace function public.verification_guard()
returns trigger language plpgsql security definer set search_path = public
as $fn$
begin
  if public.is_trusted_context() then
    if tg_op = 'UPDATE' and new.status is distinct from old.status then
      new.reviewed_by := coalesce(new.reviewed_by, auth.uid());
    end if;
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.status := 'pending';
    new.reviewed_by := null;
    new.reviewed_at := null;
    new.review_note := null;
    return new;
  end if;

  new.status      := old.status;
  new.reviewed_by := old.reviewed_by;
  new.reviewed_at := old.reviewed_at;
  new.review_note := old.review_note;
  new.user_id     := old.user_id;
  return new;
end;
$fn$;

create or replace function public.reports_guard()
returns trigger language plpgsql security definer set search_path = public
as $fn$
begin
  if public.is_trusted_context() then
    if tg_op = 'UPDATE' and new.status is distinct from old.status
       and new.status in ('actioned', 'dismissed') then
      new.resolved_by := coalesce(new.resolved_by, auth.uid());
      new.resolved_at := coalesce(new.resolved_at, now());
    end if;
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.reporter_id := auth.uid();
    new.status      := 'open';
    new.assigned_to := null;
    new.resolved_by := null;
    new.resolved_at := null;
    new.resolution_note := null;
    new.action_taken := null;
  end if;
  return new;
end;
$fn$;
