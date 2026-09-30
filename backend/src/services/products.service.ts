import { randomUUID } from 'node:crypto';

import { anon } from '../config/supabase.js';
import type { Db } from '../config/supabase.js';
import type { Database } from '../types/database.js';
import type { AuthContext } from '../types/express.js';
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
  fromPostgrest,
} from '../utils/errors.js';
import type { PageMeta } from '../utils/response.js';
import { buildPageMeta } from '../utils/response.js';
import type { CreateProductInput, ProductSearchQuery, UpdateProductInput } from '../validators/products.schema.js';

const PRODUCT_BUCKET = 'product-images';
// Video lives in its own bucket so the photo bucket's tight 5MB cap can stay
// tight while video gets 20MB (see 0020_product_video.sql).
const VIDEO_BUCKET = 'product-videos';
const VIDEO_TYPES = new Set(['video/mp4', 'video/quicktime', 'video/webm']);
const MAX_VIDEO_BYTES = 20 * 1024 * 1024;

type ProductUpdate = Database['public']['Tables']['products']['Update'];

export interface ProductCardDto {
  id: string;
  /** True when the listing has a video; the card shows a play badge. */
  hasVideo?: boolean;
  /** Set on search results, so the video feed can play without a second call. */
  videoUrl?: string | null;
  videoPosterUrl?: string | null;
  videoDurationSeconds?: number | null;
  ref: number;
  slug: string;
  title: string;
  price: number;
  currency: string;
  negotiable: boolean;
  condition: string;
  city: string | null;
  cityId: number | null;
  countryCode: string | null;
  distanceKm: number | null;
  thumbnailUrl: string | null;
  imageUrl: string | null;
  imageCount: number;
  viewCount: number;
  favoriteCount: number;
  featured: boolean;
  deliveryAvailable: boolean;
  publishedAt: string | null;
  seller: {
    id: string;
    name: string;
    avatarUrl: string | null;
    verified: boolean;
  };
  business: { id: string; name: string | null } | null;
  /** Present only for signed-in callers. */
  isFavorited?: boolean;
}

export interface ProductDetailDto extends ProductCardDto {
  description: string | null;
  categoryId: number;
  subcategoryId: number | null;
  regionId: number | null;
  districtId: number | null;
  neighborhoodId: number | null;
  latitude: number | null;
  longitude: number | null;
  brand: string | null;
  model: string | null;
  year: number | null;
  color: string | null;
  size: string | null;
  quantity: number;
  attributes: Record<string, unknown>;
  status: string;
  expiresAt: string | null;
  soldAt: string | null;
  createdAt: string;
  images: ProductImageDto[];
  /** Null when the seller has hidden their number or a block is in place. */
  contact: { phone: string | null; whatsapp: string | null };
  shareUrl: string;
}

export interface ProductImageDto {
  id: string;
  url: string;
  /** For a video, the poster frame shown until someone taps play. */
  thumbnailUrl: string | null;
  width: number | null;
  height: number | null;
  position: number;
  isPrimary: boolean;
  mediaType: 'image' | 'video';
  durationSeconds: number | null;
}

/* -------------------------------------------------------------------------- */
/* Search                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Every browse, filter and search request funnels through the search_products
 * RPC rather than being rebuilt as a PostgREST query chain.
 *
 * The RPC already returns a denormalised card row — primary image, seller name,
 * verification badge, city name and the total count — so one network call
 * renders a full grid. Assembling the same result client-side would be four
 * joins and an extra count query per page, which is exactly the round-trip
 * cost that hurts on a 2G connection.
 */
export async function searchProducts(
  query: ProductSearchQuery,
  auth?: AuthContext,
): Promise<{ items: ProductCardDto[]; meta: PageMeta }> {
  const db = auth?.db ?? anon;
  const offset = (query.page - 1) * query.limit;

  const { data, error } = await db.rpc('search_products', {
    p_query: query.q ?? undefined,
    p_category_id: query.categoryId ?? undefined,
    p_include_subcategories: query.includeSubcategories,
    p_country_id: query.countryId ?? undefined,
    p_region_id: query.regionId ?? undefined,
    p_city_id: query.cityId ?? undefined,
    p_district_id: query.districtId ?? undefined,
    p_seller_id: query.sellerId ?? undefined,
    p_business_id: query.businessId ?? undefined,
    p_conditions: query.conditions ?? undefined,
    p_min_price: query.minPrice ?? undefined,
    p_max_price: query.maxPrice ?? undefined,
    p_currency_code: query.currency ?? undefined,
    p_seller_type: query.sellerType ?? undefined,
    p_verified_only: query.verifiedOnly ?? false,
    p_delivery_only: query.deliveryOnly ?? false,
    p_negotiable_only: query.negotiableOnly ?? false,
    p_featured_only: query.featuredOnly ?? false,
    p_posted_within_days: query.postedWithinDays ?? undefined,
    p_latitude: query.lat ?? undefined,
    p_longitude: query.lng ?? undefined,
    p_radius_km: query.radiusKm ?? undefined,
    p_sort: query.sort,
    p_limit: query.limit,
    p_offset: offset,
    p_media: query.media ?? undefined,
    // search_products is STABLE, so PostgREST accepts it over GET. That makes
    // the hottest read path in the product retryable by resilientFetch.
  }, { get: true });

  if (error) throw fromPostgrest(error, 'Products');

  const rows = data ?? [];
  // total_count is repeated on every row by the RPC; zero rows means zero total.
  const total = rows.length > 0 ? Number(rows[0]!.total_count ?? 0) : 0;
  const items = rows.map(toCard);

  await decorateFavorites(items, auth);

  return { items, meta: buildPageMeta(total, query.page, query.limit) };
}

