import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Space } from '../theme';
import type { Palette } from '../theme';
import { useStyles } from '../useTheme';
import { usePrefs } from '../store/prefs';

export type Media = 'photo' | 'video';

/**
 * Photo listings / Video listings, over the top of a feed.
 *
 * Shared by home and by the feed opened from a card, so the two cannot drift
 * into looking like different products. Shaped like the tabs along the top of
 * TikTok: just the word, and a short rule under the current one -- not a
 * full-width border, which reads as a divider rather than a pointer.
 *
 * Photo and video partition the whole catalogue between them: "photo" is a
 * listing with no video, "video" is one that has one. So the pair shows
 * everything, and neither is a filter someone has to undo.
 */
export function MediaTabs({
  media,
  onChange,
}: {
  media: Media;
  onChange: (media: Media) => void;
}) {
  const styles = useStyles(makeStyles);
  const t = usePrefs((state) => state.t);

  return (
    <>
      {/* The fade is what makes white labels legible over a photo that might
          itself be white. */}
      <LinearGradient
        colors={['rgba(9,24,44,0.75)', 'transparent']}
        style={styles.scrim}
        pointerEvents="none"
      />
      <View style={styles.tabs} pointerEvents="box-none">
        <Tab
          label={t('photoListings')}
          selected={media === 'photo'}
          onPress={() => onChange('photo')}
        />
        <Tab
          label={t('videoListings')}
          selected={media === 'video'}
          onPress={() => onChange('video')}
        />
      </View>
    </>
  );
}

function Tab({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const styles = useStyles(makeStyles);
  return (
    <Pressable
      onPress={onPress}
      style={styles.tab}
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      // The rule is only as wide as the word, so the tap target has to be
      // declared or it shrinks to match.
      hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
    >
      <Text style={[styles.tabLabel, selected && styles.tabLabelSelected]}>{label}</Text>
      <View style={[styles.tabRule, selected && styles.tabRuleSelected]} />
    </Pressable>
  );
}

// White over a photo of any colour needs its own shadow to stay legible.
const shadow = { textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 4 } as const;

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    scrim: { position: 'absolute', top: 0, left: 0, right: 0, height: 96 },
    tabs: {
      position: 'absolute',
      top: Space.md,
      left: 0,
      right: 0,
      flexDirection: 'row',
      justifyContent: 'center',
      gap: Space.xl,
    },
    tab: { alignItems: 'center', gap: 6 },
    tabLabel: { fontSize: 17, fontWeight: '600', color: c.white, opacity: 0.7, ...shadow },
    tabLabelSelected: { opacity: 1, fontWeight: '800' },
    tabRule: { height: 3, width: 26, borderRadius: 2, backgroundColor: 'transparent' },
    tabRuleSelected: { backgroundColor: c.white },
  });
