import { supabase } from './supabase.js';

/* -------------------------------------------------------------------------- */
/* Envelope                                                                   */
/* -------------------------------------------------------------------------- */

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

interface SuccessBody<T> {
  success: true;
  data: T;
  message: string;
  meta?: PageMeta;
}

interface ErrorBody {
  success: false;
  message: string;
  code: string;
  errors?: Record<string, string[]>;
  requestId?: string;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fieldErrors?: Record<string, string[]>;
  readonly requestId?: string;

  constructor(status: number, body: ErrorBody) {
    super(body.message);
    this.name = 'ApiError';
    this.status = status;
    this.code = body.code;
    this.fieldErrors = body.errors;
    this.requestId = body.requestId;
  }

  /** True when retrying might actually help. */
  get isTransient(): boolean {
    return this.status === 0 || this.status === 429 || this.status >= 500;
  }
}

/* -------------------------------------------------------------------------- */
/* Client                                                                     */
/* -------------------------------------------------------------------------- */

const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '/api/v1';

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  /** Send the caller's access token. Defaults to true when a session exists. */
  auth?: boolean;
  signal?: AbortSignal;
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = `${BASE_URL}${path}`;
  if (!query) return url;

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue;
    params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<{
  data: T;
  meta?: PageMeta;
  message: string;
}> {
  const { method = 'GET', body, query, auth = true, signal } = options;

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  if (auth) {
    // getSession reads from storage and only hits the network when the token
    // is close to expiry, so this is cheap on the common path.
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if ((error as Error).name === 'AbortError') throw error;
    // A dropped connection is the normal case here, not the exception.
    // Status 0 marks it as transient so callers can retry rather than
    // showing a hard failure.
    throw new ApiError(0, {
      success: false,
      message: 'offline',
      code: 'network_error',
    });
  }

  // 204 and other empty bodies would blow up .json().
  const text = await response.text();
  const payload = text ? (JSON.parse(text) as SuccessBody<T> | ErrorBody) : null;

  if (!response.ok || !payload || payload.success === false) {
    throw new ApiError(
      response.status,
      (payload as ErrorBody | null) ?? {
        success: false,
        message: 'Something went wrong',
        code: 'unknown',
      },
    );
  }

  return { data: payload.data, meta: payload.meta, message: payload.message };
}

/** Convenience wrapper for the common case of wanting only the payload. */
export async function api<T>(path: string, options?: RequestOptions): Promise<T> {
  return (await apiRequest<T>(path, options)).data;
}

/* -------------------------------------------------------------------------- */
/* Resource types — mirror the backend DTOs                                   */
/* -------------------------------------------------------------------------- */

export interface Country {
  id: number;
  code: string;
  name: string;
  dialCode: string;
  flag: string | null;
  defaultCurrency: string | null;
  defaultLanguage: string | null;
  phoneLength: number | null;
}

export interface Place {
  id: number;
  name: string;
  latitude?: number | null;
  longitude?: number | null;
  isMajor?: boolean;
}

export interface CategoryField {
  key: string;
  type: 'text' | 'number' | 'boolean' | 'enum' | 'date';
  options?: string[];
}

export interface Category {
  id: number;
  slug: string;
  name: string;
  icon: string | null;
  imageUrl: string | null;
  accentColor: string | null;
  parentId: number | null;
  fieldSchema: { core: string[]; extra: CategoryField[] };
}

export interface CategoryTree extends Category {
  children: Category[];
}

export interface ProductCard {
  id: string;
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
  seller: { id: string; name: string; avatarUrl: string | null; verified: boolean };
  business: { id: string; name: string | null } | null;
  isFavorited?: boolean;
}

export interface ProductImage {
  id: string;
  url: string;
  thumbnailUrl: string | null;
  width: number | null;
  height: number | null;
  position: number;
  isPrimary: boolean;
}

export interface ProductDetail extends ProductCard {
  description: string | null;
  categoryId: number;
  subcategoryId: number | null;
  regionId: number | null;
  districtId: number | null;
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
  createdAt: string;
  images: ProductImage[];
  contact: { phone: string | null; whatsapp: string | null };
  shareUrl: string;
}

export interface AppConfig {
  settings: Record<string, Record<string, unknown>>;
  languages: Array<{ code: string; name: string; nativeName: string; rtl: boolean }>;
  currencies: Array<{ code: string; name: string; symbol: string; decimals: number }>;
  deeplinkHost: string;
  siteUrl: string;
}

export interface Me {
  id: string;
  username: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  role: string;
  language: string;
  currency: string;
  theme: string;
  countryId: number | null;
  cityId: number | null;
  interests: number[];
  onboarded: boolean;
  contact: {
    phone: string | null;
    phoneVerified: boolean;
    whatsapp: string | null;
    showPhone: boolean;
    showWhatsapp: boolean;
  };
  seller: {
    id: string;
    displayName: string | null;
    verification: string;
    ratingAvg: number;
    ratingCount: number;
    activeListings: number;
    followers: number;
  } | null;
  unreadNotifications: number;
}

/* -------------------------------------------------------------------------- */
/* Endpoints                                                                  */
/* -------------------------------------------------------------------------- */

export interface ProductSearchParams {
  q?: string;
  categoryId?: number;
  countryId?: number;
  regionId?: number;
  cityId?: number;
  conditions?: string[];
  minPrice?: number;
  maxPrice?: number;
  currency?: string;
  sellerType?: string;
  sellerId?: string;
  verifiedOnly?: boolean;
  deliveryOnly?: boolean;
  negotiableOnly?: boolean;
  featuredOnly?: boolean;
  postedWithinDays?: number;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  sort?: string;
  page?: number;
  limit?: number;
}

export const endpoints = {
  config: () => api<AppConfig>('/config', { auth: false }),

  countries: (lang: string) =>
    api<Country[]>('/locations/countries', { query: { lang }, auth: false }),

  cities: (params: { countryId?: number; regionId?: number; major?: boolean; q?: string; lang: string }) =>
    api<Place[]>('/locations/cities', { query: params, auth: false }),

  nearestCity: (lat: number, lng: number, lang: string) =>
    api<(Place & { distanceKm: number; countryCode: string }) | null>('/locations/nearest', {
      query: { lat, lng, lang },
      auth: false,
    }),

  categories: (lang: string) =>
    api<CategoryTree[]>('/categories', { query: { lang }, auth: false }),

  category: (slug: string, lang: string) =>
    api<CategoryTree>(`/categories/${slug}`, { query: { lang }, auth: false }),

  searchProducts: (params: ProductSearchParams, signal?: AbortSignal) =>
    apiRequest<ProductCard[]>('/products', {
      query: {
        ...params,
        conditions: params.conditions?.length ? params.conditions.join(',') : undefined,
      },
      signal,
    }),

  productByRef: (ref: number) => api<ProductDetail>(`/products/ref/${ref}`),

  similarProducts: (id: string) => api<ProductCard[]>(`/products/${id}/similar`, { auth: false }),

  recordView: (id: string, source: string) =>
    api<null>(`/products/${id}/view`, { method: 'POST', body: { source } }),

  me: () => api<Me>('/users/me'),

  favorites: (page = 1, limit = 24) =>
    apiRequest<Array<{ savedAt: string; priceAtSave: number; priceDropped: boolean; product: unknown }>>(
      '/users/me/favorites',
      { query: { page, limit } },
    ),

  addFavorite: (productId: string) =>
    api<null>(`/users/me/favorites/${productId}`, { method: 'PUT' }),

  removeFavorite: (productId: string) =>
    api<null>(`/users/me/favorites/${productId}`, { method: 'DELETE' }),
};