/** Marks which of these listings the caller has already saved. */
async function decorateFavorites(items: ProductCardDto[], auth?: AuthContext): Promise<void> {
  if (!auth || items.length === 0) return;

  const { data, error } = await auth.db
    .from('favorites')
    .select('product_id')
    .eq('user_id', auth.userId)
    .in(
      'product_id',
      items.map((item) => item.id),
    );

  // A failure here must not take the whole feed down; the heart icon just
  // renders unfilled until the next request.
  if (error) return;

  const favorited = new Set((data ?? []).map((row) => row.product_id));
  for (const item of items) {
    item.isFavorited = favorited.has(item.id);
  }
}

/* -------------------------------------------------------------------------- */
/* Detail                                                                     */
/* -------------------------------------------------------------------------- */

const DETAIL_COLUMNS = `
  id, ref, slug, title, description, price, currency_code, is_negotiable, condition, status,
  category_id, subcategory_id, country_id, region_id, city_id, district_id, neighborhood_id,
  latitude, longitude, brand, model, year, color, size, quantity, delivery_available, attributes,
  view_count, favorite_count, is_featured, published_at, expires_at, sold_at, created_at,
  seller_id, business_id
` as const;

export async function getProductByRef(
  ref: number,
  options: { siteUrl: string },
  auth?: AuthContext,
): Promise<ProductDetailDto> {
  const db = auth?.db ?? anon;

  const { data, error } = await db
    .from('products')
    .select(DETAIL_COLUMNS)
    .eq('ref', ref)
    .maybeSingle();

  if (error) throw fromPostgrest(error, 'Listing');
  if (!data) throw new NotFoundError('Listing');

  return assembleDetail(db, data as ProductRow, auth, options.siteUrl);
}

export async function getProductById(
  id: string,
  options: { siteUrl: string },
  auth?: AuthContext,
): Promise<ProductDetailDto> {
  const db = auth?.db ?? anon;

  const { data, error } = await db
    .from('products')
    .select(DETAIL_COLUMNS)
    .eq('id', id)
    .maybeSingle();

  if (error) throw fromPostgrest(error, 'Listing');
  if (!data) throw new NotFoundError('Listing');

  return assembleDetail(db, data as ProductRow, auth, options.siteUrl);
}

type ProductRow = Record<string, unknown> & {
  id: string;
  ref: number;
  seller_id: string;
  business_id: string | null;
};

