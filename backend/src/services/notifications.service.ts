import { admin, hasServiceRole } from '../config/supabase.js';
import { logger } from '../config/logger.js';
import type { Database, Json } from '../types/database.js';
import type { AuthContext } from '../types/express.js';
import { fromPostgrest } from '../utils/errors.js';
import { sendToUser, type PushPayload } from './push.service.js';

/**
 * The notification record, and getting it in front of whoever it is for.
 *
 * Reads and dismissals run as the signed-in user, so row level security is
 * what keeps one person's notifications out of another's list. Writing is
 * server-side only -- the policies in 0009 grant select, update and delete to
 * the owner and no insert to anyone -- because a client that could write its
 * own notifications could write yours.
 *
 * `notify()` is the one way a notification comes into being. It records the
 * row first and then tries to wake the device: if the push fails, or the user
 * has push switched off, or it is the middle of the night, the notification is
 * still there the next time the app is opened. The list is the product; push
 * is a way of telling someone to come and look at it.
 */

export const NOTIFICATION_TYPES = [
  'new_message',
  'listing_approved',
  'listing_rejected',
  'listing_expiring',
  'product_sold',
  'price_changed',
  'saved_search_match',
  'new_follower',
  'advertisement',
  'subscription_expiring',
  'verification_result',
  'review_received',
  'system',
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export interface NotificationDto {
  id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  imageUrl: string | null;
  /** Deep-link payload: {"route":"chat","conversationId":"..."} */
  data: Record<string, unknown>;
  read: boolean;
  createdAt: string;
}

interface NotificationRow {
  id: string;
  type: string;
  title: string;
  body: string | null;
  image_url: string | null;
  data: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
}

const COLUMNS = 'id, type, title, body, image_url, data, read_at, created_at';

function toDto(row: NotificationRow): NotificationDto {
  return {
    id: row.id,
    type: row.type as NotificationType,
    title: row.title,
    body: row.body,
    imageUrl: row.image_url,
    data: row.data ?? {},
    read: row.read_at !== null,
    createdAt: row.created_at,
  };
}

export interface ListOptions {
  /** Cursor: notifications older than this timestamp. */
  before?: string;
  limit: number;
  unreadOnly?: boolean;
}

export async function list(auth: AuthContext, options: ListOptions): Promise<NotificationDto[]> {
  let query = auth.db
    .from('notifications')
    .select(COLUMNS)
    .order('created_at', { ascending: false })
    .limit(options.limit);

  if (options.before) query = query.lt('created_at', options.before);
  if (options.unreadOnly) query = query.is('read_at', null);

  const { data, error } = await query;
  if (error) throw fromPostgrest(error, 'Notifications');
  return (data as NotificationRow[]).map(toDto);
}

/** The number on the bell. */
export async function unreadCount(auth: AuthContext): Promise<{ unread: number }> {
  const { count, error } = await auth.db
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .is('read_at', null);

  if (error) throw fromPostgrest(error, 'Notifications');
  return { unread: count ?? 0 };
}

export async function markRead(auth: AuthContext, id: string): Promise<{ unread: number }> {
  const { error } = await auth.db
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id)
    .is('read_at', null);

  if (error) throw fromPostgrest(error, 'Notification');
  return unreadCount(auth);
}

export async function markAllRead(auth: AuthContext): Promise<{ unread: number }> {
  const { error } = await auth.db
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .is('read_at', null);

  if (error) throw fromPostgrest(error, 'Notifications');
  return { unread: 0 };
}

export async function remove(auth: AuthContext, id: string): Promise<void> {
  const { error } = await auth.db.from('notifications').delete().eq('id', id);
  if (error) throw fromPostgrest(error, 'Notification');
}

// ---------------------------------------------------------------------------
// Devices
// ---------------------------------------------------------------------------

export interface DeviceRegistration {
  /** An Expo push token, or a browser PushSubscription serialised as JSON. */
  token: string;
  platform: 'android' | 'ios' | 'web';
  deviceName?: string;
  appVersion?: string;
  locale?: string;
}

export interface PreferencesDto {
  pushEnabled: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
  typeOverrides: Record<string, boolean>;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
}

/**
 * Remembers where to reach someone.
 *
 * The same device re-registers on every launch -- tokens rotate, and a token
 * can move to a different account when someone signs out and in again -- so
 * this is an upsert on the token, not an insert.
 */
export async function registerDevice(
  auth: AuthContext,
  registration: DeviceRegistration,
): Promise<{ registered: true }> {
  const { error } = await auth.db.from('device_tokens').upsert(
    {
      user_id: auth.userId,
      token: registration.token,
      platform: registration.platform,
      device_name: registration.deviceName ?? null,
      app_version: registration.appVersion ?? null,
      locale: registration.locale ?? null,
      is_active: true,
      last_used_at: new Date().toISOString(),
    },
    { onConflict: 'token' },
  );

  if (error) throw fromPostgrest(error, 'Device');
  return { registered: true };
}

