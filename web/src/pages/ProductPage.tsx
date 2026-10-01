import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { ProductRail } from '../components/product/ProductCard.js';
import { Badge, Button, EmptyState, Skeleton } from '../components/ui/index.js';
import { Icon, WhatsAppIcon } from '../components/ui/Icon.js';
import { useProduct, useSimilarProducts, useToggleFavorite } from '../hooks/useMarketData.js';
import { productStructuredData, useSeo } from '../hooks/useSeo.js';
import { useI18n, useT, type TranslationKey } from '../i18n/index.js';
import { endpoints, type ProductDetail } from '../lib/api.js';
import { formatDate, formatNumber, formatPrice, formatRelativeTime, telLink, whatsappLink } from '../lib/format.js';
import { formatDuration } from '../lib/video.js';
import { useAuth } from '../store/auth.js';

export function ProductPage() {
  const { ref } = useParams<{ ref: string }>();
  const t = useT();
  const { language } = useI18n();
  const navigate = useNavigate();
  const session = useAuth((state) => state.session);
  const toggleFavorite = useToggleFavorite();

  const productRef = Number(ref);
  const { data: product, isLoading, isError } = useProduct(productRef);
  const { data: similar } = useSimilarProducts(product?.id);

  // Count the view once the listing resolves. Fire-and-forget: the counter is
  // de-duplicated server-side and must never block or break the page.
  useEffect(() => {
    if (!product?.id) return;
    void endpoints.recordView(product.id, 'deeplink').catch(() => undefined);
  }, [product?.id]);

  useSeo({
    title: product?.title ?? t('common.loading'),
    description:
      product?.description?.slice(0, 200) ??
      (product ? `${formatPrice(product.price, product.currency)} · ${product.city ?? ''}` : undefined),
    image: product?.images.find((media) => media.mediaType !== 'video')?.url ?? null,
    path: `/product/${ref}`,
    type: 'product',
    structuredData: product ? productStructuredData(product) : null,
  });

  if (isLoading) return <ProductSkeleton />;

  if (isError || !product) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <EmptyState
          icon="package"
          title={t('error.listingNotFound')}
          body={t('error.listingNotFoundBody')}
          action={
            <Button icon="search" onClick={() => navigate('/browse')}>
              {t('empty.browse')}
            </Button>
          }
        />
      </div>
    );
  }

  const hasContact = Boolean(product.contact.phone || product.contact.whatsapp);

  return (
    <div className="mx-auto max-w-[80rem] px-4 py-6 lg:px-6">
      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-text-muted">
        <Link to="/browse" className="hover:text-brand">
          {t('browse.title')}
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-text-secondary">{product.title}</span>
      </nav>

      {/* One column on phones; gallery + buy panel side by side from tablet up,
          with the gallery taking the larger share on desktop.
          The order matters on a phone: a buyer wants the price and a way to
          reach the seller straight after the photos, not after scrolling the
          whole description. Flex ordering puts the panel second on a phone and
          leaves the grid columns alone from tablet up. */}
      <div className="flex flex-col gap-6 md:grid md:grid-cols-[minmax(0,1fr)_20rem] lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:gap-8">
        <div className="order-1 min-w-0 md:col-start-1 md:row-start-1">
          <Gallery product={product} />
        </div>

        <div className="order-3 min-w-0 space-y-6 md:col-start-1 md:row-start-2">
          {product.description ? (
            <section>
              <h2 className="mb-2 font-display text-base font-bold text-text-primary">
                {t('product.description')}
              </h2>
              {/* whitespace-pre-line keeps a seller's line breaks, which is how
                  they list specs, without allowing any markup through. */}
              <p className="whitespace-pre-line text-sm leading-relaxed text-text-secondary">
                {product.description}
              </p>
            </section>
          ) : null}

          <Attributes product={product} />
        </div>

        {/* Buy panel — second on a phone, and a sticky right-hand column from
            tablet up so the contact buttons never scroll away. */}
        <aside className="order-2 min-w-0 md:col-start-2 md:row-span-2 md:row-start-1 md:sticky md:top-24 md:self-start">
          <div className="space-y-4 rounded-(--radius-card) border border-border-subtle bg-surface-raised p-5">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                {product.status === 'sold' ? <Badge tone="neutral">{t('product.sold')}</Badge> : null}
                {product.featured ? (
                  <Badge tone="sun" icon="verified">
                    {t('common.featured')}
                  </Badge>
                ) : null}
                <Badge tone="brand">{t(`condition.${product.condition}` as TranslationKey)}</Badge>
                {product.deliveryAvailable ? <Badge tone="info">{t('common.delivery')}</Badge> : null}
              </div>

              <h1 className="mt-3 font-display text-xl font-bold leading-tight tracking-tight text-text-primary">
                {product.title}
              </h1>

              <p className="mt-2 font-display text-2xl font-extrabold text-text-primary">
                {formatPrice(product.price, product.currency, language)}
                {product.negotiable ? (
                  <span className="ml-2 align-middle text-xs font-medium text-text-muted">
                    {t('common.negotiable')}
                  </span>
                ) : null}
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-muted">
                <span className="inline-flex items-center gap-1">
                  <Icon name="map-pin" size={13} />
                  {product.city ?? '—'}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Icon name="eye" size={13} />
                  {t('product.views', { count: formatNumber(product.viewCount, language) })}
                </span>
                <time dateTime={product.publishedAt ?? undefined}>
                  {formatRelativeTime(product.publishedAt, language)}
                </time>
              </div>
            </div>

            <div className="space-y-2 border-t border-border-subtle pt-4">
              {product.contact.phone ? (
                <Button
                  fullWidth
                  size="lg"
                  icon="phone"
                  onClick={() => {
                    window.location.href = telLink(product.contact.phone!);
                  }}
                >
                  {t('product.callSeller')}
                </Button>
              ) : null}

              {product.contact.whatsapp ? (
                <a
                  href={whatsappLink(
                    product.contact.whatsapp,
                    `${product.title} — ${product.shareUrl}`,
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-(--radius-field) bg-[#25D366] text-base font-semibold text-ink-950 transition-colors hover:brightness-95"
                >
                  <WhatsAppIcon size={20} />
                  {t('product.whatsapp')}
                </a>
              ) : null}

              {session?.user.id === product.seller.id ? (
                <p className="text-center text-sm font-medium text-text-muted">{t('messages.ownListing')}</p>
              ) : (
                <Button
                  variant="secondary"
                  fullWidth
                  size="lg"
                  icon="message"
                  onClick={() =>
                    navigate(
                      session
                        ? `/messages/new?product=${product.id}`
                        : `/signin?next=${encodeURIComponent(`/product/${product.ref}`)}`,
                    )
                  }
                >
                  {t('product.message')}
                </Button>
              )}

              {!hasContact ? (
                <p className="text-center text-xs text-text-muted">{t('product.contactHidden')}</p>
              ) : null}
            </div>

            <div className="flex gap-2 border-t border-border-subtle pt-4">
              <Button
                variant="ghost"
                size="sm"
                className="flex-1"
                icon={product.isFavorited ? 'heart-filled' : 'heart'}
                onClick={() =>
                  session ? toggleFavorite.mutate(product) : navigate('/signin')
                }
              >
                {product.isFavorited ? t('product.saved') : t('product.save')}
              </Button>
              <ShareButton product={product} />
            </div>
          </div>

          <SellerCard product={product} />
        </aside>
      </div>

      {similar?.length ? (
        <section className="mt-12">
          <h2 className="mb-4 font-display text-lg font-bold tracking-tight text-text-primary">
            {t('product.similar')}
          </h2>
          <ProductRail products={similar} showFavorite={false} />
        </section>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function Gallery({ product }: { product: ProductDetail }) {
  const t = useT();
  const [index, setIndex] = useState(0);
  const images = product.images;
  const active = images[index];

  if (images.length === 0) {
    return (
      <div className="flex aspect-[4/3] items-center justify-center rounded-(--radius-card) border border-border-subtle bg-surface-sunken text-text-muted">
        <div className="flex flex-col items-center gap-2">
          <Icon name="image" size={28} />
          <span className="text-sm">{t('product.noImage')}</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-(--radius-card) border border-border-subtle bg-surface-sunken">
        {active?.mediaType === 'video' ? (
          // preload="none" matters more here than anywhere else on the site: a
          // buyer who never presses play must not pay for the megabytes. The
          // poster is a small WebP the seller's browser extracted on upload.
          <video
            key={active.id}
            src={active.url}
            poster={active.thumbnailUrl ?? undefined}
            controls
            playsInline
            preload="none"
            // Sized to the frame rather than stretched to the box: Chromium
            // paints a video element's own letterbox black whatever the CSS
            // says, so the bars have to be the container showing through.
            className="mx-auto max-h-full max-w-full"
          >
            {t('product.videoUnsupported')}
          </video>
        ) : (
          <img
            src={active?.url}
            alt={`${product.title} — ${index + 1}`}
            width={active?.width ?? 1200}
            height={active?.height ?? 900}
            // The first image is the largest thing on the page and the reason the
            // visitor is here, so it loads eagerly at high priority.
            loading="eager"
            {...({ fetchpriority: 'high' } as React.ImgHTMLAttributes<HTMLImageElement>)}
            decoding="async"
            className="size-full object-contain"
          />
        )}

        {images.length > 1 ? (
          <>
            <GalleryArrow
              side="left"
              onClick={() => setIndex((i) => (i - 1 + images.length) % images.length)}
              label={t('common.previous')}
            />
            <GalleryArrow
              side="right"
              onClick={() => setIndex((i) => (i + 1) % images.length)}
              label={t('common.next')}
            />
            <span className="absolute bottom-3 right-3 rounded-(--radius-pill) bg-ink-900/70 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-sm">
              {index + 1} / {images.length}
            </span>
          </>
        ) : null}
      </div>

      {images.length > 1 ? (
        <div className="em-scroll-x mt-3 flex gap-2">
          {images.map((image, i) => (
            <button
              key={image.id}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`${t('common.next')} ${i + 1}`}
              aria-current={i === index}
              className={`size-16 shrink-0 overflow-hidden rounded-(--radius-field) border-2 transition-colors ${
                i === index ? 'border-brand' : 'border-transparent opacity-70 hover:opacity-100'
              }`}
            >
              {image.mediaType === 'video' ? (
                <span className="relative flex size-full items-center justify-center bg-ink-900 text-white">
                  {image.thumbnailUrl ? (
                    <img
                      src={image.thumbnailUrl}
                      alt=""
                      width={64}
                      height={64}
                      loading="lazy"
                      decoding="async"
                      className="size-full object-cover opacity-70"
                    />
                  ) : null}
                  <span className="absolute inset-0 flex items-center justify-center">
                    <Icon name="play" size={18} />
                  </span>
                  {image.durationSeconds ? (
                    <span className="absolute inset-x-0 bottom-0 bg-ink-950/70 text-center text-[0.625rem] font-semibold">
                      {formatDuration(image.durationSeconds)}
                    </span>
                  ) : null}
                </span>
              ) : (
                <img
                  src={image.thumbnailUrl ?? image.url}
                  alt=""
                  width={64}
                  height={64}
                  loading="lazy"
                  decoding="async"
                  className="size-full object-cover"
                />
              )}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function GalleryArrow({
  side,
  onClick,
  label,
}: {
  side: 'left' | 'right';
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`absolute top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-surface-raised/90 text-text-primary shadow-sm backdrop-blur transition-colors hover:bg-surface-raised ${
        side === 'left' ? 'left-3' : 'right-3'
      }`}
    >
      <Icon name={side === 'left' ? 'chevron-left' : 'chevron-right'} size={20} />
    </button>
  );
}

/**
 * Category-driven attributes.
 *
 * The keys come from the listing's own `attributes` jsonb, whose shape is
 * dictated by the category's field schema. Nothing here knows what a car is —
 * add a field to a category in the admin dashboard and it appears.
 */
function Attributes({ product }: { product: ProductDetail }) {
  const t = useT();
  const { language } = useI18n();

  const rows: Array<[string, string]> = [];
  if (product.brand) rows.push(['Brand', product.brand]);
  if (product.model) rows.push(['Model', product.model]);
  if (product.year) rows.push(['Year', String(product.year)]);
  if (product.color) rows.push(['Colour', product.color]);
  if (product.size) rows.push(['Size', product.size]);
  if (product.quantity > 1) rows.push(['Quantity', formatNumber(product.quantity, language)]);

  for (const [key, value] of Object.entries(product.attributes)) {
    if (value === null || value === '' || typeof value === 'object') continue;
    rows.push([
      key.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()),
      typeof value === 'boolean' ? (value ? '✓' : '—') : String(value),
    ]);
  }

  if (rows.length === 0) return null;

  return (
    <section>
      <h2 className="mb-2 font-display text-base font-bold text-text-primary">
        {t('product.details')}
      </h2>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-0 lg:grid-cols-3">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-3 border-b border-border-subtle py-2.5">
            <dt className="text-sm text-text-muted">{label}</dt>
            <dd className="text-right text-sm font-medium text-text-primary">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function SellerCard({ product }: { product: ProductDetail }) {
  const t = useT();
  const { language } = useI18n();

  return (
    <div className="mt-4 rounded-(--radius-card) border border-border-subtle bg-surface-raised p-5">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-muted">
        {t('product.seller')}
      </h2>
      <Link to={`/seller/${product.seller.id}`} className="flex items-center gap-3 group">
        {product.seller.avatarUrl ? (
          <img
            src={product.seller.avatarUrl}
            alt=""
            width={48}
            height={48}
            loading="lazy"
            className="size-12 rounded-full object-cover"
          />
        ) : (
          <span className="flex size-12 items-center justify-center rounded-full bg-brand-subtle font-display text-lg font-bold text-brand">
            {product.seller.name.charAt(0).toUpperCase()}
          </span>
        )}
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 truncate font-semibold text-text-primary group-hover:text-brand">
            {product.seller.name}
            {product.seller.verified ? (
              <Icon name="verified" size={15} className="text-brand" strokeWidth={2.25} />
            ) : null}
          </p>
          <p className="text-xs text-text-muted">
            {t('product.memberSince', { date: formatDate(product.createdAt, language) })}
          </p>
        </div>
      </Link>
    </div>
  );
}

function ShareButton({ product }: { product: ProductDetail }) {
  const t = useT();
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const payload = {
      title: product.title,
      text: `${product.title} — ${formatPrice(product.price, product.currency)}`,
      url: product.shareUrl,
    };

    // The native share sheet is what puts a listing into a WhatsApp group in
    // two taps. Clipboard is the desktop fallback.
    if (navigator.share) {
      try {
        await navigator.share(payload);
        return;
      } catch {
        // Cancelled by the user; fall through to copying.
      }
    }
    try {
      await navigator.clipboard.writeText(product.shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked; nothing sensible left to do.
    }
  };

  return (
    <Button variant="ghost" size="sm" className="flex-1" icon={copied ? 'check' : 'share'} onClick={share}>
      {copied ? t('product.linkCopied') : t('product.share')}
    </Button>
  );
}

function ProductSkeleton() {
  return (
    <div className="mx-auto max-w-[80rem] px-4 py-6 lg:px-6">
      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_20rem] lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:gap-8">
        <div className="space-y-4">
          <Skeleton className="aspect-[4/3] rounded-(--radius-card)" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
        <div className="space-y-3 rounded-(--radius-card) border border-border-subtle p-5">
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    </div>
  );
}
