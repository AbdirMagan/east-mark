-- East-Market :: 0021 :: Browse photos and video separately
--
-- Two entry points from the home page: listings with photos, and listings with
-- a video. The video feed is played full screen, one listing at a time, the way
-- people already watch video on a phone -- so search has to be able to return
-- "only listings with a video", with the video's own URL, in one query. Doing
-- that as a second round trip per page would cost a 2G buyer another second
-- before anything moves.
--
-- Three changes to search_products, all in one place because PostgreSQL has no
-- ALTER FUNCTION for a body:
--
--   1. p_media: null (everything), 'photo' (no video), or 'video' (has one).
--   2. The card image is a photo, falling back to the video's poster frame.
--      Before this, a listing with only a video showed "No photo".
--   3. image_count counts photos only, and four video columns come back with
--      the row.

create or replace function public.search_products(
  p_query text default null,
  p_category_id integer default null,
  p_include_subcategories boolean default true,
  p_country_id smallint default null,
  p_region_id integer default null,
  p_city_id integer default null,
  p_district_id integer default null,
  p_seller_id uuid default null,
  p_business_id uuid default null,
  p_conditions public.product_condition[] default null,
  p_min_price numeric default null,
  p_max_price numeric default null,
  p_currency_code text default null,
  p_seller_type public.seller_type default null,
  p_verified_only boolean default false,
  p_delivery_only boolean default false,
  p_negotiable_only boolean default false,
  p_featured_only boolean default false,
  p_posted_within_days integer default null,
  p_latitude double precision default null,
  p_longitude double precision default null,
  p_radius_km double precision default null,
  p_sort text default 'newest',
  p_limit integer default 20,
  p_offset integer default 0,
  p_media text default null
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
  business_id uuid, business_name text,
  has_video boolean, video_url text, video_poster_url text, video_duration_seconds smallint,
  total_count bigint
)
language plpgsql
stable
security definer
set search_path to 'public', 'extensions'
as $function$
declare
  v_norm_query text := nullif(btrim(coalesce(p_query, '')), '');
  v_limit  integer := least(greatest(coalesce(p_limit, 20), 1), 100);
  v_offset integer := greatest(coalesce(p_offset, 0), 0);
  v_cats   integer[];
  v_media  text := nullif(btrim(coalesce(p_media, '')), '');
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
      -- The media filter. 'video' keeps only listings that have one; 'photo'
      -- keeps the rest, which is what someone browsing pictures expects: a
      -- listing that is nothing but a video does not belong in a photo grid.
      and (
        v_media is null
        or (v_media = 'video') = exists (
          select 1 from public.product_images pi
           where pi.product_id = p.id and pi.media_type = 'video'
        )
      )
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
      and (auth.uid() is null or not public.is_blocked_pair(auth.uid(), p.seller_id))
  ),
  counted as (select count(*) as n from filtered)
  select
    f.id, f.ref, f.slug, f.title, f.price, f.currency_code, f.is_negotiable,
    f.condition, f.status, f.category_id,
    f.city_id, ct.name, f.country_id, co.code,
    f.latitude, f.longitude, f.dist_km,
    -- A video is never the card image, but its poster frame is a perfectly
    -- good one when the seller filmed instead of photographing.
    coalesce(img.thumbnail_url, img.url, vid.poster),
    coalesce(img.url, vid.poster),
    (select count(*) from public.product_images pi
      where pi.product_id = f.id and pi.media_type <> 'video')::integer,
    f.view_count, f.favorite_count, f.is_featured, f.delivery_available, f.published_at,
    f.seller_id,
    coalesce(sp.display_name, pr.full_name, pr.username::text, 'Seller'),
    pr.avatar_url,
    (sp.verification_status = 'verified'),
    f.business_id, bp.name,
    (vid.url is not null), vid.url, vid.poster, vid.duration_seconds,
    counted.n
  from filtered f
  cross join counted
  join public.profiles pr        on pr.id = f.seller_id
  join public.seller_profiles sp on sp.user_id = f.seller_id
  left join public.cities ct     on ct.id = f.city_id
  left join public.countries co  on co.id = f.country_id
  left join public.business_profiles bp on bp.id = f.business_id
  left join lateral (
    select pi.url, pi.thumbnail_url
      from public.product_images pi
     where pi.product_id = f.id and pi.media_type <> 'video'
     order by pi.is_primary desc, pi.position asc
     limit 1
  ) img on true
  left join lateral (
    select pi.url, pi.thumbnail_url as poster, pi.duration_seconds
      from public.product_images pi
     where pi.product_id = f.id and pi.media_type = 'video'
     limit 1
  ) vid on true
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
$function$;

-- The old signature (no p_media) would otherwise stay behind as an overload and
-- make every call ambiguous to PostgREST.
drop function if exists public.search_products(
  text, integer, boolean, smallint, integer, integer, integer, uuid, uuid,
  public.product_condition[], numeric, numeric, text, public.seller_type,
  boolean, boolean, boolean, boolean, integer,
  double precision, double precision, double precision, text, integer, integer
);

grant execute on function public.search_products(
  text, integer, boolean, smallint, integer, integer, integer, uuid, uuid,
  public.product_condition[], numeric, numeric, text, public.seller_type,
  boolean, boolean, boolean, boolean, integer,
  double precision, double precision, double precision, text, integer, integer, text
) to anon, authenticated;

-- Listings with a video are a small slice of the table, and the video feed asks
-- for exactly that slice on every scroll.
create index if not exists idx_product_images_video
  on public.product_images (product_id)
  where media_type = 'video';
