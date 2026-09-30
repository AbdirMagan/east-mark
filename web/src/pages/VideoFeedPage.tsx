import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { Icon, categoryIcon, type IconName } from '../components/ui/Icon.js';
import { EmptyState, SectionHeading, Skeleton } from '../components/ui/index.js';
import { useCategories, useProductSearch, useToggleFavorite } from '../hooks/useMarketData.js';
import { useSeo } from '../hooks/useSeo.js';
import { useI18n, useT, type LanguageCode } from '../i18n/index.js';
import type { ProductCard } from '../lib/api.js';
import { formatPrice } from '../lib/format.js';
import { formatDuration } from '../lib/video.js';
import { useAuth } from '../store/auth.js';

/**
 * Listings that were filmed rather than photographed.
 *
 * The page is a grid of equal tiles — three across on a laptop — because that
 * is how someone scans twenty videos for the one they want. Opening a tile
 * hands over to a full-screen player that scrolls vertically through the rest,
 * which is how someone watches once they have chosen.
 *
 * The grid shows poster frames, never live video. Twenty autoplaying tiles
 * would cost a buyer on a metered bundle tens of megabytes before they tapped
 * anything; a poster is a few kilobytes and the video is fetched only once the
 * player opens.
 *
 * Inside the player, muted is the default: browsers refuse to autoplay with
 * sound, and a marketplace that shouts at someone on a bus loses them. Sound is
 * one tap away and the choice sticks for the rest of the session.
 */
