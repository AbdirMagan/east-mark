-- East-Market :: 0013 :: Typo-tolerant search + function hardening
--
-- 1. SEARCH
--
-- `%` (whole-string similarity) cannot match a single mistyped word inside a
-- longer title, which is exactly what marketplace search has to survive.
-- Measured against "Toyota Corolla 2018" on this schema:
--
--     query      similarity()   word_similarity()
--     toyota        0.350            1.000
--     corolla       0.400            1.000
--     corol         0.238            0.833
--     corola        0.286            0.714
--     toyta         0.182            0.500
--     nissan        0.000            0.000
--     laptop        0.000            0.000
--
-- No single cut-off works for similarity(): 0.35 for a *correct* query is
-- barely above 0.29 for a typo. word_similarity compares the query against the
-- best-matching word instead of the whole string, and separates cleanly.
-- 0.45 sits below "toyta" (0.50) and far above noise (0.00).
--
-- The indexable spelling is the `<%` operator, but it reads its cut-off from
-- pg_trgm.word_similarity_threshold, and managed Postgres refuses to let a
-- function pin that parameter ("permission denied to set parameter"). So the
-- threshold is written out explicitly and this clause is a filter rather than
-- an index scan. It is OR-ed with the GIN-indexed full-text clause and only
-- ever runs after country/city/category/price have narrowed the candidate set.
-- Revisit if text-search latency grows.
--
-- 2. HARDENING
--
-- Pin search_path on the functions that were still resolving it at call time,
-- and take the trigger functions off the PostgREST-exposed API surface.

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
  id uuid, ref bigint, slug text, title text, price numeric, currency_code text,
  is_negotiable boolean, condition public.product_condition, status public.product_status,
  category_id integer, city_id integer, city_name text, country_id smallint, country_code text,
  latitude double precision, longitude double precision, distance_km double precision,
  thumbnail_url text, image_url text, image_count integer,
  view_count integer, favorite_count integer, is_featured boolean,
  delivery_available boolean, published_at timestamptz,
  seller_id uuid, seller_name text, seller_avatar text, seller_verified boolean,
  business_id uuid, business_name text, total_count bigint
)
language plpgsql
stable
security definer
set search_path = public, extensions
as $fn$
declare
  v_norm_query text := nullif(btrim(coalesce(p_query, '')), '');
  v_limit  integer := least(greatest(coalesce(p_limit, 20), 1), 100);
  v_offset integer := greatest(coalesce(p_offset, 0), 0);
  v_cats   integer[];
  -- See the header note. Below "toyta" (0.50), far above noise (0.00).
  c_fuzzy_threshold constant real := 0.45;
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
             + (word_similarity(v_norm_query, p.title) * 0.5)::real
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
        -- 1. full text over title / brand / model / description, all languages
        or p.search_vector @@ websearch_to_tsquery('simple', public.em_normalize(v_norm_query))
        -- 2. typo tolerance against the best-matching word in the title
        or word_similarity(v_norm_query, p.title) > c_fuzzy_threshold
        -- 3. plain substring, for fragments shorter than a trigram window
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

grant execute on function public.search_products(
  text, integer, boolean, smallint, integer, integer, integer, uuid, uuid,
  public.product_condition[], numeric, numeric, text, public.seller_type,
  boolean, boolean, boolean, boolean, integer, double precision, double precision,
  double precision, text, integer, integer
) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Pin search_path on the functions that were still resolving it at call time.
-- ALTER rather than CREATE OR REPLACE for em_normalize: it backs the generated
-- products.search_vector column and must not be redefined.
-- ---------------------------------------------------------------------------
alter function public.em_normalize(text)            set search_path = public, extensions;
alter function public.set_updated_at()              set search_path = public;
alter function public.products_set_slug()           set search_path = public;
alter function public.products_lifecycle()          set search_path = public;
alter function public.payments_set_reference()      set search_path = public;
alter function public.em_distance_km(double precision, double precision, double precision, double precision)
                                                    set search_path = public;
alter function public.category_descendants(integer) set search_path = public;
alter function public.em_try_uuid(text)             set search_path = public;

-- ---------------------------------------------------------------------------
-- Trigger functions are exposed as RPC endpoints by default. They can only run
-- meaningfully as triggers, so take them off the public API surface.
-- ---------------------------------------------------------------------------
do $mig$
declare fn record;
begin
  for fn in
    select p.oid::regprocedure as sig
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.prorettype = 'trigger'::regtype
  loop
    execute format('revoke execute on function %s from public, anon, authenticated;', fn.sig);
  end loop;
end $mig$;
