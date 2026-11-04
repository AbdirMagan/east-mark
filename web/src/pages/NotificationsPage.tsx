import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { Icon } from '../components/ui/Icon.js';
import { useNotifications } from '../hooks/useMarketData.js';
import { useSeo } from '../hooks/useSeo.js';
import { endpoints, type AppNotification } from '../lib/api.js';
import { disablePush, enablePush, pushState, type PushState } from '../lib/push.js';
import { useConfig } from '../hooks/useMarketData.js';
import { useAuth } from '../store/auth.js';
import { useI18n } from '../i18n/index.js';

/**
 * Everything the marketplace has told this person, and the switch that
 * decides whether it may also interrupt them.
 *
 * The list is the record and works everywhere. Browser push is an extra on
 * top, offered only where the browser supports it and the deployment has a
 * key -- an iPhone on iOS 15, a private window, a server with no VAPID pair:
 * the page is the same, it just does not offer the switch.
 */
export function NotificationsPage() {
  const { t } = useI18n();
  const session = useAuth((state) => state.session);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: config } = useConfig();
  const { data: items, isLoading } = useNotifications(Boolean(session));
  const [push, setPush] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);

  useSeo({ title: t('notifications.title'), noIndex: true });

  const webPushKey = (config as { webPushKey?: string | null } | undefined)?.webPushKey ?? null;

  useEffect(() => {
    let cancelled = false;
    void pushState(Boolean(webPushKey)).then((state) => {
      if (!cancelled) setPush(state);
    });
    return () => {
      cancelled = true;
    };
  }, [webPushKey]);

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    void queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });
  };

  const open = async (notification: AppNotification) => {
    if (!notification.read) {
      await endpoints.markNotificationRead(notification.id).catch(() => undefined);
      refresh();
    }
    const data = notification.data as { route?: string; conversationId?: string; productId?: string };
    if (data.route === 'chat' && data.conversationId) navigate(`/messages/${data.conversationId}`);
    else if (data.route === 'chat') navigate('/messages');
    else if (data.route === 'product' && data.productId) navigate(`/product/${data.productId}`);
  };

  const togglePush = async () => {
    if (!webPushKey) return;
    setBusy(true);
    try {
      setPush(push === 'on' ? await disablePush() : await enablePush(webPushKey));
      refresh();
    } finally {
      setBusy(false);
    }
  };

  if (!session) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-xl font-bold text-text-primary">{t('notifications.title')}</h1>
        <p className="mt-2 text-text-secondary">{t('notifications.signedOut')}</p>
        <Link
          to="/signin"
          className="mt-6 inline-flex h-11 items-center rounded-(--radius-field) bg-brand px-6 font-semibold text-white"
        >
          {t('auth.signIn')}
        </Link>
      </div>
    );
  }

  const unread = (items ?? []).filter((item) => !item.read).length;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-text-primary">{t('notifications.title')}</h1>
        {unread > 0 ? (
          <button
            type="button"
            className="text-sm font-semibold text-brand hover:underline"
            onClick={async () => {
              await endpoints.markAllNotificationsRead();
              refresh();
            }}
          >
            {t('notifications.markAll')}
          </button>
        ) : null}
      </div>

      {push && push !== 'unsupported' && push !== 'unconfigured' ? (
        <div className="mt-4 flex items-center gap-3 rounded-(--radius-card) border border-border-subtle bg-surface-raised p-4">
          <Icon name={push === 'on' ? 'bell' : 'bell-off'} size={20} className="shrink-0 text-brand" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-text-primary">{t('notifications.pushTitle')}</p>
            <p className="text-xs text-text-secondary">
              {push === 'denied' ? t('notifications.pushBlocked') : t('notifications.pushBody')}
            </p>
          </div>
          {push !== 'denied' ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void togglePush()}
              className="h-9 shrink-0 rounded-(--radius-field) border border-border-subtle px-3 text-sm font-semibold text-text-primary disabled:opacity-50"
            >
              {push === 'on' ? t('notifications.turnOff') : t('notifications.turnOn')}
            </button>
          ) : null}
        </div>
      ) : null}

      {isLoading ? (
        <div className="mt-6 space-y-2">
          {[0, 1, 2].map((key) => (
            <div key={key} className="h-20 animate-pulse rounded-(--radius-card) bg-surface-sunken" />
          ))}
        </div>
      ) : !items?.length ? (
        <div className="mt-10 text-center">
          <Icon name="bell" size={32} className="mx-auto text-text-muted" />
          <p className="mt-3 font-semibold text-text-primary">{t('notifications.emptyTitle')}</p>
          <p className="mt-1 text-sm text-text-secondary">{t('notifications.emptyBody')}</p>
        </div>
      ) : (
        <ul className="mt-4 space-y-2">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => void open(item)}
                className={`flex w-full gap-3 rounded-(--radius-card) border p-4 text-left transition-colors ${
                  item.read
                    ? 'border-border-subtle bg-surface-raised'
                    : 'border-brand/30 bg-brand/5'
                }`}
              >
                <span
                  aria-hidden
                  className={`mt-1.5 size-2 shrink-0 rounded-full ${item.read ? 'bg-transparent' : 'bg-brand'}`}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-text-primary">{item.title}</span>
                  {item.body ? (
                    <span className="mt-0.5 block text-sm text-text-secondary line-clamp-2">{item.body}</span>
                  ) : null}
                  <span className="mt-1 block text-xs text-text-muted">{when(item.createdAt)}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** "3h" reads faster than a date when everything is from this week. */
function when(iso: string): string {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3600)}h`;
  if (seconds < 604_800) return `${Math.floor(seconds / 86_400)}d`;
  return new Date(iso).toLocaleDateString();
}
