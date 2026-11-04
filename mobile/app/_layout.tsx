import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import type { Palette } from '../src/theme';
import { useColors, useStyles } from '../src/useTheme';
import { useAuth } from '../src/store/auth';
import { usePrefs } from '../src/store/prefs';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // East Africa is a lot of 2G and intermittent 3G. Serving what we
      // already have while a refetch runs beats an empty screen, and a
      // listing that is a minute stale has not changed.
      staleTime: 60_000,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

export default function RootLayout() {
  const c = useColors();
  const [ready, setReady] = useState(false);
  const initAuth = useAuth((state) => state.init);
  const loadPrefs = usePrefs((state) => state.load);

  useEffect(() => {
    // Both read from AsyncStorage, so the first frame would otherwise render
    // in English and then flip to the saved language a moment later.
    void Promise.all([initAuth(), loadPrefs()]).finally(() => setReady(true));
  }, [initAuth, loadPrefs]);

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.bg }}>
        <ActivityIndicator color={c.teal} />
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      {/* Light text: every screen's own header is navy in both themes, so a
          dark status bar would be unreadable against it. */}
      <StatusBar style="light" />
      {/* No navigator header anywhere. Each screen draws AppHeader instead,
          which is navy, full-bleed and carries the search box -- more than a
          title bar can be, and the same bar the Android app shows. */}
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: c.bg },
        }}
      />
    </QueryClientProvider>
  );
}
