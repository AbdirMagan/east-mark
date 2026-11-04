import { useIsFocused } from 'expo-router';
import { useRef, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View, type LayoutChangeEvent } from 'react-native';

import type { ProductCard } from '../api/types';
import { FeedSlide } from './FeedSlide';

/**
 * Listings one at a time, each filling the screen, swiped vertically -- the
 * TikTok feed. Used by home and by the video feed.
 */
export function ProductFeed({
  products,
  refreshing = false,
  onRefresh,
  tint,
  initialIndex = 0,
}: {
  products: ProductCard[];
  refreshing?: boolean;
  onRefresh?: () => void;
  tint?: string;
  /** Which listing to open on, for a feed entered by tapping a card. */
  initialIndex?: number;
}) {
  // Starts at the listing that was tapped, so the first slide is already the
  // right one rather than the top of the list scrolling past.
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  // A video keeps playing behind another tab or a pushed listing unless the
  // feed knows it has been left.
  const focused = useIsFocused();

  /**
   * The height of the list, not of the window.
   *
   * A slide has to be exactly as tall as the viewport or paging drifts: sized
   * to the window it overshoots by the header and the tab bar, and the feed
   * settles showing the bottom of one listing and the top of the next. Measured
   * rather than calculated, because the header's height depends on the notch
   * and the bar on the home indicator.
   */
  const [viewport, setViewport] = useState(0);
  const onLayout = (event: LayoutChangeEvent) => setViewport(event.nativeEvent.layout.height);

  // Held in a ref because FlatList keeps the first callback it is given, and a
  // new function each render makes it warn about a changing config.
  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: Array<{ index?: number | null }> }) => {
      const first = viewableItems[0];
      if (typeof first?.index === 'number') setCurrentIndex(first.index);
    },
  ).current;
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 80 }).current;

  return (
    <View style={styles.list} onLayout={onLayout}>
      {viewport > 0 ? (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          initialScrollIndex={initialIndex}
          pagingEnabled
          // Stops a hard flick from sailing past several listings at once.
          disableIntervalMomentum
          decelerationRate="fast"
          showsVerticalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          // Fixed-height pages, so the list can jump without measuring each one.
          getItemLayout={(_, index) => ({ length: viewport, offset: viewport * index, index })}
          // Each slide is a full-screen image or video; keep only the
          // neighbours mounted.
          windowSize={3}
          initialNumToRender={1}
          maxToRenderPerBatch={2}
          refreshControl={
            onRefresh ? (
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={tint} />
            ) : undefined
          }
          renderItem={({ item, index }) => (
            <FeedSlide product={item} height={viewport} active={focused && index === currentIndex} />
          )}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { flex: 1 },
});
