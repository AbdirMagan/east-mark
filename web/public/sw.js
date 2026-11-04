/*
 * The service worker, which exists for one reason: to receive a push while
 * the site is closed and raise a notification for it.
 *
 * No caching. A marketplace where the prices, the listings and the inbox are
 * all stale by a day is worse than one that says it is offline, and a cache
 * here would be a second, invisible copy of the app to keep in step with
 * every deploy.
 */

self.addEventListener('install', () => {
  // Replace the previous worker immediately rather than waiting for every
  // tab to close -- otherwise a fix to this file can sit unused for days.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'Magan Market', body: event.data.text() };
  }

  const title = payload.title || 'Magan Market';
  event.waitUntil(
    self.registration.showNotification(title, {
      body: payload.body || '',
      icon: '/icon-192.png',
      badge: '/favicon-32.png',
      image: payload.imageUrl || undefined,
      // One notification per conversation, not one per message: a thread that
      // gets five replies should update a single line on the lock screen.
      tag: payload.data?.conversationId || payload.notificationId || 'magan-market',
      renotify: true,
      data: { ...(payload.data || {}), notificationId: payload.notificationId || null },
    }),
  );
});

/**
 * A tap opens the thing the notification was about, in a tab that is already
 * open where there is one. Opening a second copy of a site someone already
 * has open is a small rudeness that adds up.
 */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  let path = '/';
  if (data.route === 'chat' && data.conversationId) path = `/messages/${data.conversationId}`;
  else if (data.route === 'chat') path = '/messages';
  else if (data.route === 'product' && data.productId) path = `/product/${data.productId}`;
  else if (data.route === 'notifications') path = '/notifications';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          client.navigate(new URL(path, self.registration.scope).href);
          return client.focus();
        }
      }
      return self.clients.openWindow(path);
    }),
  );
});
