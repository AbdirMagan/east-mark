-- East-Market :: 0003 :: Identity
-- Profiles, seller profiles, business storefronts, devices, preferences.

-- ---------------------------------------------------------------------------
-- profiles :: one row per auth.users row
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id                uuid primary key references auth.users(id) on delete cascade,
  username          citext unique,
  full_name         text,
  avatar_url        text,
  bio               text,

  -- NOTE: phone numbers deliberately do NOT live here. `profiles` is
  -- world-readable (seller cards need name + avatar on every product tile),
  -- and RLS is row-level, not column-level -- a public read policy would
  -- expose every account's phone number and make the seller's
  -- "show my phone" switch meaningless. Contact details live in
  -- public.user_contacts below, which is private, and are released through
  -- the get_seller_contact() RPC that honours those switches.

  -- Location (all optional; onboarding fills country + city)
  country_id        smallint references public.countries(id) on delete set null,
  region_id         integer  references public.regions(id) on delete set null,
  city_id           integer  references public.cities(id) on delete set null,
  district_id       integer  references public.districts(id) on delete set null,
  neighborhood_id   integer  references public.neighborhoods(id) on delete set null,
  latitude          double precision,
  longitude         double precision,

  -- Preferences
  language_code     text not null default 'en' references public.languages(code),
  currency_code     text not null default 'USD' references public.currencies(code),
  theme             text not null default 'system' check (theme in ('light', 'dark', 'system')),

  role              public.user_role not null default 'buyer',
  interests         integer[] not null default '{}',   -- category ids chosen at onboarding

  is_active         boolean not null default true,
  is_banned         boolean not null default false,
  ban_reason        text,
  onboarded_at      timestamptz,
  last_seen_at      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  constraint profiles_username_format
    check (username is null or username ~ '^[a-zA-Z0-9_]{3,30}$')
);

-- ---------------------------------------------------------------------------
-- user_contacts :: private. Readable only by the owner, admins and the
-- service role. Everything else goes through get_seller_contact().
-- ---------------------------------------------------------------------------
create table if not exists public.user_contacts (
  user_id         uuid primary key references public.profiles(id) on delete cascade,
  phone           text,                             -- canonical E.164, e.g. +252634000000
  phone_verified  boolean not null default false,
  whatsapp        text,
  show_phone      boolean not null default true,
  show_whatsapp   boolean not null default true,
  updated_at      timestamptz not null default now(),

  constraint user_contacts_phone_e164
    check (phone is null or phone ~ '^\+[1-9][0-9]{6,14}$'),
  constraint user_contacts_whatsapp_e164
    check (whatsapp is null or whatsapp ~ '^\+[1-9][0-9]{6,14}$')
);

create index if not exists idx_profiles_city     on public.profiles (city_id);
create index if not exists idx_profiles_country  on public.profiles (country_id);
create index if not exists idx_profiles_role     on public.profiles (role);
create index if not exists idx_profiles_lastseen on public.profiles (last_seen_at desc nulls last);

-- ---------------------------------------------------------------------------
-- RLS helper functions. Defined here because they read public.profiles.
-- SECURITY DEFINER so policies on profiles never recurse into themselves.
-- ---------------------------------------------------------------------------
-- Role lookup used by RLS. SECURITY DEFINER so policies on `profiles`
-- never recurse back into themselves while evaluating.
create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role in ('admin', 'moderator') from public.profiles where id = auth.uid()),
    false
  );
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role = 'admin' from public.profiles where id = auth.uid()), false);
$$;

-- Mirror new auth users into profiles. Metadata supplied at sign-up
-- (full_name, phone, country, language) is carried across.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  insert into public.profiles (id, full_name, avatar_url, language_code, currency_code)
  values (
    new.id,
    nullif(meta->>'full_name', ''),
    nullif(meta->>'avatar_url', ''),
    coalesce(nullif(meta->>'language_code', ''), 'en'),
    coalesce(nullif(meta->>'currency_code', ''), 'USD')
  )
  on conflict (id) do nothing;

  insert into public.user_contacts (user_id, phone, phone_verified)
  values (
    new.id,
    coalesce(nullif(meta->>'phone', ''), new.phone),
    new.phone_confirmed_at is not null
  )
  on conflict (user_id) do nothing;

  insert into public.notification_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$fn$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- seller_profiles :: created the first time a user lists something