export function VideoFeedPage() {
  const t = useT();
  const { language } = useI18n();
  const session = useAuth((state) => state.session);
  const toggleFavorite = useToggleFavorite();
  const [params, setParams] = useSearchParams();

  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [muted, setMuted] = useState(true);

  const { data: categories, isLoading: categoriesLoading } = useCategories();
  const categorySlug = params.get('category') ?? '';
  const category = categories?.find((item) => item.slug === categorySlug);

  const search = useProductSearch({
    media: 'video',
    categoryId: category?.id,
    sort: 'newest',
    limit: 30,
  });
  const items = (search.data?.data ?? []).filter((product) => product.videoUrl);

  useSeo({
    title: t('home.videoListings'),
    description: t('home.videoListingsHint'),
    path: '/videos',
  });

  const selectCategory = (slug: string) => {
    const next = new URLSearchParams(params);
    if (slug) next.set('category', slug);
    else next.delete('category');
    setParams(next, { replace: true });
    setOpenIndex(null);
  };

  return (
    <div className="mx-auto max-w-[90rem] space-y-5 px-4 py-6 lg:px-6">
      <SectionHeading
        title={t('home.videoListings')}
        action={t('home.photoListings')}
        to="/browse?media=photo"
      />

      {/* The same category strip as the rest of the site, filtering the grid. */}
      {categoriesLoading ? (
        <div className="em-scroll-x flex gap-2">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-10 w-28 shrink-0 rounded-(--radius-pill)" />
          ))}
        </div>
      ) : (
        <div className="em-scroll-x flex gap-2">
          <CategoryChip
            label={t('filters.allCategories')}
            active={!categorySlug}
            onClick={() => selectCategory('')}
          />
          {(categories ?? []).map((item) => (
            <CategoryChip
              key={item.id}
              label={item.name}
              icon={categoryIcon(item.slug, item.icon)}
              active={categorySlug === item.slug}
              onClick={() => selectCategory(item.slug)}
            />
          ))}
        </div>
      )}

      {search.isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 10 }, (_, index) => (
            <Skeleton key={index} className="aspect-[9/16] rounded-(--radius-card)" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon="play"
          title={t('video.emptyTitle')}
          body={t('video.emptyBody')}
          action={
            <Link
              to="/sell"
              className="inline-flex items-center gap-2 rounded-(--radius-pill) border border-brand bg-brand px-4 py-2 text-sm font-bold text-white transition-transform active:scale-[0.97]"
            >
              <Icon name="plus" size={16} />
              {t('nav.sell')}
            </Link>
          }
        />
      ) : (
        <>
          <p className="flex items-center gap-1.5 text-sm text-text-secondary">
            <Icon name="play" size={14} />
            {t('video.count', { count: items.length })}
          </p>

          {/* Every tile the same size, whatever shape the video was filmed in:
              a grid of mixed heights is unreadable at a glance. */}
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {items.map((product, index) => (
              <li key={product.id}>
                <VideoTile
                  product={product}
                  language={language}
                  onOpen={() => setOpenIndex(index)}
                />
              </li>
            ))}
          </ul>
        </>
      )}

      {openIndex !== null ? (
        <VideoPlayerOverlay
          items={items}
          startIndex={openIndex}
          muted={muted}
          language={language}
          onToggleMute={() => setMuted((value) => !value)}
          onClose={() => setOpenIndex(null)}
          onToggleFavorite={session ? (product) => toggleFavorite.mutate(product) : undefined}
        />
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* The grid                                                                   */
/* -------------------------------------------------------------------------- */

function VideoTile({
  product,
  language,
  onOpen,
}: {
  product: ProductCard;
  language: LanguageCode;
  onOpen: () => void;
}) {
  const t = useT();
  const poster = product.videoPosterUrl ?? product.thumbnailUrl;

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${t('product.playVideo')}: ${product.title}`}
      className="group relative block aspect-[9/16] w-full overflow-hidden rounded-(--radius-card) border border-border-subtle bg-surface-sunken text-left transition-[border-color,box-shadow,translate] hover:border-brand hover:shadow-(--shadow-raised) motion-safe:hover:-translate-y-0.5"
    >
      {poster ? (
        <img
          src={poster}
          alt=""
          loading="lazy"
          decoding="async"
          className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
      ) : (
        <span className="flex size-full items-center justify-center text-text-muted">
          <Icon name="play" size={24} />
        </span>
      )}

      <span className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/85 to-transparent" />

      <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-(--radius-pill) bg-ink-900/70 px-2 py-0.5 text-[0.625rem] font-bold text-white backdrop-blur-sm">
        <Icon name="play" size={10} />
        {product.videoDurationSeconds
          ? formatDuration(product.videoDurationSeconds)
          : t('product.videoBadge')}
      </span>

      <span className="absolute inset-x-0 bottom-0 p-2.5 text-white">
        <span className="block font-display text-sm font-black">
          {formatPrice(product.price, product.currency, language)}
        </span>
        <span className="em-clamp-2 mt-0.5 block text-xs leading-tight text-white/90">
          {product.title}
        </span>
        <span className="mt-1 flex items-center gap-1 text-[0.625rem] text-white/75">
          <Icon name="map-pin" size={10} />
          {product.city ?? '—'}
        </span>
      </span>
    </button>
  );
}

function CategoryChip({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon?: IconName;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-(--radius-pill) border px-3.5 py-2 text-sm font-semibold transition-colors ${
        active
          ? 'border-brand bg-brand text-white'
          : 'border-border-subtle bg-surface-raised text-text-secondary hover:border-brand hover:text-brand'
      }`}
    >
      {icon ? <Icon name={icon} size={15} /> : null}
      {label}
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* The player                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Opens over the grid at the tile that was tapped, and keeps scrolling
 * vertically through the rest — one listing per screen, snapped.
 */
function VideoPlayerOverlay({
  items,
  startIndex,
  muted,
  language,
  onToggleMute,
  onClose,
  onToggleFavorite,
}: {
  items: ProductCard[];
  startIndex: number;
  muted: boolean;
  language: LanguageCode;
  onToggleMute: () => void;
  onClose: () => void;
  onToggleFavorite?: (product: ProductCard) => void;
}) {
  const t = useT();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Open on the tile that was tapped, without animating past everything above it.
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    container.scrollTop = container.clientHeight * startIndex;
  }, [startIndex]);

  // Escape closes, and the page behind must not scroll while it is open.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('home.videoListings')}
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/90 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative h-[100dvh] w-full max-w-[26rem] sm:h-[92dvh] sm:rounded-(--radius-card) sm:border sm:border-white/15 sm:shadow-(--shadow-raised)"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={t('common.close')}
          className="absolute right-3 top-3 z-10 flex size-9 items-center justify-center rounded-full border border-white/25 bg-ink-950/60 text-white backdrop-blur-sm transition-colors hover:bg-white/15"
        >
          <Icon name="close" size={16} />
        </button>

        <div
          ref={scrollRef}
          className="h-full snap-y snap-mandatory overflow-y-auto overscroll-contain sm:overflow-hidden sm:rounded-(--radius-card)"
        >
          {items.map((product, index) => (
            <VideoSlide
              key={product.id}
              product={product}
              muted={muted}
              language={language}
              priority={index === startIndex}
              onToggleMute={onToggleMute}
              onToggleFavorite={onToggleFavorite ? () => onToggleFavorite(product) : undefined}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

interface VideoSlideProps {
  product: ProductCard;
  muted: boolean;
  language: LanguageCode;
  priority: boolean;
  onToggleMute: () => void;
  onToggleFavorite?: () => void;
}

function VideoSlide({
  product,
  muted,
  language,
  priority,
  onToggleMute,
  onToggleFavorite,
}: VideoSlideProps) {
  const t = useT();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [active, setActive] = useState(priority);

  useEffect(() => {
    const element = videoRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        // Most of the slide on screen means it is the one being watched.
        setActive(Boolean(entry?.isIntersecting));
      },
      { threshold: 0.6 },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const element = videoRef.current;
    if (!element) return;

    if (active) {
      // play() rejects when the tab is backgrounded or the browser refuses
      // autoplay; the poster stays up and the controls still work. Some
      // browsers only allow it once the visitor has interacted with the page,
      // so the first touch anywhere retries it.
      void element.play().catch(() => {
        const retry = () => {
          void element.play().catch(() => undefined);
          window.removeEventListener('pointerdown', retry);
          window.removeEventListener('keydown', retry);
        };
        window.addEventListener('pointerdown', retry, { once: true });
        window.addEventListener('keydown', retry, { once: true });
      });
    } else {
      element.pause();
      // Rewind, so a listing scrolled back to starts from the top and the
      // browser is free to drop the buffered bytes.
      element.currentTime = 0;
    }
  }, [active]);

  return (
    <section className="relative flex h-full snap-start snap-always items-center justify-center bg-black">
      <video
        ref={videoRef}
        src={product.videoUrl ?? undefined}
        poster={product.videoPosterUrl ?? product.thumbnailUrl ?? undefined}
        muted={muted}
        loop
        playsInline
        autoPlay={priority}
        // Only the slide that was opened may fetch before it is scrolled to.
        preload={priority ? 'metadata' : 'none'}
        onClick={() => {
          const element = videoRef.current;
          if (!element) return;
          if (element.paused) void element.play().catch(() => undefined);
          else element.pause();
        }}
        // Fills the frame rather than leaving bars around it; the whole frame is
        // a tap away on the fullscreen button.
        className="size-full object-cover"
      />

      {/* A scrim, so white text stays readable over a bright video. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/85 to-transparent" />

      <div className="absolute inset-x-0 bottom-0 p-4 pb-5 text-white">
        <p className="font-display text-xl font-black">
          {formatPrice(product.price, product.currency, language)}
          {product.negotiable ? (
            <span className="ml-2 align-middle text-xs font-medium text-white/70">
              {t('common.negotiableShort')}
            </span>
          ) : null}
        </p>

        <h2 className="mt-1 text-sm font-semibold">{product.title}</h2>

        <p className="mt-1 flex items-center gap-1.5 text-xs text-white/75">
          <Icon name="map-pin" size={12} />
          {product.city ?? '—'}
          <span aria-hidden="true">·</span>
          <span>{product.seller.name}</span>
          {product.seller.verified ? <Icon name="verified" size={12} /> : null}
        </p>

        <div className="mt-3 flex items-center gap-2">
          <Link
            to={`/product/${product.ref}`}
            className="inline-flex items-center gap-2 rounded-(--radius-pill) border border-white/25 bg-white px-4 py-2 text-sm font-bold text-ink-950 transition-transform active:scale-[0.97]"
          >
            <Icon name="cart" size={16} />
            {t('product.buy')}
          </Link>

          <Link
            to={`/product/${product.ref}`}
            className="inline-flex items-center gap-2 rounded-(--radius-pill) border border-white/25 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/10"
          >
            <Icon name="message" size={16} />
            {t('product.message')}
          </Link>

          {onToggleFavorite ? (
            <button
              type="button"
              onClick={onToggleFavorite}
              aria-label={t(product.isFavorited ? 'product.saved' : 'product.save')}
              aria-pressed={Boolean(product.isFavorited)}
              className="ml-auto flex size-10 items-center justify-center rounded-full border border-white/25 text-white transition-colors hover:bg-white/10"
            >
              <Icon name={product.isFavorited ? 'heart-filled' : 'heart'} size={18} />
            </button>
          ) : null}

          <button
            type="button"
            onClick={() => {
              const element = videoRef.current;
              if (!element) return;
              // iOS Safari exposes only the webkit form, and only on the video
              // element itself.
              const withWebkit = element as HTMLVideoElement & {
                webkitEnterFullscreen?: () => void;
              };
              if (document.fullscreenElement) void document.exitFullscreen();
              else if (element.requestFullscreen) void element.requestFullscreen();
              else withWebkit.webkitEnterFullscreen?.();
            }}
            aria-label={t('video.fullscreen')}
            className={`flex size-10 items-center justify-center rounded-full border border-white/25 text-white transition-colors hover:bg-white/10 ${
              onToggleFavorite ? '' : 'ml-auto'
            }`}
          >
            <Icon name="expand" size={18} />
          </button>

          <button
            type="button"
            onClick={onToggleMute}
            aria-label={t(muted ? 'video.soundOn' : 'video.soundOff')}
            className="flex size-10 items-center justify-center rounded-full border border-white/25 text-white transition-colors hover:bg-white/10"
          >
            <Icon name={muted ? 'volume-off' : 'volume'} size={18} />
          </button>
        </div>
      </div>
    </section>
  );
}
