import strings from './strings.json';

/**
 * The four launch languages.
 *
 * The dictionaries were lifted from the SwiftUI app so the wording is the same
 * one someone sees if they use both. A key missing from a translation falls
 * back to English rather than rendering the key itself: a seller reading
 * "videoTooLarge" on screen learns nothing.
 */
export const LANGUAGES = ['en', 'so', 'am', 'sw'] as const;
export type Language = (typeof LANGUAGES)[number];

export const LANGUAGE_NAMES: Record<Language, string> = {
  en: 'English',
  so: 'Soomaali',
  am: 'አማርኛ',
  sw: 'Kiswahili',
};

type Table = Record<Language, Record<string, string>>;
const table = strings as Table;

export type StringKey = keyof (typeof strings)['en'];

export function translate(key: StringKey, language: Language): string {
  return table[language]?.[key] ?? table.en[key] ?? (key as string);
}
