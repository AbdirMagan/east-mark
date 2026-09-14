-- East-Market :: 0014 :: Column-level write privileges
--
-- Found by exercising the schema with a real JWT instead of as postgres.
--
-- The guards in 0009/0011 protected derived columns by rewriting them back to
-- their old values (new.favorite_count := old.favorite_count). That is wrong:
-- the counter triggers themselves issue UPDATEs against the same tables, and
-- the guard cannot tell the platform's own bookkeeping from a user tampering.
-- Under a real user, favourite counts, view counts, seller listing counts and
-- rating averages all silently stayed at zero -- while looking perfectly
-- correct when the same statements ran as postgres, because postgres has no
-- JWT and took the trusted-context path.
--
-- Column privileges are the right mechanism. A column that `authenticated`
-- holds no UPDATE grant on cannot be named in a user's UPDATE statement at
-- all, while:
--   * SECURITY DEFINER triggers run as the table owner and are unaffected,
--   * the backend's service_role is unaffected,
--   * BEFORE triggers may still assign any column (privileges are checked
--     against the columns the *statement* names, not what triggers set).
--
-- A tampering attempt now fails loudly with a permission error instead of
-- being silently rewritten:
--     ERROR: 42501: permission denied for table products
--
-- The guards keep the jobs that genuinely need logic: moderation state
-- transitions, and arbitrating reviewer-vs-seller edits on a review.
--
-- Admin writes to protected columns (promoting a user, approving a listing,
-- deciding a verification) go through the backend with the service role. That
-- is deliberate: no client, however privileged its JWT, can write a moderation
-- or role column directly.

-- ---------------------------------------------------------------------------
-- profiles :: everything except role, ban state and identity
-- ---------------------------------------------------------------------------
revoke update on public.profiles from anon, authenticated;
grant update (
  username, full_name, avatar_url, bio,
  country_id, region_id, city_id, district_id, neighborhood_id, latitude, longitude,
  language_code, currency_code, theme, interests, onboarded_at, last_seen_at
) on public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- user_contacts :: the owner controls their own numbers and visibility,
-- but not the verified flag
-- ---------------------------------------------------------------------------
revoke update on public.user_contacts from anon, authenticated;
grant update (phone, whatsapp, show_phone, show_whatsapp)
  on public.user_contacts to authenticated;

-- ---------------------------------------------------------------------------
-- seller_profiles :: presentation only. Ratings, counters and verification
-- are all platform-maintained.
-- ---------------------------------------------------------------------------
revoke update on public.seller_profiles from anon, authenticated;
grant update (display_name, about, seller_type)
  on public.seller_profiles to authenticated;

-- ---------------------------------------------------------------------------
-- business_profiles
-- ---------------------------------------------------------------------------
revoke update on public.business_profiles from anon, authenticated;
grant update (
  name, slug, description, logo_url, cover_url,
  phone, whatsapp, email, website,
  country_id, region_id, city_id, district_id, address, latitude, longitude,
  opening_hours, categories, registration_number, is_active
) on public.business_profiles to authenticated;

-- ---------------------------------------------------------------------------
-- products :: the seller owns the listing content; the platform owns ref,
-- ownership, engagement counters and paid placement.
-- ---------------------------------------------------------------------------
revoke update on public.products from anon, authenticated;
grant update (
  title, description, price, currency_code, is_negotiable, condition, status,
  category_id, subcategory_id,
  country_id, region_id, city_id, district_id, neighborhood_id, latitude, longitude,
  phone, whatsapp,
  brand, model, year, color, size, quantity, delivery_available, attributes,
  business_id, sold_at
) on public.products to authenticated;

-- ---------------------------------------------------------------------------
-- conversations :: participants may archive or hide a thread. Unread counters
-- are maintained by triggers and cleared by mark_conversation_read().
-- ---------------------------------------------------------------------------
revoke update on public.conversations from anon, authenticated;
grant update (buyer_archived, seller_archived, buyer_deleted_at, seller_deleted_at)
  on public.conversations to authenticated;

-- ---------------------------------------------------------------------------
-- messages :: a sender may edit or withdraw their own message
-- ---------------------------------------------------------------------------
revoke update on public.messages from anon, authenticated;
grant update (body, edited_at, deleted_at) on public.messages to authenticated;

-- ---------------------------------------------------------------------------
-- reviews :: the reviewer owns rating + comment, the seller owns the reply.
-- reviews_moderation_guard decides which of the two the caller is.
-- ---------------------------------------------------------------------------
revoke update on public.reviews from anon, authenticated;
grant update (rating, comment, seller_reply) on public.reviews to authenticated;

-- ---------------------------------------------------------------------------
-- verification_requests :: the applicant may amend the submission, never the verdict
-- ---------------------------------------------------------------------------
revoke update on public.verification_requests from anon, authenticated;
grant update (full_name, document_type, document_number, documents, notes)
  on public.verification_requests to authenticated;

-- Reports are file-and-forget for users; moderators work through the backend.
revoke update on public.reports from anon, authenticated;

-- Notifications: a user may only mark one read or dismiss it.
revoke update on public.notifications from anon, authenticated;
grant update (read_at) on public.notifications to authenticated;

-- Money, ads and the audit trail are never client-writable. product_views is
-- written only through record_product_view(), which de-duplicates.
revoke insert, update, delete on
  public.payments, public.payment_transactions, public.subscriptions,
  public.featured_listings, public.advertisements, public.admin_audit_log,
  public.product_views
from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Guards: drop the counter rewriting now that privileges cover it.
-- What remains is the logic privileges cannot express.
-- ---------------------------------------------------------------------------
create or replace function public.profiles_guard()
returns trigger language plpgsql security definer set search_path = public
as $fn$
begin
  -- Column privileges already stop a user naming role/is_banned in an UPDATE.
  -- This stays as defence in depth for any future privileged path.
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
  new.verification_status := old.verification_status;
  new.verified_at         := old.verified_at;
  return new;
end;
$fn$;

create or replace function public.business_profiles_guard()
returns trigger language plpgsql security definer set search_path = public
as $fn$
begin
  if public.is_trusted_context() then return new; end if;
  new.verification_status := old.verification_status;
  new.owner_id            := old.owner_id;
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

  -- A material edit to a live listing sends it back through moderation.
  if v_moderation and old.status = 'active' and new.status = 'active'
     and (new.title is distinct from old.title
          or new.description is distinct from old.description
          or new.category_id is distinct from old.category_id) then
    new.status := 'pending_approval';
  end if;

  return new;
end;
$fn$;

create or replace function public.reviews_moderation_guard()
returns trigger language plpgsql security definer set search_path = public
as $fn$
declare v_is_seller boolean;
begin
  if public.is_trusted_context() then return new; end if;

  if tg_op = 'INSERT' then
    new.status := 'pending';
    new.seller_reply := null;
    new.seller_replied_at := null;
    return new;
  end if;

  select exists (
    select 1 from public.seller_profiles s where s.id = new.seller_id and s.user_id = auth.uid()
  ) into v_is_seller;

  if v_is_seller then
    -- The reviewed seller may add a reply and nothing else.
    new.rating  := old.rating;
    new.comment := old.comment;
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
