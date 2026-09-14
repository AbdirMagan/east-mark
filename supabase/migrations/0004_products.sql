-- East-Market :: 0004 :: Products
-- Listings, images, favorites, follows, view tracking and the search index.

create table if not exists public.products (
  id              uuid primary key default extensions.gen_random_uuid(),
  -- Short numeric id used in shareable links: eastmarket.app/product/12345
  ref             bigint generated always as identity (start with 100000) unique,
  slug            text,

  seller_id       uuid not null references public.profiles(id) on delete cascade,
  business_id     uuid references public.business_profiles(id) on delete set null,

  category_id     integer not null references public.categories(id) on delete restrict,
  subcategory_id  integer references public.categories(id) on delete set null,

  title           text not null check (char_length(btrim(title)) between 3 and 120),
  description     text check (description is null or char_length(description) <= 5000),

  price           numeric(14, 2) not null check (price >= 0),
  currency_code   text not null references public.currencies(code),
  is_negotiable   boolean not null default false,

  condition       public.product_condition not null default 'used',
  status          public.product_status not null default 'pending_approval',
  rejection_reason text,

  -- Location snapshot. Denormalised ids keep filter queries to a single table.
  country_id      smallint not null references public.countries(id) on delete restrict,
  region_id       integer  references public.regions(id) on delete set null,
  city_id         integer  references public.cities(id) on delete set null,
  district_id     integer  references public.districts(id) on delete set null,
  neighborhood_id integer  references public.neighborhoods(id) on delete set null,
  latitude        double precision check (latitude is null or latitude between -90 and 90),
  longitude       double precision check (longitude is null or longitude between -180 and 180),

  -- Contact overrides; fall back to the seller profile when null.
  phone           text,
  whatsapp        text,

  -- Optional, category-dependent attributes
  brand           text,
  model           text,
  year            smallint check (year is null or year between 1900 and 2100),
  color           text,
  size            text,
  quantity        integer not null default 1 check (quantity >= 0),
  delivery_available boolean not null default false,
  -- Free-form extras driven by categories.field_schema
  attributes      jsonb not null default '{}'::jsonb,

  -- Counters maintained by triggers / RPC
  view_count      integer not null default 0,
  favorite_count  integer not null default 0,
  message_count   integer not null default 0,

  is_featured     boolean not null default false,
  featured_until  timestamptz,

  published_at    timestamptz,
  expires_at      timestamptz,
  sold_at         timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  -- Multilingual search index. 'simple' (no stemming dictionary) is the right
  -- config here: Somali and Amharic have no PostgreSQL dictionary, and stemming
  -- English-only would skew results across the four supported languages.
  -- Trigram indexes below cover fuzzy/partial matching.
  search_vector   tsvector generated always as (
      setweight(to_tsvector('simple', public.em_normalize(title)), 'A')
   || setweight(to_tsvector('simple', public.em_normalize(coalesce(brand, '') || ' ' || coalesce(model, ''))), 'B')
   || setweight(to_tsvector('simple', public.em_normalize(coalesce(description, ''))), 'C')
  ) stored
);

-- Feeds and filters. The partial indexes keep the hot path (active listings)
-- small, which matters because that is 99% of reads.
create index if not exists idx_products_feed
  on public.products (published_at desc) where status = 'active';
create index if not exists idx_products_city
  on public.products (city_id, published_at desc) where status = 'active';
create index if not exists idx_products_country
  on public.products (country_id, published_at desc) where status = 'active';
create index if not exists idx_products_category
  on public.products (category_id, published_at desc) where status = 'active';
create index if not exists idx_products_price
  on public.products (currency_code, price) where status = 'active';
create index if not exists idx_products_seller
  on public.products (seller_id, created_at desc);
create index if not exists idx_products_business
  on public.products (business_id, created_at desc) where business_id is not null;
create index if not exists idx_products_status
  on public.products (status, created_at desc);
create index if not exists idx_products_featured
  on public.products (featured_until desc) where is_featured and status = 'active';
create index if not exists idx_products_popular
  on public.products (view_count desc) where status = 'active';
create index if not exists idx_products_expiry
  on public.products (expires_at) where status = 'active';

create index if not exists idx_products_search on public.products using gin (search_vector);
create index if not exists idx_products_title_trgm
  on public.products using gin (title extensions.gin_trgm_ops);
create index if not exists idx_products_attributes on public.products using gin (attributes);

-- ---------------------------------------------------------------------------
-- Images
-- ---------------------------------------------------------------------------
create table if not exists public.product_images (
  id            uuid primary key default extensions.gen_random_uuid(),
  product_id    uuid not null references public.products(id) on delete cascade,
  storage_path  text not null,                     -- path inside the product-images bucket
  url           text not null,                     -- full-size public URL
  thumbnail_url text,                              -- small WebP, used by cards on slow networks
  width         integer,
  height        integer,
  bytes         integer,
  position      smallint not null default 0,
  is_primary    boolean not null default false,
  created_at    timestamptz not null default now(),
  unique (product_id, position)
);

create index if not exists idx_product_images_product on public.product_images (product_id, position);
-- At most one primary image per product.
create unique index if not exists uq_product_primary_image
  on public.product_images (product_id) where is_primary;

