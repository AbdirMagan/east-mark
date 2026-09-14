-- East-Market :: 0008 :: Discovery
-- Search history, saved searches, and the RPCs that power search,
-- the home feed and recommendations.

create table if not exists public.search_history (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  query      text not null,
  filters    jsonb not null default '{}'::jsonb,
  result_count integer,
  created_at timestamptz not null default now()
);

create index if not exists idx_search_history_user on public.search_history (user_id, created_at desc);

create table if not exists public.saved_searches (
  id             uuid primary key default extensions.gen_random_uuid(),
  user_id        uuid not null references public.profiles(id) on delete cascade,
  name           text not null,
  query          text,
  -- Same shape as the search_products arguments, persisted verbatim so the
  -- matcher job can replay the exact search.
  filters        jsonb not null default '{}'::jsonb,
  notify         boolean not null default true,
  last_notified_at timestamptz,
  last_match_at  timestamptz,
  match_count    integer not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (user_id, name)
);

create index if not exists idx_saved_searches_user   on public.saved_searches (user_id, created_at desc);
create index if not exists idx_saved_searches_notify on public.saved_searches (notify) where notify;

-- ---------------------------------------------------------------------------
-- Distance helper (haversine, km). Avoids a PostGIS dependency for what is
-- only ever a "sort by nearest" and a radius filter.
-- ---------------------------------------------------------------------------
create or replace function public.em_distance_km(
  lat1 double precision, lon1 double precision,
  lat2 double precision, lon2 double precision
) returns double precision
language sql
immutable
parallel safe
as $fn$
  select case
    when lat1 is null or lon1 is null or lat2 is null or lon2 is null then null
    else 6371.0 * 2 * asin(sqrt(
      power(sin(radians(lat2 - lat1) / 2), 2)
      + cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lon2 - lon1) / 2), 2)
    ))
  end;
$fn$;

-- Every descendant of a category, inclusive. Lets a search on "Electronics"
-- return listings filed under its subcategories.
create or replace function public.category_descendants(p_category_id integer)
returns setof integer
language sql
stable
parallel safe
as $fn$
  with recursive tree as (
    select id from public.categories where id = p_category_id
    union all
    select c.id from public.categories c join tree t on c.parent_id = t.id
  )
  select id from tree;
$fn$;

-- ---------------------------------------------------------------------------
-- search_products
-- The single entry point for the marketplace feed, category browsing,
-- text search and every filter combination. Returns a denormalised row so a
-- product card renders from one request with no follow-up joins.
-- ---------------------------------------------------------------------------
create or replace function public.search_products(
  p_query                 text                      default null,
  p_category_id           integer                   default null,
  p_include_subcategories boolean                   default true,
  p_country_id            smallint                  default null,
  p_region_id             integer                   default null,
  p_city_id               integer                   default null,
  p_district_id           integer                   default null,
  p_seller_id             uuid                      default null,
  p_business_id           uuid                      default null,
  p_conditions            public.product_condition[] default null,
  p_min_price             numeric                   default null,
  p_max_price             numeric                   default null,
  p_currency_code         text                      default null,
  p_seller_type           public.seller_type        default null,
  p_verified_only         boolean                   default false,
  p_delivery_only         boolean                   default false,
  p_negotiable_only       boolean                   default false,
  p_featured_only         boolean                   default false,
  p_posted_within_days    integer                   default null,
  p_latitude              double precision          default null,
  p_longitude             double precision          default null,
  p_radius_km             double precision          default null,
  p_sort                  text                      default 'newest',
  p_limit                 integer                   default 20,
  p_offset                integer                   default 0
)
returns table (
  id              uuid,
  ref             bigint,
  slug            text,
  title           text,
  price           numeric,
  currency_code   text,
  is_negotiable   boolean,
  condition       public.product_condition,
  status          public.product_status,
  category_id     integer,
  city_id         integer,
  city_name       text,
  country_id      smallint,
  country_code    text,
  latitude        double precision,
  longitude       double precision,
  distance_km     double precision,
  thumbnail_url   text,
  image_url       text,
  image_count     integer,
  view_count      integer,
  favorite_count  integer,
  is_featured     boolean,
  delivery_available boolean,
  published_at    timestamptz,
  seller_id       uuid,
  seller_name     text,
  seller_avatar   text,
  seller_verified boolean,
  business_id     uuid,
  business_name   text,
  total_count     bigint
)
language plpgsql
stable
security definer
set search_path = public
as $fn$
declare
  v_norm_query text := nullif(btrim(coalesce(p_query, '')), '');
  v_limit  integer := least(greatest(coalesce(p_limit, 20), 1), 100);
  v_offset integer := greatest(coalesce(p_offset, 0), 0);
  v_cats   integer[];
