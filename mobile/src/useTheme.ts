import { useMemo } from 'react';
import { useColorScheme } from 'react-native';

import { DARK, LIGHT, type Palette } from './theme';
import { usePrefs } from './store/prefs';

export type ThemeMode = 'system' | 'light' | 'dark';

/**
 * Which palette is in force.
 *
 * "System" is the default and follows the phone, because someone who has set
 * their whole phone to dark at night has already said what they want. The
 * other two exist because that setting is a blunt instrument: people read in
 * bed with the lights on, and people use a bright phone outdoors.
 */
export function useColors(): Palette {
  const mode = usePrefs((state) => state.themeMode);
  const system = useColorScheme();
  const dark = mode === 'dark' || (mode === 'system' && system === 'dark');
  return dark ? DARK : LIGHT;
}

/** True when the dark palette is showing, for the status bar and such. */
export function useIsDark(): boolean {
  const mode = usePrefs((state) => state.themeMode);
  const system = useColorScheme();
  return mode === 'dark' || (mode === 'system' && system === 'dark');
}

/**
 * Builds a screen's stylesheet from the active palette.
 *
 * `StyleSheet.create` resolves its values once, when the module loads, so a
 * stylesheet written against a fixed palette can never change theme. Passing
 * the palette in and memoising on it means the sheet is rebuilt exactly when
 * the colours change and not on every render.
 *
 * The factory must be defined at module scope, so that it is the same function
 * each render and the memo actually holds.
 */
export function useStyles<T>(factory: (colors: Palette) => T): T {
  const colors = useColors();
  return useMemo(() => factory(colors), [factory, colors]);
}
