import { endpoints } from './api.js';

/**
 * Browser push: asking permission, subscribing, and telling the API where to
 * reach this browser.
 *
 * The subscription is created by the browser's own push service, so what we
 * store is the whole PushSubscription object -- an endpoint plus two keys --
 * rather than an opaque token. The API serialises it straight back out when
 * it sends.
 *
 * Everything here is optional. Push needs a service worker, the Push API, a
 * VAPID key from the server and the person's permission, and any of the four
 * can be missing: an iPhone before iOS 16.4, a browser in private mode, a
 * deployment with no keys configured, someone who said no. The marketplace
 * works the same in every case -- the notifications are still in the list.
 */

export type PushState = 'unsupported' | 'unconfigured' | 'denied' | 'off' | 'on';

export function pushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/** The VAPID public key arrives base64url-encoded; the Push API wants bytes. */
function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
  const binary = atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

let registration: ServiceWorkerRegistration | null = null;

async function worker(): Promise<ServiceWorkerRegistration> {
  registration ??= await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  // A worker registered a moment ago is not yet in control; subscribing
  // before it is active throws.
  await navigator.serviceWorker.ready;
  return registration;
}

export async function pushState(hasKey: boolean): Promise<PushState> {
  if (!pushSupported()) return 'unsupported';
  if (!hasKey) return 'unconfigured';
  if (Notification.permission === 'denied') return 'denied';
  if (Notification.permission !== 'granted') return 'off';

  const existing = await (await worker()).pushManager.getSubscription();
  return existing ? 'on' : 'off';
}

/**
 * Asks, subscribes, and registers. Returns the state afterwards, so the
 * caller can say what happened without asking again.
 */
export async function enablePush(vapidPublicKey: string): Promise<PushState> {
  if (!pushSupported()) return 'unsupported';

  const permission = await Notification.requestPermission();
  if (permission === 'denied') return 'denied';
  if (permission !== 'granted') return 'off';

  const reg = await worker();
  const subscription =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({
      // Every message must be visible to the user. Chrome enforces this, and
      // it is the right rule: a silent push is a tracking beacon.
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
    }));

  await endpoints.registerDevice({
    token: JSON.stringify(subscription.toJSON()),
    platform: 'web',
    deviceName: deviceName(),
    locale: navigator.language,
  });

  return 'on';
}

/** Unsubscribes this browser and retires the token server-side. */
export async function disablePush(): Promise<PushState> {
  if (!pushSupported()) return 'unsupported';

  const subscription = await (await worker()).pushManager.getSubscription();
  if (!subscription) return 'off';

  const token = JSON.stringify(subscription.toJSON());
  await subscription.unsubscribe();
  // Best effort: the browser has already stopped listening, so a failure
  // here leaves a dead row the sender retires on its next 410.
  await endpoints.forgetDevice(token).catch(() => undefined);
  return 'off';
}

/** Something recognisable in a list of devices, without fingerprinting. */
function deviceName(): string {
  const agent = navigator.userAgent;
  const browser = /Edg\//.test(agent)
    ? 'Edge'
    : /OPR\//.test(agent)
      ? 'Opera'
      : /Firefox\//.test(agent)
        ? 'Firefox'
        : /Chrome\//.test(agent)
          ? 'Chrome'
          : /Safari\//.test(agent)
            ? 'Safari'
            : 'Browser';
  const platform = /Android/.test(agent)
    ? 'Android'
    : /iPhone|iPad/.test(agent)
      ? 'iOS'
      : /Windows/.test(agent)
        ? 'Windows'
        : /Mac OS X/.test(agent)
          ? 'Mac'
          : /Linux/.test(agent)
            ? 'Linux'
            : '';
  return platform ? `${browser} on ${platform}` : browser;
}
