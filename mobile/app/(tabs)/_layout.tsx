import { Tabs } from 'expo-router';
import { Text, type ColorValue } from 'react-native';

import { Brand } from '../../src/theme';
import { usePrefs } from '../../src/store/prefs';

/**
 * The five tabs, in the order the SwiftUI and Kotlin apps use. Sell sits in
 * the middle because it is the thing the marketplace most wants people to do.
 */
export default function TabsLayout() {
  const t = usePrefs((state) => state.t);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Brand.acacia,
        tabBarInactiveTintColor: Brand.muted,
        tabBarStyle: { backgroundColor: Brand.white, borderTopColor: Brand.sandDeep },
        headerStyle: { backgroundColor: Brand.sand },
        headerTintColor: Brand.ink,
        headerTitleStyle: { fontWeight: '700' },
        sceneStyle: { backgroundColor: Brand.sand },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: t('home'), headerTitle: 'East Market', tabBarIcon: icon('⌂') }}
      />
      <Tabs.Screen name="browse" options={{ title: t('browse'), tabBarIcon: icon('⌕') }} />
      <Tabs.Screen name="sell" options={{ title: t('sell'), tabBarIcon: icon('＋') }} />
      <Tabs.Screen name="messages" options={{ title: t('messages'), tabBarIcon: icon('✉') }} />
      <Tabs.Screen name="account" options={{ title: t('account'), tabBarIcon: icon('☺') }} />
    </Tabs>
  );
}

/**
 * Glyphs rather than an icon package: a set like @expo/vector-icons is several
 * hundred kilobytes of font for five symbols, and this app is built for people
 * on metered connections.
 */
function icon(glyph: string) {
  // The tab bar passes React Native's ColorValue, which is wider than string.
  return ({ color }: { color: ColorValue }) => (
    <Text style={{ color, fontSize: 20, lineHeight: 24 }}>{glyph}</Text>
  );
}
