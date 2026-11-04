import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { StyleSheet, Text, View, type ColorValue } from 'react-native';

import { Space } from '../../src/theme';
import type { Palette } from '../../src/theme';
import { useColors, useStyles } from '../../src/useTheme';
import { useFeedContext } from '../../src/store/feed';
import { usePrefs } from '../../src/store/prefs';

/**
 * Home, Categories, Sell, Messages, Profile.
 *
 * Laid out the way the apps people already use lay it out: a real icon set
 * rather than typographic glyphs, outline when a tab is idle and solid when it
 * is current, and the create button in the middle as a filled shape instead of
 * a fifth identical icon. Text glyphs were a bundle-size saving that bought a
 * tab bar nobody would trust -- one of them rendered as a colour emoji.
 */
export default function TabsLayout() {
  const c = useColors();
  const styles = useStyles(makeStyles);
  const t = usePrefs((state) => state.t);
  const resetFeed = useFeedContext((state) => state.reset);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.text,
        tabBarInactiveTintColor: c.textMuted,
        tabBarStyle: styles.bar,
        tabBarLabelStyle: styles.label,
        tabBarItemStyle: { paddingTop: 6 },
        sceneStyle: { backgroundColor: c.bg },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: t('home'), tabBarIcon: icon('home') }}
        // Home is the whole catalogue. Arriving from a card leaves that
        // listing and its filters in the store, so tapping the tab clears
        // them -- otherwise Home quietly stays filtered.
        listeners={{ tabPress: () => resetFeed() }}
      />
      <Tabs.Screen name="categories" options={{ title: t('categories'), tabBarIcon: icon('grid') }} />
      <Tabs.Screen
        name="sell"
        options={{
          title: t('sell'),
          tabBarIcon: SellButton,
          tabBarLabelStyle: [styles.label, styles.sellLabel],
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{ title: t('messages'), tabBarIcon: icon('chatbubble-ellipses') }}
      />
      <Tabs.Screen name="profile" options={{ title: t('account'), tabBarIcon: icon('person') }} />

      {/*
        Reached by pushing, not by tapping a tab, but they live inside this
        navigator so the bar stays under them -- a screen that loses the bar
        feels like it left the app, and the way back becomes a guess.
        `href: null` keeps them off the bar itself.
      */}
      <Tabs.Screen name="videos" options={{ href: null }} />
      <Tabs.Screen name="chat/[id]" options={{ href: null }} />
    </Tabs>
  );
}

/** Solid for the tab you are on, outline for the rest. */
function icon(name: 'home' | 'grid' | 'chatbubble-ellipses' | 'person') {
  return ({ color, focused }: { color: ColorValue; focused: boolean }) => (
    <Ionicons
      name={focused ? name : (`${name}-outline` as typeof name)}
      size={23}
      color={color as string}
    />
  );
}

/**
 * The create button, shaped like the one in TikTok: a wide rounded rectangle
 * rather than another icon, so the one thing the marketplace wants from a
 * visitor does not sit in the row looking like navigation.
 */
function SellButton() {
  const c = useColors();
  const styles = useStyles(makeStyles);
  return (
    <View style={styles.sell}>
      <Ionicons name="add" size={22} color={c.white} />
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
  bar: {
    backgroundColor: c.surface,
    borderTopColor: c.divider,
    height: 86,
    paddingBottom: 26,
    paddingTop: 6,
  },
  label: { fontSize: 11, fontWeight: '600' },
  sellLabel: { color: c.teal, fontWeight: '700' },
  sell: {
    width: 44,
    height: 30,
    borderRadius: 10,
    backgroundColor: c.teal,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -Space.xs,
  },
});
