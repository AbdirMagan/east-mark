import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { api } from '../../src/api/endpoints';
import { AppHeader } from '../../src/components/AppHeader';
import { ProductFeed } from '../../src/components/ProductFeed';
import type { Palette } from '../../src/theme';
import { useColors, useStyles } from '../../src/useTheme';
import { usePrefs } from '../../src/store/prefs';

/** Video listings only, one at a time, full screen, swiped vertically. */
export default function VideoFeedScreen() {
  const c = useColors();
  const styles = useStyles(makeStyles);
  const t = usePrefs((state) => state.t);
  const countryId = usePrefs((state) => state.countryId);
  const cityId = usePrefs((state) => state.cityId);
  const currency = usePrefs((state) => state.currency);
  const router = useRouter();

  const videos = useQuery({
    queryKey: ['products', 'videos', countryId, cityId, currency],
    queryFn: () => api.products({ media: 'video', countryId, cityId, limit: 20 }),
  });

  return (
    <View style={styles.screen}>
      <AppHeader title={t('videoListings')} onBack={() => router.back()} showSearch={false} />

      {videos.isLoading ? (
        <View style={styles.centred}>
          <ActivityIndicator color={c.white} />
        </View>
      ) : !videos.data?.length ? (
        <View style={styles.centred}>
          <Text style={styles.empty}>{t('noVideos')}</Text>
        </View>
      ) : (
        <ProductFeed
          products={videos.data}
          refreshing={videos.isRefetching}
          onRefresh={() => void videos.refetch()}
          tint={c.white}
        />
      )}
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.navyDark },
  centred: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { color: c.white, opacity: 0.8 },
});
