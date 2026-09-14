import { z } from 'zod';

import {
  booleanFlag,
  csvOf,
  currencyCode,
  latitude,
  longitude,
  optionalText,
  phone,
  productCondition,
  refId,
  sellerType,
  sortOption,
  uuid,
} from './common.js';

/* -------------------------------------------------------------------------- */
/* Search                                                                     */
/* -------------------------------------------------------------------------- */

export const productSearchQuery = z
  .object({
    q: z.string().trim().min(1).max(120).optional(),

    categoryId: refId.optional(),
    includeSubcategories: z
      .union([z.boolean(), z.enum(['true', 'false'])])
      .transform((value) => value !== false && value !== 'false')
      .default(true),

    countryId: refId.optional(),
    regionId: refId.optional(),
    cityId: refId.optional(),
    districtId: refId.optional(),

    sellerId: uuid.optional(),
    businessId: uuid.optional(),

    conditions: csvOf(productCondition),
    minPrice: z.coerce.number().min(0).optional(),
    maxPrice: z.coerce.number().min(0).optional(),
    currency: currencyCode.optional(),

    sellerType: sellerType.optional(),
    verifiedOnly: booleanFlag,
    deliveryOnly: booleanFlag,
    negotiableOnly: booleanFlag,
    featuredOnly: booleanFlag,
    postedWithinDays: z.coerce.number().int().min(1).max(365).optional(),

    lat: latitude.optional(),
    lng: longitude.optional(),
    radiusKm: z.coerce.number().min(1).max(500).optional(),

    sort: sortOption.default('newest'),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .refine(
    (value) => value.minPrice === undefined || value.maxPrice === undefined || value.minPrice <= value.maxPrice,
    { message: 'The minimum price cannot be higher than the maximum', path: ['minPrice'] },
  )
  .refine((value) => value.sort !== 'nearest' || (value.lat !== undefined && value.lng !== undefined), {
    message: 'Sorting by nearest needs lat and lng',
    path: ['sort'],
  })
  .refine((value) => value.radiusKm === undefined || (value.lat !== undefined && value.lng !== undefined), {
    message: 'A search radius needs lat and lng',
    path: ['radiusKm'],
  });

export type ProductSearchQuery = z.infer<typeof productSearchQuery>;

/* -------------------------------------------------------------------------- */
/* Create / update                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Free-form, category-driven extras, stored in products.attributes.
 *
 * Bounded deliberately: the shape is dictated by categories.field_schema, but
 * it lands in a jsonb column that clients can write, so it needs a ceiling on
 * key count, key length and value size. Without one this is an open door to
 * stuffing megabytes into a row.
 */
const attributes = z
  .record(
    z.string().min(1).max(48),
    z.union([z.string().max(200), z.number(), z.boolean(), z.null()]),
  )
  .refine((value) => Object.keys(value).length <= 40, {
    message: 'Too many extra fields (40 maximum)',
  })
  .optional();

const baseProduct = {
  title: z.string().trim().min(3, 'Give the listing a title').max(120),
  description: optionalText(5000),

  categoryId: refId,
  subcategoryId: refId.optional(),

  price: z.coerce.number().min(0, 'Price cannot be negative').max(1_000_000_000),
  currency: currencyCode,
  negotiable: z.boolean().optional(),
  condition: productCondition,

  countryId: refId,
  regionId: refId.optional(),
  cityId: refId.optional(),
  districtId: refId.optional(),
  neighborhoodId: refId.optional(),
  latitude: latitude.optional(),
  longitude: longitude.optional(),

  phone: phone.optional(),
  whatsapp: phone.optional(),

  brand: optionalText(60),
  model: optionalText(60),
  year: z.coerce.number().int().min(1900).max(2100).optional(),
  color: optionalText(40),
  size: optionalText(40),
  quantity: z.coerce.number().int().min(0).max(1_000_000).optional(),
  deliveryAvailable: z.boolean().optional(),
  attributes,

  businessId: uuid.optional(),
};

export const createProductSchema = z.object({
  ...baseProduct,
  /** Save without submitting for review. */
  draft: z.boolean().optional().default(false),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;

/** Every field optional; at least one required. */
export const updateProductSchema = z
  .object({
    title: baseProduct.title.optional(),
    description: baseProduct.description,
    categoryId: baseProduct.categoryId.optional(),
    subcategoryId: baseProduct.subcategoryId,
    price: baseProduct.price.optional(),
    currency: baseProduct.currency.optional(),
    negotiable: baseProduct.negotiable,
    condition: baseProduct.condition.optional(),
    countryId: baseProduct.countryId.optional(),
    regionId: baseProduct.regionId,
    cityId: baseProduct.cityId,
    districtId: baseProduct.districtId,
    neighborhoodId: baseProduct.neighborhoodId,
    latitude: baseProduct.latitude,
    longitude: baseProduct.longitude,
    phone: baseProduct.phone,
    whatsapp: baseProduct.whatsapp,
    brand: baseProduct.brand,
    model: baseProduct.model,
    year: baseProduct.year,
    color: baseProduct.color,
    size: baseProduct.size,
    quantity: baseProduct.quantity,
    deliveryAvailable: baseProduct.deliveryAvailable,
    attributes: baseProduct.attributes,
  })
  .refine((value) => Object.keys(value).length > 0, { message: 'Nothing to update' });

export type UpdateProductInput = z.infer<typeof updateProductSchema>;

/**
 * Sellers may move a listing between their own lifecycle states only.
 * Approving, rejecting and suspending are moderation actions and live on the
 * admin routes; the products_guard trigger enforces that independently.
 */
export const productStatusSchema = z.object({
  status: z.enum(['draft', 'pending_approval', 'active', 'sold']),
});

/* -------------------------------------------------------------------------- */
/* Images                                                                     */
/* -------------------------------------------------------------------------- */

export const uploadUrlSchema = z.object({
  contentType: z.enum(['image/webp', 'image/jpeg', 'image/png']),
});

export const registerImageSchema = z.object({
  path: z.string().trim().min(1).max(400),
  thumbnailPath: z.string().trim().min(1).max(400).optional(),
  width: z.coerce.number().int().positive().max(20_000).optional(),
  height: z.coerce.number().int().positive().max(20_000).optional(),
  bytes: z.coerce.number().int().positive().max(10 * 1024 * 1024).optional(),
  isPrimary: z.boolean().optional(),
});

export const reorderImagesSchema = z.object({
  imageIds: z.array(uuid).min(1).max(20),
});

/* -------------------------------------------------------------------------- */
/* Misc                                                                       */
/* -------------------------------------------------------------------------- */

export const recordViewSchema = z.object({
  sessionId: z.string().trim().min(8).max(64).optional(),
  source: z.enum(['feed', 'search', 'category', 'seller', 'deeplink', 'similar', 'recommended']).optional(),
});

export const myProductsQuery = z.object({
  status: z
    .enum(['draft', 'pending_approval', 'active', 'rejected', 'sold', 'expired', 'suspended'])
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const refParam = z.object({ ref: z.coerce.number().int().positive() });
