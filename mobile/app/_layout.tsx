import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { Brand } from '../src/theme';
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
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Brand.sand }}>
        <ActivityIndicator color={Brand.acacia} />
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: Brand.sand },
          headerTintColor: Brand.ink,
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: Brand.sand },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="product/[ref]" options={{ title: '' }} />
        <Stack.Screen name="videos" options={{ title: 'Video listings' }} />
        <Stack.Screen name="chat/[id]" options={{ title: '' }} />
      </Stack>
    </QueryClientProvider>
  );
}
