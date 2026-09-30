import { anon, admin as serviceRoleClient, hasServiceRole } from '../config/supabase.js';
import type { Db } from '../config/supabase.js';
import type { Database, Json } from '../types/database.js';
import type { AuthContext } from '../types/express.js';
import { AD_TARGET_TYPES, invalidateAdsCache, linkFor, type AdPlacement, type AdTheme } from './ads.service.js';
import { invalidateCategoryCache } from './categories.service.js';
import { invalidateLocationCache } from './locations.service.js';
import { AppError, NotFoundError, fromPostgrest } from '../utils/errors.js';
import type { PageMeta } from '../utils/response.js';
import { buildPageMeta } from '../utils/response.js';

/**
 * READS run as the signed-in moderator (`auth.db`), so RLS decides what they
 * can see. WRITES go through the service-role client.
 *
 * That split is forced by migration 0014, and it is the right design. Column
 * privileges there revoke UPDATE on every moderation column — a listing's
 * rejection_reason, a profile's role and ban state, a report's verdict, a
 * verification outcome, the audit log — from `authenticated` entirely.
 * Privileges are granted per ROLE, not per row, so they cannot be handed to
 * admins without handing them to every signed-in user. The consequence is
 * deliberate: a stolen admin JWT cannot approve listings, promote accounts or
 * rewrite the audit trail, because those columns are unreachable from any
 * client token. Only the backend, holding the secret key, can.
 *
 * Authorisation is therefore this layer's job on writes: every route is behind
 * requireAdmin, and role changes behind requireSuperAdmin.
 */

/**
 * The service-role client, with a readable error when it is not configured.
 * Reads still work without it, so the dashboard loads and only moderation
 * actions fail — which is a far better failure than a blank page.
 */
function service(): Db {
  if (!hasServiceRole) {
    throw new AppError(
      503,
      'Moderation actions need SUPABASE_SERVICE_ROLE_KEY on the backend. ' +
        'Add it to backend/.env from Supabase: Settings -> API -> service_role (secret), then restart the API.',
      // expose:true because this is deployment guidance for whoever runs the
      // dashboard, not an internal detail. 5xx messages are hidden by default.
      { code: 'service_role_missing', expose: true },
    );
  }
  return serviceRoleClient();
}

/* -------------------------------------------------------------------------- */
/* Audit                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Append-only record of what staff did. Best-effort: a failure to log must not
 * roll back a moderation decision, but it is logged loudly on the server.
 */
async function audit(
  auth: AuthContext,
  action: string,
  entityType: string,
  entityId: string,
  payload: Record<string, unknown> = {},
): Promise<void> {
  await service()
    .from('admin_audit_log')
    .insert({
      admin_id: auth.userId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      payload: payload as Json,
    })
    .then(({ error }) => {
      if (error) console.error('[audit] failed to record %s on %s: %s', action, entityId, error.message);
    });
}

/* -------------------------------------------------------------------------- */
/* Dashboard                                                                  */
/* -------------------------------------------------------------------------- */

export interface AdminStats {
  users: { total: number; sellers: number; businesses: number; banned: number; newThisWeek: number };
  listings: {
    total: number;
    active: number;
    pending: number;
    sold: number;
    rejected: number;
    newThisWeek: number;
  };
  moderation: { openReports: number; pendingVerifications: number };
  commerce: { activeSubscriptions: number; featuredActive: number; revenue: number; currency: string };
}

const WEEK_AGO = () => new Date(Date.now() - 7 * 86_400_000).toISOString();

