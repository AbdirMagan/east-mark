import { describe, expect, it } from 'vitest';

import { en } from '../src/i18n/locales/en.js';
import { so } from '../src/i18n/locales/so.js';
import { am } from '../src/i18n/locales/am.js';
import { sw } from '../src/i18n/locales/sw.js';
import {
  formatDistance,
  formatPrice,
  formatRelativeTime,
  telLink,
  whatsappLink,
} from '../src/lib/format.js';

describe('currency formatting', () => {
  it('formats the five launch currencies', () => {
    expect(formatPrice(9500, 'USD')).toBe('$9,500');
    expect(formatPrice(46000, 'ETB')).toBe('Br 46,000');
    expect(formatPrice(42000, 'KES')).toBe('KSh 42,000');
  });

  it('does not put fractional units on currencies that do not use them', () => {
    // A Somaliland shilling price is never quoted in cents.
    expect(formatPrice(8500000, 'SLSH')).toBe('SL 8,500,000');
    expect(formatPrice(57000.5, 'SOS')).toBe('Sh.So. 57,001');
  });

  it('survives SLSH, which Intl does not recognise as a currency', () => {
    // SLSH is not an ISO 4217 code, so Intl.NumberFormat with
    // { style: 'currency', currency: 'SLSH' } throws. Prices are formatted as
    // plain numbers with the symbol attached for exactly this reason.
    expect(() => formatPrice(1000, 'SLSH')).not.toThrow();
    expect(formatPrice(1000, 'SLSH')).toContain('SL');
  });

  it('falls back to the raw code for a currency it has no symbol for', () => {
    expect(formatPrice(100, 'UGX')).toBe('UGX 100');
  });

  it('shows decimals only when the amount has them', () => {
    expect(formatPrice(1200, 'USD')).toBe('$1,200');
    expect(formatPrice(1200.5, 'USD')).toBe('$1,200.50');
  });
});

describe('relative time', () => {
  it('describes recent listings', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(twoHoursAgo, 'en')).toMatch(/2 hours ago/i);
  });

  it('never throws on a locale the browser lacks data for', () => {
    // Somali relative-time data is missing in many engines; the formatter
    // falls back to English rather than blowing up the card.
    const iso = new Date(Date.now() - 3 * 86_400_000).toISOString();
    for (const lang of ['en', 'so', 'am', 'sw'] as const) {
      expect(() => formatRelativeTime(iso, lang)).not.toThrow();
      expect(formatRelativeTime(iso, lang)).not.toBe('');
    }
  });

  it('returns an empty string for missing or invalid dates', () => {
    expect(formatRelativeTime(null)).toBe('');
    expect(formatRelativeTime('not-a-date')).toBe('');
  });
});

describe('contact links', () => {
  it('strips the plus for wa.me, which rejects it', () => {
    expect(whatsappLink('+252634111111')).toBe('https://wa.me/252634111111');
  });

  it('url-encodes a prefilled message', () => {
    const link = whatsappLink('+254722333444', 'Toyota Corolla — is it available?');
    expect(link).toContain('https://wa.me/254722333444?text=');
    expect(link).not.toContain(' ');
  });

  it('keeps the plus for tel:, which needs it for international dialling', () => {
    expect(telLink('+251911234567')).toBe('tel:+251911234567');
  });
});

describe('distance', () => {
  it('rounds to whole kilometres and floors sub-kilometre', () => {
    expect(formatDistance(0.4)).toBe('< 1 km');
    expect(formatDistance(12.6)).toBe('13 km');
    expect(formatDistance(null)).toBe('');
  });
});

describe('translations', () => {
  const locales = { so, am, sw };
  const keys = Object.keys(en) as Array<keyof typeof en>;

  it.each(Object.entries(locales))('%s has no keys English does not', (_name, dictionary) => {
    // A stale key is dead weight that looks like coverage. English is the
    // source of truth for what exists.
    for (const key of Object.keys(dictionary)) {
      expect(keys).toContain(key);
    }
  });

  it.each(Object.entries(locales))('%s translates the whole interface', (_name, dictionary) => {
    const missing = keys.filter((key) => !(key in dictionary));
    expect(missing).toEqual([]);
  });

  it.each(Object.entries(locales))(
    '%s keeps every interpolation placeholder English uses',
    (_name, dictionary) => {
      // Dropping {city} from a translation silently renders the wrong sentence
      // rather than failing, so it is worth asserting.
      for (const key of keys) {
        const translated = (dictionary as Record<string, string>)[key];
        if (!translated) continue;
        const expected = [...en[key].matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
        const actual = [...translated.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
        expect(actual, `placeholders in "${key}"`).toEqual(expected);
      }
    },
  );

  it('has no empty strings', () => {
    for (const [name, dictionary] of Object.entries(locales)) {
      for (const [key, value] of Object.entries(dictionary)) {
        expect(value.trim(), `${name}.${key}`).not.toBe('');
      }
    }
  });
});