begin
  if p_category_id is not null then
    if coalesce(p_include_subcategories, true) then
      select array_agg(d) into v_cats from public.category_descendants(p_category_id) d;
    else
      v_cats := array[p_category_id];
    end if;
  end if;

  return query
  with filtered as (
    select
      p.*,
      public.em_distance_km(p_latitude, p_longitude, p.latitude, p.longitude) as dist_km,
      case
        when v_norm_query is null then 0::real
        else ts_rank(p.search_vector, websearch_to_tsquery('simple', public.em_normalize(v_norm_query)))
             + (extensions.similarity(p.title, v_norm_query) * 0.5)::real
      end as rank
    from public.products p
    join public.seller_profiles sp on sp.user_id = p.seller_id
    where p.status = 'active'
      and (p.expires_at is null or p.expires_at > now())
      and (v_cats is null or p.category_id = any(v_cats) or p.subcategory_id = any(v_cats))
      and (p_country_id  is null or p.country_id  = p_country_id)
      and (p_region_id   is null or p.region_id   = p_region_id)
      and (p_city_id     is null or p.city_id     = p_city_id)
      and (p_district_id is null or p.district_id = p_district_id)
      and (p_seller_id   is null or p.seller_id   = p_seller_id)
      and (p_business_id is null or p.business_id = p_business_id)
      and (p_conditions  is null or p.condition   = any(p_conditions))
      and (p_min_price   is null or p.price >= p_min_price)
      and (p_max_price   is null or p.price <= p_max_price)
      and (p_currency_code is null or p.currency_code = p_currency_code)
      and (p_seller_type is null or sp.seller_type = p_seller_type)
      and (not coalesce(p_verified_only, false)   or sp.verification_status = 'verified')
      and (not coalesce(p_delivery_only, false)   or p.delivery_available)
      and (not coalesce(p_negotiable_only, false) or p.is_negotiable)
      and (not coalesce(p_featured_only, false)   or (p.is_featured and coalesce(p.featured_until, now()) > now()))
      and (p_posted_within_days is null
           or p.published_at >= now() - make_interval(days => p_posted_within_days))
      and (
        v_norm_query is null
        or p.search_vector @@ websearch_to_tsquery('simple', public.em_normalize(v_norm_query))
        or p.title % v_norm_query                                  -- trigram fuzzy fallback
        or public.em_normalize(p.title) like '%' || public.em_normalize(v_norm_query) || '%'
      )
      and (
        p_radius_km is null or p_latitude is null or p_longitude is null
        or public.em_distance_km(p_latitude, p_longitude, p.latitude, p.longitude) <= p_radius_km
      )
      -- Listings from users the caller blocked (or who blocked them) are hidden.
      and (auth.uid() is null or not public.is_blocked_pair(auth.uid(), p.seller_id))
  ),
  counted as (select count(*) as n from filtered)
  select
    f.id, f.ref, f.slug, f.title, f.price, f.currency_code, f.is_negotiable,
    f.condition, f.status, f.category_id,
    f.city_id, ct.name, f.country_id, co.code,
    f.latitude, f.longitude, f.dist_km,
    img.thumbnail_url, img.url, coalesce(img.n, 0)::integer,
    f.view_count, f.favorite_count, f.is_featured, f.delivery_available, f.published_at,
    f.seller_id,
    coalesce(sp.display_name, pr.full_name, pr.username::text, 'Seller'),
    pr.avatar_url,
    (sp.verification_status = 'verified'),
    f.business_id, bp.name,
    counted.n
  from filtered f
  cross join counted
  join public.profiles pr        on pr.id = f.seller_id
  join public.seller_profiles sp on sp.user_id = f.seller_id
  left join public.cities ct     on ct.id = f.city_id
  left join public.countries co  on co.id = f.country_id
  left join public.business_profiles bp on bp.id = f.business_id
  left join lateral (
    select pi.url, pi.thumbnail_url, count(*) over () as n
      from public.product_images pi
     where pi.product_id = f.id
     order by pi.is_primary desc, pi.position asc
     limit 1
  ) img on true
  order by
    -- Featured listings float to the top of the default feed only; explicit
    -- sorts (price, nearest, oldest) are never reordered by paid placement.
    case when p_sort in ('newest', 'relevance') and f.is_featured then 0 else 1 end,
    case when p_sort = 'relevance' and v_norm_query is not null then f.rank end desc nulls last,
    case when p_sort = 'price_asc'  then f.price end asc nulls last,
    case when p_sort = 'price_desc' then f.price end desc nulls last,
    case when p_sort = 'popular'    then f.view_count end desc nulls last,
    case when p_sort = 'nearest'    then f.dist_km end asc nulls last,
    case when p_sort = 'oldest'     then f.published_at end asc nulls last,
    f.published_at desc nulls last,
    f.id
  limit v_limit offset v_offset;
end;
$fn$;

-- ---------------------------------------------------------------------------
-- record_product_view
-- Bumps the counter and appends a view row. De-duplicated to one view per
-- viewer per listing per hour so counts stay meaningful.
-- ---------------------------------------------------------------------------
create or replace function public.record_product_view(
  p_product_id uuid,
  p_session_id text default null,
  p_source     text default null
) returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_recent boolean;
  v_owner uuid;
