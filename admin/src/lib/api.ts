import { AuthClient } from '@supabase/auth-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!url || !anonKey) {
  throw new Error('VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set. Copy .env.example to .env.');
}

/**
 * Auth only, like the marketplace app.
 *
 * The dashboard never queries Supabase directly — everything goes through
 * /api/v1/admin, which runs each query under the moderator's own token so the
 * RLS policies decide what is permitted. Importing @supabase/auth-js rather
 * than the full supabase-js keeps PostgREST, Realtime and Storage out of the
 * bundle.
 */
export const auth = new AuthClient({
  url: `${url}/auth/v1`,
  headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
  storageKey: 'em.admin.auth',
  autoRefreshToken: true,
  persistSession: true,
});

/* -------------------------------------------------------------------------- */

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  constructor(status: number, message: string, code: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

/**
 * Where the dashboard calls the API.
 *
 * In development the relative path is right: Vite proxies /api to the backend
 * on localhost:4000, so the browser never leaves the origin. A deployed build
 * has no such proxy -- a relative /api/v1 is a 404 on the dashboard's own
 * host, every request fails, and StaffGate reports it as an account that
 * cannot be verified. So a production build falls back to the deployed API
 * instead, and VITE_API_BASE_URL still overrides both.
 */
const BASE =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
  (import.meta.env.PROD ? 'https://east-market-api-two.vercel.app/api/v1' : '/api/v1');

async function request<T>(
  path: string,
  options: { method?: string; body?: unknown; query?: Record<string, unknown> } = {},
): Promise<{ data: T; meta?: PageMeta }> {
  const { method = 'GET', body, query } = options;

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined || value === null || value === '') continue;
    params.set(key, String(value));
  }
  const qs = params.toString();

  const { data: session } = await auth.getSession();
  const token = session.session?.access_token;

  const response = await fetch(`${BASE}${path}${qs ? `?${qs}` : ''}`, {
    method,
    headers: {
      Accept: 'application/json',
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok || !payload?.success) {
    throw new ApiError(
      response.status,
      payload?.message ?? 'Request failed',
      payload?.code ?? 'unknown',
    );
  }

  return { data: payload.data as T, meta: payload.meta as PageMeta | undefined };
}

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

export interface AdminStats {
  users: { total: number; sellers: number; businesses: number; banned: number; newThisWeek: number };
  listings: { total: number; active: number; pending: number; sold: number; rejected: number; newThisWeek: number };
  moderation: { openReports: number; pendingVerifications: number };
  commerce: { activeSubscriptions: number; featuredActive: number; revenue: number; currency: string };
}

export interface AdminAnalytics {
  listingsByCountry: Array<{ label: string; value: number }>;
  listingsByCity: Array<{ label: string; value: number }>;
  topCategories: Array<{ label: string; value: number }>;
  listingsOverTime: Array<{ date: string; value: number }>;
  mostViewed: Array<{ id: string; ref: number; title: string; views: number }>;
  topSellers: Array<{ id: string; name: string; listings: number; rating: number }>;
}

export interface AdminProduct {
  id: string;
  ref: number;
  title: string;
  price: number;
  currency_code: string;
  status: string;
  condition: string;
  created_at: string;
  published_at: string | null;
  view_count: number;
  rejection_reason: string | null;
  sellerName: string;
  thumbnailUrl: string | null;
  imageCount: number;
  /** A listing with a video cannot be judged without watching it. */
  videoUrl: string | null;
  videoPosterUrl: string | null;
  videoDurationSeconds: number | null;
}

export interface AdminUser {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  role: string;
  is_banned: boolean;
  ban_reason: string | null;
  created_at: string;
  last_seen_at: string | null;
}

export interface AdminReport {
  id: string;
  target_type: string;
  target_id: string;
  reason: string;
  details: string | null;
  status: string;
  created_at: string;
  resolution_note: string | null;
  action_taken: string | null;
}

export interface AdminVerification {
  id: string;
  user_id: string;
  kind: string;
  full_name: string | null;
  document_type: string | null;
  status: string;
  review_note: string | null;
  created_at: string;
}

export interface AuditEntry {
  id: number;
  admin_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  payload: Record<string, unknown>;
  created_at: string;
}

export type AdTheme = 'night' | 'acacia' | 'clay' | 'sun' | 'navy';

export interface AdminAd {
  id: string;
  placement: string;
  title: string;
  subtitle: string | null;
  badge: string | null;
  ctaLabel: string | null;
  theme: AdTheme;
  icon: string | null;
  imageUrl: string | null;
  targetType: string;
  targetValue: string | null;
  link: string | null;
  status: string;
  priority: number;
  startsAt: string;
  endsAt: string | null;
  impressions: number;
  clicks: number;
  translations: Record<string, Record<string, string>>;
  updatedAt: string;
}

export interface AdInput {
  placement: 'home_hero';
  title: string;
  subtitle?: string;
  badge?: string;
  ctaLabel?: string;
  theme: AdTheme;
  icon?: string;
  imageUrl?: string | null;
  targetType: 'url' | 'product' | 'business' | 'category' | 'search';
  targetValue?: string;
  status: 'draft' | 'scheduled' | 'running' | 'paused' | 'ended' | 'rejected';
  priority: number;
  endsAt?: string | null;
  translations?: Record<string, Record<string, string>>;
}

export interface CategoryOption {
  id: number;
  slug: string;
  name: string;
}

export interface Me {
  id: string;
  fullName: string | null;
  role: string;
}

/* -------------------------------------------------------------------------- */
/* Endpoints                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Uploads an advertisement image to the `ad-creatives` bucket and returns its
 * public URL.
 *
 * The bytes go straight from this browser to Supabase Storage with the staff
 * member's own token: the bucket's policy (0010_storage.sql) only lets an
 * admin write there, so no service-role key is involved and the backend never
 * has to proxy the file.
 */
export async function uploadAdImage(file: Blob, filename: string): Promise<string> {
  const { data } = await auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new ApiError(401, 'Your session expired. Sign in again.', 'unauthorized');

  const safe = filename.toLowerCase().replace(/[^a-z0-9.]+/g, '-').replace(/^-+|-+$/g, '').slice(-40) || 'image.webp';
  const path = `${crypto.randomUUID()}-${safe}`;

  const response = await fetch(`${url}/storage/v1/object/ad-creatives/${path}`, {
    method: 'POST',
    headers: {
      apikey: anonKey as string,
      Authorization: `Bearer ${token}`,
      'Content-Type': file.type || 'image/webp',
      'x-upsert': 'true',
    },
    body: file,
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new ApiError(response.status, `Could not upload the image: ${detail.slice(0, 140)}`, 'upload_failed');
  }
  return `${url}/storage/v1/object/public/ad-creatives/${path}`;
}

export const api = {
  me: () => request<Me>('/users/me').then((r) => r.data),

  stats: () => request<AdminStats>('/admin/stats').then((r) => r.data),
  analytics: () => request<AdminAnalytics>('/admin/analytics').then((r) => r.data),

  products: (query: { status?: string; q?: string; page?: number; limit?: number }) =>
    request<AdminProduct[]>('/admin/products', { query }),

  moderate: (id: string, decision: 'approve' | 'reject' | 'suspend' | 'restore', reason?: string) =>
    request<{ id: string; status: string }>(`/admin/products/${id}/moderate`, {
      method: 'POST',
      body: { decision, reason },
    }).then((r) => r.data),

  users: (query: { q?: string; role?: string; page?: number; limit?: number }) =>
    request<AdminUser[]>('/admin/users', { query }),

  updateUser: (id: string, body: { role?: string; isBanned?: boolean; banReason?: string }) =>
    request<AdminUser>(`/admin/users/${id}`, { method: 'PATCH', body }).then((r) => r.data),

  reports: (query: { status?: string; page?: number; limit?: number }) =>
    request<AdminReport[]>('/admin/reports', { query }),

  resolveReport: (id: string, body: { status: string; resolutionNote?: string; actionTaken?: string }) =>
    request<AdminReport>(`/admin/reports/${id}`, { method: 'PATCH', body }).then((r) => r.data),

  verifications: (query: { status?: string; page?: number; limit?: number }) =>
    request<AdminVerification[]>('/admin/verifications', { query }),

  decideVerification: (id: string, body: { status: 'verified' | 'rejected'; reviewNote?: string }) =>
    request<AdminVerification>(`/admin/verifications/${id}`, { method: 'PATCH', body }).then((r) => r.data),

  ads: () => request<AdminAd[]>('/admin/ads').then((r) => r.data),

  createAd: (body: AdInput) => request<AdminAd>('/admin/ads', { method: 'POST', body }).then((r) => r.data),

  updateAd: (id: string, body: AdInput) =>
    request<AdminAd>(`/admin/ads/${id}`, { method: 'PATCH', body }).then((r) => r.data),

  deleteAd: (id: string) => request<null>(`/admin/ads/${id}`, { method: 'DELETE' }).then((r) => r.data),

  categories: () => request<CategoryOption[]>('/categories').then((r) => r.data),

  audit: (query: { page?: number; limit?: number }) => request<AuditEntry[]>('/admin/audit', { query }),
};
