import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { api } from './api/endpoints';

/**
 * Push, through Expo's service.
 *
 * Expo holds the APNs key and the FCM credentials, so one token covers both
 * phones and the backend sends to one endpoint. What we do here is ask, get
 * the token, and hand it over.
 *
 * Two things reliably go wrong and neither is a bug to fix at the call site:
 *
 *  - Expo Go cannot receive a remote push on SDK 53 and later. A development
 *    or production build can. Asking anyway in Expo Go throws, so this checks
 *    first and reports it rather than crashing a screen.
 *  - A simulator has no push token at all.
 *
 * In both cases the notification list still works. Push is how someone hears
 * about a notification early, not how they get it.
 */

export type PushResult =
  | { ok: true; token: string }
  | { ok: false; reason: 'denied' | 'simulator' | 'expo-go' | 'failed' };

/** Foreground behaviour: show it, rather than drop it because the app is open. */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

function inExpoGo(): boolean {
  return Constants.appOwnership === 'expo';
}

export async function registerForPush(): Promise<PushResult> {
  if (!Device.isDevice) return { ok: false, reason: 'simulator' };
  if (inExpoGo()) return { ok: false, reason: 'expo-go' };

  if (Platform.OS === 'android') {
    // Android needs a channel before anything can be posted into it.
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Messages and listings',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const existing = await Notifications.getPermissionsAsync();
  const granted =
    existing.granted ||
    (await Notifications.requestPermissionsAsync()).granted;
  if (!granted) return { ok: false, reason: 'denied' };

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;

  try {
    const token = (await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    )).data;

    await api.registerDevice({
      token,
      platform: Platform.OS === 'ios' ? 'ios' : 'android',
      deviceName: Device.deviceName ?? Device.modelName ?? undefined,
      locale: undefined,
    });

    return { ok: true, token };
  } catch {
    return { ok: false, reason: 'failed' };
  }
}

/** Signing out: stop sending to this phone for this account. */
export async function unregisterPush(): Promise<void> {
  try {
    const token = (await Notifications.getExpoPushTokenAsync()).data;
    await api.forgetDevice(token);
  } catch {
    // No token, no permission, or offline. The sender retires dead tokens
    // when the push service rejects them, so there is nothing to chase here.
  }
}

/**
 * Raises a notification on this phone, with no server involved.
 *
 * Used to prove the pipe end to end from the Notifications screen: if this
 * shows and a real one does not, the problem is delivery, not the phone.
 */
export async function showLocalNotification(title: string, body: string): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: { title, body },
    trigger: null,
  });
}