/** Signing out, or turning notifications off in the browser. */
export async function unregisterDevice(auth: AuthContext, token: string): Promise<void> {
  const { error } = await auth.db
    .from('device_tokens')
    .update({ is_active: false })
    .eq('token', token)
    .eq('user_id', auth.userId);

  if (error) throw fromPostgrest(error, 'Device');
}

export async function preferences(auth: AuthContext): Promise<PreferencesDto> {
  const { data, error } = await auth.db
    .from('notification_preferences')
    .select('push_enabled, email_enabled, sms_enabled, type_overrides, quiet_hours_start, quiet_hours_end')
    .eq('user_id', auth.userId)
    .maybeSingle();

  if (error) throw fromPostgrest(error, 'Notification preferences');

  // A row is created with the profile; this default covers the window between
  // sign-up and that trigger, and anyone whose row was deleted.
  return {
    pushEnabled: data?.push_enabled ?? true,
    emailEnabled: data?.email_enabled ?? true,
    smsEnabled: data?.sms_enabled ?? false,
    typeOverrides: (data?.type_overrides as Record<string, boolean> | null) ?? {},
    quietHoursStart: data?.quiet_hours_start ?? null,
    quietHoursEnd: data?.quiet_hours_end ?? null,
  };
}

export interface PreferencesPatch {
  pushEnabled?: boolean;
  emailEnabled?: boolean;
  smsEnabled?: boolean;
  typeOverrides?: Record<string, boolean>;
  quietHoursStart?: string | null;
  quietHoursEnd?: string | null;
}

export async function updatePreferences(
  auth: AuthContext,
  patch: PreferencesPatch,
): Promise<PreferencesDto> {
  const row: Database['public']['Tables']['notification_preferences']['Insert'] = {
    user_id: auth.userId,
  };
  if (patch.pushEnabled !== undefined) row.push_enabled = patch.pushEnabled;
  if (patch.emailEnabled !== undefined) row.email_enabled = patch.emailEnabled;
  if (patch.smsEnabled !== undefined) row.sms_enabled = patch.smsEnabled;
  if (patch.typeOverrides !== undefined) row.type_overrides = patch.typeOverrides as Json;
  if (patch.quietHoursStart !== undefined) row.quiet_hours_start = patch.quietHoursStart;
  if (patch.quietHoursEnd !== undefined) row.quiet_hours_end = patch.quietHoursEnd;

  const { error } = await auth.db
    .from('notification_preferences')
    .upsert(row, { onConflict: 'user_id' });

  if (error) throw fromPostgrest(error, 'Notification preferences');
  return preferences(auth);
}

// ---------------------------------------------------------------------------
// Creating one
// ---------------------------------------------------------------------------

export interface NotifyInput {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string | null;
  imageUrl?: string | null;
  data?: Record<string, unknown>;
}

/**
 * Records a notification and tries to wake the device.
 *
 * Called from whatever just happened -- a message sent, a listing approved --
 * and deliberately swallowing its own failures: nobody should fail to receive
 * a message because we could not tell them about it afterwards. The caller
 * gets a boolean and the logs get the reason.
 */
export async function notify(input: NotifyInput): Promise<boolean> {
  if (!hasServiceRole) {
    // Local development without the secret key: the event still happened, it
    // just leaves no notification. Say so rather than throwing into a request.
    logger.debug({ type: input.type }, 'notify: no service-role key, skipping');
    return false;
  }

  try {
    const { data, error } = await admin()
      .from('notifications')
      .insert({
        user_id: input.userId,
        type: input.type,
        title: input.title,
        body: input.body ?? null,
        image_url: input.imageUrl ?? null,
        data: (input.data ?? {}) as Json,
      })
      .select('id')
      .single();

    if (error) {
      logger.warn({ err: error, type: input.type }, 'notify: could not record notification');
      return false;
    }

    const unread = await admin()
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', input.userId)
      .is('read_at', null);

    const payload: PushPayload = {
      title: input.title,
      body: input.body ?? null,
      data: input.data ?? {},
      imageUrl: input.imageUrl ?? null,
      notificationId: (data as { id: string }).id,
      badge: unread.count ?? undefined,
    };

    const delivered = await sendToUser(input.userId, input.type, payload);
    if (delivered > 0) {
      await admin()
        .from('notifications')
        .update({ pushed_at: new Date().toISOString() })
        .eq('id', (data as { id: string }).id);
    }
    return true;
  } catch (error) {
    logger.warn({ err: error, type: input.type }, 'notify: failed');
    return false;
  }
}
