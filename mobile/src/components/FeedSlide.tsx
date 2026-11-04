import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { api } from '../api/endpoints';
import { Space, formatPrice } from '../theme';
import type { Palette } from '../theme';
import { useColors, useStyles } from '../useTheme';
import { useAuth } from '../store/auth';
import { usePrefs } from '../store/prefs';
import type { ProductCard } from '../api/types';

/**
 * One listing filling the whole viewport, the way a TikTok post does.
 *
 * Shared by the home feed and the video feed. A listing with a video plays it
 * (only while it is the slide on screen); one without shows its photo.
 */
export function FeedSlide({
  product,
  height,
  active,
}: {
  product: ProductCard;
  height: number;
  active: boolean;
}) {
  const c = useColors();
  const styles = useStyles(makeStyles);
  const t = usePrefs((state) => state.t);
  const currency = usePrefs((state) => state.currency);
  const router = useRouter();
  const session = useAuth((state) => state.session);
  const [muted, setMuted] = useState(true);
  // The listing page used to hold the rest of the description. Without it
  // the caption has to be able to open, or the text is simply lost.
  const [expanded, setExpanded] = useState(false);
  const videoUrl = product.videoUrl;

  /**
   * The seller's number lives on the listing, not on a search result, so it is
   * fetched for the slide that is actually on screen. Fetching every slide's
   * would be twenty requests to show three.
   */
  const detail = useQuery({
    queryKey: ['product', product.ref],
    queryFn: () => api.product(product.ref),
    enabled: active,
  });

  const phone = detail.data?.contact?.phone;
  const whatsapp = detail.data?.contact?.whatsapp;

  const openChat = async () => {
    if (!session) {
      router.push('/profile');
      return;
    }
    const conversation = await api.startConversation(product.id);
    router.push(`/chat/${conversation.id}`);
  };

  return (
    <View style={[styles.slide, { height }]}>
      {videoUrl ? (
        <VideoMedia uri={videoUrl} active={active} muted={muted} />
      ) : (
        // The full image rather than the thumbnail: a grid tile's thumbnail
        // blown up to the height of a phone is mostly blur.
        <PhotoMedia uri={product.imageUrl ?? product.thumbnailUrl ?? null} />
      )}

      {/* Tapping a video toggles sound, the way a feed does; tapping a photo
          opens the listing, since there is nothing to unmute. The overlay sits
          above this, so the buttons still take their own taps. */}
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={
          videoUrl
            ? () => setMuted((previous) => !previous)
            : () => setExpanded((previous) => !previous)
        }
      />

      {/* The rail, where TikTok puts like, comment and share. A marketplace
          wants the three ways to reach a seller instead. */}
      <View style={styles.rail}>
        <RailButton
          icon="logo-whatsapp"
          label={t('whatsapp')}
          tint={c.whatsapp}
          disabled={!whatsapp}
          // wa.me rejects the leading plus, unlike tel:.
          onPress={() => void Linking.openURL(`https://wa.me/${whatsapp?.replace(/^\+/, '')}`)}
        />
        <RailButton icon="chatbubble-ellipses" label={t('message')} onPress={() => void openChat()} />
        <RailButton
          icon="call"
          label={t('call')}
          disabled={!phone}
          onPress={() => void Linking.openURL(`tel:${phone}`)}
        />
        {videoUrl ? (
          <RailButton
            icon={muted ? 'volume-mute' : 'volume-high'}
            label={muted ? t('soundOff') : t('soundOn')}
            onPress={() => setMuted((previous) => !previous)}
          />
        ) : null}
      </View>

      {/* Bottom left, clear of the rail: price first, then what it is. The
          caption opens the listing too -- it is what someone reads just before
          deciding they want to know more. */}
      {/* Behind the caption and the rail, not over them: a fade rather than a
          panel, so it darkens the bottom of any photo without looking like a
          box drawn on the picture. */}
      <LinearGradient
        colors={['transparent', 'rgba(9,24,44,0.85)']}
        style={styles.bottomScrim}
        pointerEvents="none"
      />

      <Pressable
        style={styles.caption}
        onPress={() => setExpanded((previous) => !previous)}
        accessibilityRole="button"
        accessibilityLabel={expanded ? 'Collapse the details' : 'Read the full details'}
      >
        <Text style={styles.price}>{formatPrice(product.price, product.currency, currency)}</Text>
        <Text style={styles.title} numberOfLines={expanded ? undefined : 2}>
          {product.title}
        </Text>
        {detail.data?.description ? (
          <Text style={styles.description} numberOfLines={expanded ? undefined : 2}>
            {detail.data.description}
          </Text>
        ) : null}
        <Text style={styles.meta} numberOfLines={1}>
          {[product.seller.name, product.city].filter(Boolean).join(' · ')}
        </Text>
      </Pressable>
    </View>
  );
}

