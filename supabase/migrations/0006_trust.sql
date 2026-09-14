-- East-Market :: 0006 :: Trust & safety
-- Reviews, reports, verification requests and the admin audit trail.

-- ---------------------------------------------------------------------------
-- Reviews :: buyers rate sellers
-- ---------------------------------------------------------------------------
create table if not exists public.reviews (
  id           uuid primary key default extensions.gen_random_uuid(),
  seller_id    uuid not null references public.seller_profiles(id) on delete cascade,
  reviewer_id  uuid not null references public.profiles(id) on delete cascade,
  product_id   uuid references public.products(id) on delete set null,

  rating       smallint not null check (rating between 1 and 5),
  comment      text check (comment is null or char_length(comment) <= 1500),

  status       public.review_status not null default 'pending',
  moderated_by uuid references public.profiles(id) on delete set null,
  moderated_at timestamptz,
  moderation_note text,

  -- One public reply from the seller.
  seller_reply text,
  seller_replied_at timestamptz,

  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- One review per reviewer per seller per listing.
create unique index if not exists uq_review_once
  on public.reviews (reviewer_id, seller_id, coalesce(product_id, '00000000-0000-0000-0000-000000000000'::uuid));

create index if not exists idx_reviews_seller
  on public.reviews (seller_id, created_at desc) where status = 'approved';
create index if not exists idx_reviews_reviewer on public.reviews (reviewer_id, created_at desc);
create index if not exists idx_reviews_moderation on public.reviews (status, created_at) where status = 'pending';

-- A seller cannot review themselves.
create or replace function public.reviews_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_owner uuid;
begin
  select user_id into v_owner from public.seller_profiles where id = new.seller_id;
  if v_owner = new.reviewer_id then
    raise exception 'You cannot review your own seller profile' using errcode = '22023';
  end if;
  return new;
end;
$fn$;

drop trigger if exists trg_reviews_guard on public.reviews;
create trigger trg_reviews_guard
  before insert or update on public.reviews
  for each row execute function public.reviews_guard();

-- Recompute the seller's rating from approved reviews only.
create or replace function public.reviews_sync_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare
  target uuid := coalesce(new.seller_id, old.seller_id);
begin
  update public.seller_profiles sp
     set rating_avg   = coalesce(sub.avg_rating, 0),
         rating_count = coalesce(sub.n, 0)
    from (
      select round(avg(rating)::numeric, 2) as avg_rating, count(*) as n
        from public.reviews
       where seller_id = target and status = 'approved'
    ) sub
   where sp.id = target;
  return null;
end;
$fn$;

drop trigger if exists trg_reviews_rating on public.reviews;
create trigger trg_reviews_rating
  after insert or delete or update of rating, status on public.reviews
  for each row execute function public.reviews_sync_rating();

-- ---------------------------------------------------------------------------
-- Reports
-- target_id is a uuid across every reportable entity, so a single table
-- serves products, sellers, businesses, messages and reviews.
-- ---------------------------------------------------------------------------
create table if not exists public.reports (
  id              uuid primary key default extensions.gen_random_uuid(),
  reporter_id     uuid references public.profiles(id) on delete set null,
  target_type     public.report_target not null,
  target_id       uuid not null,
  reason          public.report_reason not null,
  details         text check (details is null or char_length(details) <= 2000),
  evidence_urls   text[] not null default '{}',

  status          public.report_status not null default 'open',
  assigned_to     uuid references public.profiles(id) on delete set null,
  resolved_by     uuid references public.profiles(id) on delete set null,
  resolved_at     timestamptz,
  resolution_note text,
  action_taken    text,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- A user may report a given target once while the report is still open.
create unique index if not exists uq_report_open_per_user
  on public.reports (reporter_id, target_type, target_id)
  where status in ('open', 'under_review');

create index if not exists idx_reports_queue  on public.reports (status, created_at);
create index if not exists idx_reports_target on public.reports (target_type, target_id);

-- ---------------------------------------------------------------------------
-- Verification requests
-- ---------------------------------------------------------------------------
create table if not exists public.verification_requests (
  id            uuid primary key default extensions.gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  business_id   uuid references public.business_profiles(id) on delete cascade,
  kind          public.verification_kind not null default 'identity',

  full_name     text,
  document_type text,                               -- passport | national_id | license | registration
  document_number text,
  -- Private storage paths, never public URLs.
  documents     jsonb not null default '[]'::jsonb,
  notes         text,

  status        public.verification_status not null default 'pending',
  reviewed_by   uuid references public.profiles(id) on delete set null,
  reviewed_at   timestamptz,
  review_note   text,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_verification_user  on public.verification_requests (user_id, created_at desc);
create index if not exists idx_verification_queue on public.verification_requests (status, created_at)
  where status = 'pending';

-- Only one request in flight per user per kind.
create unique index if not exists uq_verification_pending
  on public.verification_requests (user_id, kind) where status = 'pending';

-- Approving a request flips the seller / business verification flag.
create or replace function public.verification_apply_decision()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
begin
  if new.status = old.status then
    return new;
  end if;

  if new.business_id is not null then
    update public.business_profiles
       set verification_status = new.status
     where id = new.business_id;
  end if;

  if new.kind in ('identity', 'business') then
    update public.seller_profiles
       set verification_status = new.status,
           verified_at = case when new.status = 'verified' then now() else null end
     where user_id = new.user_id;
  end if;

  if new.kind = 'phone' and new.status = 'verified' then
    update public.user_contacts set phone_verified = true where user_id = new.user_id;
  end if;

  insert into public.notifications (user_id, type, title, body, data)
  values (
    new.user_id,
    'verification_result',
    case when new.status = 'verified' then 'Verification approved' else 'Verification update' end,
    coalesce(new.review_note, 'Your verification request was reviewed.'),
    jsonb_build_object('route', 'verification', 'status', new.status, 'kind', new.kind)
  );

  new.reviewed_at := now();
  return new;
end;
$fn$;

drop trigger if exists trg_verification_decision on public.verification_requests;
create trigger trg_verification_decision
  before update of status on public.verification_requests
  for each row execute function public.verification_apply_decision();

-- ---------------------------------------------------------------------------
-- Admin audit trail :: append-only
-- ---------------------------------------------------------------------------
create table if not exists public.admin_audit_log (
  id          bigint generated always as identity primary key,
  admin_id    uuid references public.profiles(id) on delete set null,
  action      text not null,                       -- product.approve, user.ban, ...
  entity_type text not null,
  entity_id   text,
  payload     jsonb not null default '{}'::jsonb,
  ip_address  inet,
  user_agent  text,
  created_at  timestamptz not null default now()
);

create index if not exists idx_audit_admin  on public.admin_audit_log (admin_id, created_at desc);
create index if not exists idx_audit_entity on public.admin_audit_log (entity_type, entity_id, created_at desc);

do $mig$
declare t text;
begin
  foreach t in array array['reviews','reports','verification_requests'] loop
    execute format('drop trigger if exists trg_%1$s_updated_at on public.%1$s;', t);
    execute format(
      'create trigger trg_%1$s_updated_at before update on public.%1$s
       for each row execute function public.set_updated_at();', t);
  end loop;
end $mig$;