export async function getStats(auth: AuthContext): Promise<AdminStats> {
  const db = auth.db;
  const since = WEEK_AGO();

  // head:true returns only the count, so none of these transfer rows.
  const [
    users, sellers, businesses, banned, newUsers,
    listingsTotal, active, pending, sold, rejected, newListings,
    reports, verifications, subscriptions, featured,
  ] = await Promise.all([
    db.from('profiles').select('*', { count: 'exact', head: true }),
    db.from('seller_profiles').select('*', { count: 'exact', head: true }),
    db.from('business_profiles').select('*', { count: 'exact', head: true }),
    db.from('profiles').select('*', { count: 'exact', head: true }).eq('is_banned', true),
    db.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', since),

    db.from('products').select('*', { count: 'exact', head: true }).neq('status', 'deleted'),
    db.from('products').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    db.from('products').select('*', { count: 'exact', head: true }).eq('status', 'pending_approval'),
    db.from('products').select('*', { count: 'exact', head: true }).eq('status', 'sold'),
    db.from('products').select('*', { count: 'exact', head: true }).eq('status', 'rejected'),
    db.from('products').select('*', { count: 'exact', head: true }).gte('created_at', since),

    db.from('reports').select('*', { count: 'exact', head: true }).in('status', ['open', 'under_review']),
    db.from('verification_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    db.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    db.from('featured_listings').select('*', { count: 'exact', head: true }).eq('is_active', true),
  ]);

  // Revenue is summed rather than counted, so it needs the rows.
  const payments = await db.from('payments').select('amount').eq('status', 'succeeded');
  const revenue = (payments.data ?? []).reduce((total, row) => total + Number(row.amount ?? 0), 0);

  return {
    users: {
      total: users.count ?? 0,
      sellers: sellers.count ?? 0,
      businesses: businesses.count ?? 0,
      banned: banned.count ?? 0,
      newThisWeek: newUsers.count ?? 0,
    },
    listings: {
      total: listingsTotal.count ?? 0,
      active: active.count ?? 0,
      pending: pending.count ?? 0,
      sold: sold.count ?? 0,
      rejected: rejected.count ?? 0,
      newThisWeek: newListings.count ?? 0,
    },
    moderation: {
      openReports: reports.count ?? 0,
      pendingVerifications: verifications.count ?? 0,
    },
    commerce: {
      activeSubscriptions: subscriptions.count ?? 0,
      featuredActive: featured.count ?? 0,
      revenue,
      currency: 'USD',
    },
  };
}

export interface AdminAnalytics {
  listingsByCountry: Array<{ label: string; value: number }>;
  listingsByCity: Array<{ label: string; value: number }>;
  topCategories: Array<{ label: string; value: number }>;
  listingsOverTime: Array<{ date: string; value: number }>;
  mostViewed: Array<{ id: string; ref: number; title: string; views: number }>;
  topSellers: Array<{ id: string; name: string; listings: number; rating: number }>;
}

export async function getAnalytics(auth: AuthContext): Promise<AdminAnalytics> {
  const db = auth.db;

  // Aggregation is done here rather than in SQL views because the dataset is
  // small and a view would need its own migration per chart. Revisit when
  // listings pass six figures; at that point these become materialised views.
  const [products, countries, cities, categories, sellers, profiles] = await Promise.all([
    db
      .from('products')
      .select('id, ref, title, country_id, city_id, category_id, view_count, created_at, status')
      .neq('status', 'deleted')
      .limit(5000),
    anon.from('countries').select('id, name'),
    anon.from('cities').select('id, name'),
    anon.from('category_translations').select('category_id, name').eq('language_code', 'en'),
    db
      .from('seller_profiles')
      .select('id, user_id, display_name, active_listing_count, rating_avg')
      .order('active_listing_count', { ascending: false })
      .limit(10),
    db.from('profiles').select('id, full_name, username').limit(500),
  ]);

  if (products.error) throw fromPostgrest(products.error, 'Analytics');

  const rows = products.data ?? [];
  const countryName = new Map((countries.data ?? []).map((r) => [r.id, r.name]));
  const cityName = new Map((cities.data ?? []).map((r) => [r.id, r.name]));
  const categoryName = new Map((categories.data ?? []).map((r) => [r.category_id, r.name]));
  const profileName = new Map((profiles.data ?? []).map((r) => [r.id, r.full_name ?? r.username]));

  const tally = <T>(items: T[], key: (item: T) => string | null) => {
    const counts = new Map<string, number>();
    for (const item of items) {
      const k = key(item);
      if (!k) continue;
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
  };

  // Last 30 days, including days with no listings so the line has no gaps.
  const byDay = new Map<string, number>();
  for (let i = 29; i >= 0; i -= 1) {
    byDay.set(new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10), 0);
  }
  for (const row of rows) {
    const day = String(row.created_at).slice(0, 10);
    if (byDay.has(day)) byDay.set(day, (byDay.get(day) ?? 0) + 1);
  }

  return {
    listingsByCountry: tally(rows, (r) => countryName.get(r.country_id) ?? null),
    listingsByCity: tally(rows, (r) => (r.city_id ? (cityName.get(r.city_id) ?? null) : null)).slice(0, 10),
    topCategories: tally(rows, (r) => categoryName.get(r.category_id) ?? null).slice(0, 8),
    listingsOverTime: [...byDay.entries()].map(([date, value]) => ({ date, value })),
    mostViewed: [...rows]
      .sort((a, b) => (b.view_count ?? 0) - (a.view_count ?? 0))
      .slice(0, 8)
      .map((r) => ({ id: r.id, ref: r.ref, title: r.title, views: r.view_count ?? 0 })),
    topSellers: (sellers.data ?? []).map((s) => ({
      id: s.id,
      name: s.display_name ?? profileName.get(s.user_id) ?? 'Seller',
      listings: s.active_listing_count ?? 0,
      rating: Number(s.rating_avg ?? 0),
    })),
  };
}

/* -------------------------------------------------------------------------- */
/* Listing moderation                                                         */
/* -------------------------------------------------------------------------- */

export async function listProducts(
  auth: AuthContext,
  options: { status?: string; q?: string; page: number; limit: number },
): Promise<{ items: unknown[]; meta: PageMeta }> {
  const from = (options.page - 1) * options.limit;

  let query = auth.db
    .from('products')
    .select(
      `id, ref, slug, title, price, currency_code, status, condition, created_at, published_at,
       view_count, rejection_reason, seller_id, category_id, city_id,
       images:product_images(url, thumbnail_url, is_primary, media_type, duration_seconds)`,
      { count: 'exact' },
    )
    .order('created_at', { ascending: false })
    .range(from, from + options.limit - 1);

  if (options.status) query = query.eq('status', options.status as never);
  else query = query.neq('status', 'deleted');

  if (options.q) query = query.ilike('title', `%${options.q}%`);

  const { data, error, count } = await query;
  if (error) throw fromPostgrest(error, 'Listings');

  // Seller names come from a second lookup rather than an embed: profiles is
  // not a foreign-key target PostgREST can traverse from products.seller_id
  // without an explicit relationship hint.
  const sellerIds = [...new Set((data ?? []).map((r) => r.seller_id))];
  const profiles = sellerIds.length
    ? await auth.db.from('profiles').select('id, full_name, username').in('id', sellerIds)
    : { data: [] };
  const names = new Map((profiles.data ?? []).map((p) => [p.id, p.full_name ?? p.username]));

  const items = (data ?? []).map((row) => {
    const media = (row.images ?? []) as Array<{
      url: string;
      thumbnail_url: string | null;
      is_primary: boolean;
      media_type: string;
      duration_seconds: number | null;
    }>;
    const photos = media.filter((i) => i.media_type !== 'video');
    const primary = photos.find((i) => i.is_primary) ?? photos[0];
    // A video-only listing still gets a thumbnail in the queue: the poster.
    const poster = media.find((i) => i.media_type === 'video')?.thumbnail_url ?? null;
    // A moderator has to be able to watch the video before approving it: an
    // unwatched video is an unmoderated listing.
    const video = media.find((i) => i.media_type === 'video');
    return {
      ...row,
      images: undefined,
      imageCount: photos.length,
      thumbnailUrl: primary?.thumbnail_url ?? primary?.url ?? poster,
      videoUrl: video?.url ?? null,
      videoPosterUrl: video?.thumbnail_url ?? null,
      videoDurationSeconds: video?.duration_seconds ?? null,
      sellerName: names.get(row.seller_id) ?? 'Seller',
    };
  });

  return { items, meta: buildPageMeta(count ?? 0, options.page, options.limit) };
}

type ModerationDecision = 'approve' | 'reject' | 'suspend' | 'restore';

export async function moderateProduct(
  auth: AuthContext,
  id: string,
  decision: ModerationDecision,
  reason?: string,
): Promise<{ id: string; status: string }> {
  const status =
    decision === 'approve'
      ? 'active'
      : decision === 'reject'
        ? 'rejected'
        : decision === 'suspend'
          ? 'suspended'
          : 'active';

  const patch: Database['public']['Tables']['products']['Update'] = {
    status: status as Database['public']['Enums']['product_status'],
    rejection_reason: decision === 'approve' || decision === 'restore' ? null : (reason ?? null),
  };

  const { data, error } = await service()
    .from('products')
    .update(patch)
    .eq('id', id)
    .select('id, status, seller_id, title')
    .maybeSingle();

  if (error) throw fromPostgrest(error, 'Listing');
  if (!data) throw new NotFoundError('Listing');

  await audit(auth, `product.${decision}`, 'product', id, { reason, status });

  // Tell the seller. Notifications have no client INSERT policy, but admins
  // reach them through the same is_admin() path the rest of this file uses.
  const copy: Record<ModerationDecision, { type: 'listing_approved' | 'listing_rejected'; title: string; body: string }> = {
    approve: { type: 'listing_approved', title: 'Your listing is live', body: `"${data.title}" has been approved.` },
    restore: { type: 'listing_approved', title: 'Your listing is live again', body: `"${data.title}" has been restored.` },
    reject: { type: 'listing_rejected', title: 'Listing not approved', body: reason ?? `"${data.title}" was not approved.` },
    suspend: { type: 'listing_rejected', title: 'Listing suspended', body: reason ?? `"${data.title}" has been suspended.` },
  };
  const message = copy[decision];

  await service().from('notifications').insert({
    user_id: data.seller_id,
    type: message.type,
    title: message.title,
    body: message.body,
    data: { route: 'product', product_id: id },
  });

  return { id: data.id, status: data.status };
}

/* -------------------------------------------------------------------------- */
/* Users                                                                      */
/* -------------------------------------------------------------------------- */

export async function listUsers(
  auth: AuthContext,
  options: { q?: string; role?: string; page: number; limit: number },
): Promise<{ items: unknown[]; meta: PageMeta }> {
  const from = (options.page - 1) * options.limit;

  let query = auth.db
    .from('profiles')
    .select(
      'id, username, full_name, avatar_url, role, is_banned, ban_reason, country_id, city_id, created_at, last_seen_at',
      { count: 'exact' },
    )
    .order('created_at', { ascending: false })
    .range(from, from + options.limit - 1);

  if (options.role) query = query.eq('role', options.role as never);
  if (options.q) query = query.or(`full_name.ilike.%${options.q}%,username.ilike.%${options.q}%`);

  const { data, error, count } = await query;
  if (error) throw fromPostgrest(error, 'Users');

  return { items: data ?? [], meta: buildPageMeta(count ?? 0, options.page, options.limit) };
}

export async function updateUser(
  auth: AuthContext,
  id: string,
  input: { role?: string; isBanned?: boolean; banReason?: string },
): Promise<{ id: string; role: string; isBanned: boolean }> {
  const patch: Database['public']['Tables']['profiles']['Update'] = {};
  if (input.role !== undefined) patch.role = input.role as Database['public']['Enums']['user_role'];
  if (input.isBanned !== undefined) {
    patch.is_banned = input.isBanned;
    patch.ban_reason = input.isBanned ? (input.banReason ?? null) : null;
  }

  const { data, error } = await service()
    .from('profiles')
    .update(patch)
    .eq('id', id)
    .select('id, role, is_banned')
    .maybeSingle();

  if (error) throw fromPostgrest(error, 'User');
  if (!data) throw new NotFoundError('User');

  await audit(auth, 'user.update', 'user', id, patch as Record<string, unknown>);
  return { id: data.id, role: data.role, isBanned: data.is_banned };
}

/* -------------------------------------------------------------------------- */
/* Reports                                                                    */
/* -------------------------------------------------------------------------- */

export async function listReports(
  auth: AuthContext,
  options: { status?: string; page: number; limit: number },
): Promise<{ items: unknown[]; meta: PageMeta }> {
  const from = (options.page - 1) * options.limit;

  let query = auth.db
    .from('reports')
    .select(
      'id, target_type, target_id, reason, details, status, created_at, resolved_at, resolution_note, action_taken, reporter_id',
      { count: 'exact' },
    )
    .order('created_at', { ascending: false })
    .range(from, from + options.limit - 1);

  if (options.status) query = query.eq('status', options.status as never);

  const { data, error, count } = await query;
  if (error) throw fromPostgrest(error, 'Reports');

  return { items: data ?? [], meta: buildPageMeta(count ?? 0, options.page, options.limit) };
}

export async function resolveReport(
  auth: AuthContext,
  id: string,
  input: { status: string; resolutionNote?: string; actionTaken?: string },
): Promise<{ id: string; status: string }> {
  const { data, error } = await service()
    .from('reports')
    .update({
      status: input.status as never,
      resolution_note: input.resolutionNote ?? null,
      action_taken: input.actionTaken ?? null,
    })
    .eq('id', id)
    .select('id, status')
    .maybeSingle();

  if (error) throw fromPostgrest(error, 'Report');
  if (!data) throw new NotFoundError('Report');

  await audit(auth, 'report.resolve', 'report', id, input);
  return data;
}

/* -------------------------------------------------------------------------- */
/* Verification                                                               */
/* -------------------------------------------------------------------------- */

export async function listVerifications(
  auth: AuthContext,
  options: { status?: string; page: number; limit: number },
): Promise<{ items: unknown[]; meta: PageMeta }> {
  const from = (options.page - 1) * options.limit;

  let query = auth.db
    .from('verification_requests')
    .select(
      'id, user_id, business_id, kind, full_name, document_type, document_number, documents, notes, status, review_note, created_at, reviewed_at',
      { count: 'exact' },
    )
    .order('created_at', { ascending: false })
    .range(from, from + options.limit - 1);

  if (options.status) query = query.eq('status', options.status as never);

  const { data, error, count } = await query;
  if (error) throw fromPostgrest(error, 'Verification requests');

  return { items: data ?? [], meta: buildPageMeta(count ?? 0, options.page, options.limit) };
}

export async function decideVerification(
  auth: AuthContext,
  id: string,
  input: { status: 'verified' | 'rejected'; reviewNote?: string },
): Promise<{ id: string; status: string }> {
  // The verification_apply_decision trigger propagates this to the seller and
  // business rows and raises the notification, so this only sets the status.
  const { data, error } = await service()
    .from('verification_requests')
    .update({ status: input.status, review_note: input.reviewNote ?? null })
    .eq('id', id)
    .select('id, status')
    .maybeSingle();

  if (error) throw fromPostgrest(error, 'Verification request');
  if (!data) throw new NotFoundError('Verification request');

  await audit(auth, `verification.${input.status}`, 'verification_request', id, input);
  return data;
}

/* -------------------------------------------------------------------------- */
/* Categories and locations                                                   */
/* -------------------------------------------------------------------------- */

export async function upsertCategory(
  auth: AuthContext,
  input: {
    id?: number;
    parentId?: number | null;
    slug: string;
    icon?: string;
    accentColor?: string;
    isActive?: boolean;
    sortOrder?: number;
    translations?: Record<string, string>;
  },
): Promise<{ id: number; slug: string }> {
  const row = {
    parent_id: input.parentId ?? null,
    slug: input.slug,
    icon: input.icon ?? null,
    accent_color: input.accentColor ?? null,
    is_active: input.isActive ?? true,
    sort_order: input.sortOrder ?? 0,
  };

  const { data, error } = input.id
    ? await auth.db.from('categories').update(row).eq('id', input.id).select('id, slug').maybeSingle()
    : await auth.db.from('categories').insert(row).select('id, slug').maybeSingle();

  if (error) throw fromPostgrest(error, 'Category');
  if (!data) throw new NotFoundError('Category');

  if (input.translations) {
    const rows = Object.entries(input.translations)
      .filter(([, name]) => name.trim() !== '')
      .map(([language_code, name]) => ({ category_id: data.id, language_code, name }));
    if (rows.length) {
      await auth.db.from('category_translations').upsert(rows, { onConflict: 'category_id,language_code' });
    }
  }

  // The API caches the category tree for an hour; an admin edit must appear now.
  invalidateCategoryCache();
  await audit(auth, input.id ? 'category.update' : 'category.create', 'category', String(data.id), input);
  return data;
}

export async function upsertLocation(
  auth: AuthContext,
  level: 'countries' | 'regions' | 'cities' | 'districts',
  input: Record<string, unknown> & { id?: number },
): Promise<{ id: number }> {
  const { id, ...rest } = input;

  const { data, error } = id
    ? await auth.db.from(level).update(rest as never).eq('id', id).select('id').maybeSingle()
    : await auth.db.from(level).insert(rest as never).select('id').maybeSingle();

  if (error) throw fromPostgrest(error, 'Location');
  if (!data) throw new NotFoundError('Location');

  invalidateLocationCache();
  await audit(auth, id ? `${level}.update` : `${level}.create`, level, String(data.id), input);
  return data as { id: number };
}

export async function listAuditLog(
  auth: AuthContext,
  options: { page: number; limit: number },
): Promise<{ items: unknown[]; meta: PageMeta }> {
  const from = (options.page - 1) * options.limit;

  const { data, error, count } = await service()
    .from('admin_audit_log')
    .select('id, admin_id, action, entity_type, entity_id, payload, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, from + options.limit - 1);

  if (error) throw fromPostgrest(error, 'Audit log');
  return { items: data ?? [], meta: buildPageMeta(count ?? 0, options.page, options.limit) };
}


/* -------------------------------------------------------------------------- */
/* Promotions (advertisements)                                                */
/* -------------------------------------------------------------------------- */

export interface AdminAd {
  id: string;
  placement: string;
  title: string;
  subtitle: string | null;
  badge: string | null;
  ctaLabel: string | null;
  theme: string;
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
  placement: AdPlacement;
  title: string;
  subtitle?: string;
  badge?: string;
  ctaLabel?: string;
  theme: AdTheme;
  icon?: string;
  imageUrl?: string | null;
  targetType: (typeof AD_TARGET_TYPES)[number];
  targetValue?: string;
  status: Database['public']['Enums']['ad_status'];
  priority: number;
  startsAt?: string;
  endsAt?: string | null;
  translations?: Record<string, Partial<Record<'title' | 'subtitle' | 'badge' | 'cta_label', string | undefined>>>;
}

const AD_COLUMNS =
  'id, placement, title, subtitle, badge, cta_label, theme, icon, image_url, target_type, target_value, status, priority, starts_at, ends_at, impressions, clicks, translations, updated_at';

type AdRow = Database['public']['Tables']['advertisements']['Row'];
type AdSelectRow = Pick<
  AdRow,
  | 'id' | 'placement' | 'title' | 'subtitle' | 'badge' | 'cta_label' | 'theme' | 'icon' | 'image_url'
  | 'target_type' | 'target_value' | 'status' | 'priority' | 'starts_at' | 'ends_at' | 'impressions'
  | 'clicks' | 'translations' | 'updated_at'
>;

function toAdminAd(row: AdSelectRow): AdminAd {
  return {
    id: row.id,
    placement: row.placement,
    title: row.title,
    subtitle: row.subtitle,
    badge: row.badge,
    ctaLabel: row.cta_label,
    theme: row.theme,
    icon: row.icon,
    imageUrl: row.image_url,
    targetType: row.target_type,
    targetValue: row.target_value,
    link: linkFor(row.target_type, row.target_value),
    status: row.status,
    priority: row.priority,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    impressions: row.impressions,
    clicks: row.clicks,
    translations: (row.translations ?? {}) as Record<string, Record<string, string>>,
    updatedAt: row.updated_at,
  };
}

/** Drops empty strings so a cleared translation field falls back to English. */
function cleanTranslations(input: AdInput['translations']): Json {
  const out: Record<string, Record<string, string>> = {};
  for (const [lang, copy] of Object.entries(input ?? {})) {
    const kept = Object.fromEntries(
      Object.entries(copy ?? {}).filter((entry): entry is [string, string] => typeof entry[1] === 'string' && entry[1].trim() !== ''),
    );
    if (Object.keys(kept).length) out[lang] = kept;
  }
  return out as Json;
}

/**
 * The dashboard form always sends the whole promotion, so an update replaces
 * every editable field: a subtitle cleared in the form is cleared here.
 */
function toAdRow(input: AdInput): Database['public']['Tables']['advertisements']['Update'] {
  return {
    placement: input.placement,
    title: input.title,
    subtitle: input.subtitle ?? null,
    badge: input.badge ?? null,
    cta_label: input.ctaLabel ?? null,
    theme: input.theme,
    icon: input.icon ?? null,
    image_url: input.imageUrl ?? null,
    target_type: input.targetType,
    target_value: input.targetValue ?? null,
    status: input.status,
    priority: input.priority,
    ...(input.startsAt ? { starts_at: input.startsAt } : {}),
    ends_at: input.endsAt ?? null,
    translations: cleanTranslations(input.translations),
  };
}

export async function listAds(auth: AuthContext): Promise<AdminAd[]> {
  const { data, error } = await auth.db
    .from('advertisements')
    .select(AD_COLUMNS)
    .order('placement')
    .order('priority', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) throw fromPostgrest(error, 'Promotions');
  return (data ?? []).map(toAdminAd);
}

export async function createAd(auth: AuthContext, input: AdInput): Promise<AdminAd> {
  const row = { ...toAdRow(input), created_by: auth.userId } as Database['public']['Tables']['advertisements']['Insert'];
  const { data, error } = await service().from('advertisements').insert(row).select(AD_COLUMNS).single();

  if (error) throw fromPostgrest(error, 'Promotion');
  await audit(auth, 'ad.create', 'advertisement', data.id, { title: data.title, status: data.status });
  invalidateAdsCache();
  return toAdminAd(data);
}

export async function updateAd(auth: AuthContext, id: string, input: AdInput): Promise<AdminAd> {
  const { data, error } = await service()
    .from('advertisements')
    .update(toAdRow(input))
    .eq('id', id)
    .select(AD_COLUMNS)
    .maybeSingle();

  if (error) throw fromPostgrest(error, 'Promotion');
  if (!data) throw new NotFoundError('Promotion');
  await audit(auth, 'ad.update', 'advertisement', id, { title: data.title, status: data.status });
  invalidateAdsCache();
  return toAdminAd(data);
}

export async function deleteAd(auth: AuthContext, id: string): Promise<void> {
  const { data, error } = await service().from('advertisements').delete().eq('id', id).select('id, title').maybeSingle();

  if (error) throw fromPostgrest(error, 'Promotion');
  if (!data) throw new NotFoundError('Promotion');
  await audit(auth, 'ad.delete', 'advertisement', id, { title: data.title });
  invalidateAdsCache();
}