/**
 * The photo, whole, over a blurred copy of itself.
 *
 * Cropping to fill would cut the edges off whatever is for sale, and a buyer
 * judging a sofa needs to see all of it. The blurred copy fills the bars a
 * letterboxed photo would otherwise leave, so the slide still reads as full
 * screen.
 */
function PhotoMedia({ uri }: { uri: string | null }) {
  const styles = useStyles(makeStyles);
  if (!uri) return null;
  return (
    <>
      <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" blurRadius={30} />
      {/* The blur is only as dark as the photo, and a product shot on a white
          background blurs to white -- which leaves the white caption on top
          of it invisible. This is what guarantees a dark field underneath,
          whatever the seller photographed. */}
      <View style={styles.backdropShade} />
      <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="contain" transition={180} />
    </>
  );
}

/** Its own component because the player hook cannot be called conditionally. */
function VideoMedia({ uri, active, muted }: { uri: string; active: boolean; muted: boolean }) {
  const player = useVideoPlayer(uri, (instance) => {
    instance.loop = true;
    // Starts muted: a feed that blares audio in a shared room is a feed people
    // close.
    instance.muted = true;
  });

  // Only the slide on screen plays. Letting neighbours play would mean three
  // videos streaming at once on a connection that struggles with one, and the
  // bill lands on the buyer.
  useEffect(() => {
    if (active) player.play();
    else player.pause();
  }, [active, player]);

  useEffect(() => {
    player.muted = muted;
  }, [muted, player]);

  return (
    <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />
  );
}

/**
 * One rail button: a glyph with its name under it, the way a feed labels its
 * actions. Dimmed rather than hidden when a seller has not given that number,
 * so the rail does not change shape between slides.
 */
function RailButton({
  icon,
  label,
  tint,
  disabled,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  tint?: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  const c = useColors();
  const styles = useStyles(makeStyles);
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.railButton, disabled && styles.railDisabled]}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: Boolean(disabled) }}
    >
      <View style={styles.railIcon}>
        <Ionicons name={icon} size={26} color={tint ?? c.white} />
      </View>
      <Text style={styles.railLabel} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

// The picture behind can be any colour, so every label carries its own shadow
// rather than relying on it being dark.
const shadow = { textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 4 } as const;

const makeStyles = (c: Palette) =>
  StyleSheet.create({
  slide: { width: '100%', backgroundColor: c.navyDark, overflow: 'hidden' },

  rail: {
    position: 'absolute',
    right: Space.md,
    bottom: Space.xl * 2,
    alignItems: 'center',
    gap: Space.lg,
  },
  railButton: { alignItems: 'center', gap: 2, width: 64 },
  railDisabled: { opacity: 0.35 },
  railIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  railLabel: { color: c.white, fontSize: 11, fontWeight: '600', ...shadow, textShadowRadius: 3 },

  backdropShade: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(9,24,44,0.45)',
  },
  bottomScrim: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '45%' },

  caption: {
    position: 'absolute',
    left: Space.lg,
    // Stops short of the rail rather than running under it.
    right: 92,
    bottom: Space.xl,
    gap: Space.xs,
  },
  price: { color: c.white, fontSize: 26, fontWeight: '800', ...shadow },
  title: { color: c.white, fontSize: 17, fontWeight: '700', ...shadow },
  description: { color: c.white, opacity: 0.9, fontSize: 13, ...shadow },
  meta: { color: c.white, opacity: 0.8, fontSize: 12, ...shadow },
});
