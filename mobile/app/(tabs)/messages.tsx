import { useQuery } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { api } from '../../src/api/endpoints';
import { Radius, Space, formatPrice } from '../../src/theme';
import type { Palette } from '../../src/theme';
import { useColors, useStyles } from '../../src/useTheme';
import { useAuth } from '../../src/store/auth';
import { AppHeader } from '../../src/components/AppHeader';
import { usePrefs } from '../../src/store/prefs';

export default function MessagesScreen() {
  const c = useColors();
  const styles = useStyles(makeStyles);
  const t = usePrefs((state) => state.t);
  const currency = usePrefs((state) => state.currency);
  const session = useAuth((state) => state.session);

  const conversations = useQuery({
    queryKey: ['conversations'],
    // Signed out there is nothing to fetch, and asking anyway earns a 401
    // on every visit to the tab.
    enabled: Boolean(session),
    queryFn: () => api.conversations(),
  });

  if (!session) {
    return (
      <View style={styles.screen}>
      <AppHeader showSearch={false} />
      <View style={styles.centred}>
        <Text style={styles.empty}>{t('signInToMessage')}</Text>
        <Link href="/profile" asChild>
          <Pressable style={styles.button}>
            <Text style={styles.buttonText}>{t('signIn')}</Text>
          </Pressable>
        </Link>
      </View>
      </View>
    );
  }

  if (conversations.isLoading) {
    return (
      <View style={styles.centred}>
        <ActivityIndicator color={c.teal} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
    <AppHeader showSearch={false} />
    <FlatList
      style={styles.screen}
      contentContainerStyle={styles.list}
      data={conversations.data ?? []}
      keyExtractor={(item) => item.id}
      refreshing={conversations.isFetching}
      onRefresh={() => void conversations.refetch()}
      ListEmptyComponent={<Text style={styles.empty}>{t('noMessages')}</Text>}
      renderItem={({ item }) => (
        <Link href={`/chat/${item.id}`} asChild>
          <Pressable style={styles.row}>
            <View style={styles.rowBody}>
              <Text style={styles.name} numberOfLines={1}>
                {item.otherParty.name}
              </Text>
              {item.product ? (
                <Text style={styles.product} numberOfLines={1}>
                  {item.product.title} · {formatPrice(item.product.price, item.product.currency, currency)}
                </Text>
              ) : null}
              <Text style={styles.preview} numberOfLines={1}>
                {item.lastSenderIsMe && item.lastMessagePreview ? '↩ ' : ''}
                {item.lastMessagePreview ?? '—'}
              </Text>
            </View>
            {item.unreadCount > 0 ? (
              <View style={styles.unread}>
                <Text style={styles.unreadText}>{item.unreadCount}</Text>
              </View>
            ) : null}
          </Pressable>
        </Link>
      )}
    />
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.bg },
  list: { padding: Space.lg, gap: Space.md },
  centred: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Space.lg,
    backgroundColor: c.bg,
    padding: Space.xl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
    padding: Space.lg,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: c.divider,
    backgroundColor: c.surface,
  },
  rowBody: { flex: 1, gap: 2 },
  name: { fontSize: 15, fontWeight: '700', color: c.text },
  product: { fontSize: 12, color: c.teal },
  preview: { fontSize: 13, color: c.textMuted },
  unread: {
    minWidth: 24,
    height: 24,
    paddingHorizontal: 6,
    borderRadius: 12,
    backgroundColor: c.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadText: { color: c.white, fontSize: 12, fontWeight: '700' },
  empty: { color: c.textMuted, textAlign: 'center' },
  button: {
    height: 48,
    paddingHorizontal: Space.xl,
    borderRadius: Radius.pill,
    backgroundColor: c.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { color: c.white, fontWeight: '700' },
});
