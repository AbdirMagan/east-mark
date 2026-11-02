import { useQuery } from '@tanstack/react-query';
import { Link, useRouter } from 'expo-router';
import { useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { api } from '../../src/api/endpoints';
import { ProductCardView } from '../../src/components/ProductCard';
import { Brand, Radius, Space } from '../../src/theme';
import { usePrefs } from '../../src/store/prefs';
import type { HomeAd, ProductCard } from '../../src/api/types';

export default function HomeScreen() {
  const t = usePrefs((state) => state.t);
  const language = usePrefs((state) => state.language);
  const countryId = usePrefs((state) => state.countryId);
  const router = useRouter();

  const ads = useQuery({
    queryKey: ['ads', language, countryId],
    queryFn: () => api.homeAds(language, countryId),
  });

  const categories = useQuery({
    queryKey: ['categories', language],
    queryFn: () => api.categories(language),
  });

  const featured = useQuery({
    queryKey: ['products', 'featured', countryId],
    queryFn: () => api.products({ featuredOnly: true, countryId, limit: 10 }),
  });

  const recent = useQuery({
    queryKey: ['products', 'recent', countryId],
    queryFn: () => api.products({ sort: 'newest', countryId, limit: 20 }),
  });

  const refreshing = ads.isFetching || recent.isFetching;
  const refresh = () => {
    void ads.refetch();
    void categories.refetch();
    void featured.refetch();
    void recent.refetch();
  };

  // The first thing the API fails at is usually the first thing it is asked
  // for, so show one message rather than four identical ones.
  const offline = recent.isError || categories.isError;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={Brand.acacia} />}
    >
      {offline ? (
        <View style={styles.offline}>
          <Text style={styles.offlineText}>{t('offline')}</Text>
          <Pressable onPress={refresh} accessibilityRole="button">
            <Text style={styles.offlineAction}>{t('retry')}</Text>
          </Pressable>
        </View>
      ) : null}

      {ads.data?.length ? <HeroCarousel ads={ads.data} /> : null}

      <Section title={t('categories')}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {(categories.data ?? []).map((category) => (
            <Pressable
              key={category.id}
              onPress={() => router.push(`/browse?categoryId=${category.id}`)}
              style={styles.chip}
            >
              <Text style={styles.chipText}>{category.name}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </Section>

      <View style={styles.modes}>
        <ModeCard
          title={t('photoListings')}
          hint={t('photoListingsHint')}
          onPress={() => router.push('/browse?media=photo')}
        />
        <ModeCard
          title={t('videoListings')}
          hint={t('videoListingsHint')}
          onPress={() => router.push('/videos')}
        />
      </View>

      {featured.data?.length ? (
        <Section title={t('featured')}>
          <Grid products={featured.data} />
        </Section>
      ) : null}

      <Section title={t('recent')}>
        {recent.isLoading ? (
          <ActivityIndicator color={Brand.acacia} style={{ marginVertical: Space.xl }} />
        ) : recent.data?.length ? (
          <Grid products={recent.data} />
        ) : (
          <Text style={styles.empty}>{t('noListings')}</Text>
        )}
      </Section>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

/**
 * Two columns, each card half the width minus the gap.
 *
 * Deliberately a wrapping flex row rather than a FlatList: these lists are
 * capped at twenty and already inside a ScrollView, and nesting a virtualised
 * list in a scroll view is what produces the "VirtualizedLists should never be
 * nested" warning along with broken scrolling.
 */
function Grid({ products }: { products: ProductCard[] }) {
  return (
    <View style={styles.grid}>
      {products.map((product) => (
        <View key={product.id} style={styles.gridCell}>
          <ProductCardView product={product} />
        </View>
      ))}
    </View>
  );
}

function ModeCard({ title, hint, onPress }: { title: string; hint: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.modeCard} accessibilityRole="button">
      <Text style={styles.modeTitle}>{title}</Text>
      <Text style={styles.modeHint}>{hint}</Text>
    </Pressable>
  );
}

/** The promotional strip. Horizontal paging rather than a timer: a carousel
 *  that moves on its own takes the page away from whoever was reading it. */
function HeroCarousel({ ads }: { ads: HomeAd[] }) {
  const themes = useMemo(
    () => ({
      acacia: Brand.acacia,
      clay: Brand.clay,
      navy: Brand.navy,
      sun: Brand.sun,
    }) as Record<string, string>,
    [],
  );

  return (
    <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={styles.hero}>
      {ads.map((ad) => (
        <Link key={ad.id} href={ad.categoryId ? `/browse?categoryId=${ad.categoryId}` : '/browse'} asChild>
          <Pressable
            onPress={() => void api.recordAdClick(ad.id)}
            style={[styles.heroCard, { backgroundColor: themes[ad.theme ?? ''] ?? Brand.acacia }]}
          >
            {ad.badge ? (
              <View style={styles.heroBadge}>
                <Text style={styles.heroBadgeText}>{ad.badge}</Text>
              </View>
            ) : null}
            <Text style={styles.heroTitle}>{ad.title}</Text>
            {ad.subtitle ? <Text style={styles.heroSubtitle}>{ad.subtitle}</Text> : null}
          </Pressable>
        </Link>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Brand.sand },
  content: { paddingVertical: Space.md, gap: Space.xl },

  offline: {
    marginHorizontal: Space.lg,
    padding: Space.md,
    borderRadius: Radius.field,
    backgroundColor: Brand.sandDeep,
    gap: Space.xs,
  },
  offlineText: { color: Brand.ink, fontSize: 13 },
  offlineAction: { color: Brand.acacia, fontWeight: '700', fontSize: 13 },

  hero: { paddingLeft: Space.lg },
  heroCard: {
    width: 300,
    minHeight: 150,
    marginRight: Space.md,
    padding: Space.lg,
    borderRadius: Radius.card,
    justifyContent: 'center',
    gap: Space.sm,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Brand.sun,
    borderRadius: Radius.pill,
    paddingHorizontal: Space.md,
    paddingVertical: 3,
  },
  heroBadgeText: { fontSize: 11, fontWeight: '800', color: Brand.ink },
  heroTitle: { color: Brand.white, fontSize: 20, fontWeight: '800' },
  heroSubtitle: { color: Brand.white, opacity: 0.9, fontSize: 13 },

  section: { gap: Space.md },
  sectionTitle: { paddingHorizontal: Space.lg, fontSize: 17, fontWeight: '800', color: Brand.ink },

  chipRow: { paddingHorizontal: Space.lg, gap: Space.sm },
  chip: {
    paddingHorizontal: Space.lg,
    paddingVertical: Space.md,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Brand.sandDeep,
    backgroundColor: Brand.white,
  },
  chipText: { fontSize: 14, color: Brand.ink },

  modes: { flexDirection: 'row', gap: Space.md, paddingHorizontal: Space.lg },
  modeCard: {
    flex: 1,
    padding: Space.lg,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Brand.sandDeep,
    backgroundColor: Brand.white,
    gap: Space.xs,
  },
  modeTitle: { fontSize: 15, fontWeight: '700', color: Brand.ink },
  modeHint: { fontSize: 12, color: Brand.muted },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Space.lg,
    gap: Space.md,
  },
  // Half the row minus half the gap. Written out rather than using percentages
  // so the two columns stay equal when the gap changes.
  gridCell: { width: '48%', flexGrow: 1 },

  empty: { paddingHorizontal: Space.lg, color: Brand.muted },
});