-- ---------------------------------------------------------------------------
-- Favorites and follows
-- ---------------------------------------------------------------------------
create table if not exists public.favorites (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  -- Price at the moment of saving, so we can notify on a real drop.
  price_at_save numeric(14, 2),
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

create index if not exists idx_favorites_product on public.favorites (product_id);
create index if not exists idx_favorites_user    on public.favorites (user_id, created_at desc);

create table if not exists public.seller_follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  seller_id   uuid not null references public.seller_profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (follower_id, seller_id)
);

create index if not exists idx_seller_follows_seller on public.seller_follows (seller_id);

-- ---------------------------------------------------------------------------
-- View tracking (drives "popular" + recommendations)
-- ---------------------------------------------------------------------------
create table if not exists public.product_views (
  id         bigint generated always as identity primary key,
  product_id uuid not null references public.products(id) on delete cascade,
  viewer_id  uuid references public.profiles(id) on delete set null,
  session_id text,
  source     text,                                  -- feed | search | category | seller | deeplink
  created_at timestamptz not null default now()
);

create index if not exists idx_product_views_product on public.product_views (product_id, created_at desc);
create index if not exists idx_product_views_viewer  on public.product_views (viewer_id, created_at desc)
  where viewer_id is not null;

-- ---------------------------------------------------------------------------
-- Triggers: slug, lifecycle timestamps, counters
-- ---------------------------------------------------------------------------

-- URL-safe slug derived from the title, suffixed with the short ref so it is
-- always unique: "toyota-corolla-2018-100042"
create or replace function public.products_set_slug()
returns trigger
language plpgsql
as $fn$
declare
  base text;
begin
  base := regexp_replace(public.em_normalize(new.title), '[^a-z0-9]+', '-', 'g');
  base := btrim(regexp_replace(base, '-{2,}', '-', 'g'), '-');
  if base = '' then base := 'listing'; end if;
  new.slug := left(base, 60) || '-' || new.ref::text;
  return new;
end;
$fn$;

drop trigger if exists trg_products_slug on public.products;
create trigger trg_products_slug
  before insert or update of title on public.products
  for each row execute function public.products_set_slug();

-- published_at / sold_at follow the status column.
create or replace function public.products_lifecycle()
returns trigger
language plpgsql
as $fn$
declare
  listing_days integer;
begin
  if new.status = 'active' and (old.status is distinct from 'active') then
    new.published_at := coalesce(new.published_at, now());
    if new.expires_at is null then
      select coalesce((value->>'listing_days')::int, 60)
        into listing_days
        from public.app_settings where key = 'listings';
      new.expires_at := now() + make_interval(days => coalesce(listing_days, 60));
    end if;
  end if;

  if new.status = 'sold' and (old.status is distinct from 'sold') then
    new.sold_at := coalesce(new.sold_at, now());
  elsif new.status <> 'sold' then
    new.sold_at := null;
  end if;

  return new;
end;
$fn$;

drop trigger if exists trg_products_lifecycle on public.products;
create trigger trg_products_lifecycle
  before insert or update of status on public.products
  for each row execute function public.products_lifecycle();

-- favorite_count on products
create or replace function public.favorites_sync_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
begin
  if tg_op = 'INSERT' then
    update public.products set favorite_count = favorite_count + 1 where id = new.product_id;
    return new;
  else
    update public.products set favorite_count = greatest(favorite_count - 1, 0) where id = old.product_id;
    return old;
  end if;
end;
$fn$;

drop trigger if exists trg_favorites_count on public.favorites;
create trigger trg_favorites_count
  after insert or delete on public.favorites
  for each row execute function public.favorites_sync_count();

-- follower_count on seller_profiles
create or replace function public.follows_sync_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
begin
  if tg_op = 'INSERT' then
    update public.seller_profiles set follower_count = follower_count + 1 where id = new.seller_id;
    return new;
  else
    update public.seller_profiles set follower_count = greatest(follower_count - 1, 0) where id = old.seller_id;
    return old;
  end if;
end;
$fn$;

drop trigger if exists trg_follows_count on public.seller_follows;
create trigger trg_follows_count
  after insert or delete on public.seller_follows
  for each row execute function public.follows_sync_count();

-- listing counters on seller_profiles / business_profiles
create or replace function public.products_sync_seller_counts()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare
  target uuid := coalesce(new.seller_id, old.seller_id);
begin
  update public.seller_profiles sp
     set listing_count = sub.total,
         active_listing_count = sub.active,
         sold_count = sub.sold
    from (
      select count(*) filter (where status <> 'deleted')          as total,
             count(*) filter (where status = 'active')            as active,
             count(*) filter (where status = 'sold')              as sold
        from public.products where seller_id = target
    ) sub
   where sp.user_id = target;

  if coalesce(new.business_id, old.business_id) is not null then
    update public.business_profiles bp
       set product_count = (
         select count(*) from public.products
          where business_id = coalesce(new.business_id, old.business_id)
            and status = 'active'
       )
     where bp.id = coalesce(new.business_id, old.business_id);
  end if;

  return null;
end;
$fn$;

drop trigger if exists trg_products_seller_counts on public.products;
create trigger trg_products_seller_counts
  after insert or delete or update of status on public.products
  for each row execute function public.products_sync_seller_counts();

do $mig$
declare t text;
begin
  foreach t in array array['products'] loop
    execute format('drop trigger if exists trg_%1$s_updated_at on public.%1$s;', t);
    execute format(
      'create trigger trg_%1$s_updated_at before update on public.%1$s
       for each row execute function public.set_updated_at();', t);
  end loop;
end $mig$;
