import type { LanguageCode } from '../validators/common.js';
import { DEFAULT_LANGUAGE } from '../validators/common.js';

/**
 * Reference tables carry localized names in a `translations` jsonb column:
 *   {"so": "Hargeysa", "am": "ሀርጌሳ"}
 *
 * The `name` column is the English/canonical spelling and is always present,
 * so a missing translation degrades to something readable rather than to null.
 * That matters here: seeding every city in four languages is an ongoing job,
 * and a half-translated row must never render as a blank chip in the UI.
 */
export type Translations = Record<string, string> | null | undefined;

export function translate(
  translations: Translations,
  fallback: string,
  lang: LanguageCode = DEFAULT_LANGUAGE,
): string {
  if (lang === DEFAULT_LANGUAGE) return fallback;
  const value = translations?.[lang];
  return typeof value === 'string' && value.trim().length > 0 ? value : fallback;
}

/** Narrows the untyped jsonb coming back from PostgREST. */
export function asTranslations(value: unknown): Translations {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, string>;
  }
  return null;
}
