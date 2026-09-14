-- East-Market :: 0009 :: Row Level Security
--
-- Model:
--   anon          -> public marketplace reads only (active listings, seller
--                    cards, categories, locations, running ads)
--   authenticated -> the above, plus full control of their OWN rows
--   admin/mod     -> moderation surface, via public.is_admin()
--   service_role  -> bypasses RLS entirely; used only by the backend
--
-- Two things RLS cannot express are handled by BEFORE triggers at the bottom
-- of this file: column-level immutability (a user must not be able to set
-- their own role, or their own listing's featured flag) and cross-row checks.

-- ---------------------------------------------------------------------------
-- Enable RLS everywhere. Nothing in public is left open by accident.
-- ---------------------------------------------------------------------------
do $mig$
declare t text;
begin
  foreach t in array array[
    'languages','currencies','exchange_rates','countries','regions','cities',
    'districts','neighborhoods','categories','category_translations','app_settings',
    'profiles','user_contacts','seller_profiles','business_profiles','business_employees',
    'device_tokens','notification_preferences',
    'products','product_images','favorites','seller_follows','product_views',
    'blocked_users','conversations','messages','notifications',
    'reviews','reports','verification_requests','admin_audit_log',
    'payment_providers','subscription_plans','subscriptions','payments',
    'payment_transactions','featured_listings','advertisements',
    'search_history','saved_searches'
  ] loop
    execute format('alter table public.%I enable row level security;', t);
  end loop;
end $mig$;

-- Note: FORCE ROW LEVEL SECURITY is deliberately NOT used. The SECURITY
-- DEFINER helpers and RPCs in this schema run as the table owner, and forcing
-- RLS on the owner would make them subject to the very policies they exist to
-- implement. service_role bypasses RLS by role attribute either way.

-- ---------------------------------------------------------------------------
-- Reference data :: world-readable when active, admin-writable
-- ---------------------------------------------------------------------------
do $mig$
declare t text;
begin
  foreach t in array array[
    'languages','currencies','countries','regions','cities','districts',
    'neighborhoods','categories','subscription_plans'
  ] loop
    execute format('drop policy if exists %1$s_public_read on public.%1$s;', t);
    execute format(
      'create policy %1$s_public_read on public.%1$s
         for select to anon, authenticated
         using (is_active or public.is_admin());', t);

    execute format('drop policy if exists %1$s_admin_write on public.%1$s;', t);
    execute format(
      'create policy %1$s_admin_write on public.%1$s
         for all to authenticated
         using (public.is_admin()) with check (public.is_admin());', t);
  end loop;
end $mig$;

-- Translations and rates have no is_active column.
drop policy if exists category_translations_public_read on public.category_translations;
create policy category_translations_public_read on public.category_translations
  for select to anon, authenticated using (true);

drop policy if exists category_translations_admin_write on public.category_translations;
create policy category_translations_admin_write on public.category_translations
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists exchange_rates_public_read on public.exchange_rates;
create policy exchange_rates_public_read on public.exchange_rates
  for select to anon, authenticated using (true);

drop policy if exists exchange_rates_admin_write on public.exchange_rates;
create policy exchange_rates_admin_write on public.exchange_rates
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Only rows explicitly flagged public are exposed to clients.
drop policy if exists app_settings_public_read on public.app_settings;
create policy app_settings_public_read on public.app_settings
  for select to anon, authenticated using (is_public or public.is_admin());

drop policy if exists app_settings_admin_write on public.app_settings;
create policy app_settings_admin_write on public.app_settings
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Payment providers: the list of *available* methods is not secret, but the
-- rows carry integration config, so only signed-in users and admins see them.
drop policy if exists payment_providers_read on public.payment_providers;
create policy payment_providers_read on public.payment_providers
  for select to authenticated using (is_active or public.is_admin());

drop policy if exists payment_providers_admin_write on public.payment_providers;
create policy payment_providers_admin_write on public.payment_providers
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
drop policy if exists profiles_public_read on public.profiles;
create policy profiles_public_read on public.profiles
  for select to anon, authenticated
  using (not is_banned or id = auth.uid() or public.is_admin());

drop policy if exists profiles_insert_self on public.profiles;
create policy profiles_insert_self on public.profiles
  for insert to authenticated with check (id = auth.uid());

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------------------
-- user_contacts :: private
-- ---------------------------------------------------------------------------
drop policy if exists user_contacts_self on public.user_contacts;
create policy user_contacts_self on public.user_contacts
  for all to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------------------
-- seller_profiles / business storefronts
-- ---------------------------------------------------------------------------
drop policy if exists seller_profiles_public_read on public.seller_profiles;
create policy seller_profiles_public_read on public.seller_profiles
  for select to anon, authenticated using (true);

drop policy if exists seller_profiles_insert_self on public.seller_profiles;
create policy seller_profiles_insert_self on public.seller_profiles
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists seller_profiles_update_self on public.seller_profiles;
create policy seller_profiles_update_self on public.seller_profiles
  for update to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

drop policy if exists business_public_read on public.business_profiles;
create policy business_public_read on public.business_profiles
  for select to anon, authenticated
  using (is_active or owner_id = auth.uid() or public.is_admin());

drop policy if exists business_insert_owner on public.business_profiles;
create policy business_insert_owner on public.business_profiles
  for insert to authenticated with check (owner_id = auth.uid());

drop policy if exists business_update_member on public.business_profiles;
create policy business_update_member on public.business_profiles
  for update to authenticated
  using (owner_id = auth.uid() or public.is_business_member(id) or public.is_admin())
  with check (owner_id = auth.uid() or public.is_business_member(id) or public.is_admin());

drop policy if exists business_delete_owner on public.business_profiles;
create policy business_delete_owner on public.business_profiles
  for delete to authenticated using (owner_id = auth.uid() or public.is_admin());

drop policy if exists business_employees_read on public.business_employees;
create policy business_employees_read on public.business_employees
  for select to authenticated
  using (user_id = auth.uid() or public.is_business_member(business_id) or public.is_admin());

drop policy if exists business_employees_manage on public.business_employees;
create policy business_employees_manage on public.business_employees
  for all to authenticated
  using (
    public.is_admin()
    or exists (select 1 from public.business_profiles b
                where b.id = business_id and b.owner_id = auth.uid())
  )
  with check (
    public.is_admin()
    or exists (select 1 from public.business_profiles b
                where b.id = business_id and b.owner_id = auth.uid())
  );

-- An employee may accept their own invitation.
drop policy if exists business_employees_accept on public.business_employees;
create policy business_employees_accept on public.business_employees
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- devices + preferences :: strictly self
-- ---------------------------------------------------------------------------
drop policy if exists device_tokens_self on public.device_tokens;
create policy device_tokens_self on public.device_tokens
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists notification_preferences_self on public.notification_preferences;
create policy notification_preferences_self on public.notification_preferences
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- products
-- ---------------------------------------------------------------------------
drop policy if exists products_public_read on public.products;
create policy products_public_read on public.products
  for select to anon, authenticated
  using (
    status = 'active'
    or status = 'sold'                       -- sold listings stay viewable via old links
    or seller_id = auth.uid()
    or (business_id is not null and public.is_business_member(business_id))
    or public.is_admin()
  );

drop policy if exists products_insert_own on public.products;
create policy products_insert_own on public.products
  for insert to authenticated
  with check (
    seller_id = auth.uid()
    and (business_id is null or public.is_business_member(business_id))
  );

drop policy if exists products_update_own on public.products;
create policy products_update_own on public.products
  for update to authenticated
  using (
    seller_id = auth.uid()
    or (business_id is not null and public.is_business_member(business_id))
    or public.is_admin()
  )
  with check (
    seller_id = auth.uid()
    or (business_id is not null and public.is_business_member(business_id))
    or public.is_admin()
  );

drop policy if exists products_delete_own on public.products;
create policy products_delete_own on public.products
  for delete to authenticated
  using (seller_id = auth.uid() or public.is_admin());

-- Product images inherit their parent's visibility.
drop policy if exists product_images_read on public.product_images;
create policy product_images_read on public.product_images
  for select to anon, authenticated
  using (exists (select 1 from public.products p where p.id = product_id));

drop policy if exists product_images_write_own on public.product_images;
create policy product_images_write_own on public.product_images
  for all to authenticated
  using (
    exists (
      select 1 from public.products p
       where p.id = product_id
         and (p.seller_id = auth.uid()
              or (p.business_id is not null and public.is_business_member(p.business_id))
              or public.is_admin())
    )
  )
  with check (
    exists (
      select 1 from public.products p
       where p.id = product_id
         and (p.seller_id = auth.uid()
              or (p.business_id is not null and public.is_business_member(p.business_id))
              or public.is_admin())
    )
  );

-- ---------------------------------------------------------------------------
-- favorites / follows / views
-- ---------------------------------------------------------------------------
drop policy if exists favorites_self on public.favorites;
create policy favorites_self on public.favorites
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists seller_follows_read on public.seller_follows;
create policy seller_follows_read on public.seller_follows
  for select to authenticated
  using (
    follower_id = auth.uid()
    or exists (select 1 from public.seller_profiles s
                where s.id = seller_id and s.user_id = auth.uid())
    or public.is_admin()
  );

drop policy if exists seller_follows_write_self on public.seller_follows;
create policy seller_follows_write_self on public.seller_follows
  for all to authenticated
  using (follower_id = auth.uid()) with check (follower_id = auth.uid());

-- Views are written exclusively through record_product_view() (SECURITY
-- DEFINER), so clients get no direct INSERT policy at all.
drop policy if exists product_views_read_owner on public.product_views;
create policy product_views_read_owner on public.product_views
  for select to authenticated
  using (
    public.is_admin()
    or exists (select 1 from public.products p
                where p.id = product_id and p.seller_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- blocking
-- ---------------------------------------------------------------------------
drop policy if exists blocked_users_self on public.blocked_users;
create policy blocked_users_self on public.blocked_users
  for all to authenticated
  using (blocker_id = auth.uid() or public.is_admin())
  with check (blocker_id = auth.uid());

-- ---------------------------------------------------------------------------
-- conversations + messages
-- ---------------------------------------------------------------------------
drop policy if exists conversations_member_read on public.conversations;
create policy conversations_member_read on public.conversations
  for select to authenticated
  using (
    buyer_id = auth.uid()
    or seller_id = auth.uid()
    or (business_id is not null and public.is_business_member(business_id))
    or public.is_admin()
  );

drop policy if exists conversations_insert_buyer on public.conversations;
create policy conversations_insert_buyer on public.conversations
  for insert to authenticated
  with check (
    buyer_id = auth.uid()
    and seller_id <> auth.uid()
    and not public.is_blocked_pair(auth.uid(), seller_id)
  );

drop policy if exists conversations_update_member on public.conversations;
create policy conversations_update_member on public.conversations
  for update to authenticated
  using (
    buyer_id = auth.uid() or seller_id = auth.uid()
    or (business_id is not null and public.is_business_member(business_id))
  )
  with check (
    buyer_id = auth.uid() or seller_id = auth.uid()
    or (business_id is not null and public.is_business_member(business_id))
  );

drop policy if exists messages_member_read on public.messages;
create policy messages_member_read on public.messages
  for select to authenticated
  using (public.is_conversation_member(conversation_id) or public.is_admin());

drop policy if exists messages_insert_sender on public.messages;
create policy messages_insert_sender on public.messages
  for insert to authenticated
  with check (
    sender_id = auth.uid()
    and public.is_conversation_member(conversation_id)
    -- Blocked in either direction: no new messages.
    and not exists (
      select 1 from public.conversations c
       where c.id = conversation_id
         and public.is_blocked_pair(c.buyer_id, c.seller_id)
    )
  );

-- Senders may edit or soft-delete their own message. Recipients may only
-- flip read_at, which the mark_conversation_read() RPC does for them.
drop policy if exists messages_update_sender on public.messages;
create policy messages_update_sender on public.messages
  for update to authenticated
  using (sender_id = auth.uid() or public.is_admin())
  with check (sender_id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------------------
-- notifications :: read + dismiss only. Creation is server-side.
-- ---------------------------------------------------------------------------
drop policy if exists notifications_self_read on public.notifications;
create policy notifications_self_read on public.notifications
  for select to authenticated using (user_id = auth.uid());

drop policy if exists notifications_self_update on public.notifications;
create policy notifications_self_update on public.notifications
  for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists notifications_self_delete on public.notifications;
create policy notifications_self_delete on public.notifications
  for delete to authenticated using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- reviews
-- ---------------------------------------------------------------------------
drop policy if exists reviews_public_read on public.reviews;
create policy reviews_public_read on public.reviews
  for select to anon, authenticated
  using (
    status = 'approved'
    or reviewer_id = auth.uid()
    or exists (select 1 from public.seller_profiles s
                where s.id = seller_id and s.user_id = auth.uid())
    or public.is_admin()
  );

drop policy if exists reviews_insert_self on public.reviews;
create policy reviews_insert_self on public.reviews
  for insert to authenticated
  with check (reviewer_id = auth.uid() and status = 'pending');

-- The reviewer may amend a review that has not been moderated yet.
-- The reviewed seller may attach a public reply.
-- Admins may do either at any time.
drop policy if exists reviews_update on public.reviews;
create policy reviews_update on public.reviews
  for update to authenticated
  using (
    (reviewer_id = auth.uid() and status = 'pending')
    or exists (select 1 from public.seller_profiles s
                where s.id = seller_id and s.user_id = auth.uid())
    or public.is_admin()
  )
  with check (
    (reviewer_id = auth.uid() and status = 'pending')
    or exists (select 1 from public.seller_profiles s
                where s.id = seller_id and s.user_id = auth.uid())
    or public.is_admin()
  );

drop policy if exists reviews_delete on public.reviews;
create policy reviews_delete on public.reviews
  for delete to authenticated
  using (reviewer_id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------------------
-- reports :: file-and-forget for users, full access for moderators
-- ---------------------------------------------------------------------------
drop policy if exists reports_insert_self on public.reports;
create policy reports_insert_self on public.reports
  for insert to authenticated
  with check (reporter_id = auth.uid() and status = 'open');

drop policy if exists reports_read_own on public.reports;
create policy reports_read_own on public.reports
  for select to authenticated
  using (reporter_id = auth.uid() or public.is_admin());

drop policy if exists reports_admin_manage on public.reports;
create policy reports_admin_manage on public.reports
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists reports_admin_delete on public.reports;
create policy reports_admin_delete on public.reports
  for delete to authenticated using (public.is_admin());

-- ---------------------------------------------------------------------------
-- verification requests
-- ---------------------------------------------------------------------------
drop policy if exists verification_insert_self on public.verification_requests;
create policy verification_insert_self on public.verification_requests
  for insert to authenticated
  with check (user_id = auth.uid() and status = 'pending');

drop policy if exists verification_read_own on public.verification_requests;
create policy verification_read_own on public.verification_requests
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- The applicant may amend a pending request; only admins decide it. The
-- status column itself is pinned by the guard trigger further down.
drop policy if exists verification_update on public.verification_requests;
create policy verification_update on public.verification_requests
  for update to authenticated
  using ((user_id = auth.uid() and status = 'pending') or public.is_admin())
  with check ((user_id = auth.uid() and status = 'pending') or public.is_admin());

-- ---------------------------------------------------------------------------
-- audit log :: readable by admins, written only by the service role
-- ---------------------------------------------------------------------------
drop policy if exists audit_admin_read on public.admin_audit_log;
create policy audit_admin_read on public.admin_audit_log
  for select to authenticated using (public.is_admin());

-- ---------------------------------------------------------------------------
-- money :: clients read their own records, they never write them.
-- Every mutation goes through the backend with the service role.
-- ---------------------------------------------------------------------------
drop policy if exists subscriptions_read_own on public.subscriptions;
create policy subscriptions_read_own on public.subscriptions
  for select to authenticated
  using (
    user_id = auth.uid()
    or (business_id is not null and public.is_business_member(business_id))
    or public.is_admin()
  );

drop policy if exists payments_read_own on public.payments;
create policy payments_read_own on public.payments
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists payment_tx_read_own on public.payment_transactions;
create policy payment_tx_read_own on public.payment_transactions
  for select to authenticated
  using (
    public.is_admin()
    or exists (select 1 from public.payments p
                where p.id = payment_id and p.user_id = auth.uid())
  );

drop policy if exists featured_read on public.featured_listings;
create policy featured_read on public.featured_listings
  for select to anon, authenticated
  using (is_active or user_id = auth.uid() or public.is_admin());

drop policy if exists featured_admin_write on public.featured_listings;
create policy featured_admin_write on public.featured_listings
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- advertisements :: running ads are public, everything else is admin
-- ---------------------------------------------------------------------------
drop policy if exists ads_public_read on public.advertisements;
create policy ads_public_read on public.advertisements
  for select to anon, authenticated
  using (
    (status = 'running' and starts_at <= now() and (ends_at is null or ends_at > now()))
    or advertiser_id = auth.uid()
    or (business_id is not null and public.is_business_member(business_id))
    or public.is_admin()
  );

drop policy if exists ads_admin_write on public.advertisements;
create policy ads_admin_write on public.advertisements
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- search history + saved searches :: strictly self
-- ---------------------------------------------------------------------------
drop policy if exists search_history_self on public.search_history;
create policy search_history_self on public.search_history
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists saved_searches_self on public.saved_searches;
create policy saved_searches_self on public.saved_searches
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ===========================================================================
-- Guard triggers :: column-level rules RLS cannot express
-- ===========================================================================

-- Without this, "update your own profile" would also mean "make yourself an
-- admin", because RLS checks rows, not columns.
create or replace function public.profiles_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
begin
  if public.is_admin() then
    return new;
  end if;
  new.role       := old.role;
  new.is_banned  := old.is_banned;
  new.ban_reason := old.ban_reason;
  new.created_at := old.created_at;
  return new;
end;
$fn$;

drop trigger if exists trg_profiles_guard on public.profiles;
create trigger trg_profiles_guard
  before update on public.profiles
  for each row execute function public.profiles_guard();

-- Sellers must not be able to verify themselves or fake their own ratings.
create or replace function public.seller_profiles_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
begin
  if public.is_admin() then
    return new;
  end if;
  new.verification_status := old.verification_status;
  new.verified_at         := old.verified_at;
  new.rating_avg          := old.rating_avg;
  new.rating_count        := old.rating_count;
  new.listing_count       := old.listing_count;
  new.active_listing_count := old.active_listing_count;
  new.sold_count          := old.sold_count;
  new.follower_count      := old.follower_count;
  return new;
end;
$fn$;

drop trigger if exists trg_seller_profiles_guard on public.seller_profiles;
create trigger trg_seller_profiles_guard
  before update on public.seller_profiles
  for each row execute function public.seller_profiles_guard();

create or replace function public.business_profiles_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
begin
  if public.is_admin() then
    return new;
  end if;
  new.verification_status := old.verification_status;
  new.rating_avg    := old.rating_avg;
  new.rating_count  := old.rating_count;
  new.product_count := old.product_count;
  new.follower_count := old.follower_count;
  new.owner_id      := old.owner_id;
  return new;
end;
$fn$;

drop trigger if exists trg_business_profiles_guard on public.business_profiles;
create trigger trg_business_profiles_guard
  before update on public.business_profiles
  for each row execute function public.business_profiles_guard();

-- Listings: sellers control content, the platform controls moderation state,
-- paid placement and the engagement counters.
create or replace function public.products_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_moderation boolean;
  v_allowed public.product_status[] := array['draft', 'pending_approval', 'active', 'sold', 'deleted']::public.product_status[];
begin
  if public.is_admin() then
    return new;
  end if;

  select coalesce((value->>'require_approval')::boolean, true)
    into v_moderation
    from public.app_settings where key = 'moderation';
  v_moderation := coalesce(v_moderation, true);

  if tg_op = 'INSERT' then
    -- New listings enter the moderation queue (or go live if approval is off).
    new.status := case
      when new.status = 'draft' then 'draft'
      when v_moderation then 'pending_approval'
      else 'active'
    end;
    new.is_featured    := false;
    new.featured_until := null;
    new.view_count     := 0;
    new.favorite_count := 0;
    new.message_count  := 0;
    new.rejection_reason := null;
    return new;
  end if;

  -- Sellers may move between their own lifecycle states, but may never
  -- self-approve a listing that moderation has not cleared, nor resurrect a
  -- suspended one.
  if old.status in ('suspended', 'rejected') and new.status <> old.status then
    raise exception 'This listing is locked by moderation'
      using errcode = '42501';
  end if;

  if not (new.status = any(v_allowed)) then
    new.status := old.status;
  end if;

  if new.status = 'active' and old.status not in ('active', 'sold', 'expired') and v_moderation then
    new.status := 'pending_approval';
  end if;

  -- Material edits to a live listing send it back through moderation.
  if v_moderation and old.status = 'active' and new.status = 'active'
     and (new.title is distinct from old.title
          or new.description is distinct from old.description
          or new.category_id is distinct from old.category_id) then
    new.status := 'pending_approval';
  end if;

  new.is_featured    := old.is_featured;
  new.featured_until := old.featured_until;
  new.view_count     := old.view_count;
  new.favorite_count := old.favorite_count;
  new.message_count  := old.message_count;
  new.seller_id      := old.seller_id;
  new.rejection_reason := old.rejection_reason;
  return new;
end;
$fn$;

drop trigger if exists trg_products_guard on public.products;
create trigger trg_products_guard
  before insert or update on public.products
  for each row execute function public.products_guard();

-- Reviews: the author owns the content, the platform owns the moderation
-- state, and the seller owns only the reply.
create or replace function public.reviews_moderation_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_is_seller boolean;
begin
  if public.is_admin() then
    return new;
  end if;

  select exists (
    select 1 from public.seller_profiles s
     where s.id = new.seller_id and s.user_id = auth.uid()
  ) into v_is_seller;

  if tg_op = 'INSERT' then
    new.status := 'pending';
    new.seller_reply := null;
    new.seller_replied_at := null;
    return new;
  end if;

  new.status       := old.status;
  new.moderated_by := old.moderated_by;
  new.moderated_at := old.moderated_at;
  new.moderation_note := old.moderation_note;

  if v_is_seller then
    -- Seller touches nothing but the reply.
    new.rating     := old.rating;
    new.comment    := old.comment;
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

drop trigger if exists trg_reviews_moderation_guard on public.reviews;
create trigger trg_reviews_moderation_guard
  before insert or update on public.reviews
  for each row execute function public.reviews_moderation_guard();

-- Applicants may amend documents; only admins decide.
create or replace function public.verification_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
begin
  if public.is_admin() then
    if tg_op = 'UPDATE' and new.status is distinct from old.status then
      new.reviewed_by := auth.uid();
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

-- Must run before verification_apply_decision so the decision trigger only
-- ever sees a status change an admin actually made.
drop trigger if exists trg_verification_guard on public.verification_requests;
create trigger trg_verification_guard
  before insert or update on public.verification_requests
  for each row execute function public.verification_guard();

-- Reports: the filer owns the claim, moderators own the outcome.
create or replace function public.reports_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
begin
  if public.is_admin() then
    if tg_op = 'UPDATE' and new.status is distinct from old.status
       and new.status in ('actioned', 'dismissed') then
      new.resolved_by := auth.uid();
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

drop trigger if exists trg_reports_guard on public.reports;
create trigger trg_reports_guard
  before insert or update on public.reports
  for each row execute function public.reports_guard();

-- ===========================================================================
-- Function execution privileges
-- ===========================================================================
revoke execute on function public.mark_conversation_read(uuid) from public, anon;
grant  execute on function public.mark_conversation_read(uuid) to authenticated;

revoke execute on function public.start_conversation(uuid, uuid) from public, anon;
grant  execute on function public.start_conversation(uuid, uuid) to authenticated;

revoke execute on function public.get_seller_contact(uuid) from public;
grant  execute on function public.get_seller_contact(uuid) to anon, authenticated;

grant execute on function public.record_product_view(uuid, text, text) to anon, authenticated;
grant execute on function public.record_ad_impression(uuid) to anon, authenticated;
grant execute on function public.record_ad_click(uuid)      to anon, authenticated;
grant execute on function public.similar_products(uuid, integer) to anon, authenticated;
grant execute on function public.category_descendants(integer)   to anon, authenticated;

revoke execute on function public.recommended_products(uuid, integer, integer) from public, anon;
grant  execute on function public.recommended_products(uuid, integer, integer) to authenticated;

grant execute on function public.search_products(
  text, integer, boolean, smallint, integer, integer, integer, uuid, uuid,
  public.product_condition[], numeric, numeric, text, public.seller_type,
  boolean, boolean, boolean, boolean, integer, double precision, double precision,
  double precision, text, integer, integer
) to anon, authenticated;

-- Helper functions used INSIDE policy expressions must stay executable by the
-- roles those policies apply to. A policy is evaluated as the querying role,
-- so revoking EXECUTE here would make every policy that calls is_admin() or
-- is_business_member() fail with a permission error rather than deny access.
grant execute on function public.is_admin()                   to anon, authenticated;
grant execute on function public.is_super_admin()             to anon, authenticated;
grant execute on function public.current_user_role()          to authenticated;
grant execute on function public.is_blocked_pair(uuid, uuid)  to anon, authenticated;
grant execute on function public.is_business_member(uuid)     to anon, authenticated;
grant execute on function public.is_conversation_member(uuid) to anon, authenticated;