async function assembleDetail(
  db: Db,
  row: ProductRow,
  auth: AuthContext | undefined,
  siteUrl: string,
): Promise<ProductDetailDto> {
  const [images, seller, business, contact, favorited, city, country] = await Promise.all([
    db
      .from('product_images')
      .select('id, url, thumbnail_url, width, height, position, is_primary, media_type, duration_seconds')
      .eq('product_id', row.id)
      .order('is_primary', { ascending: false })
      .order('position'),
    db
      .from('seller_profiles')
      .select('id, display_name, verification_status, rating_avg, rating_count, active_listing_count')
      .eq('user_id', row.seller_id)
      .maybeSingle(),
    row.business_id
      ? db.from('business_profiles').select('id, name, slug').eq('id', row.business_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    // Contact goes through the RPC so the seller's show_phone / show_whatsapp
    // switches and any block between the two parties are honoured. The columns
    // are not readable directly, by design.
    db.rpc('get_seller_contact', { p_seller_id: row.seller_id }, { get: true }),
    auth
      ? db
          .from('favorites')
          .select('product_id')
          .eq('user_id', auth.userId)
          .eq('product_id', row.id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    // The search RPC denormalises the city name onto every card, but a direct
    // row read does not, so it is resolved here. Without this the product page
    // renders a dash where the location should be.
    row.city_id
      ? db.from('cities').select('name').eq('id', row.city_id as number).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    row.country_id
      ? db.from('countries').select('code').eq('id', row.country_id as number).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  const profile = await db
    .from('profiles')
    .select('full_name, username, avatar_url')
    .eq('id', row.seller_id)
    .maybeSingle();

  const contactRow = Array.isArray(contact.data) ? contact.data[0] : contact.data;

  return {
    id: row.id,
    ref: row.ref,
    slug: String(row.slug ?? ''),
    title: String(row.title ?? ''),
    description: (row.description as string | null) ?? null,
    price: Number(row.price ?? 0),
    currency: String(row.currency_code ?? 'USD'),
    negotiable: Boolean(row.is_negotiable),
    condition: String(row.condition ?? 'used'),
    status: String(row.status ?? 'active'),
    categoryId: Number(row.category_id),
    subcategoryId: (row.subcategory_id as number | null) ?? null,
    cityId: (row.city_id as number | null) ?? null,
    city: city.data?.name ?? null,
    countryCode: country.data?.code ?? null,
    regionId: (row.region_id as number | null) ?? null,
    districtId: (row.district_id as number | null) ?? null,
    neighborhoodId: (row.neighborhood_id as number | null) ?? null,
    latitude: (row.latitude as number | null) ?? null,
    longitude: (row.longitude as number | null) ?? null,
    distanceKm: null,
    brand: (row.brand as string | null) ?? null,
    model: (row.model as string | null) ?? null,
    year: (row.year as number | null) ?? null,
    color: (row.color as string | null) ?? null,
    size: (row.size as string | null) ?? null,
    quantity: Number(row.quantity ?? 1),
    deliveryAvailable: Boolean(row.delivery_available),
    attributes: (row.attributes as Record<string, unknown>) ?? {},
    viewCount: Number(row.view_count ?? 0),
    favoriteCount: Number(row.favorite_count ?? 0),
    featured: Boolean(row.is_featured),
    publishedAt: (row.published_at as string | null) ?? null,
    expiresAt: (row.expires_at as string | null) ?? null,
    soldAt: (row.sold_at as string | null) ?? null,
    createdAt: String(row.created_at ?? ''),
    // Counts and the card image are photos only: a listing with one photo and
    // one video is still "1 photo", and a card never points at a video file.
    imageCount: (images.data ?? []).filter((image) => image.media_type !== 'video').length,
    // With no photos at all, the video's poster frame is the listing's face.
    imageUrl:
      (images.data ?? []).find((image) => image.media_type !== 'video')?.url ??
      (images.data ?? []).find((image) => image.media_type === 'video')?.thumbnail_url ??
      null,
    thumbnailUrl:
      (images.data ?? []).find((image) => image.media_type !== 'video')?.thumbnail_url ??
      (images.data ?? []).find((image) => image.media_type === 'video')?.thumbnail_url ??
      null,
    hasVideo: (images.data ?? []).some((image) => image.media_type === 'video'),
    images: (images.data ?? []).map((image) => ({
      id: image.id,
      url: image.url,
      thumbnailUrl: image.thumbnail_url,
      width: image.width,
      height: image.height,
      position: image.position,
      isPrimary: image.is_primary,
      mediaType: image.media_type === 'video' ? ('video' as const) : ('image' as const),
      durationSeconds: image.duration_seconds,
    })),
    seller: {
      id: row.seller_id,
      name:
        seller.data?.display_name ??
        profile.data?.full_name ??
        profile.data?.username ??
        'Seller',
      avatarUrl: profile.data?.avatar_url ?? null,
      verified: seller.data?.verification_status === 'verified',
    },
    business: business.data ? { id: business.data.id, name: business.data.name } : null,
    contact: {
      phone: contactRow?.phone ?? null,
      whatsapp: contactRow?.whatsapp ?? null,
    },
    isFavorited: auth ? Boolean(favorited.data) : undefined,
    shareUrl: `${siteUrl.replace(/\/$/, '')}/product/${row.ref}`,
  };
}

/* -------------------------------------------------------------------------- */
/* Write operations                                                           */
/* -------------------------------------------------------------------------- */

/**
 * A seller_profile is created the first time someone lists something, rather
 * than at sign-up. Most accounts are buyers and never need one, and the row
 * carries the rating and counter columns that only make sense once there is
 * something to sell.
 */
export async function ensureSellerProfile(auth: AuthContext): Promise<string> {
  const existing = await auth.db
    .from('seller_profiles')
    .select('id')
    .eq('user_id', auth.userId)
    .maybeSingle();

  if (existing.error) throw fromPostgrest(existing.error, 'Seller profile');
  if (existing.data) return existing.data.id;

  const created = await auth.db
    .from('seller_profiles')
    .insert({ user_id: auth.userId })
    .select('id')
    .single();

  if (created.error) {
    // Two concurrent first listings race here; the unique index on user_id
    // decides, and the loser just reads the winner's row.
    if (created.error.code === '23505') {
      const retry = await auth.db
        .from('seller_profiles')
        .select('id')
        .eq('user_id', auth.userId)
        .single();
      if (retry.error) throw fromPostgrest(retry.error, 'Seller profile');
      return retry.data.id;
    }
    throw fromPostgrest(created.error, 'Seller profile');
  }

  return created.data.id;
}

export async function createProduct(
  auth: AuthContext,
  input: CreateProductInput,
): Promise<{ id: string; ref: number; slug: string | null; status: string }> {
  await ensureSellerProfile(auth);

  if (input.businessId) {
    await assertBusinessMember(auth, input.businessId);
  }

  const { data, error } = await auth.db
    .from('products')
    .insert({
      seller_id: auth.userId,
      business_id: input.businessId ?? null,
      category_id: input.categoryId,
      subcategory_id: input.subcategoryId ?? null,
      title: input.title,
      description: input.description ?? null,
      price: input.price,
      currency_code: input.currency,
      is_negotiable: input.negotiable ?? false,
      condition: input.condition,
      // The products_guard trigger decides the real starting status: a draft
      // stays a draft, everything else enters the moderation queue.
      status: input.draft ? 'draft' : 'pending_approval',
      country_id: input.countryId,
      region_id: input.regionId ?? null,
      city_id: input.cityId ?? null,
      district_id: input.districtId ?? null,
      neighborhood_id: input.neighborhoodId ?? null,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      phone: input.phone ?? null,
      whatsapp: input.whatsapp ?? null,
      brand: input.brand ?? null,
      model: input.model ?? null,
      year: input.year ?? null,
      color: input.color ?? null,
      size: input.size ?? null,
      quantity: input.quantity ?? 1,
      delivery_available: input.deliveryAvailable ?? false,
      attributes: input.attributes ?? {},
    })
    .select('id, ref, slug, status')
    .single();

  if (error) throw fromPostgrest(error, 'Listing');
  return data;
}

export async function updateProduct(
  auth: AuthContext,
  id: string,
  input: UpdateProductInput,
): Promise<{ id: string; ref: number; slug: string | null; status: string }> {
  const patch: ProductUpdate = {};

  // Only columns the seller is actually allowed to write are ever sent. The
  // database enforces this too (0014 revokes UPDATE on everything else), but
  // building the patch explicitly keeps the failure at "field ignored" rather
  // than a 403 for the whole request.
  if (input.title !== undefined) patch.title = input.title;
  if (input.description !== undefined) patch.description = input.description;
  if (input.price !== undefined) patch.price = input.price;
  if (input.currency !== undefined) patch.currency_code = input.currency;
  if (input.negotiable !== undefined) patch.is_negotiable = input.negotiable;
  if (input.condition !== undefined) patch.condition = input.condition;
  if (input.categoryId !== undefined) patch.category_id = input.categoryId;
  if (input.subcategoryId !== undefined) patch.subcategory_id = input.subcategoryId;
  if (input.countryId !== undefined) patch.country_id = input.countryId;
  if (input.regionId !== undefined) patch.region_id = input.regionId;
  if (input.cityId !== undefined) patch.city_id = input.cityId;
  if (input.districtId !== undefined) patch.district_id = input.districtId;
  if (input.neighborhoodId !== undefined) patch.neighborhood_id = input.neighborhoodId;
  if (input.latitude !== undefined) patch.latitude = input.latitude;
  if (input.longitude !== undefined) patch.longitude = input.longitude;
  if (input.phone !== undefined) patch.phone = input.phone;
  if (input.whatsapp !== undefined) patch.whatsapp = input.whatsapp;
  if (input.brand !== undefined) patch.brand = input.brand;
  if (input.model !== undefined) patch.model = input.model;
  if (input.year !== undefined) patch.year = input.year;
  if (input.color !== undefined) patch.color = input.color;
  if (input.size !== undefined) patch.size = input.size;
  if (input.quantity !== undefined) patch.quantity = input.quantity;
  if (input.deliveryAvailable !== undefined) patch.delivery_available = input.deliveryAvailable;
  if (input.attributes !== undefined) patch.attributes = input.attributes;

  if (Object.keys(patch).length === 0) {
    throw new BadRequestError('Nothing to update');
  }

  const { data, error } = await auth.db
    .from('products')
    .update(patch)
    .eq('id', id)
    .select('id, ref, slug, status')
    .maybeSingle();

  if (error) throw fromPostgrest(error, 'Listing');
  // RLS filtered the row out: either it does not exist or it is not theirs.
  // Both answer the same way, so ownership is not probeable.
  if (!data) throw new NotFoundError('Listing');
  return data;
}

/** Publish, unpublish, or mark sold. The guard trigger has the final say. */
export async function setProductStatus(
  auth: AuthContext,
  id: string,
  status: 'draft' | 'pending_approval' | 'active' | 'sold',
): Promise<{ id: string; status: string }> {
  const { data, error } = await auth.db
    .from('products')
    .update({ status })
    .eq('id', id)
    .select('id, status')
    .maybeSingle();

  if (error) throw fromPostgrest(error, 'Listing');
  if (!data) throw new NotFoundError('Listing');
  return data;
}

/**
 * Soft delete. The row stays so existing conversations, favourites and shared
 * links do not break; it simply leaves every public query.
 */
export async function deleteProduct(auth: AuthContext, id: string): Promise<void> {
  const { data, error } = await auth.db
    .from('products')
    .update({ status: 'deleted' })
    .eq('id', id)
    .select('id')
    .maybeSingle();

  if (error) throw fromPostgrest(error, 'Listing');
  if (!data) throw new NotFoundError('Listing');
}

export async function listMyProducts(
  auth: AuthContext,
  options: { status?: string; page: number; limit: number },
): Promise<{ items: unknown[]; meta: PageMeta }> {
  const from = (options.page - 1) * options.limit;

  let builder = auth.db
    .from('products')
    .select(
      `id, ref, slug, title, description, price, currency_code, status, condition,
       view_count, favorite_count, message_count, is_featured, published_at, expires_at,
       created_at, city_id, category_id, is_negotiable, quantity, delivery_available,
       rejection_reason`,
      { count: 'exact' },
    )
    .eq('seller_id', auth.userId)
    .neq('status', 'deleted')
    .order('created_at', { ascending: false })
    .range(from, from + options.limit - 1);

  if (options.status) builder = builder.eq('status', options.status as never);

  const { data, error, count } = await builder;
  if (error) throw fromPostgrest(error, 'Listings');

  const rows = data ?? [];

  // A seller scanning their own listings needs to recognise each one at a
  // glance, so the thumbnail comes along -- one batched query for the page,
  // never one per row.
  const media = rows.length
    ? await auth.db
        .from('product_images')
        .select('product_id, url, thumbnail_url, is_primary, position, media_type')
        .in(
          'product_id',
          rows.map((row) => row.id),
        )
        .order('is_primary', { ascending: false })
        .order('position')
    : { data: [], error: null };

  const photoByProduct = new Map<string, string>();
  const photoCount = new Map<string, number>();
  const posterByProduct = new Map<string, string | null>();
  for (const image of media.data ?? []) {
    if (image.media_type === 'video') {
      posterByProduct.set(image.product_id, image.thumbnail_url);
      continue;
    }
    photoCount.set(image.product_id, (photoCount.get(image.product_id) ?? 0) + 1);
    if (!photoByProduct.has(image.product_id)) {
      photoByProduct.set(image.product_id, image.thumbnail_url ?? image.url);
    }
  }

  const items = rows.map((row) => ({
    id: row.id,
    ref: row.ref,
    slug: row.slug,
    title: row.title,
    description: row.description,
    price: Number(row.price),
    currency: row.currency_code,
    status: row.status,
    condition: row.condition,
    categoryId: row.category_id,
    cityId: row.city_id,
    negotiable: row.is_negotiable,
    quantity: row.quantity,
    deliveryAvailable: row.delivery_available,
    viewCount: row.view_count,
    favoriteCount: row.favorite_count,
    messageCount: row.message_count,
    featured: row.is_featured,
    publishedAt: row.published_at,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    // Without this a rejected listing is a dead end: the seller is told no and
    // never told why.
    rejectionReason: row.rejection_reason,
    thumbnailUrl: photoByProduct.get(row.id) ?? posterByProduct.get(row.id) ?? null,
    imageCount: photoCount.get(row.id) ?? 0,
    hasVideo: posterByProduct.has(row.id),
  }));

  return {
    items,
    meta: buildPageMeta(count ?? 0, options.page, options.limit),
  };
}

/* -------------------------------------------------------------------------- */
/* Images                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Images are uploaded straight from the client to Supabase Storage using a
 * short-lived signed URL, then registered here.
 *
 * Routing the bytes through this API would mean uploading each photo twice —
 * once phone-to-server, once server-to-storage — and the phone is the slow
 * half of that journey. Clients already downscale and convert to WebP before
 * upload (targets live in app_settings.media), so the server has nothing to
 * add but latency.
 *
 * The storage policy keys on the first path segment being the uploader's own
 * user id, so a signed URL cannot be used to write into someone else's folder.
 */
export interface UploadSlot {
  uploadUrl: string;
  token: string;
  path: string;
}

export async function createImageUploadUrl(
  auth: AuthContext,
  productId: string,
  contentType: string,
): Promise<{ full: UploadSlot; thumbnail: UploadSlot }> {
  await assertOwnsProduct(auth, productId);

  const extension = extensionFor(contentType);
  const isVideo = VIDEO_TYPES.has(contentType);
  const base = `${auth.userId}/${productId}/${randomUUID()}`;
  // A video still gets a poster image: browsing costs a small WebP, and the
  // video itself is only fetched when a buyer taps play.
  const posterPath = isVideo ? `${base}-poster.webp` : `${base}-thumb.${extension}`;

  // Both slots are issued together. Each photo needs two objects uploaded (the
  // resized original and its thumbnail), and asking for them separately would
  // be four round trips per photo. On a connection with 300ms of latency, a
  // five-photo listing would spend six seconds just negotiating URLs.
  const [full, thumbnail] = await Promise.all([
    auth.db.storage
      .from(isVideo ? VIDEO_BUCKET : PRODUCT_BUCKET)
      .createSignedUploadUrl(`${base}.${extension}`),
    auth.db.storage.from(PRODUCT_BUCKET).createSignedUploadUrl(posterPath),
  ]);

  if (full.error || thumbnail.error) {
    throw new BadRequestError(
      `Could not prepare the upload: ${(full.error ?? thumbnail.error)!.message}`,
    );
  }

  return {
    full: { uploadUrl: full.data.signedUrl, token: full.data.token, path: full.data.path },
    thumbnail: {
      uploadUrl: thumbnail.data.signedUrl,
      token: thumbnail.data.token,
      path: thumbnail.data.path,
    },
  };
}

export async function registerImage(
  auth: AuthContext,
  productId: string,
  input: {
    path: string;
    thumbnailPath?: string;
    width?: number;
    height?: number;
    bytes?: number;
    isPrimary?: boolean;
    mediaType?: 'image' | 'video';
    durationSeconds?: number;
  },
): Promise<ProductImageDto> {
  const isVideo = input.mediaType === 'video';
  if (isVideo && input.bytes && input.bytes > MAX_VIDEO_BYTES) {
    throw new BadRequestError('A video must be 20MB or smaller.');
  }
  await assertOwnsProduct(auth, productId);

  // The path must sit inside this user's folder for this listing. Storage RLS
  // enforces the same rule on write; this stops a mismatched row being created
  // that points at someone else's object.
  const expectedPrefix = `${auth.userId}/${productId}/`;
  if (!input.path.startsWith(expectedPrefix)) {
    throw new ForbiddenError('That file does not belong to this listing');
  }

  const existing = await auth.db
    .from('product_images')
    .select('id, position')
    .eq('product_id', productId)
    .order('position', { ascending: false })
    .limit(1);

  if (existing.error) throw fromPostgrest(existing.error, 'Images');

  const nextPosition = (existing.data?.[0]?.position ?? -1) + 1;
  // The card thumbnail is always a photo, so a video is never primary.
  const isPrimary = isVideo ? false : (input.isPrimary ?? nextPosition === 0);

  if (isPrimary) {
    // Only one primary per product (enforced by a partial unique index).
    await auth.db.from('product_images').update({ is_primary: false }).eq('product_id', productId);
  }

  const publicUrl = auth.db.storage
    .from(isVideo ? VIDEO_BUCKET : PRODUCT_BUCKET)
    .getPublicUrl(input.path).data.publicUrl;
  const thumbnailUrl = input.thumbnailPath
    ? auth.db.storage.from(PRODUCT_BUCKET).getPublicUrl(input.thumbnailPath).data.publicUrl
    : null;

  const { data, error } = await auth.db
    .from('product_images')
    .insert({
      product_id: productId,
      storage_path: input.path,
      url: publicUrl,
      thumbnail_url: thumbnailUrl,
      width: input.width ?? null,
      height: input.height ?? null,
      bytes: input.bytes ?? null,
      position: nextPosition,
      is_primary: isPrimary,
      media_type: isVideo ? 'video' : 'image',
      duration_seconds: isVideo ? (input.durationSeconds ?? null) : null,
    })
    .select('id, url, thumbnail_url, width, height, position, is_primary, media_type, duration_seconds')
    .single();

  if (error) {
    // The partial unique index in 0020 is what stops a second video.
    if (error.code === '23505') {
      throw new BadRequestError('A listing can have one video. Remove the existing one first.');
    }
    throw fromPostgrest(error, 'Image');
  }

  return {
    id: data.id,
    url: data.url,
    thumbnailUrl: data.thumbnail_url,
    width: data.width,
    height: data.height,
    position: data.position,
    isPrimary: data.is_primary,
    mediaType: data.media_type === 'video' ? 'video' : 'image',
    durationSeconds: data.duration_seconds,
  };
}

export async function deleteImage(
  auth: AuthContext,
  productId: string,
  imageId: string,
): Promise<void> {
  await assertOwnsProduct(auth, productId);

  const { data, error } = await auth.db
    .from('product_images')
    .select('id, storage_path, is_primary, media_type')
    .eq('id', imageId)
    .eq('product_id', productId)
    .maybeSingle();

  if (error) throw fromPostgrest(error, 'Image');
  if (!data) throw new NotFoundError('Image');

  const removed = await auth.db.from('product_images').delete().eq('id', imageId);
  if (removed.error) throw fromPostgrest(removed.error, 'Image');

  // Best effort: a leftover object costs storage, a failed request costs a user.
  await auth.db.storage
    .from(data.media_type === 'video' ? VIDEO_BUCKET : PRODUCT_BUCKET)
    .remove([data.storage_path]);

  if (data.is_primary) {
    // The replacement has to be a photo: a video may not be primary.
    const next = await auth.db
      .from('product_images')
      .select('id')
      .eq('product_id', productId)
      .neq('media_type', 'video')
      .order('position')
      .limit(1)
      .maybeSingle();
    if (next.data) {
      await auth.db.from('product_images').update({ is_primary: true }).eq('id', next.data.id);
    }
  }
}

export async function reorderImages(
  auth: AuthContext,
  productId: string,
  orderedIds: string[],
): Promise<void> {
  await assertOwnsProduct(auth, productId);

  const { data, error } = await auth.db
    .from('product_images')
    .select('id')
    .eq('product_id', productId);

  if (error) throw fromPostgrest(error, 'Images');

  const owned = new Set((data ?? []).map((row) => row.id));
  if (orderedIds.length !== owned.size || orderedIds.some((id) => !owned.has(id))) {
    throw new BadRequestError('The image list must contain every image for this listing exactly once');
  }

  // position carries a unique constraint per product, so shifting the whole
  // set in place would collide part-way through. Park them above the range
  // first, then write the final values.
  for (const [index, id] of orderedIds.entries()) {
    await auth.db
      .from('product_images')
      .update({ position: 1000 + index, is_primary: false })
      .eq('id', id);
  }
  for (const [index, id] of orderedIds.entries()) {
    await auth.db
      .from('product_images')
      .update({ position: index, is_primary: index === 0 })
      .eq('id', id);
  }
}

/* -------------------------------------------------------------------------- */
/* Engagement                                                                 */
/* -------------------------------------------------------------------------- */

/** Fire-and-forget: a failed view count must never break a product page. */
export async function recordView(
  productId: string,
  auth?: AuthContext,
  sessionId?: string,
  source?: string,
): Promise<void> {
  const db = auth?.db ?? anon;
  await db.rpc('record_product_view', {
    p_product_id: productId,
    p_session_id: sessionId ?? undefined,
    p_source: source ?? undefined,
  });
}

export async function similarProducts(productId: string, limit: number): Promise<ProductCardDto[]> {
  const { data, error } = await anon.rpc(
    'similar_products',
    { p_product_id: productId, p_limit: limit },
    { get: true },
  );
  if (error) throw fromPostgrest(error, 'Products');
  return hydrateCards(anon, (data ?? []) as Array<Record<string, unknown>>);
}

export async function recommendedProducts(
  auth: AuthContext,
  limit: number,
  offset: number,
): Promise<ProductCardDto[]> {
  const { data, error } = await auth.db.rpc(
    'recommended_products',
    { p_user_id: auth.userId, p_limit: limit, p_offset: offset },
    { get: true },
  );
  if (error) throw fromPostgrest(error, 'Products');
  return hydrateCards(auth.db, (data ?? []) as Array<Record<string, unknown>>);
}

/**
 * similar_products and recommended_products return whole product rows rather
 * than the denormalised card shape search_products produces, so they arrive
 * with no image and no seller name.
 *
 * Two batched lookups fill that in for the entire page. Doing it per row would
 * be N+1; leaving it out would render a strip of grey placeholders, which on a
 * marketplace reads as broken rather than as loading.
 */
async function hydrateCards(db: Db, rows: Array<Record<string, unknown>>): Promise<ProductCardDto[]> {
  const cards = rows.map(toMinimalCard);
  if (cards.length === 0) return cards;

  const productIds = cards.map((card) => card.id);
  const sellerIds = [...new Set(cards.map((card) => card.seller.id))];
  const cityIds = [...new Set(cards.map((card) => card.cityId).filter((id): id is number => id != null))];

  const [images, profiles, sellers, cities] = await Promise.all([
    db
      .from('product_images')
      .select('product_id, url, thumbnail_url, is_primary, position, media_type')
      .in('product_id', productIds)
      .order('is_primary', { ascending: false })
      .order('position'),
    db.from('profiles').select('id, full_name, username, avatar_url').in('id', sellerIds),
    db.from('seller_profiles').select('user_id, display_name, verification_status').in('user_id', sellerIds),
    cityIds.length > 0
      ? db.from('cities').select('id, name').in('id', cityIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const imageByProduct = new Map<string, { url: string; thumbnail_url: string | null }>();
  const countByProduct = new Map<string, number>();
  const withVideo = new Set<string>();
  const posterByProduct = new Map<string, string | null>();
  const videoUrlByProduct = new Map<string, string>();
  for (const image of images.data ?? []) {
    // A video never becomes the card image, and does not count as a photo --
    // but its poster frame stands in for a listing that has no photos.
    if (image.media_type === 'video') {
      withVideo.add(image.product_id);
      posterByProduct.set(image.product_id, image.thumbnail_url);
      videoUrlByProduct.set(image.product_id, image.url);
      continue;
    }
    countByProduct.set(image.product_id, (countByProduct.get(image.product_id) ?? 0) + 1);
    if (!imageByProduct.has(image.product_id)) {
      imageByProduct.set(image.product_id, { url: image.url, thumbnail_url: image.thumbnail_url });
    }
  }

  const profileById = new Map((profiles.data ?? []).map((row) => [row.id, row]));
  const sellerByUser = new Map((sellers.data ?? []).map((row) => [row.user_id, row]));
  const cityById = new Map((cities.data ?? []).map((row) => [row.id, row.name]));

  for (const card of cards) {
    const image = imageByProduct.get(card.id);
    const poster = posterByProduct.get(card.id) ?? null;
    card.videoPosterUrl = poster;
    card.videoUrl = videoUrlByProduct.get(card.id) ?? null;
    card.imageUrl = image?.url ?? poster;
    card.thumbnailUrl = image?.thumbnail_url ?? poster;
    card.imageCount = countByProduct.get(card.id) ?? 0;
    card.hasVideo = withVideo.has(card.id);

    const profile = profileById.get(card.seller.id);
    const seller = sellerByUser.get(card.seller.id);
    card.seller = {
      id: card.seller.id,
      name: seller?.display_name ?? profile?.full_name ?? profile?.username ?? 'Seller',
      avatarUrl: profile?.avatar_url ?? null,
      verified: seller?.verification_status === 'verified',
    };

    if (card.cityId != null) card.city = cityById.get(card.cityId) ?? null;
  }

  return cards;
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

async function assertOwnsProduct(auth: AuthContext, productId: string): Promise<void> {
  const { data, error } = await auth.db
    .from('products')
    .select('id, seller_id, business_id')
    .eq('id', productId)
    .maybeSingle();

  if (error) throw fromPostgrest(error, 'Listing');
  if (!data) throw new NotFoundError('Listing');

  if (data.seller_id === auth.userId) return;
  if (data.business_id) {
    await assertBusinessMember(auth, data.business_id);
    return;
  }
  throw new ForbiddenError('That listing is not yours');
}

async function assertBusinessMember(auth: AuthContext, businessId: string): Promise<void> {
  const { data, error } = await auth.db.rpc('is_business_member', { b_id: businessId });
  if (error) throw fromPostgrest(error, 'Business');
  if (!data) throw new ForbiddenError('You are not a member of that business');
}

function extensionFor(contentType: string): string {
  switch (contentType) {
    case 'image/webp':
      return 'webp';
    case 'image/png':
      return 'png';
    case 'image/jpeg':
      return 'jpg';
    case 'video/mp4':
      return 'mp4';
    case 'video/quicktime':
      return 'mov';
    case 'video/webm':
      return 'webm';
    default:
      throw new BadRequestError('Photos must be WebP, JPEG or PNG, and video MP4, MOV or WebM');
  }
}

type SearchRow = {
  id: string;
  ref: number;
  slug: string;
  title: string;
  price: number;
  currency_code: string;
  is_negotiable: boolean;
  condition: string;
  city_id: number | null;
  city_name: string | null;
  country_code: string | null;
  distance_km: number | null;
  thumbnail_url: string | null;
  image_url: string | null;
  image_count: number;
  has_video: boolean | null;
  video_url: string | null;
  video_poster_url: string | null;
  video_duration_seconds: number | null;
  view_count: number;
  favorite_count: number;
  is_featured: boolean;
  delivery_available: boolean;
  published_at: string | null;
  seller_id: string;
  seller_name: string;
  seller_avatar: string | null;
  seller_verified: boolean;
  business_id: string | null;
  business_name: string | null;
};

function toCard(row: SearchRow): ProductCardDto {
  return {
    id: row.id,
    ref: Number(row.ref),
    slug: row.slug ?? '',
    title: row.title,
    price: Number(row.price),
    currency: row.currency_code,
    negotiable: row.is_negotiable,
    condition: row.condition,
    city: row.city_name,
    cityId: row.city_id,
    countryCode: row.country_code,
    distanceKm: row.distance_km == null ? null : Math.round(row.distance_km * 10) / 10,
    thumbnailUrl: row.thumbnail_url,
    imageUrl: row.image_url,
    imageCount: Number(row.image_count ?? 0),
    hasVideo: row.has_video ?? false,
    videoUrl: row.video_url,
    videoPosterUrl: row.video_poster_url,
    videoDurationSeconds: row.video_duration_seconds,
    viewCount: Number(row.view_count ?? 0),
    favoriteCount: Number(row.favorite_count ?? 0),
    featured: row.is_featured,
    deliveryAvailable: row.delivery_available,
    publishedAt: row.published_at,
    seller: {
      id: row.seller_id,
      name: row.seller_name,
      avatarUrl: row.seller_avatar,
      verified: row.seller_verified,
    },
    business: row.business_id ? { id: row.business_id, name: row.business_name } : null,
  };
}

/** Raw product row -> card skeleton. hydrateCards fills in image and seller. */
function toMinimalCard(row: Record<string, unknown>): ProductCardDto {
  return {
    id: String(row.id),
    ref: Number(row.ref),
    slug: String(row.slug ?? ''),
    title: String(row.title ?? ''),
    price: Number(row.price ?? 0),
    currency: String(row.currency_code ?? 'USD'),
    negotiable: Boolean(row.is_negotiable),
    condition: String(row.condition ?? 'used'),
    city: null,
    cityId: (row.city_id as number | null) ?? null,
    countryCode: null,
    distanceKm: null,
    thumbnailUrl: null,
    imageUrl: null,
    imageCount: 0,
    viewCount: Number(row.view_count ?? 0),
    favoriteCount: Number(row.favorite_count ?? 0),
    featured: Boolean(row.is_featured),
    deliveryAvailable: Boolean(row.delivery_available),
    publishedAt: (row.published_at as string | null) ?? null,
    seller: {
      id: String(row.seller_id),
      name: 'Seller',
      avatarUrl: null,
      verified: false,
    },
    business: null,
  };
}
