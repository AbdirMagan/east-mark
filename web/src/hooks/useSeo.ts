import { useEffect } from 'react';

interface SeoOptions {
  title: string;
  description?: string;
  image?: string | null;
  /** Canonical path, e.g. /product/100042. */
  path?: string;
  type?: 'website' | 'article' | 'product';
  /** JSON-LD, so a listing can appear as a rich result. */
  structuredData?: Record<string, unknown> | null;
  noIndex?: boolean;
}

const SITE_NAME = 'East-Market';
const SITE_URL = (import.meta.env.VITE_SITE_URL as string | undefined) ?? 'https://eastmarket.app';

/**
 * Per-page document metadata.
 *
 * Product pages are shared into WhatsApp groups constantly in these markets —
 * that is how a listing actually spreads — so Open Graph tags are not an
 * afterthought here. Without them a shared link is a bare URL; with them it is
 * a card with the photo, title and price, which is the difference between a
 * link that gets tapped and one that does not.
 *
 * This is a client-rendered app, so crawlers that do not execute JavaScript
 * will not see these. Pre-rendering product routes is the follow-up; the tags
 * are correct either way, and WhatsApp, Telegram and Facebook all render what
 * a prerenderer would emit.
 */
export function useSeo({
  title,
  description,
  image,
  path,
  type = 'website',
  structuredData,
  noIndex = false,
}: SeoOptions): void {
  useEffect(() => {
    const fullTitle = title === SITE_NAME ? title : `${title} | ${SITE_NAME}`;
    document.title = fullTitle;

    const canonical = path ? `${SITE_URL.replace(/\/$/, '')}${path}` : SITE_URL;

    setMeta('name', 'description', description);
    setMeta('name', 'robots', noIndex ? 'noindex, nofollow' : 'index, follow');

    setMeta('property', 'og:site_name', SITE_NAME);
    setMeta('property', 'og:title', fullTitle);
    setMeta('property', 'og:description', description);
    setMeta('property', 'og:type', type);
    setMeta('property', 'og:url', canonical);
    setMeta('property', 'og:image', image ?? undefined);

    // Large image cards, since a product photo is the point of the share.
    setMeta('name', 'twitter:card', image ? 'summary_large_image' : 'summary');
    setMeta('name', 'twitter:title', fullTitle);
    setMeta('name', 'twitter:description', description);
    setMeta('name', 'twitter:image', image ?? undefined);

    setLink('canonical', canonical);
    setStructuredData(structuredData);
  }, [title, description, image, path, type, structuredData, noIndex]);
}

function setMeta(attribute: 'name' | 'property', key: string, content: string | undefined): void {
  const selector = `meta[${attribute}="${key}"]`;
  let element = document.head.querySelector<HTMLMetaElement>(selector);

  if (!content) {
    element?.remove();
    return;
  }
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}

function setLink(rel: string, href: string): void {
  let element = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', rel);
    document.head.appendChild(element);
  }
  element.setAttribute('href', href);
}

const JSON_LD_ID = 'em-structured-data';

function setStructuredData(data: Record<string, unknown> | null | undefined): void {
  document.getElementById(JSON_LD_ID)?.remove();
  if (!data) return;

  const script = document.createElement('script');
  script.id = JSON_LD_ID;
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify(data);
  document.head.appendChild(script);
}

/** Schema.org Product for a listing, used by search engines for rich results. */
export function productStructuredData(product: {
  title: string;
  description: string | null;
  price: number;
  currency: string;
  condition: string;
  images: Array<{ url: string }>;
  status: string;
  city: string | null;
  shareUrl: string;
}): Record<string, unknown> {
  const CONDITIONS: Record<string, string> = {
    new: 'https://schema.org/NewCondition',
    like_new: 'https://schema.org/NewCondition',
    used: 'https://schema.org/UsedCondition',
    refurbished: 'https://schema.org/RefurbishedCondition',
  };

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: product.description ?? undefined,
    image: product.images.map((image) => image.url),
    offers: {
      '@type': 'Offer',
      price: product.price,
      priceCurrency: product.currency,
      itemCondition: CONDITIONS[product.condition] ?? 'https://schema.org/UsedCondition',
      availability:
        product.status === 'sold'
          ? 'https://schema.org/SoldOut'
          : 'https://schema.org/InStock',
      url: product.shareUrl,
      areaServed: product.city ?? undefined,
    },
  };
}
