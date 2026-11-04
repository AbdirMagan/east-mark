import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { api } from '../../src/api/endpoints';
import { ProductCardView } from '../../src/components/ProductCard';
import { Radius, Space } from '../../src/theme';
import type { Palette } from '../../src/theme';
import { useColors, useStyles } from '../../src/useTheme';
import { AppHeader } from '../../src/components/AppHeader';
import { useFeedContext } from '../../src/store/feed';
import { usePrefs } from '../../src/store/prefs';

export default function BrowseScreen() {
  const c = useColors();
  const styles = useStyles(makeStyles);
  const t = usePrefs((state) => state.t);
  const language = usePrefs((state) => state.language);
  const countryId = usePrefs((state) => state.countryId);
  const cityId = usePrefs((state) => state.cityId);
  const openListing = useFeedContext((state) => state.openListing);
  const router = useRouter();
  const currency = usePrefs((state) => state.currency);

  // Home links in with a category or a media filter already chosen.
  const params = useLocalSearchParams<{ categoryId?: string; media?: string }>();
  const media = params.media === 'photo' || params.media === 'video' ? params.media : undefined;

  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(
    params.categoryId ? Number(params.categoryId) : null,
  );

  const categories = useQuery({
    queryKey: ['categories', language],
    queryFn: () => api.categories(language),
  });

  const products = useQuery({
    queryKey: ['products', 'browse', search, categoryId, media, countryId, cityId, currency],
    queryFn: () => api.products({ search, categoryId, media, countryId, cityId, limit: 40 }),
  });

  return (
    <View style={styles.screen}>
      <AppHeader onSearch={setSearch} onRefresh={() => void products.refetch()} />
      <View style={styles.chipStrip}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {[{ id: 0, name: t('categories') }, ...(categories.data ?? [])].map((item) => {
            const selected = item.id === 0 ? categoryId === null : categoryId === item.id;
            return (
              <Pressable
                key={item.id}
                onPress={() => setCategoryId(item.id === 0 ? null : item.id)}
                style={[styles.chip, selected && styles.chipSelected]}
              >
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                  {item.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {products.isLoading ? (
        <ActivityIndicator color={c.teal} style={{ marginTop: Space.xl }} />
      ) : (
        <FlatList
          data={products.data ?? []}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.column}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.cell}>
              <ProductCardView
                product={item}
                onPress={() => {
                  // The feed follows the listing, not the grid's filter: photo
                  // and video are disjoint lists, so opening a video listing
                  // in the photo feed lands on something unrelated.
                  openListing({
                    start: item.id,
                    media: item.hasVideo ? 'video' : 'photo',
                    search,
                    categoryId,
                  });
                  router.push('/');
                }}
              />
            </View>
          )}
          ListEmptyComponent={<Text style={styles.empty}>{t('noListings')}</Text>}
          refreshing={products.isFetching}
          onRefresh={() => void products.refetch()}
        />
      )}
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.bg },
  // A fixed height: a horizontal strip inside a flex column has none of
  // its own, and came out clipped to half a chip.
  chipStrip: { height: 56, justifyContent: 'center' },
  chipRow: { paddingHorizontal: Space.lg, gap: Space.sm, alignItems: 'center' },
  chip: {
    paddingHorizontal: Space.lg,
    paddingVertical: Space.sm,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: c.divider,
    backgroundColor: c.surface,
  },
  chipSelected: { backgroundColor: c.teal, borderColor: c.teal },
  chipText: { fontSize: 15, color: c.text },
  chipTextSelected: { color: c.white, fontWeight: '700' },
  list: { padding: Space.lg, paddingTop: 0, gap: Space.md },
  column: { gap: Space.md },
  cell: { flex: 1 },
  empty: { textAlign: 'center', color: c.textMuted, marginTop: Space.xl },
});
