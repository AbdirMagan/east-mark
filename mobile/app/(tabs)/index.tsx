import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { api } from '../../src/api/endpoints';
import { AppHeader } from '../../src/components/AppHeader';
import { MediaTabs } from '../../src/components/MediaTabs';
import { ProductFeed } from '../../src/components/ProductFeed';
import { Radius, Space } from '../../src/theme';
import type { Palette } from '../../src/theme';
import { useColors, useStyles } from '../../src/useTheme';
import { useFeedContext } from '../../src/store/feed';
import { usePrefs } from '../../src/store/prefs';

/**
 * Home is the feed: one listing filling the screen at a time, swiped
 * vertically, the way TikTok shows one post at a time.
 */
export default function HomeScreen() {
  const c = useColors();
  const styles = useStyles(makeStyles);
  const t = usePrefs((state) => state.t);
  const countryId = usePrefs((state) => state.countryId);
  const cityId = usePrefs((state) => state.cityId);
  const currency = usePrefs((state) => state.currency);
  const router = useRouter();

  /**
   * What the feed shows, held in a store rather than in local state.
   *
   * Home is the feed, and tapping a card in Categories brings you here
   * positioned on that listing. A store carries that across, where route
   * params cannot: this screen is a tab, so arriving is a tab switch to a
   * screen that was never unmounted.
   *
   * Photo and video partition the whole catalogue between them -- "photo" is
   * a listing with no video, "video" is one that has one -- so the two tabs
   * together still show everything.
   */
  const media = useFeedContext((state) => state.media);
  const setMedia = useFeedContext((state) => state.setMedia);
  const start = useFeedContext((state) => state.start);
  const search = useFeedContext((state) => state.search);
  const categoryId = useFeedContext((state) => state.categoryId);

  const listings = useQuery({
    queryKey: ['products', 'home', media, search, categoryId, countryId, cityId, currency],
    queryFn: () =>
      api.products({ media, search, categoryId, sort: 'newest', countryId, cityId, limit: 40 }),
  });

  const items = listings.data ?? [];
  // Arriving from a card opens on that listing; arriving by tapping Home
  // starts at the top, because the tab clears it.
  const startIndex = start ? Math.max(0, items.findIndex((item) => item.id === start)) : 0;

  const refresh = () => void listings.refetch();

  return (
    <View style={styles.screen}>
      <AppHeader
        onRefresh={refresh}
        onSearch={(query) => router.push(`/categories?q=${encodeURIComponent(query)}`)}
      />

      <View style={styles.feed}>
        {listings.isLoading ? (
          <View style={styles.centred}>
            <ActivityIndicator color={c.white} />
          </View>
        ) : listings.isError ? (
          <View style={styles.centred}>
            <Text style={styles.message}>{t('offline')}</Text>
            <Pressable onPress={refresh} accessibilityRole="button" style={styles.retry}>
              <Text style={styles.retryText}>{t('retry')}</Text>
            </Pressable>
          </View>
        ) : !items.length ? (
          <View style={styles.centred}>
            <Text style={styles.message}>{media === 'video' ? t('noVideos') : t('noListings')}</Text>
          </View>
        ) : (
          <ProductFeed
            // Remount per arrival: initialScrollIndex is only read on mount,
            // and this screen is never unmounted.
            key={`${media}:${start ?? ''}`}
            products={items}
            initialIndex={startIndex}
            refreshing={listings.isRefetching}
            onRefresh={refresh}
            tint={c.white}
          />
        )}

        {/* Over the feed rather than above it, so the listing gets the whole
            screen -- the same place TikTok puts Following and For You. */}
        <MediaTabs media={media} onChange={setMedia} />
      </View>
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.navyDark },
  feed: { flex: 1 },
  centred: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Space.md, padding: Space.lg },
  message: { color: c.white, opacity: 0.85, textAlign: 'center' },
  retry: {
    paddingHorizontal: Space.xl,
    paddingVertical: Space.sm,
    borderRadius: Radius.pill,
    backgroundColor: c.teal,
  },
  retryText: { color: c.white, fontWeight: '700' },
});
