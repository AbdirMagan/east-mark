import type { Database } from '../types/database.js';
import type { AuthContext } from '../types/express.js';
import { ConflictError, NotFoundError, fromPostgrest } from '../utils/errors.js';
import type { PageMeta } from '../utils/response.js';
import { buildPageMeta } from '../utils/response.js';

type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];
type ContactUpdate = Database['public']['Tables']['user_contacts']['Update'];

export interface MeDto {
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
  regionId: number | null;
  cityId: number | null;
  districtId: number | null;
  neighborhoodId: number | null;
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

export async function getMe(auth: AuthContext): Promise<MeDto> {
  const [profile, contact, seller, unread] = await Promise.all([
    auth.db
      .from('profiles')
      .select(
        'id, username, full_name, avatar_url, bio, role, language_code, currency_code, theme, country_id, region_id, city_id, district_id, neighborhood_id, interests, onboarded_at, is_banned',
      )
      .eq('id', auth.userId)
      .maybeSingle(),
    // Private table: only the owner and admins can read it.
    auth.db
      .from('user_contacts')
      .select('phone, phone_verified, whatsapp, show_phone, show_whatsapp')
      .eq('user_id', auth.userId)
      .maybeSingle(),
    auth.db
      .from('seller_profiles')
      .select(
        'id, display_name, verification_status, rating_avg, rating_count, active_listing_count, follower_count',
      )
      .eq('user_id', auth.userId)
      .maybeSingle(),
    auth.db
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', auth.userId)
      .is('read_at', null),
  ]);

  if (profile.error) throw fromPostgrest(profile.error, 'Profile');
  if (!profile.data) throw new NotFoundError('Profile');

  return {
    id: profile.data.id,
    username: profile.data.username,
    fullName: profile.data.full_name,
    avatarUrl: profile.data.avatar_url,
    bio: profile.data.bio,
    role: profile.data.role,
    language: profile.data.language_code,
    currency: profile.data.currency_code,
    theme: profile.data.theme,
    countryId: profile.data.country_id,
    regionId: profile.data.region_id,
    cityId: profile.data.city_id,
    districtId: profile.data.district_id,
    neighborhoodId: profile.data.neighborhood_id,
    interests: profile.data.interests ?? [],
    onboarded: profile.data.onboarded_at != null,
    contact: {
      phone: contact.data?.phone ?? null,
      phoneVerified: contact.data?.phone_verified ?? false,
      whatsapp: contact.data?.whatsapp ?? null,
      showPhone: contact.data?.show_phone ?? true,
      showWhatsapp: contact.data?.show_whatsapp ?? true,
    },
    seller: seller.data
      ? {
          id: seller.data.id,
          displayName: seller.data.display_name,
          verification: seller.data.verification_status,
          ratingAvg: Number(seller.data.rating_avg ?? 0),
          ratingCount: seller.data.rating_count ?? 0,
          activeListings: seller.data.active_listing_count ?? 0,
          followers: seller.data.follower_count ?? 0,
        }
      : null,
    unreadNotifications: unread.count ?? 0,
  };
}

export interface UpdateProfileInput {
  username?: string;
  fullName?: string;
  avatarUrl?: string;
  bio?: string;
  language?: string;
  currency?: string;
  theme?: 'light' | 'dark' | 'system';
  countryId?: number;
  regionId?: number;
  cityId?: number;
  districtId?: number;
  neighborhoodId?: number;
  latitude?: number;
  longitude?: number;
  interests?: number[];
}

export async function updateProfile(auth: AuthContext, input: UpdateProfileInput): Promise<MeDto> {
  const patch: ProfileUpdate = {};
  if (input.username !== undefined) patch.username = input.username;
  if (input.fullName !== undefined) patch.full_name = input.fullName;
  if (input.avatarUrl !== undefined) patch.avatar_url = input.avatarUrl;
  if (input.bio !== undefined) patch.bio = input.bio;
  if (input.language !== undefined) patch.language_code = input.language;
  if (input.currency !== undefined) patch.currency_code = input.currency;
  if (input.theme !== undefined) patch.theme = input.theme;
  if (input.countryId !== undefined) patch.country_id = input.countryId;
  if (input.regionId !== undefined) patch.region_id = input.regionId;
  if (input.cityId !== undefined) patch.city_id = input.cityId;
  if (input.districtId !== undefined) patch.district_id = input.districtId;
  if (input.neighborhoodId !== undefined) patch.neighborhood_id = input.neighborhoodId;
  if (input.latitude !== undefined) patch.latitude = input.latitude;
  if (input.longitude !== undefined) patch.longitude = input.longitude;
  if (input.interests !== undefined) patch.interests = input.interests;

  if (Object.keys(patch).length > 0) {
    const { error } = await auth.db.from('profiles').update(patch).eq('id', auth.userId);
    if (error) {
      if (error.code === '23505') throw new ConflictError('That username is already taken');
      throw fromPostgrest(error, 'Profile');
    }
  }

  return getMe(auth);
}

/**
 * Marks onboarding complete: country, language, city and interests.
 * Separate from updateProfile because it is the one write that stamps
 * onboarded_at, and the clients treat it as a single atomic step.
 */
export async function completeOnboarding(
  auth: AuthContext,
  input: {
    countryId: number;
    cityId?: number;
    regionId?: number;
    language: string;
    currency?: string;
    interests?: number[];
    fullName?: string;
  },
): Promise<MeDto> {
  const { error } = await auth.db
    .from('profiles')
    .update({
      country_id: input.countryId,
      region_id: input.regionId ?? null,
      city_id: input.cityId ?? null,
      language_code: input.language,
      ...(input.currency ? { currency_code: input.currency } : {}),
      ...(input.fullName ? { full_name: input.fullName } : {}),
      interests: input.interests ?? [],
      onboarded_at: new Date().toISOString(),
    })
    .eq('id', auth.userId);

  if (error) throw fromPostgrest(error, 'Profile');
  return getMe(auth);
}

export async function updateContact(
  auth: AuthContext,
  input: { phone?: string | null; whatsapp?: string | null; showPhone?: boolean; showWhatsapp?: boolean },
): Promise<MeDto['contact']> {
  const patch: ContactUpdate = {};
  if (input.phone !== undefined) patch.phone = input.phone;
  if (input.whatsapp !== undefined) patch.whatsapp = input.whatsapp;
  if (input.showPhone !== undefined) patch.show_phone = input.showPhone;
  if (input.showWhatsapp !== undefined) patch.show_whatsapp = input.showWhatsapp;

  // UPDATE, not upsert.
  //
  // An upsert is INSERT ... ON CONFLICT DO UPDATE, and PostgREST writes every
  // column in the payload on the update branch — including user_id, which
  // migration 0014 deliberately revoked UPDATE on. The whole call then fails
  // with 42501 and the seller's "show my phone" switch silently stops working.
  // The row always exists: handle_new_user() creates it at sign-up.
  const { data, error } = await auth.db
    .from('user_contacts')
    .update(patch)
    .eq('user_id', auth.userId)
    .select('phone, phone_verified, whatsapp, show_phone, show_whatsapp')
    .maybeSingle();

  if (error) throw fromPostgrest(error, 'Contact details');

  // Backfill for any account created before that trigger existed.
  if (!data) {
    const inserted = await auth.db
      .from('user_contacts')
      .insert({ user_id: auth.userId, ...patch })
      .select('phone, phone_verified, whatsapp, show_phone, show_whatsapp')
      .single();
    if (inserted.error) throw fromPostgrest(inserted.error, 'Contact details');
    return {
      phone: inserted.data.phone,
      phoneVerified: inserted.data.phone_verified,
      whatsapp: inserted.data.whatsapp,
      showPhone: inserted.data.show_phone,
      showWhatsapp: inserted.data.show_whatsapp,
    };
  }

  return {
    phone: data.phone,
    phoneVerified: data.phone_verified,
    whatsapp: data.whatsapp,
    showPhone: data.show_phone,
    showWhatsapp: data.show_whatsapp,
  };
}

/* -------------------------------------------------------------------------- */
/* Favorites                                                                  */
/* -------------------------------------------------------------------------- */

export async function addFavorite(auth: AuthContext, productId: string): Promise<void> {
  // price_at_save is what makes a "price dropped" notification possible later.
  const product = await auth.db.from('products').select('price').eq('id', productId).maybeSingle();
  if (product.error) throw fromPostgrest(product.error, 'Listing');
  if (!product.data) throw new NotFoundError('Listing');

  const { error } = await auth.db
    .from('favorites')
    .upsert(
      { user_id: auth.userId, product_id: productId, price_at_save: product.data.price },
      { onConflict: 'user_id,product_id', ignoreDuplicates: true },
    );

  if (error) throw fromPostgrest(error, 'Favorite');
}

export async function removeFavorite(auth: AuthContext, productId: string): Promise<void> {
  const { error } = await auth.db
    .from('favorites')
    .delete()
    .eq('user_id', auth.userId)
    .eq('product_id', productId);
  if (error) throw fromPostgrest(error, 'Favorite');
}

export async function listFavorites(
  auth: AuthContext,
  page: number,
  limit: number,
): Promise<{ items: unknown[]; meta: PageMeta }> {
  const from = (page - 1) * limit;

  const { data, error, count } = await auth.db
    .from('favorites')
    .select(
      `created_at, price_at_save,
       product:products (
         id, ref, slug, title, price, currency_code, condition, status, city_id,
         view_count, favorite_count, is_featured, published_at, seller_id
       )`,
      { count: 'exact' },
    )
    .eq('user_id', auth.userId)
    .order('created_at', { ascending: false })
    .range(from, from + limit - 1);

  if (error) throw fromPostgrest(error, 'Favorites');

  const items = (data ?? []).map((row) => {
    const product = row.product as Record<string, unknown> | null;
    const savedAt = Number(row.price_at_save ?? 0);
    const current = Number(product?.price ?? 0);
    return {
      savedAt: row.created_at,
      priceAtSave: savedAt,
      // Surfacing the drop is the whole point of storing price_at_save.
      priceDropped: savedAt > 0 && current < savedAt,
      product,
    };
  });

  return { items, meta: buildPageMeta(count ?? 0, page, limit) };
}

/* -------------------------------------------------------------------------- */
/* Devices                                                                    */
/* -------------------------------------------------------------------------- */

export async function registerDevice(
  auth: AuthContext,
  input: { token: string; platform: 'android' | 'ios' | 'web'; deviceName?: string; appVersion?: string; locale?: string },
): Promise<void> {
  // A device token can move between accounts (shared phone, re-install), so
  // the token is the conflict target, not the user.
  const { error } = await auth.db.from('device_tokens').upsert(
    {
      user_id: auth.userId,
      token: input.token,
      platform: input.platform,
      device_name: input.deviceName ?? null,
      app_version: input.appVersion ?? null,
      locale: input.locale ?? null,
      is_active: true,
      last_used_at: new Date().toISOString(),
    },
    { onConflict: 'token' },
  );

  if (error) throw fromPostgrest(error, 'Device');
}

export async function unregisterDevice(auth: AuthContext, token: string): Promise<void> {
  const { error } = await auth.db
    .from('device_tokens')
    .delete()
    .eq('user_id', auth.userId)
    .eq('token', token);
  if (error) throw fromPostgrest(error, 'Device');
}
