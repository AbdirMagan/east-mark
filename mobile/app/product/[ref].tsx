import { useMutation, useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { api } from '../../src/api/endpoints';
import { Brand, Radius, Space, formatPrice } from '../../src/theme';
import { isVideo } from '../../src/api/types';
import { useAuth } from '../../src/store/auth';
import { usePrefs } from '../../src/store/prefs';

export default function ProductScreen() {
  const t = usePrefs((state) => state.t);
  const { ref } = useLocalSearchParams<{ ref: string }>();
  const router = useRouter();
  const session = useAuth((state) => state.session);

  const product = useQuery({
    queryKey: ['product', ref],
    queryFn: () => api.product(Number(ref)),
  });

  useEffect(() => {
    if (product.data) void api.recordView(product.data.id);
  }, [product.data]);

  const startChat = useMutation({
    mutationFn: (productId: string) => api.startConversation(productId),
    onSuccess: (conversation) => router.push(`/chat/${conversation.id}`),
  });

  if (product.isLoading) {
    return (
      <View style={styles.centred}>
        <ActivityIndicator color={Brand.acacia} />
      </View>
    );
  }

  if (!product.data) {
    return (
      <View style={styles.centred}>
        <Text style={styles.muted}>{t('offline')}</Text>
      </View>
    );
  }

  const item = product.data;
  const video = item.images?.find(isVideo);
  const photos = item.images?.filter((image) => !isVideo(image)) ?? [];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* A listing with a video is a listing about the video: showing a photo
          strip beside it just asks which one to look at. */}
      {video ? (
        <VideoPanel uri={video.url} poster={video.thumbnailUrl ?? undefined} />
      ) : photos.length ? (
        <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
          {photos.map((photo) => (
            <Image key={photo.id} source={{ uri: photo.url }} style={styles.photo} contentFit="cover" />
          ))}
        </ScrollView>
      ) : (
        <View style={[styles.photo, styles.photoPlaceholder]} />
      )}

      <View style={styles.body}>
        <Text style={styles.price}>{formatPrice(item.price, item.currency)}</Text>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.meta}>
          {[item.city, item.condition].filter(Boolean).join(' · ')}
        </Text>

        <View style={styles.actions}>
          {item.contact?.phone ? (
            <Pressable
              onPress={() => void Linking.openURL(`tel:${item.contact?.phone}`)}
              style={[styles.action, { backgroundColor: Brand.acacia }]}
            >
              <Text style={styles.actionText}>{t('call')}</Text>
            </Pressable>
          ) : null}

          {item.contact?.whatsapp ? (
            <Pressable
              onPress={() =>
                // wa.me rejects the leading plus, unlike tel:.
                void Linking.openURL(`https://wa.me/${item.contact?.whatsapp?.replace(/^\+/, '')}`)
              }
              style={[styles.action, { backgroundColor: Brand.whatsapp }]}
            >
              <Text style={styles.actionText}>{t('whatsapp')}</Text>
            </Pressable>
          ) : null}
        </View>

        <Pressable
          onPress={() => (session ? startChat.mutate(item.id) : router.push('/account'))}
          style={styles.messageButton}
        >
          <Text style={styles.messageButtonText}>
            {session ? t('message') : t('signInToMessage')}
          </Text>
        </Pressable>

        {item.description ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('description')}</Text>
            <Text style={styles.description}>{item.description}</Text>
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}

/**
 * The video, sized to the screen and paused until asked.
 *
 * Autoplay would start spending a buyer's data bundle the moment the listing
 * opened, which on a metered connection is money they did not agree to spend.
 */
function VideoPanel({ uri, poster }: { uri: string; poster?: string }) {
  const player = useVideoPlayer(uri, (instance) => {
    instance.loop = true;
  });

  return (
    <VideoView
      player={player}
      style={styles.video}
      // The native controls carry the fullscreen button, which is on by
      // default -- and fullscreen is how you actually look at a car.
      nativeControls
      contentFit="contain"
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Brand.sand },
  content: { paddingBottom: Space.xl },
  centred: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Brand.sand },
  muted: { color: Brand.muted },
  photo: { width: 360, height: 270, backgroundColor: Brand.sandDeep },
  photoPlaceholder: { width: '100%' },
  video: { width: '100%', aspectRatio: 1, backgroundColor: Brand.ink },
  body: { padding: Space.lg, gap: Space.md },
  price: { fontSize: 26, fontWeight: '800', color: Brand.acacia },
  title: { fontSize: 18, fontWeight: '700', color: Brand.ink },
  meta: { fontSize: 13, color: Brand.muted },
  actions: { flexDirection: 'row', gap: Space.md },
  action: {
    flex: 1,
    height: 50,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: { color: Brand.white, fontWeight: '700', fontSize: 15 },
  messageButton: {
    height: 50,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Brand.sandDeep,
    backgroundColor: Brand.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageButtonText: { color: Brand.ink, fontWeight: '600' },
  section: { gap: Space.sm, marginTop: Space.md },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Brand.ink },
  description: { fontSize: 14, color: Brand.ink, opacity: 0.8, lineHeight: 21 },
});