begin
  select seller_id into v_owner from public.products where id = p_product_id and status = 'active';
  if v_owner is null then
    return;                                   -- nothing to count, and no error leak
  end if;
  if v_owner = auth.uid() then
    return;                                   -- sellers do not inflate their own views
  end if;

  select exists (
    select 1 from public.product_views
     where product_id = p_product_id
       and created_at > now() - interval '1 hour'
       and (
         (auth.uid() is not null and viewer_id = auth.uid())
         or (auth.uid() is null and p_session_id is not null and session_id = p_session_id)
       )
  ) into v_recent;

  if v_recent then
    return;
  end if;

  insert into public.product_views (product_id, viewer_id, session_id, source)
  values (p_product_id, auth.uid(), p_session_id, p_source);

  update public.products set view_count = view_count + 1 where id = p_product_id;
end;
$fn$;

-- ---------------------------------------------------------------------------
-- recommended_products
-- Deliberately explainable rather than clever: score each active listing on
-- location proximity, the categories the user engages with, and freshness.
-- The scoring weights are the seam where an ML ranker drops in later.
-- ---------------------------------------------------------------------------
create or replace function public.recommended_products(
  p_user_id uuid default null,
  p_limit   integer default 20,
  p_offset  integer default 0
)
returns setof public.products
language plpgsql
stable
security definer
set search_path = public
as $fn$
declare
  v_user uuid := coalesce(p_user_id, auth.uid());
  v_city integer;
  v_country smallint;
  v_interests integer[];
  v_limit integer := least(greatest(coalesce(p_limit, 20), 1), 50);
begin
  select city_id, country_id, interests
    into v_city, v_country, v_interests
    from public.profiles where id = v_user;

  return query
  with signals as (
    -- Categories the user has recently viewed, favorited or searched.
    select category_id, count(*)::numeric as weight
      from (
        select p.category_id
          from public.product_views v
          join public.products p on p.id = v.product_id
         where v.viewer_id = v_user and v.created_at > now() - interval '30 days'
        union all
        select p.category_id
          from public.favorites f
          join public.products p on p.id = f.product_id
         where f.user_id = v_user
        union all
        select unnest(coalesce(v_interests, '{}'))
      ) s
     where category_id is not null
     group by category_id
  )
  select p.*
    from public.products p
    left join signals sg on sg.category_id = p.category_id
   where p.status = 'active'
     and (p.expires_at is null or p.expires_at > now())
     and p.seller_id is distinct from v_user
     and (v_user is null or not public.is_blocked_pair(v_user, p.seller_id))
     -- Do not recommend what the user already saved or viewed.
     and not exists (select 1 from public.favorites f where f.user_id = v_user and f.product_id = p.id)
     and not exists (
       select 1 from public.product_views v
        where v.viewer_id = v_user and v.product_id = p.id
          and v.created_at > now() - interval '7 days'
     )
   order by
       (coalesce(sg.weight, 0) * 3.0)                                        -- category affinity
     + (case when v_city is not null and p.city_id = v_city then 5.0 else 0 end)     -- same city
     + (case when v_country is not null and p.country_id = v_country then 2.0 else 0 end)
     + (case when p.is_featured then 1.5 else 0 end)
     + greatest(0, 3.0 - extract(epoch from (now() - coalesce(p.published_at, p.created_at))) / 86400.0 / 7.0)
     + least(ln(1 + p.view_count) * 0.3, 2.0)                               -- mild popularity
       desc,
     p.published_at desc nulls last
   limit v_limit offset greatest(coalesce(p_offset, 0), 0);
end;
$fn$;

-- Listings similar to the one being viewed: same category, nearby, similar price.
create or replace function public.similar_products(p_product_id uuid, p_limit integer default 10)
returns setof public.products
language sql
stable
security definer
set search_path = public
as $fn$
  with src as (select * from public.products where id = p_product_id)
  select p.*
    from public.products p, src
   where p.id <> src.id
     and p.status = 'active'
     and (p.expires_at is null or p.expires_at > now())
     and (p.category_id = src.category_id or p.subcategory_id = src.category_id)
   order by
       (case when p.city_id = src.city_id then 3 else 0 end)
     + (case when p.country_id = src.country_id then 1 else 0 end)
     + (case when p.currency_code = src.currency_code
                  and p.price between src.price * 0.6 and src.price * 1.4 then 2 else 0 end)
       desc,
     p.published_at desc nulls last
   limit least(greatest(coalesce(p_limit, 10), 1), 30);
$fn$;

do $mig$
begin
  execute 'drop trigger if exists trg_saved_searches_updated_at on public.saved_searches';
  execute 'create trigger trg_saved_searches_updated_at before update on public.saved_searches
           for each row execute function public.set_updated_at()';
end $mig$;
