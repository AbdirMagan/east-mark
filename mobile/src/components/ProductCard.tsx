import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Radius, Space, formatPrice } from '../theme';
import type { Palette } from '../theme';
import { useColors, useStyles } from '../useTheme';
import { cardImage, type ProductCard as Card } from '../api/types';
import { usePrefs } from '../store/prefs';

/**
 * A listing tile, laid out like the Android app's ProductCard.
 *
 * The three corners of the photo are spoken for: the condition sits top left,
 * the favourite heart top right, and a video badge bottom left. The price
 * leads the body because it is what a buyer scans a grid for, and
 * "Neg." sits opposite the place, since whether an asking price can be
 * haggled is half of what a listing is saying.
 */
export function ProductCardView({ product, onPress }: { product: Card; onPress: () => void }) {
  const c = useColors();
  const styles = useStyles(makeStyles);
  const t = usePrefs((state) => state.t);
  const currency = usePrefs((state) => state.currency);
  const image = cardImage(product);

  return (
    <Pressable style={styles.card} onPress={onPress} accessibilityRole="button">
        <View style={styles.photo}>
          {image ? (
            <Image
              source={{ uri: image }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              // A grid on a 2G connection is mostly waiting, so fade the photo
              // in rather than snapping a half-drawn image into place.
              transition={180}
            />
          ) : null}

          <View style={styles.conditionBadge}>
            <Text style={styles.conditionText}>{conditionLabel(product.condition)}</Text>
          </View>

          <View style={styles.heart}>
            <Ionicons name="heart-outline" size={19} color={c.textMuted} />
          </View>

          {product.hasVideo ? (
            <View style={styles.videoBadge}>
              {/* A badge, never an inline player: a scrolling grid of videos
                  would spend a buyer's data bundle before they tapped. */}
              <Ionicons name="play" size={10} color={c.white} />
              <Text style={styles.videoText}>{t('video')}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.body}>
          <Text style={styles.price} numberOfLines={1}>
            {formatPrice(product.price, product.currency, currency)}
          </Text>
          <Text style={styles.title} numberOfLines={2}>
            {product.title}
          </Text>

          <View style={styles.footer}>
            <View style={styles.placeRow}>
              <Ionicons name="location-outline" size={12} color={c.textFaint} />
              <Text style={styles.place} numberOfLines={1}>
                {product.city ?? '—'}
              </Text>
            </View>
            {product.negotiable ? <Text style={styles.negotiable}>Neg.</Text> : null}
          </View>
        </View>
    </Pressable>
  );
}

/** `like_new` is a database value, not something to show a buyer. */
function conditionLabel(condition: string): string {
  return condition.replace(/_/g, ' ').replace(/^\w/, (character) => character.toUpperCase());
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: c.surface,
    borderRadius: Radius.card,
    overflow: 'hidden',
    // Android uses a 2dp elevation; this is the same lift without a shadow
    // that renders differently on each platform.
    borderWidth: 1,
    borderColor: c.divider,
  },
  photo: {
    width: '100%',
    // 1.25 matches the Android tile, which is wider than it is tall.
    aspectRatio: 1.25,
    backgroundColor: c.card,
  },
  conditionBadge: {
    position: 'absolute',
    top: Space.sm,
    left: Space.sm,
    borderRadius: 6,
    backgroundColor: 'rgba(15,42,74,0.85)',
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  conditionText: { color: c.white, fontSize: 11, fontWeight: '700' },
  heart: {
    position: 'absolute',
    top: Space.xs,
    right: Space.xs,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: c.surface,
    opacity: 0.92,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoBadge: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    bottom: Space.sm,
    left: Space.sm,
    borderRadius: 6,
    backgroundColor: 'rgba(15,42,74,0.85)',
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  videoText: { color: c.white, fontSize: 11, fontWeight: '700' },

  body: { padding: Space.md, gap: Space.xs },
  price: { fontSize: 17, fontWeight: '800', color: c.teal },
  title: { fontSize: 13, color: c.text, minHeight: 34 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Space.xs },
  placeRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 2 },
  place: { flex: 1, fontSize: 12, color: c.textFaint },
  negotiable: { fontSize: 11, fontWeight: '600', color: c.gold },
});
