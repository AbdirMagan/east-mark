import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { en, type Dictionary, type TranslationKey } from './locales/en.js';

export type LanguageCode = 'en' | 'so' | 'am' | 'sw';

export const LANGUAGES: ReadonlyArray<{
  code: LanguageCode;
  name: string;
  nativeName: string;
}> = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'so', name: 'Somali', nativeName: 'Soomaali' },
  { code: 'am', name: 'Amharic', nativeName: 'አማርኛ' },
  { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili' },
];

/**
 * Locales other than English are code-split and fetched on demand.
 *
 * Bundling all four would ship three dictionaries every visitor never reads.
 * That is the wrong trade on a connection where the first paint is already
 * the expensive part — so English (the fallback, needed regardless) is in the
 * main bundle and the rest arrive only if chosen.
 */
const loaders: Record<Exclude<LanguageCode, 'en'>, () => Promise<Partial<Dictionary>>> = {
  so: () => import('./locales/so.js').then((m) => m.so),
  am: () => import('./locales/am.js').then((m) => m.am),
  sw: () => import('./locales/sw.js').then((m) => m.sw),
};

export type TranslateValues = Record<string, string | number>;
export type Translate = (key: TranslationKey, values?: TranslateValues) => string;

interface I18nContextValue {
  language: LanguageCode;
  setLanguage: (code: LanguageCode) => void;
  t: Translate;
  /** True while a non-English dictionary is still in flight. */
  loading: boolean;
}

const I18nContext = createContext<I18nContextValue | null>(null);

const STORAGE_KEY = 'em.language';

function detectLanguage(): LanguageCode {
  if (typeof window === 'undefined') return 'en';

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored && isLanguage(stored)) return stored;

  // navigator.languages is ordered by preference; take the first we support.
  for (const tag of navigator.languages ?? [navigator.language]) {
    const base = tag.split('-')[0]?.toLowerCase();
    if (base && isLanguage(base)) return base;
  }
  return 'en';
}

function isLanguage(value: string): value is LanguageCode {
  return value === 'en' || value === 'so' || value === 'am' || value === 'sw';
}

function interpolate(template: string, values?: TranslateValues): string {
  if (!values) return template;
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>(detectLanguage);
  const [dictionary, setDictionary] = useState<Partial<Dictionary>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    if (language === 'en') {
      setDictionary({});
      setLoading(false);
    } else {
      setLoading(true);
      loaders[language]()
        .then((loaded) => {
          if (!cancelled) setDictionary(loaded);
        })
        .catch(() => {
          // A failed chunk fetch must not blank the interface: English is
          // already in the bundle and every key resolves against it.
          if (!cancelled) setDictionary({});
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }

    document.documentElement.lang = language;
    return () => {
      cancelled = true;
    };
  }, [language]);

  const setLanguage = useCallback((code: LanguageCode) => {
    setLanguageState(code);
    try {
      window.localStorage.setItem(STORAGE_KEY, code);
    } catch {
      // Private browsing with storage blocked: the choice simply is not
      // remembered between visits, which is preferable to a crash.
    }
  }, []);

  const t = useCallback<Translate>(
    (key, values) => interpolate(dictionary[key] ?? en[key] ?? key, values),
    [dictionary],
  );

  const value = useMemo(
    () => ({ language, setLanguage, t, loading }),
    [language, setLanguage, t, loading],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n must be used inside <I18nProvider>');
  return context;
}

/** Shorthand for components that only need the translate function. */
export function useT(): Translate {
  return useI18n().t;
}

export type { TranslationKey };
