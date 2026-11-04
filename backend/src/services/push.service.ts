import webpush from 'web-push';

import { env } from '../config/env.js';
import { admin } from '../config/supabase.js';
import { logger } from '../config/logger.js';

/**
 * Getting a notification onto a device that is not looking at the app.
 *
 * Three kinds of device register here, and each one is woken differently:
 *
 *   web      a browser Push API subscription, delivered through the browser
 *            vendor's push service and signed with our VAPID key pair.
 *   ios      an Expo push token, delivered through Expo's service, which
 *   android  holds the APNs key and the FCM credentials on our behalf.
 *
 * The native Android app does not appear here. It has no Firebase project, so
 * rather than wait for one it asks the API for what it missed on a schedule
 * and raises the notification itself -- see NotificationSyncWorker. The row in
 * `notifications` is the same row either way; this file is only about waking a
 * device that is not already asking.
 *
 * Nothing in here is allowed to fail a request. A notification that could not
 * be delivered is still recorded, and the next time the app is opened it is
 * there. Push is the loudspeaker, not the record.
 */

export interface PushPayload {
  title: string;
  body: string | null;
  /** Deep-link payload: {"route":"chat","conversation_id":"..."} */
  data: Record<string, unknown>;
  imageUrl?: string | null;
  /** The notifications row, so a tap can mark it read. */
  notificationId?: string;
  /** Unread total after this one, for the app icon badge. */
  badge?: number;
}

interface DeviceRow {
  id: string;
  token: string;
  platform: string;
}

const EXPO_ENDPOINT = 'https://exp.host/--/api/v2/push/send';

/** Expo hands out `ExponentPushToken[...]`; anything else is a raw APNs/FCM token. */
export function isExpoToken(token: string): boolean {
  return /^Expo(nent)?PushToken\[[^\]]+\]$/.test(token);
}

/**
 * A browser subscription is the whole PushSubscription JSON, not an opaque
 * string, so it is stored as the serialised object.
 */
