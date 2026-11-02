import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import { LANGUAGES, type Language } from '../i18n';
import { translate, type StringKey } from '../i18n';

const KEY = 'em.prefs';

interface Prefs {
  language: Language;
  countryId: number | null;
  /** True until the saved preferences have been read back. */
  loading: boolean;
  setLanguage: (language: Language) => void;
  setCountry: (countryId: number | null) => void;
  load: () => Promise<void>;
  /** Shorthand so screens read `t('buy')` rather than threading the language. */
  t: (key: StringKey) => string;
}

export const usePrefs = create<Prefs>((set, get) => ({
  language: 'en',
  countryId: null,
  loading: true,

  setLanguage: (language) => {
    set({ language });
    void persist(get());
  },

  setCountry: (countryId) => {
    set({ countryId });
    void persist(get());
  },

  load: async () => {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      const saved = raw ? (JSON.parse(raw) as Partial<Prefs>) : null;
      set({
        // A stored value from an older build could be a language that no
        // longer exists; fall back rather than render every label as a key.
        language: LANGUAGES.includes(saved?.language as Language)
          ? (saved?.language as Language)
          : 'en',
        countryId: typeof saved?.countryId === 'number' ? saved.countryId : null,
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
      JSON.stringify({ language: state.language, countryId: state.countryId }),
    );
  } catch {
    // Losing a preference is a small annoyance; crashing over it is not worth it.
  }
}
