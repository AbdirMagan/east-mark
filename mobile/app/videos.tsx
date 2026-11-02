import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { api } from '../src/api/endpoints';
import { Brand, Radius, Space, formatPrice } from '../src/theme';
import { usePrefs } from '../src/store/prefs';
import type { ProductCard } from '../src/api/types';

/**
 * One listing at a time, full screen, swiped vertically.
 *
 * Only the slide on screen plays. Letting neighbours play would mean three
 * videos streaming at once on a connection that struggles with one, and the
 * bill lands on the buyer.
 */
export default function VideoFeedScreen() {
  const t = usePrefs((state) => state.t);
  const countryId = usePrefs((state) => state.countryId);
  const [currentIndex, setCurrentIndex] = useState(0);
  const { height } = Dimensions.get('window');

  const videos = useQuery({
    queryKey: ['products', 'videos', countryId],
    queryFn: () => api.products({ media: 'video', countryId, limit: 20 }),
  });

  // Held in a ref because FlatList keeps the first callback it is given, and
  // a new function each render makes it warn about a changing config.
  // Typed inline: this version of react-native does not export ViewToken.
  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: Array<{ index?: number | null }> }) => {
      const first = viewableItems[0];
      if (typeof first?.index === 'number') setCurrentIndex(first.index);
    },
  ).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 80 }).current;

  if (videos.isLoading) {
    return (
      <View style={styles.centred}>
        <ActivityIndicator color={Brand.white} />
      </View>
    );
  }

  if (!videos.data?.length) {
    return (
      <View style={styles.centred}>
        <Text style={styles.empty}>{t('noVideos')}</Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.screen}
      data={videos.data}
      keyExtractor={(item) => item.id}
      pagingEnabled
      showsVerticalScrollIndicator={false}
      onViewableItemsChanged={onViewableItemsChanged}
      viewabilityConfig={viewabilityConfig}
      // Fixed-height pages, so the list can jump without measuring every slide.
      getItemLayout={(_, index) => ({ length: height, offset: height * index, index })}
      renderItem={({ item, index }) => (
        <Slide product={item} height={height} active={index === currentIndex} />
      )}
    />
  );
}

function Slide({
  product,
  height,
  active,
}: {
  product: ProductCard;
  height: number;
  active: boolean;
}) {
  const t = usePrefs((state) => state.t);
  const router = useRouter();
  const [muted, setMuted] = useState(true);

  const player = useVideoPlayer(product.videoUrl ?? '', (instance) => {
    instance.loop = true;
    // Starts muted: a feed that blares audio in a shared room is a feed
    // people close.
    instance.muted = true;
  });

  useEffect(() => {
    if (active) player.play();
    else player.pause();
  }, [active, player]);

  useEffect(() => {
    player.muted = muted;
  }, [muted, player]);

  return (
    <View style={[styles.slide, { height }]}>
      <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />

      <Pressable style={StyleSheet.absoluteFill} onPress={() => setMuted((previous) => !previous)}>
        <View />
      </Pressable>

      <View style={styles.overlay}>
        <Text style={styles.price}>{formatPrice(product.price, product.currency)}</Text>
        <Text style={styles.title} numberOfLines={2}>
          {product.title}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {[product.city, product.seller.name].filter(Boolean).join(' · ')}
        </Text>

        <View style={styles.actions}>
          <Pressable onPress={() => router.push(`/product/${product.ref}`)} style={styles.buy}>
            <Text style={styles.buyText}>{t('buy')}</Text>
          </Pressable>
          <Pressable onPress={() => setMuted((previous) => !previous)} style={styles.sound}>
            <Text style={styles.soundText}>{muted ? t('soundOff') : t('soundOn')}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Brand.ink },
  centred: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Brand.ink },
  empty: { color: Brand.white, opacity: 0.8 },
  slide: { width: '100%', backgroundColor: Brand.ink, justifyContent: 'flex-end' },
  overlay: { padding: Space.lg, paddingBottom: Space.xl * 2, gap: Space.xs },
  price: { color: Brand.white, fontSize: 26, fontWeight: '800' },
  title: { color: Brand.white, fontSize: 17, fontWeight: '600' },
  meta: { color: Brand.white, opacity: 0.8, fontSize: 13 },
  actions: { flexDirection: 'row', gap: Space.md, marginTop: Space.md },
  buy: {
    paddingHorizontal: Space.xl,
    height: 46,
    borderRadius: Radius.pill,
    backgroundColor: Brand.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buyText: { color: Brand.ink, fontWeight: '800' },
  sound: {
    paddingHorizontal: Space.lg,
    height: 46,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  soundText: { color: Brand.white, fontWeight: '600', fontSize: 13 },
});