export function parseWebSubscription(token: string): webpush.PushSubscription | null {
  try {
    const parsed = JSON.parse(token) as webpush.PushSubscription;
    if (!parsed?.endpoint || !parsed.keys?.p256dh || !parsed.keys?.auth) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function webPushConfigured(): boolean {
  return Boolean(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY);
}

let vapidReady = false;

function ensureVapid(): boolean {
  if (!webPushConfigured()) return false;
  if (!vapidReady) {
    webpush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY!, env.VAPID_PRIVATE_KEY!);
    vapidReady = true;
  }
  return true;
}

/**
 * Quiet hours, as the user set them in their profile.
 *
 * The window wraps midnight more often than not -- 22:00 to 07:00 is the
 * ordinary case -- so "inside the window" is two different comparisons
 * depending on which way round the ends are.
 */
export function inQuietHours(start: string | null, end: string | null, now = new Date()): boolean {
  if (!start || !end) return false;
  const minutes = now.getHours() * 60 + now.getMinutes();
  const at = (value: string): number => {
    const [h = '0', m = '0'] = value.split(':');
    return Number(h) * 60 + Number(m);
  };
  const from = at(start);
  const to = at(end);
  if (from === to) return false;
  return from < to ? minutes >= from && minutes < to : minutes >= from || minutes < to;
}

export interface Preferences {
  push_enabled: boolean;
  type_overrides: Record<string, boolean> | null;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
}

/** Whether this particular notification is allowed to make a noise. */
export function shouldPush(preferences: Preferences | null, type: string, now = new Date()): boolean {
  if (!preferences) return true; // No row yet: the schema's default is on.
  if (!preferences.push_enabled) return false;
  const override = preferences.type_overrides?.[type];
  if (override === false) return false;
  return !inQuietHours(preferences.quiet_hours_start, preferences.quiet_hours_end, now);
}

/**
 * Sends to every device a user has registered.
 *
 * Tokens die constantly -- a browser subscription is dropped when site data is
 * cleared, an Expo token when the app is uninstalled -- and a push service
 * says so with 404/410 (web) or DeviceNotRegistered (Expo). Those are retired
 * on the spot, because retrying them forever is how a sending queue silts up.
 */
export async function sendToUser(userId: string, type: string, payload: PushPayload): Promise<number> {
  const [devices, preferences] = await Promise.all([
    admin().from('device_tokens').select('id, token, platform').eq('user_id', userId).eq('is_active', true),
    admin()
      .from('notification_preferences')
      .select('push_enabled, type_overrides, quiet_hours_start, quiet_hours_end')
      .eq('user_id', userId)
      .maybeSingle(),
  ]);

  if (devices.error) {
    logger.warn({ err: devices.error, userId }, 'push: could not read devices');
    return 0;
  }
  if (!shouldPush((preferences.data as Preferences | null) ?? null, type)) return 0;

  const rows = (devices.data ?? []) as DeviceRow[];
  if (!rows.length) return 0;

  const expo = rows.filter((row) => isExpoToken(row.token));
  const web = rows.filter((row) => row.platform === 'web' && !isExpoToken(row.token));

  const [expoSent, webSent] = await Promise.all([sendExpo(expo, payload), sendWeb(web, payload)]);
  return expoSent + webSent;
}

async function retire(ids: string[], reason: string): Promise<void> {
  if (!ids.length) return;
  await admin().from('device_tokens').update({ is_active: false }).in('id', ids);
  logger.info({ count: ids.length, reason }, 'push: retired dead device tokens');
}

async function sendExpo(devices: DeviceRow[], payload: PushPayload): Promise<number> {
  if (!devices.length) return 0;

  const messages = devices.map((device) => ({
    to: device.token,
    title: payload.title,
    body: payload.body ?? '',
    data: { ...payload.data, notificationId: payload.notificationId },
    sound: 'default',
    badge: payload.badge,
    channelId: 'default',
  }));

  try {
    const response = await fetch(EXPO_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(env.EXPO_ACCESS_TOKEN ? { Authorization: `Bearer ${env.EXPO_ACCESS_TOKEN}` } : {}),
      },
      body: JSON.stringify(messages),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      logger.warn({ status: response.status }, 'push: Expo rejected the batch');
      return 0;
    }

    const result = (await response.json()) as { data?: Array<{ status: string; details?: { error?: string } }> };
    const dead: string[] = [];
    let delivered = 0;

    (result.data ?? []).forEach((ticket, index) => {
      if (ticket.status === 'ok') {
        delivered += 1;
      } else if (ticket.details?.error === 'DeviceNotRegistered') {
        const device = devices[index];
        if (device) dead.push(device.id);
      }
    });

    await retire(dead, 'DeviceNotRegistered');
    return delivered;
  } catch (error) {
    logger.warn({ err: error }, 'push: Expo send failed');
    return 0;
  }
}

async function sendWeb(devices: DeviceRow[], payload: PushPayload): Promise<number> {
  if (!devices.length || !ensureVapid()) return 0;

  const body = JSON.stringify({
    title: payload.title,
    body: payload.body ?? '',
    data: payload.data,
    imageUrl: payload.imageUrl ?? null,
    notificationId: payload.notificationId ?? null,
  });

  const dead: string[] = [];
  let delivered = 0;

  await Promise.all(
    devices.map(async (device) => {
      const subscription = parseWebSubscription(device.token);
      if (!subscription) {
        dead.push(device.id);
        return;
      }
      try {
        await webpush.sendNotification(subscription, body, { TTL: 86_400 });
        delivered += 1;
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        // 404/410: the browser dropped this subscription for good.
        if (status === 404 || status === 410) dead.push(device.id);
        else logger.warn({ err: error, status }, 'push: web push failed');
      }
    }),
  );

  await retire(dead, 'gone');
  return delivered;
}
