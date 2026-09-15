import { memo } from 'react';
import { Link } from 'react-router-dom';

import { useI18n, useT } from '../../i18n/index.js';
import type { ProductCard as ProductCardData } from '../../lib/api.js';
import { formatDistance, formatPrice, formatRelativeTime } from '../../lib/format.js';
import { Badge, Skeleton } from '../ui/index.js';
import { Icon } from '../ui/Icon.js';
import type { TranslationKey } from '../../i18n/index.js';

interface ProductCardProps {
  product: ProductCardData;
  onToggleFavorite?: (product: ProductCardData) => void;
  /** Hidden for anonymous visitors, who have nowhere to save to. */
  showFavorite?: boolean;
  priority?: boolean;
}

/**
 * The product card.
 *
 * Two details matter more than they look:
 *
 * 1. The image sits in a fixed 4:3 box with width and height attributes. On a
 *    slow connection images arrive long after the text, and without a reserved
 *    box the whole grid jumps as each one lands — which on a phone means
 *    tapping the wrong listing.
 *
 * 2. It renders `thumbnailUrl` (a ~400px WebP), never the full-size image. A
 *    grid of twenty full-size photos is several megabytes; a grid of twenty
 *    thumbnails is a few hundred kilobytes.
 */
export const ProductCard = memo(function ProductCard({
  product,
  onToggleFavorite,
  showFavorite = true,
  priority = false,
}: ProductCardProps) {
  const t = useT();
  const { language } = useI18n();
  const image = product.thumbnailUrl ?? product.imageUrl;

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-[1.25rem] border border-border-subtle bg-surface-raised transition-shadow duration-200 hover:shadow-[--shadow-raised]">
      <Link to={`/product/${product.ref}`} className="block">
        <div className="relative aspect-[4/3] overflow-hidden bg-surface-sunken">
          {image ? (
            <img
              src={image}
              alt={product.title}
              width={400}
              height={300}
              loading={priority ? 'eager' : 'lazy'}
              decoding="async"
              // React 18 only passes through the lowercase attribute; the
              // camelCase form is dropped with a warning, so the hint never
              // reached the browser.
              {...({ fetchpriority: priority ? 'high' : 'auto' } as React.ImgHTMLAttributes<HTMLImageElement>)}
              className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex size-full flex-col items-center justify-center gap-1.5 text-text-muted">
              <Icon name="image" size={22} />
              <span className="text-[0.6875rem]">{t('product.noImage')}</span>
            </div>
          )}

          <div className="absolute left-2 top-2 flex flex-wrap gap-1">
            {product.featured ? (
              <Badge tone="sun" icon="verified">
                {t('common.featured')}
              </Badge>
            ) : null}
            {product.imageCount > 1 ? (
              <Badge tone="neutral" className="bg-ink-900/70 text-white backdrop-blur-sm">
                {product.imageCount}
              </Badge>
            ) : null}
          </div>

          {product.distanceKm != null ? (
            <span className="absolute bottom-2 left-2 rounded-[--radius-pill] bg-ink-900/70 px-2 py-0.5 text-[0.6875rem] font-semibold text-white backdrop-blur-sm">
              {formatDistance(product.distanceKm, language)}
            </span>
          ) : null}
        </div>

        <div className="p-3">
          <p className="font-display text-[0.9375rem] font-bold leading-tight text-text-primary">
            {formatPrice(product.price, product.currency, language)}
            {product.negotiable ? (
              <span className="ml-1.5 whitespace-nowrap align-middle text-[0.6875rem] font-medium text-text-muted">
                {t('common.negotiableShort')}
              </span>
            ) : null}
          </p>

          <h3 className="em-clamp-2 mt-1 min-h-[2.5rem] text-sm leading-tight text-text-secondary">
            {product.title}
          </h3>

          <div className="mt-2 flex items-center gap-1.5 text-[0.6875rem] text-text-muted">
            <Icon name="map-pin" size={12} />
            <span className="truncate">{product.city ?? '—'}</span>
            <span aria-hidden="true">·</span>
            <span className="shrink-0">{t(`condition.${product.condition}` as TranslationKey)}</span>
          </div>

          <div className="mt-1.5 flex items-center justify-between gap-2 text-[0.6875rem] text-text-muted">
            <time dateTime={product.publishedAt ?? undefined}>
              {formatRelativeTime(product.publishedAt, language)}
            </time>
            {product.seller.verified ? (
              <span
                className="inline-flex shrink-0 items-center gap-1 text-brand"
                title={t('common.verified')}
              >
                <Icon name="verified" size={12} strokeWidth={2.25} />
                <span className="hidden sm:inline">{t('common.verified')}</span>
              </span>
            ) : null}
          </div>
        </div>
      </Link>

      {/* Buy opens the same listing as the card; the seller is contacted from
          there. mt-auto keeps it on the bottom edge when titles differ in
          length, so a row of cards lines up. */}
      <div className="mt-auto px-3 pb-3">
        <Link
          to={`/product/${product.ref}`}
          className="flex h-10 w-full items-center justify-center gap-1.5 rounded-[--radius-pill] bg-accent text-sm font-semibold text-white transition-colors hover:bg-accent-hover dark:text-ink-950"
        >
          <Icon name="cart" size={16} />
          {t('product.buy')}
        </Link>
      </div>

      {showFavorite && onToggleFavorite ? (
        <button
          type="button"
          onClick={() => onToggleFavorite(product)}
          aria-pressed={product.isFavorited ?? false}
          aria-label={product.isFavorited ? t('product.saved') : t('product.save')}
          className="absolute right-2 top-2 flex size-9 items-center justify-center rounded-full bg-surface-raised/90 text-text-secondary shadow-sm backdrop-blur-sm transition-colors hover:text-accent"
        >
          <Icon
            name={product.isFavorited ? 'heart-filled' : 'heart'}
            size={17}
            className={product.isFavorited ? 'text-accent' : ''}
          />
        </button>
      ) : null}
    </article>
  );
});

