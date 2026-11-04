import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { api } from '../../src/api/endpoints';
import type { AppNotification } from '../../src/api/types';
import { AppHeader } from '../../src/components/AppHeader';
import { Radius, Space, Type } from '../../src/theme';
import type { Palette } from '../../src/theme';
import { registerForPush, showLocalNotification, type PushResult } from '../../src/push';
import { useAuth } from '../../src/store/auth';
import { usePrefs } from '../../src/store/prefs';
import { useColors, useStyles } from '../../src/useTheme';

/**
 * What the marketplace has told this person, and the switch that lets it
 * reach them when the app is shut.
 *
 * The list is the record and works everywhere, including Expo Go. Push is an
 * extra on top and needs a development build, which the card says plainly
 * rather than failing silently.
 */
export default function NotificationsScreen() {
  const c = useColors();
  const styles = useStyles(makeStyles);
  const t = usePrefs((state) => state.t);
  const session = useAuth((state) => state.session);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [push, setPush] = useState<PushResult | null>(null);
  const [busy, setBusy] = useState(false);

  const notifications = useQuery({
    queryKey: ['notifications'],
    enabled: Boolean(session),
    queryFn: () => api.notifications(),
  });

  // Registering is idempotent, so doing it on arrival keeps the token fresh
  // without a separate "please enable" prompt somewhere else in the app.
  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    void registerForPush().then((result) => {
      if (!cancelled) setPush(result);
    });
    return () => {
      cancelled = true;
    };
  }, [session]);

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    void queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });
  };

  const open = async (item: AppNotification) => {
    if (!item.read) {
      await api.markNotificationRead(item.id).catch(() => undefined);
      refresh();
    }
    if (item.data?.conversationId) router.push(`/chat/${item.data.conversationId}`);
  };

  if (!session) {
    return (
      <View style={styles.screen}>
        <AppHeader showSearch={false} title={t('notifications')} />
        <View style={styles.centred}>
          <Ionicons name="notifications-outline" size={34} color={c.textFaint} />
          <Text style={styles.empty}>{t('signInToSeeNotifications')}</Text>
          <Pressable style={styles.button} onPress={() => router.push('/profile')}>
            <Text style={styles.buttonText}>{t('signIn')}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const items = notifications.data ?? [];
  const unread = items.filter((item) => !item.read).length;

  return (
    <View style={styles.screen}>
      <AppHeader showSearch={false} title={t('notifications')} />

      <FlatList
        style={styles.screen}
        contentContainerStyle={styles.list}
        data={items}
        keyExtractor={(item) => item.id}
        refreshing={notifications.isFetching}
        onRefresh={refresh}
        ListHeaderComponent={
          <View>
            <PushCard
              result={push}
              busy={busy}
              onEnable={async () => {
                setBusy(true);
                setPush(await registerForPush());
                setBusy(false);
              }}
              onTest={() => void showLocalNotification(t('notifications'), t('pushOn'))}
            />
            {unread > 0 ? (
              <Pressable style={styles.markAll} onPress={async () => {
                await api.markAllNotificationsRead();
                refresh();
              }}>
                <Text style={styles.markAllText}>{t('markAllRead')}</Text>
              </Pressable>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          notifications.isLoading ? (
            <View style={styles.centred}>
              <ActivityIndicator color={c.teal} />
            </View>
          ) : (
            <View style={styles.centred}>
              <Ionicons name="notifications-outline" size={34} color={c.textFaint} />
              <Text style={styles.emptyTitle}>{t('noNotifications')}</Text>
              <Text style={styles.empty}>{t('noNotificationsBody')}</Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <Pressable
            style={[styles.row, item.read ? null : styles.rowUnread]}
            onPress={() => void open(item)}
          >
            <View style={[styles.glyph, { backgroundColor: `${tintFor(item.type, c)}26` }]}>
              <Ionicons name={iconFor(item.type)} size={17} color={tintFor(item.type, c)} />
            </View>
            <View style={styles.body}>
              <Text style={[styles.title, item.read ? null : styles.titleUnread]} numberOfLines={2}>
                {item.title}
              </Text>
              {item.body ? (
                <Text style={styles.preview} numberOfLines={2}>
                  {item.body}
                </Text>
              ) : null}
              <Text style={styles.when}>{relativeTime(item.createdAt)}</Text>
            </View>
            {item.read ? null : <View style={styles.dot} />}
          </Pressable>
        )}
      />
    </View>
  );
}

function PushCard({
  result,
  busy,
  onEnable,
  onTest,
}: {
  result: PushResult | null;
  busy: boolean;
  onEnable: () => void;
  onTest: () => void;
}) {
  const c = useColors();
  const styles = useStyles(makeStyles);
  const t = usePrefs((state) => state.t);
  if (!result) return null;

  const message = result.ok
    ? t('pushOn')
    : result.reason === 'expo-go'
      ? t('pushExpoGo')
      : result.reason === 'denied'
        ? t('pushDenied')
        : t('pushOff');

  return (
    <View style={styles.card}>
      <Ionicons
        name={result.ok ? 'notifications' : 'notifications-off-outline'}
        size={20}
        color={c.teal}
      />
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle}>{t('pushNotifications')}</Text>
        <Text style={styles.cardText}>{message}</Text>
      </View>
      {result.ok ? (
        <Pressable style={styles.cardButton} onPress={onTest}>
          <Text style={styles.cardButtonText}>{t('testNotification')}</Text>
        </Pressable>
      ) : result.reason === 'failed' ? (
        <Pressable style={styles.cardButton} disabled={busy} onPress={onEnable}>
          <Text style={styles.cardButtonText}>{t('turnOn')}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** A glyph per kind, so the list scans without reading every line. */
function iconFor(type: string): keyof typeof Ionicons.glyphMap {
  switch (type) {
    case 'new_message':
      return 'chatbubble-ellipses';
    case 'listing_approved':
    case 'verification_result':
      return 'checkmark-circle';
    case 'listing_rejected':
      return 'alert-circle';
    default:
      return 'notifications';
  }
}

function tintFor(type: string, c: Palette): string {
  switch (type) {
    case 'listing_rejected':
      return c.gold;
    case 'new_message':
    case 'listing_approved':
    case 'verification_result':
      return c.teal;
    default:
      return c.textMuted;
  }
}

function relativeTime(iso: string): string {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3600)}h`;
  if (seconds < 604_800) return `${Math.floor(seconds / 86_400)}d`;
  return `${Math.floor(seconds / 604_800)}w`;
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    list: { padding: Space.md, gap: Space.sm, flexGrow: 1 },
    centred: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Space.sm, padding: Space.xl },
    emptyTitle: { fontSize: Type.body, fontWeight: '700', color: c.text },
    empty: { fontSize: Type.small, color: c.textMuted, textAlign: 'center' },

    button: {
      marginTop: Space.sm,
      paddingHorizontal: Space.xl,
      paddingVertical: Space.sm,
      borderRadius: Radius.pill,
      backgroundColor: c.teal,
    },
    buttonText: { color: c.white, fontWeight: '700' },

    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Space.sm,
      padding: Space.md,
      borderRadius: Radius.card,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.divider,
      marginBottom: Space.sm,
    },
    cardBody: { flex: 1 },
    cardTitle: { fontSize: Type.small, fontWeight: '700', color: c.text },
    cardText: { fontSize: Type.caption, color: c.textMuted },
    cardButton: {
      paddingHorizontal: Space.md,
      paddingVertical: 6,
      borderRadius: Radius.pill,
      borderWidth: 1,
      borderColor: c.divider,
    },
    cardButtonText: { fontSize: Type.caption, fontWeight: '700', color: c.text },

    markAll: { alignSelf: 'flex-end', paddingVertical: Space.xs },
    markAllText: { fontSize: Type.small, fontWeight: '700', color: c.teal },

    row: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: Space.sm,
      padding: Space.md,
      borderRadius: Radius.card,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.divider,
    },
    rowUnread: { borderColor: c.teal },
    glyph: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
    body: { flex: 1, gap: 2 },
    title: { fontSize: Type.small, fontWeight: '600', color: c.text },
    titleUnread: { fontWeight: '800' },
    preview: { fontSize: Type.caption, color: c.textMuted },
    when: { fontSize: Type.caption, color: c.textFaint, marginTop: 2 },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: c.teal, marginTop: 6 },
  });
