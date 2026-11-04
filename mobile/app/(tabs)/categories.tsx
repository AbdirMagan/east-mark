import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { api } from '../../src/api/endpoints';
import { ProductCardView } from '../../src/components/ProductCard';
import { Brand, Radius, Space } from '../../src/theme';
import { usePrefs } from '../../src/store/prefs';

export default function BrowseScreen() {
  const t = usePrefs((state) => state.t);
  const language = usePrefs((state) => state.language);
  const countryId = usePrefs((state) => state.countryId);

  // Home links in with a category or a media filter already chosen.
  const params = useLocalSearchParams<{ categoryId?: string; media?: string }>();
  const media = params.media === 'photo' || params.media === 'video' ? params.media : undefined;

  const [draft, setDraft] = useState('');
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(
    params.categoryId ? Number(params.categoryId) : null,
  );

  const categories = useQuery({
    queryKey: ['categories', language],
    queryFn: () => api.categories(language),
  });

  const products = useQuery({
    queryKey: ['products', 'browse', search, categoryId, media, countryId],
    queryFn: () => api.products({ search, categoryId, media, countryId, limit: 40 }),
  });

  return (
    <View style={styles.screen}>
      <View style={styles.searchRow}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          // Searching on every keystroke would be a request per character on
          // a connection that can barely afford one.
          onSubmitEditing={() => setSearch(draft.trim())}
          returnKeyType="search"
          placeholder={t('search')}
          placeholderTextColor={Brand.muted}
          style={styles.search}
        />
      </View>

      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={[{ id: 0, name: t('categories') }, ...(categories.data ?? [])]}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.chipRow}
        style={styles.chipStrip}
        renderItem={({ item }) => {
          const selected = item.id === 0 ? categoryId === null : categoryId === item.id;
          return (
            <Pressable
              onPress={() => setCategoryId(item.id === 0 ? null : item.id)}
              style={[styles.chip, selected && styles.chipSelected]}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{item.name}</Text>
            </Pressable>
          );
        }}
      />

      {products.isLoading ? (
        <ActivityIndicator color={Brand.acacia} style={{ marginTop: Space.xl }} />
      ) : (
        <FlatList
          data={products.data ?? []}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.column}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.cell}>
              <ProductCardView product={item} />
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

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Brand.sand },
  searchRow: { padding: Space.lg, paddingBottom: Space.md },
  search: {
    height: 46,
    borderRadius: Radius.field,
    borderWidth: 1,
    borderColor: Brand.sandDeep,
    backgroundColor: Brand.white,
    paddingHorizontal: Space.lg,
    fontSize: 15,
    color: Brand.ink,
  },
  chipStrip: { flexGrow: 0 },
  chipRow: { paddingHorizontal: Space.lg, gap: Space.sm, paddingBottom: Space.md },
  chip: {
    paddingHorizontal: Space.lg,
    paddingVertical: Space.sm,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Brand.sandDeep,
    backgroundColor: Brand.white,
  },
  chipSelected: { backgroundColor: Brand.acacia, borderColor: Brand.acacia },
  chipText: { fontSize: 14, color: Brand.ink },
  chipTextSelected: { color: Brand.white, fontWeight: '700' },
  list: { padding: Space.lg, paddingTop: 0, gap: Space.md },
  column: { gap: Space.md },
  cell: { flex: 1 },
  empty: { textAlign: 'center', color: Brand.muted, marginTop: Space.xl },
});