-- ---------------------------------------------------------------------------
create table if not exists public.seller_profiles (
  id                  uuid primary key default extensions.gen_random_uuid(),
  user_id             uuid not null unique references public.profiles(id) on delete cascade,
  display_name        text,
  about               text,
  seller_type         public.seller_type not null default 'individual',
  verification_status public.verification_status not null default 'unverified',
  verified_at         timestamptz,

  -- Denormalised counters, maintained by triggers (0004/0006).
  rating_avg          numeric(3, 2) not null default 0 check (rating_avg between 0 and 5),
  rating_count        integer not null default 0,
  listing_count       integer not null default 0,
  active_listing_count integer not null default 0,
  sold_count          integer not null default 0,
  follower_count      integer not null default 0,

  response_rate       numeric(5, 2),
  avg_response_minutes integer,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists idx_seller_profiles_user     on public.seller_profiles (user_id);
create index if not exists idx_seller_profiles_verified on public.seller_profiles (verification_status);
create index if not exists idx_seller_profiles_rating   on public.seller_profiles (rating_avg desc, rating_count desc);

-- ---------------------------------------------------------------------------
-- business_profiles :: storefront for business sellers
-- ---------------------------------------------------------------------------
create table if not exists public.business_profiles (
  id                  uuid primary key default extensions.gen_random_uuid(),
  owner_id            uuid not null references public.profiles(id) on delete cascade,
  seller_profile_id   uuid references public.seller_profiles(id) on delete set null,

  name                text not null,
  slug                citext not null unique,
  description         text,
  logo_url            text,
  cover_url           text,

  phone               text,
  whatsapp            text,
  email               text,
  website             text,

  country_id          smallint references public.countries(id) on delete set null,
  region_id           integer  references public.regions(id) on delete set null,
  city_id             integer  references public.cities(id) on delete set null,
  district_id         integer  references public.districts(id) on delete set null,
  address             text,
  latitude            double precision,
  longitude           double precision,

  -- [{"day":1,"open":"08:00","close":"18:00","closed":false}, ...] 0=Sunday
  opening_hours       jsonb not null default '[]'::jsonb,
  categories          integer[] not null default '{}',

  verification_status public.verification_status not null default 'unverified',
  registration_number text,

  rating_avg          numeric(3, 2) not null default 0,
  rating_count        integer not null default 0,
  product_count       integer not null default 0,
  follower_count      integer not null default 0,

  is_active           boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  constraint business_slug_format check (slug ~ '^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$')
);

create index if not exists idx_business_owner    on public.business_profiles (owner_id);
create index if not exists idx_business_city     on public.business_profiles (city_id) where is_active;
create index if not exists idx_business_country  on public.business_profiles (country_id) where is_active;
create index if not exists idx_business_name_trgm on public.business_profiles using gin (name extensions.gin_trgm_ops);

-- Staff attached to a storefront
create table if not exists public.business_employees (
  id           uuid primary key default extensions.gen_random_uuid(),
  business_id  uuid not null references public.business_profiles(id) on delete cascade,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  job_title    text,
  -- {"manage_products":true,"manage_messages":true,"manage_staff":false,"view_analytics":true}
  permissions  jsonb not null default '{}'::jsonb,
  invited_by   uuid references public.profiles(id) on delete set null,
  accepted_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (business_id, user_id)
);

create index if not exists idx_business_employees_user on public.business_employees (user_id);

-- Membership check used by RLS on products/messages owned by a storefront.
create or replace function public.is_business_member(b_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $fn$
  select exists (
    select 1 from public.business_profiles bp
    where bp.id = b_id and bp.owner_id = auth.uid()
  ) or exists (
    select 1 from public.business_employees be
    where be.business_id = b_id and be.user_id = auth.uid() and be.accepted_at is not null
  );
$fn$;

-- ---------------------------------------------------------------------------
-- Push notification devices
-- ---------------------------------------------------------------------------
create table if not exists public.device_tokens (
  id          uuid primary key default extensions.gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  token       text not null unique,
  platform    text not null check (platform in ('android', 'ios', 'web')),
  device_name text,
  app_version text,
  locale      text,
  is_active   boolean not null default true,
  last_used_at timestamptz not null default now(),
  created_at  timestamptz not null default now()
);

create index if not exists idx_device_tokens_user on public.device_tokens (user_id) where is_active;

-- ---------------------------------------------------------------------------
-- Per-channel notification preferences
-- ---------------------------------------------------------------------------
create table if not exists public.notification_preferences (
  user_id            uuid primary key references public.profiles(id) on delete cascade,
  push_enabled       boolean not null default true,
  email_enabled      boolean not null default true,
  sms_enabled        boolean not null default false,
  -- Per notification_type overrides: {"new_message": false, ...}
  type_overrides     jsonb not null default '{}'::jsonb,
  quiet_hours_start  time,
  quiet_hours_end    time,
  updated_at         timestamptz not null default now()
);

do $mig$
declare t text;
begin
  foreach t in array array[
    'profiles','user_contacts','seller_profiles','business_profiles','business_employees','notification_preferences'
  ] loop
    execute format('drop trigger if exists trg_%1$s_updated_at on public.%1$s;', t);
    execute format(
      'create trigger trg_%1$s_updated_at before update on public.%1$s
       for each row execute function public.set_updated_at();', t);
  end loop;
end $mig$;
