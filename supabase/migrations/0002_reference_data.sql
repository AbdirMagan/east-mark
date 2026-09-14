-- East-Market :: 0002 :: Reference data
-- Languages, currencies, the location hierarchy and the category tree.
--
-- ID convention for the whole schema:
--   * Reference/lookup tables use compact integer identities. They are
--     embedded in almost every API payload and the bytes matter on 2G/3G.
--   * User-generated content uses uuid, so ids are never enumerable.

-- ---------------------------------------------------------------------------
-- Languages
-- ---------------------------------------------------------------------------
create table if not exists public.languages (
  code          text primary key,                 -- BCP-47: en, so, am, sw
  name          text not null,                    -- English name
  native_name   text not null,                    -- Soomaali, አማርኛ, Kiswahili
  is_rtl        boolean not null default false,
  is_active     boolean not null default true,
  sort_order    smallint not null default 0,
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Currencies + exchange rates
-- ---------------------------------------------------------------------------
create table if not exists public.currencies (
  code            text primary key,               -- USD, SLSH, SOS, ETB, KES
  name            text not null,
  symbol          text not null,
  decimal_digits  smallint not null default 2,
  is_active       boolean not null default true,
  sort_order      smallint not null default 0,
  created_at      timestamptz not null default now()
);

-- Rates are cached from a provider. Products always keep their original
-- price + currency; conversion is a display concern only.
create table if not exists public.exchange_rates (
  base_code    text not null references public.currencies(code) on delete cascade,
  quote_code   text not null references public.currencies(code) on delete cascade,
  rate         numeric(20, 8) not null check (rate > 0),
  source       text not null default 'manual',
  fetched_at   timestamptz not null default now(),
  primary key (base_code, quote_code)
);

-- ---------------------------------------------------------------------------
-- Location hierarchy: country > region > city > district > neighborhood
-- Fully database driven. Admins add rows, no code changes required.
-- `translations` holds localized names keyed by language code:
--   {"so": "Hargeysa", "am": "ሀርጌሳ"}
-- ---------------------------------------------------------------------------
create table if not exists public.countries (
  id                    smallint generated always as identity primary key,
  code                  text not null unique,      -- ISO 3166-1 alpha-2 (XA used for Somaliland)
  code3                 text,
  name                  text not null,
  translations          jsonb not null default '{}'::jsonb,
  dial_code             text not null,             -- +252, +251, +254
  flag_emoji            text,
  default_currency_code text references public.currencies(code),
  default_language_code text references public.languages(code),
  phone_number_length   smallint,                  -- national significant number length
  is_active             boolean not null default true,
  sort_order            smallint not null default 0,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create table if not exists public.regions (
  id           integer generated always as identity primary key,
  country_id   smallint not null references public.countries(id) on delete cascade,
  name         text not null,
  translations jsonb not null default '{}'::jsonb,
  code         text,
  is_active    boolean not null default true,
  sort_order   smallint not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (country_id, name)
);

create table if not exists public.cities (
  id           integer generated always as identity primary key,
  region_id    integer not null references public.regions(id) on delete cascade,
  country_id   smallint not null references public.countries(id) on delete cascade,
  name         text not null,
  translations jsonb not null default '{}'::jsonb,
  latitude     double precision,
  longitude    double precision,
  is_major     boolean not null default false,     -- surfaced in the quick-pick list
  is_active    boolean not null default true,
  sort_order   smallint not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (region_id, name)
);

create table if not exists public.districts (
  id           integer generated always as identity primary key,
  city_id      integer not null references public.cities(id) on delete cascade,
  name         text not null,
  translations jsonb not null default '{}'::jsonb,
  latitude     double precision,
  longitude    double precision,
  is_active    boolean not null default true,
  sort_order   smallint not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (city_id, name)
);

create table if not exists public.neighborhoods (
  id           integer generated always as identity primary key,
  district_id  integer not null references public.districts(id) on delete cascade,
  name         text not null,
  translations jsonb not null default '{}'::jsonb,
  latitude     double precision,
  longitude    double precision,
  is_active    boolean not null default true,
  sort_order   smallint not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (district_id, name)
);

create index if not exists idx_regions_country        on public.regions (country_id) where is_active;
create index if not exists idx_cities_region          on public.cities (region_id) where is_active;
create index if not exists idx_cities_country         on public.cities (country_id) where is_active;
create index if not exists idx_cities_major           on public.cities (country_id, sort_order) where is_major and is_active;
create index if not exists idx_districts_city         on public.districts (city_id) where is_active;
create index if not exists idx_neighborhoods_district on public.neighborhoods (district_id) where is_active;
create index if not exists idx_cities_name_trgm       on public.cities using gin (name extensions.gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- Category tree (self-referencing; subcategories are children)
-- ---------------------------------------------------------------------------
create table if not exists public.categories (
  id             integer generated always as identity primary key,
  parent_id      integer references public.categories(id) on delete cascade,
  slug           text not null unique,
  icon           text,                             -- icon key resolved by each client
  image_url      text,
  accent_color   text,                             -- hex, drives the category tile tint
  is_active      boolean not null default true,
  sort_order     smallint not null default 0,
  -- Which optional listing fields this category shows. Keeps Year/Model on
  -- cars and off livestock without hard-coding categories in the apps.
  field_schema   jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint categories_no_self_parent check (parent_id is null or parent_id <> id)
);

create table if not exists public.category_translations (
  category_id    integer not null references public.categories(id) on delete cascade,
  language_code  text not null references public.languages(code) on delete cascade,
  name           text not null,
  description    text,
  primary key (category_id, language_code)
);

create index if not exists idx_categories_parent on public.categories (parent_id, sort_order) where is_active;
create index if not exists idx_category_tr_lang  on public.category_translations (language_code);

-- ---------------------------------------------------------------------------
-- Key/value application settings, editable from the admin dashboard
-- ---------------------------------------------------------------------------
create table if not exists public.app_settings (
  key         text primary key,
  value       jsonb not null,
  description text,
  is_public   boolean not null default false,      -- public rows are readable by anon clients
  updated_by  uuid,
  updated_at  timestamptz not null default now()
);

-- updated_at triggers for every table above that carries the column
do $mig$
declare t text;
begin
  foreach t in array array[
    'countries','regions','cities','districts','neighborhoods','categories','app_settings'
  ] loop
    execute format(
      'drop trigger if exists trg_%1$s_updated_at on public.%1$s;', t);
    execute format(
      'create trigger trg_%1$s_updated_at before update on public.%1$s
       for each row execute function public.set_updated_at();', t);
  end loop;
end $mig$;
