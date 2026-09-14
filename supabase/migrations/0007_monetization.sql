-- East-Market :: 0007 :: Monetization
-- Subscription plans, featured listings, advertisements and the
-- provider-agnostic payment ledger.

-- ---------------------------------------------------------------------------
-- Payment providers
-- Rows are registered by admins; the backend resolves a provider adapter by
-- `code`. No provider is hard-coded in application logic.
-- `config` holds non-secret settings only (endpoints, merchant display name).
-- Secrets live in backend environment variables keyed by provider code.
-- ---------------------------------------------------------------------------
create table if not exists public.payment_providers (
  code           text primary key,                 -- zaad | evcplus | sahal | telebirr | mpesa | stripe
  name           text not null,
  logo_url       text,
  country_codes  text[] not null default '{}',     -- ISO alpha-2 of supported countries
  currency_codes text[] not null default '{}',
  config         jsonb not null default '{}'::jsonb,
  is_active      boolean not null default false,
  sort_order     smallint not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Subscription plans
-- ---------------------------------------------------------------------------
create table if not exists public.subscription_plans (
  id               integer generated always as identity primary key,
  code             text not null unique,           -- free | basic | business | premium
  name             text not null,
  translations     jsonb not null default '{}'::jsonb,
  description      text,
  tier             smallint not null default 0,    -- ordering / upgrade comparison
  price            numeric(12, 2) not null default 0 check (price >= 0),
  currency_code    text not null default 'USD' references public.currencies(code),
  interval_unit    text not null default 'month' check (interval_unit in ('day', 'week', 'month', 'year')),
  interval_count   smallint not null default 1 check (interval_count > 0),

  max_listings     integer,                        -- null = unlimited
  max_images_per_listing smallint not null default 10,
  max_employees    smallint not null default 0,
  featured_credits smallint not null default 0,    -- free featured slots per period
  -- {"analytics":"advanced","storefront":true,"priority_support":true,"ads":true}
  features         jsonb not null default '{}'::jsonb,

  is_active        boolean not null default true,
  sort_order       smallint not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id            uuid primary key default extensions.gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  business_id   uuid references public.business_profiles(id) on delete cascade,
  plan_id       integer not null references public.subscription_plans(id) on delete restrict,

  status        public.subscription_status not null default 'active',
  starts_at     timestamptz not null default now(),
  ends_at       timestamptz not null,
  cancelled_at  timestamptz,
  auto_renew    boolean not null default false,

  featured_credits_remaining smallint not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_subscriptions_user   on public.subscriptions (user_id, status);
create index if not exists idx_subscriptions_expiry on public.subscriptions (ends_at) where status = 'active';
-- One live subscription per user.
create unique index if not exists uq_subscription_active
  on public.subscriptions (user_id) where status in ('active', 'trialing', 'past_due');

-- ---------------------------------------------------------------------------
-- Payments
-- `payments` is the intent (what the user is buying).
-- `payment_transactions` is the provider-level attempt log. One payment may
-- have several attempts across providers.
-- ---------------------------------------------------------------------------
create table if not exists public.payments (
  id             uuid primary key default extensions.gen_random_uuid(),
  reference      text not null unique,             -- human-readable: EM-2026-0001234
  user_id        uuid not null references public.profiles(id) on delete restrict,
  business_id    uuid references public.business_profiles(id) on delete set null,

  amount         numeric(14, 2) not null check (amount >= 0),
  currency_code  text not null references public.currencies(code),
  purpose        public.payment_purpose not null,
  -- What the payment unlocks. Kept loose so new purposes need no migration.
  subject_type   text,                             -- product | subscription_plan | advertisement
  subject_id     text,

  provider_code  text references public.payment_providers(code) on delete set null,
  status         public.payment_status not null default 'pending',
  failure_reason text,
  paid_at        timestamptz,
  metadata       jsonb not null default '{}'::jsonb,

  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists idx_payments_user   on public.payments (user_id, created_at desc);
create index if not exists idx_payments_status on public.payments (status, created_at desc);
create index if not exists idx_payments_subject on public.payments (subject_type, subject_id);

create table if not exists public.payment_transactions (
  id                 uuid primary key default extensions.gen_random_uuid(),
  payment_id         uuid not null references public.payments(id) on delete cascade,
  provider_code      text not null references public.payment_providers(code) on delete restrict,
  provider_reference text,                          -- id returned by the provider
  status             public.payment_status not null default 'pending',
  amount             numeric(14, 2) not null,
  currency_code      text not null references public.currencies(code),
  -- Redacted request/response envelopes for support and reconciliation.
  -- Never store card data, PINs or provider secrets here.
  request            jsonb not null default '{}'::jsonb,
  response           jsonb not null default '{}'::jsonb,
  error_code         text,
  error_message      text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists idx_payment_tx_payment on public.payment_transactions (payment_id, created_at desc);
create unique index if not exists uq_payment_tx_provider_ref
  on public.payment_transactions (provider_code, provider_reference)
  where provider_reference is not null;

-- Human-readable payment reference: EM-<year>-<zero padded sequence>
create sequence if not exists public.payment_reference_seq;

create or replace function public.payments_set_reference()
returns trigger
language plpgsql
as $fn$
begin
  if new.reference is null or new.reference = '' then
    new.reference := 'EM-' || to_char(now(), 'YYYY') || '-'
                  || lpad(nextval('public.payment_reference_seq')::text, 7, '0');
  end if;
  return new;
end;
$fn$;

drop trigger if exists trg_payments_reference on public.payments;
create trigger trg_payments_reference
  before insert on public.payments
  for each row execute function public.payments_set_reference();

-- ---------------------------------------------------------------------------
-- Featured listings
-- ---------------------------------------------------------------------------
create table if not exists public.featured_listings (
  id          uuid primary key default extensions.gen_random_uuid(),
  product_id  uuid not null references public.products(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  payment_id  uuid references public.payments(id) on delete set null,

  duration_days smallint not null check (duration_days in (3, 7, 14, 30)),
  price       numeric(12, 2) not null default 0,
  currency_code text not null default 'USD' references public.currencies(code),

  starts_at   timestamptz not null default now(),
  ends_at     timestamptz not null,
  is_active   boolean not null default false,
  impressions integer not null default 0,
  clicks      integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_featured_active
  on public.featured_listings (ends_at desc) where is_active;
create index if not exists idx_featured_product on public.featured_listings (product_id, ends_at desc);

-- Activating a feature slot mirrors onto the product for cheap feed reads.
create or replace function public.featured_sync_product()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
begin
  if tg_op = 'DELETE' then
    update public.products
       set is_featured = exists (
             select 1 from public.featured_listings
              where product_id = old.product_id and is_active and ends_at > now()
           )
     where id = old.product_id;
    return old;
  end if;

  update public.products
     set is_featured = new.is_active and new.ends_at > now(),
         featured_until = case when new.is_active then greatest(coalesce(featured_until, new.ends_at), new.ends_at) end
   where id = new.product_id;
  return new;
end;
$fn$;

drop trigger if exists trg_featured_sync on public.featured_listings;
create trigger trg_featured_sync
  after insert or update or delete on public.featured_listings
  for each row execute function public.featured_sync_product();

-- ---------------------------------------------------------------------------
-- Advertisements
-- ---------------------------------------------------------------------------
create table if not exists public.advertisements (
  id            uuid primary key default extensions.gen_random_uuid(),
  title         text not null,
  subtitle      text,
  image_url     text,
  -- Optional per-language creatives: {"so": {"title": "...", "image_url": "..."}}
  translations  jsonb not null default '{}'::jsonb,

  placement     public.ad_placement not null,
  -- Where it points. Either an internal route or an external URL.
  target_type   text not null default 'url' check (target_type in ('url', 'product', 'business', 'category', 'search')),
  target_value  text,

  -- Targeting. Empty array = no restriction on that dimension.
  country_ids   smallint[] not null default '{}',
  city_ids      integer[] not null default '{}',
  category_ids  integer[] not null default '{}',
  language_codes text[] not null default '{}',

  advertiser_id uuid references public.profiles(id) on delete set null,
  business_id   uuid references public.business_profiles(id) on delete set null,
  payment_id    uuid references public.payments(id) on delete set null,

  status        public.ad_status not null default 'draft',
  priority      smallint not null default 0,
  starts_at     timestamptz not null default now(),
  ends_at       timestamptz,
  impressions   integer not null default 0,
  clicks        integer not null default 0,

  created_by    uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint ads_window check (ends_at is null or ends_at > starts_at)
);

create index if not exists idx_ads_serving
  on public.advertisements (placement, priority desc, starts_at desc)
  where status = 'running';
create index if not exists idx_ads_countries on public.advertisements using gin (country_ids);
create index if not exists idx_ads_categories on public.advertisements using gin (category_ids);

-- Impression/click counters are bumped through these RPCs so clients never
-- need write access to the advertisements table itself.
create or replace function public.record_ad_impression(p_ad_id uuid)
returns void
language sql
security definer
set search_path = public
as $fn$
  update public.advertisements set impressions = impressions + 1
   where id = p_ad_id and status = 'running';
$fn$;

create or replace function public.record_ad_click(p_ad_id uuid)
returns void
language sql
security definer
set search_path = public
as $fn$
  update public.advertisements set clicks = clicks + 1
   where id = p_ad_id and status = 'running';
$fn$;

do $mig$
declare t text;
begin
  foreach t in array array[
    'payment_providers','subscription_plans','subscriptions','payments',
    'payment_transactions','featured_listings','advertisements'
  ] loop
    execute format('drop trigger if exists trg_%1$s_updated_at on public.%1$s;', t);
    execute format(
      'create trigger trg_%1$s_updated_at before update on public.%1$s
       for each row execute function public.set_updated_at();', t);
  end loop;
end $mig$;