export function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-[1.25rem] border border-border-subtle bg-surface-raised">
      <Skeleton className="aspect-[4/3] rounded-none" />
      <div className="space-y-2 p-3">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3.5 w-3/4" />
        <Skeleton className="h-3 w-2/5" />
        <Skeleton className="h-10 w-full rounded-full" />
      </div>
    </div>
  );
}

/**
 * The responsive grid: two columns on a phone -- which keeps twice as many
 * listings above the fold -- and from `sm` up, as many columns as the screen
 * fits, each between 13.5rem and 24rem. auto-fit collapses the empty tracks and
 * the row is centred, so a search returning two listings shows two full-size
 * cards in the middle of the page rather than two small ones stranded on the
 * left. The 24rem ceiling stops a single result blowing its photo up to
 * full-page size.
 */
export function ProductGrid({
  products,
  loading,
  skeletonCount = 12,
  onToggleFavorite,
  showFavorite = true,
}: {
  products: ProductCardData[];
  loading?: boolean;
  skeletonCount?: number;
  onToggleFavorite?: (product: ProductCardData) => void;
  showFavorite?: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:[grid-template-columns:repeat(auto-fit,minmax(13.5rem,24rem))] sm:[justify-content:safe_center]">
      {loading
        ? Array.from({ length: skeletonCount }, (_, index) => <ProductCardSkeleton key={index} />)
        : products.map((product, index) => (
            <ProductCard
              key={product.id}
              product={product}
              onToggleFavorite={onToggleFavorite}
              showFavorite={showFavorite}
              priority={index < 4}
            />
          ))}
    </div>
  );
}

/** Horizontal rail used on the home page, where a full grid would be too much. */
export function ProductRail({
  products,
  loading,
  onToggleFavorite,
  showFavorite = true,
}: {
  products: ProductCardData[];
  loading?: boolean;
  onToggleFavorite?: (product: ProductCardData) => void;
  showFavorite?: boolean;
}) {
  return (
    <div className="em-scroll-x -mx-4 flex gap-3 px-4 pb-1 sm:mx-0 sm:px-0 sm:[justify-content:safe_center]">
      {(loading ? Array.from({ length: 6 }, (_, i) => i) : products).map((item, index) => (
        <div
          key={typeof item === 'number' ? item : item.id}
          className="w-[46%] shrink-0 grow snap-start sm:w-[15rem] sm:max-w-[24rem] lg:w-[17rem]"
        >
          {typeof item === 'number' ? (
            <ProductCardSkeleton />
          ) : (
            <ProductCard
              product={item}
              onToggleFavorite={onToggleFavorite}
              showFavorite={showFavorite}
              priority={index < 3}
            />
          )}
        </div>
      ))}
    </div>
  );
}
