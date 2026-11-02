import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Brand, Radius, Space, formatPrice } from '../theme';
import { cardImage, type ProductCard as Card } from '../api/types';
import { usePrefs } from '../store/prefs';

/**
 * A listing card: a 4:3 photo, the price first, then the title and place.
 *
 * The price leads because it is what a buyer scans for. The photo is a fixed
 * 4:3 box the image is cropped into, so a column of cards keeps its rhythm
 * whatever shape the seller's photo happened to be.
 */
export function ProductCardView({ product }: { product: Card }) {
  const t = usePrefs((state) => state.t);
  const image = cardImage(product);

  return (
    <Link href={`/product/${product.ref}`} asChild>
      <Pressable style={styles.card}>
        <View style={styles.photo}>
          {image ? (
            <Image
              source={{ uri: image }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              // A listing grid on a 2G connection is mostly waiting, so fade
              // the photo in rather than snapping a half-drawn image into place.
              transition={180}
            />
          ) : (
            <View style={[StyleSheet.absoluteFill, styles.placeholder]} />
          )}

          {product.hasVideo ? (
            <View style={styles.badge}>
              {/* A badge, not a player: a scrolling grid that autoplays video
                  would spend a buyer's data bundle before a single tap. */}
              <Text style={styles.badgeText}>▶ {t('video')}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.body}>
          <Text style={styles.price} numberOfLines={1}>
            {formatPrice(product.price, product.currency)}
          </Text>
          <Text style={styles.title} numberOfLines={2}>
            {product.title}
          </Text>
          <Text style={styles.place} numberOfLines={1}>
            {product.city ?? '—'}
          </Text>
        </View>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: Brand.white,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Brand.sandDeep,
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    aspectRatio: 4 / 3,
    backgroundColor: Brand.sandDeep,
  },
  placeholder: { backgroundColor: Brand.sandDeep },
  badge: {
    position: 'absolute',
    top: Space.sm,
    right: Space.sm,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: Radius.pill,
    paddingHorizontal: Space.sm,
    paddingVertical: 3,
  },
  badgeText: { color: Brand.white, fontSize: 10, fontWeight: '700' },
  body: { padding: Space.md, gap: Space.xs },
  price: { fontSize: 15, fontWeight: '700', color: Brand.ink },
  title: { fontSize: 13, color: Brand.ink, opacity: 0.75, minHeight: 34 },
  place: { fontSize: 11, color: Brand.muted },
});
