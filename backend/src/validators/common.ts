import { z } from 'zod';

/** Language codes are rows in public.languages; this is the launch set. */
export const languageCode = z.enum(['en', 'so', 'am', 'sw']);
export type LanguageCode = z.infer<typeof languageCode>;

export const DEFAULT_LANGUAGE: LanguageCode = 'en';

export const currencyCode = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{3,5}$/, 'Must be a currency code such as USD or SLSH');

export const uuid = z.string().uuid('Must be a valid id');

export const refId = z.coerce.number().int().positive();

/** E.164, the only phone format the database accepts. */
export const phone = z
  .string()
  .trim()
  .regex(/^\+[1-9]\d{6,14}$/, 'Use the full international format, for example +252634000000');

export const productCondition = z.enum(['new', 'like_new', 'used', 'refurbished']);

export const productStatus = z.enum([
  'draft',
  'pending_approval',
  'active',
  'rejected',
  'sold',
  'expired',
  'suspended',
  'deleted',
]);

export const sellerType = z.enum(['individual', 'business']);

export const sortOption = z.enum([
  'newest',
  'oldest',
  'price_asc',
  'price_desc',
  'popular',
  'nearest',
  'relevance',
]);

export const latitude = z.coerce.number().min(-90).max(90);
export const longitude = z.coerce.number().min(-180).max(180);

/**
 * Page size is capped at 100 to match search_products(), which clamps
 * server-side regardless of what a client asks for.
 */
export const pagination = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type Pagination = z.infer<typeof pagination>;

export function offsetOf({ page, limit }: Pagination): number {
  return (page - 1) * limit;
}

/** Accepts `?lang=so`, falling back to English rather than erroring. */
export const languageQuery = z.object({
  lang: languageCode.default(DEFAULT_LANGUAGE),
});

export const idParam = z.object({ id: uuid });
export const numericIdParam = z.object({ id: refId });

/** Trims, and turns "" into undefined so optional text fields behave. */
export function optionalText(max: number) {
  return z
    .string()
    .trim()
    .max(max, `Must be ${max} characters or fewer`)
    .transform((value) => (value.length === 0 ? undefined : value))
    .optional();
}

/** Comma-separated query lists, e.g. ?conditions=new,used */
export function csvOf<T extends z.ZodTypeAny>(item: T) {
  return z
    .string()
    .transform((value) =>
      value
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean),
    )
    .pipe(z.array(item))
    .optional();
}

export const booleanFlag = z
  .union([z.boolean(), z.enum(['true', 'false', '1', '0'])])
  .transform((value) => value === true || value === 'true' || value === '1')
  .optional();
