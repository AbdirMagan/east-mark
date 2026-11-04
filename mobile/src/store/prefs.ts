import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import { LANGUAGES, type Language } from '../i18n';
import type { ThemeMode } from '../useTheme';
import { translate, type StringKey } from '../i18n';

const KEY = 'em.prefs';

/**
 * The currencies the marketplace trades in, with the rates the Android app
 * uses (ui Currency enum, rateToUsd).
 *
 * The conversion happens here rather than on the server. The API's `currency`
 * parameter looks like it would do this job and does not -- it filters to
 * listings *priced* in that currency, so asking for Kenyan shillings returns
 * nothing at all rather than the catalogue in shillings.
 *
 * Rates in the client mean they can drift from reality, so a converted price
 * is an estimate. The listing's own currency is what the seller is actually
 * asking in, which is why a listing page shows that and not this.
 */
export const CURRENCIES = [
  { code: 'USD', symbol: '$', label: 'US Dollar', perUsd: 1 },
  { code: 'SLSH', symbol: 'Sl.Sh', label: 'Somaliland Shilling', perUsd: 8500 },
  { code: 'DJF', symbol: 'Fdj', label: 'Djiboutian Franc', perUsd: 177.72 },
  { code: 'SOS', symbol: 'So.Sh', label: 'Somali Shilling', perUsd: 570 },
  { code: 'ETB', symbol: 'Br', label: 'Ethiopian Birr', perUsd: 125 },
  { code: 'KES', symbol: 'KSh', label: 'Kenyan Shilling', perUsd: 130 },
] as const;

export interface LocationChoice {
  countryId: number | null;
  cityId: number | null;
  /** What the header chip shows: the city, else the country, else everywhere. */
  label: string | null;
}

interface Prefs {
  language: Language;
  countryId: number | null;
  cityId: number | null;
  locationLabel: string | null;
  currency: string;
  themeMode: ThemeMode;
  /** True until the saved preferences have been read back. */
  loading: boolean;

  setLanguage: (language: Language) => void;
  setLocation: (choice: LocationChoice) => void;
  setCurrency: (code: string) => void;
  setThemeMode: (mode: ThemeMode) => void;
  load: () => Promise<void>;
  /** Shorthand so screens read `t('buy')` rather than threading the language. */
  t: (key: StringKey) => string;
}

export const usePrefs = create<Prefs>((set, get) => ({
  language: 'en',
  countryId: null,
  cityId: null,
  locationLabel: null,
  currency: 'USD',
  // Follow the phone until someone says otherwise.
  themeMode: 'system',
  loading: true,

  setLanguage: (language) => {
    set({ language });
    void persist(get());
  },

  setLocation: ({ countryId, cityId, label }) => {
    set({ countryId, cityId, locationLabel: label });
    void persist(get());
  },

  setCurrency: (currency) => {
    set({ currency });
    void persist(get());
  },

  setThemeMode: (themeMode) => {
    set({ themeMode });
    void persist(get());
  },

  load: async () => {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      const saved = raw ? (JSON.parse(raw) as Partial<Prefs>) : null;
      set({
        // A stored value from an older build could name a language that no
        // longer exists; fall back rather than render every label as a key.
        language: LANGUAGES.includes(saved?.language as Language)
          ? (saved?.language as Language)
          : 'en',
        countryId: typeof saved?.countryId === 'number' ? saved.countryId : null,
        cityId: typeof saved?.cityId === 'number' ? saved.cityId : null,
        locationLabel: typeof saved?.locationLabel === 'string' ? saved.locationLabel : null,
        currency: CURRENCIES.some((item) => item.code === saved?.currency)
          ? (saved?.currency as string)
          : 'USD',
        themeMode: (['system', 'light', 'dark'] as const).includes(saved?.themeMode as ThemeMode)
          ? (saved?.themeMode as ThemeMode)
          : 'system',
        loading: false,
      });
    } catch {
      set({ loading: false });
    }
  },

  t: (key) => translate(key, get().language),
}));

async function persist(state: Prefs) {
  try {
    await AsyncStorage.setItem(
      KEY,
      JSON.stringify({
        language: state.language,
        countryId: state.countryId,
        cityId: state.cityId,
        locationLabel: state.locationLabel,
        currency: state.currency,
        themeMode: state.themeMode,
      }),
    );
  } catch {
    // Losing a preference is a small annoyance; crashing over it is not worth it.
  }
}
