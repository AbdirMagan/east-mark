import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeChoice = 'light' | 'dark' | 'system';

export interface LocationChoice {
  countryId: number | null;
  countryCode: string | null;
  countryName: string | null;
  cityId: number | null;
  cityName: string | null;
  /** Set when the user granted geolocation, for "sort by nearest". */
  lat: number | null;
  lng: number | null;
}

interface PreferencesState extends LocationChoice {
  currency: string;
  theme: ThemeChoice;
  setCurrency: (code: string) => void;
  setTheme: (theme: ThemeChoice) => void;
  setCountry: (country: { id: number; code: string; name: string } | null) => void;
  setCity: (city: { id: number; name: string } | null) => void;
  setCoordinates: (lat: number | null, lng: number | null) => void;
  clearLocation: () => void;
}

/**
 * Currency, theme and the chosen place, persisted to localStorage.
 *
 * Location lives here rather than in the URL because it is a standing
 * preference: someone in Hargeisa wants Hargeisa listings on every visit, not
 * just the one they arrived through. Search filters stay in the URL, where
 * they belong, so a filtered result can be shared and linked.
 *
 * Language is NOT here — it lives in the i18n provider, which also has to
 * fetch the matching dictionary.
 */
export const usePreferences = create<PreferencesState>()(
  persist(
    (set) => ({
      currency: 'USD',
      theme: 'system',
      countryId: null,
      countryCode: null,
      countryName: null,
      cityId: null,
      cityName: null,
      lat: null,
      lng: null,

      setCurrency: (currency) => set({ currency }),
      setTheme: (theme) => set({ theme }),

      setCountry: (country) =>
        set(
          country
            ? {
                countryId: country.id,
                countryCode: country.code,
                countryName: country.name,
                // Changing country invalidates the city beneath it.
                cityId: null,
                cityName: null,
              }
            : { countryId: null, countryCode: null, countryName: null, cityId: null, cityName: null },
        ),

      setCity: (city) =>
        set(city ? { cityId: city.id, cityName: city.name } : { cityId: null, cityName: null }),

      setCoordinates: (lat, lng) => set({ lat, lng }),

      clearLocation: () =>
        set({
          countryId: null,
          countryCode: null,
          countryName: null,
          cityId: null,
          cityName: null,
          lat: null,
          lng: null,
        }),
    }),
    {
      name: 'em.preferences',
      version: 1,
    },
  ),
);

/**
 * Applies the theme to <html>.
 *
 * Called once at startup and whenever the choice changes. "system" subscribes
 * to prefers-color-scheme so the page follows the device without a reload.
 */
export function applyTheme(theme: ThemeChoice): () => void {
  const root = document.documentElement;
  const media = window.matchMedia('(prefers-color-scheme: dark)');

  const apply = () => {
    const dark = theme === 'dark' || (theme === 'system' && media.matches);
    root.classList.toggle('dark', dark);
    // Keeps the browser UI (address bar, form controls) in step.
    root.style.colorScheme = dark ? 'dark' : 'light';
  };

  apply();

  if (theme !== 'system') return () => undefined;
  media.addEventListener('change', apply);
  return () => media.removeEventListener('change', apply);
}
