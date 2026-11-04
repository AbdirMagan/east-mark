import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Radius, Space } from '../theme';
import type { Palette } from '../theme';
import { useColors, useStyles } from '../useTheme';
import { CurrencyPicker } from './CurrencyPicker';
import { LocationPicker } from './LocationPicker';
import { api } from '../api/endpoints';
import { useAuth } from '../store/auth';
import { usePrefs } from '../store/prefs';

/**
 * The application header, on every screen.
 *
 * One header, not one per screen: the logo, the city, the currency and the
 * search box are the things a buyer reaches for wherever they are, and a
 * marketplace where they vanish when you open a listing feels like two
 * different apps. Screens that are not home get a back arrow in the same bar.
 *
 * Mirrors the Android app's EastMarketHeader, down to the navy surface and the
 * translucent chips, so the two phones look like one product.
 */
export function AppHeader({
  title,
  showSearch = true,
  onBack,
  onSearch,
  onRefresh,
}: {
  /** Shown instead of the brand name on an inner screen. */
  title?: string;
  /** Off where typing a query would have nowhere to go, such as a conversation. */
  showSearch?: boolean;
  onBack?: () => void;
  onSearch?: (query: string) => void;
  onRefresh?: () => void;
}) {
  const c = useColors();
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const t = usePrefs((state) => state.t);
  const locationLabel = usePrefs((state) => state.locationLabel);
  const currency = usePrefs((state) => state.currency);

  const [pickingLocation, setPickingLocation] = useState(false);
  const [pickingCurrency, setPickingCurrency] = useState(false);

  // Polled rather than pushed: a number that changes a few times a day does
  // not earn a socket held open. A real push updates it by waking the app.
  const session = useAuth((state) => state.session);
  const { data: unreadData } = useQuery({
    queryKey: ['notifications-unread'],
    enabled: Boolean(session),
    queryFn: () => api.unreadNotifications(),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
  const unread = unreadData?.unread ?? 0;

  return (
    <View style={[styles.bar, { paddingTop: insets.top + Space.md }]}>
      <View style={styles.topRow}>
        <View style={styles.brandRow}>
          {onBack ? (
            <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Back" style={styles.back}>
              <Ionicons name="chevron-back" size={24} color={c.white} />
            </Pressable>
          ) : null}

          {/* The cart alone, not the full logo: the wordmark is unreadable at
              this size, and the name is already spelt out beside it. Dropped
              next to a back arrow, where the arrow, the mark and the title do
              not all fit beside the city and the currency. */}
          {onBack ? null : (
            <Image
              source={require('../../assets/logo-mark.png')}
              style={styles.mark}
              contentFit="contain"
            />
          )}

          <View style={styles.brandText}>
            <Text style={styles.brandName} numberOfLines={1}>
              {title ?? 'Magan Market'}
            </Text>
            {/* Dropped on inner screens: with a back arrow and a title in the
                same row there is not enough width, and a half-cut tagline
                reads as a bug. */}
            {!onBack && !title ? (
              <Text style={styles.tagline} numberOfLines={1}>
                East Africa Online Marketplace
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.chips}>
          <Pressable
            onPress={() => setPickingLocation(true)}
            style={styles.locationChip}
            accessibilityRole="button"
          >
            <Text style={styles.locationText} numberOfLines={1}>
              {locationLabel ?? 'All locations'}
            </Text>
            <Ionicons name="chevron-down" size={14} color={c.white} />
          </Pressable>

          <Pressable
            onPress={() => setPickingCurrency(true)}
            style={styles.currencyChip}
            accessibilityRole="button"
          >
            <Text style={styles.currencyText}>{currency}</Text>
          </Pressable>
        </View>
      </View>

      {showSearch ? (
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color="rgba(255,255,255,0.75)" />
          <TextInput
            placeholder={t('search')}
            placeholderTextColor="rgba(255,255,255,0.6)"
            onSubmitEditing={(event) => onSearch?.(event.nativeEvent.text.trim())}
            returnKeyType="search"
            style={styles.search}
          />
          </View>
          <Pressable
            onPress={() => router.push('/notifications')}
            accessibilityRole="button"
            accessibilityLabel={t('notifications')}
            style={styles.iconButton}
          >
            <Ionicons name="notifications-outline" size={21} color={c.white} />
            {unread > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unread > 99 ? '99+' : unread}</Text>
              </View>
            ) : null}
          </Pressable>

          {onRefresh ? (
            <Pressable onPress={onRefresh} accessibilityRole="button" accessibilityLabel={t('refresh')} style={styles.iconButton}>
              <Ionicons name="refresh" size={21} color={c.white} />
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <LocationPicker visible={pickingLocation} onClose={() => setPickingLocation(false)} />
      <CurrencyPicker visible={pickingCurrency} onClose={() => setPickingCurrency(false)} />
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
  bar: {
    backgroundColor: c.headerBg,
    paddingHorizontal: Space.lg,
    paddingBottom: Space.md,
    gap: Space.md,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Space.sm },
  brandRow: { flexDirection: 'row', alignItems: 'center', flexShrink: 1 },
  back: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  mark: {
    // The shape of the cart, 1.83:1. A square slot was mostly blank tile,
    // and drew the cart at half the height of the bar it sits in.
    width: 52,
    height: 28,
    borderRadius: 8,
    // The artwork is drawn on white, so it needs a white tile to sit on --
    // on navy alone its edges would show as a pale rectangle anyway.
    backgroundColor: c.white,
  },
  brandText: { marginLeft: Space.sm, flexShrink: 1 },
  brandName: { color: c.white, fontWeight: '900', fontSize: 20, letterSpacing: 0.5 },
  tagline: { color: c.tealLight, fontSize: 10, fontWeight: '500' },

  chips: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.xs,
    paddingHorizontal: 6,
    paddingVertical: 5,
    borderRadius: Radius.chip,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  locationText: { color: c.white, fontSize: 12, fontWeight: '600' },
  currencyChip: {
    paddingHorizontal: 6,
    paddingVertical: 5,
    borderRadius: Radius.chip,
    backgroundColor: 'rgba(230,126,34,0.25)',
  },
  currencyText: { color: c.goldLight, fontSize: 12, fontWeight: '700' },

  searchRow: { flexDirection: 'row', alignItems: 'center', gap: Space.sm },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 3,
    borderRadius: 8,
    backgroundColor: c.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: c.white, fontSize: 10, fontWeight: '800' },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
    height: 50,
    borderRadius: Radius.field,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: Space.md,
  },
  search: { flex: 1, color: c.white, fontSize: 15, height: '100%' },
  iconButton: {
    width: 50,
    height: 50,
    borderRadius: Radius.field,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
