import type { LanguageCode } from '../i18n/index.js';

/** Locale tags for Intl. Somali maps to so-SO, which modern browsers accept. */
const INTL_LOCALE: Record<LanguageCode, string> = {
  en: 'en-GB',
  so: 'so-SO',
  am: 'am-ET',
  sw: 'sw-KE',
};

/**
 * Currency display for the five launch currencies.
 *
 * Intl does not know SLSH (Somaliland Shilling) — it is not an ISO 4217 code,
 * because Somaliland's currency is not internationally registered. Passing it
 * to Intl.NumberFormat as a currency throws, so codes are formatted as plain
 * numbers with the symbol placed manually. SOS, ETB, KES and USD are real
 * codes but are handled the same way for consistency: a marketplace price
 * should read "$9,500" and "SL 8,500,000", not "SOS 9,500.00".
 */
const SYMBOLS: Record<string, string> = {
  USD: '$',
  SLSH: 'SL',
  SOS: 'Sh.So.',
  ETB: 'Br',
  KES: 'KSh',
};

/** Currencies where fractional units are not used in practice. */
const ZERO_DECIMAL = new Set(['SLSH', 'SOS']);

export function formatPrice(
  amount: number,
  currency: string,
  language: LanguageCode = 'en',
): string {
  const decimals = ZERO_DECIMAL.has(currency) ? 0 : amount % 1 === 0 ? 0 : 2;

  const number = new Intl.NumberFormat(INTL_LOCALE[language] ?? 'en-GB', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);

  const symbol = SYMBOLS[currency] ?? currency;
  // Symbols that are a single glyph hug the number; word-like codes get a space.
  return symbol.length <= 1 ? `${symbol}${number}` : `${symbol} ${number}`;
}

export function formatNumber(value: number, language: LanguageCode = 'en'): string {
  return new Intl.NumberFormat(INTL_LOCALE[language] ?? 'en-GB').format(value);
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * "3 hours ago" style timestamps.
 *
 * On a marketplace, recency is a buying signal: a listing posted this morning
 * is worth more attention than one from March. Intl.RelativeTimeFormat gives
 * this in every supported language without a date library.
 */
export function formatRelativeTime(iso: string | null, language: LanguageCode = 'en'): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';

  const diff = date.getTime() - Date.now();
  const absolute = Math.abs(diff);

  let value: number;
  let unit: Intl.RelativeTimeFormatUnit;

  if (absolute < HOUR) {
    value = Math.round(diff / MINUTE);
    unit = 'minute';
  } else if (absolute < DAY) {
    value = Math.round(diff / HOUR);
    unit = 'hour';
  } else if (absolute < 30 * DAY) {
    value = Math.round(diff / DAY);
    unit = 'day';
  } else if (absolute < 365 * DAY) {
    value = Math.round(diff / (30 * DAY));
    unit = 'month';
  } else {
    value = Math.round(diff / (365 * DAY));
    unit = 'year';
  }

  try {
    return new Intl.RelativeTimeFormat(INTL_LOCALE[language] ?? 'en-GB', {
      numeric: 'auto',
    }).format(value, unit);
  } catch {
    return new Intl.RelativeTimeFormat('en-GB', { numeric: 'auto' }).format(value, unit);
  }
}

export function formatDate(iso: string | null, language: LanguageCode = 'en'): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  try {
    return new Intl.DateTimeFormat(INTL_LOCALE[language] ?? 'en-GB', {
      year: 'numeric',
      month: 'short',
    }).format(date);
  } catch {
    return new Intl.DateTimeFormat('en-GB', { year: 'numeric', month: 'short' }).format(date);
  }
}

export function formatDistance(km: number | null, language: LanguageCode = 'en'): string {
  if (km == null) return '';
  if (km < 1) return '< 1 km';
  return `${formatNumber(Math.round(km), language)} km`;
}

/**
 * Builds a wa.me link. WhatsApp expects the number without a leading +.
 */
export function whatsappLink(phone: string, message?: string): string {
  const digits = phone.replace(/[^\d]/g, '');
  const query = message ? `?text=${encodeURIComponent(message)}` : '';
  return `https://wa.me/${digits}${query}`;
}

export function telLink(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, '')}`;
}
