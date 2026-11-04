/**
 * The palettes, carried over from the Android app (ui/theme/Color.kt and
 * Theme.kt) so the two phones look like one product.
 *
 * Light and dark name the same roles, which is what lets a screen be written
 * once: a style asks for `surface` or `slate`, never for a hex code, and the
 * theme decides what that means today.
 */

const SHARED = {
  teal: '#00897B',
  tealLight: '#4DB6AC',
  tealDark: '#004D40',
  gold: '#E67E22',
  goldLight: '#F39C12',
  success: '#10B981',
  error: '#EF4444',
  verified: '#2563EB',
  whatsapp: '#25D366',
  white: '#FFFFFF',
  /** The header stays navy in both themes: it is the brand, not a surface. */
  navyDark: '#09182C',

  /**
   * Brand navy, identical in both themes.
   *
   * A fill and a mark -- a badge, the back of a video, the word on a white
   * pill -- never body text. What you read inverts with the theme; a brand
   * colour must not, or the pill goes white-on-white at night.
   */
  navy: '#0F2A4A',
  navyLight: '#1E3D6B',
} as const;

export const LIGHT = {
  ...SHARED,

  bg: '#F8FAFC',
  surface: '#FFFFFF',
  card: '#F1F5F9',

  /**
   * What you read on `bg`, `surface` or `card`. Text over a teal or gold fill,
   * or over a photo, uses `white` instead -- those fills do not change with
   * the theme, so the text on them must not either.
   */
  text: '#0F2A4A',
  /** Supporting text: a hint, a field label, an unselected tab. */
  textMuted: '#64748B',
  /** Quieter still: a location pin, a timestamp. */
  textFaint: '#94A3B8',

  /** Neutral fills -- an unselected icon, a border. Not text. */
  slate: '#64748B',
  slateLight: '#94A3B8',
  divider: '#E2E8F0',

  /** What the app header is painted with. */
  headerBg: '#0F2A4A',
} as const;

export const DARK = {
  ...SHARED,

  bg: '#0B132B',
  surface: '#1C2541',
  card: '#28385E',

  // The reading roles invert. The brand colours above do not.
  text: '#FFFFFF',
  textMuted: '#A9B8CC',
  textFaint: '#8193AB',

  // Light enough to see on a dark page, dark enough that a divider still
  // reads as a line rather than glowing.
  slate: '#A9B8CC',
  slateLight: '#8193AB',
  divider: '#2C3A5A',

  // Darker than the light theme's header so it still reads as the top of the
  // screen rather than merging with the page.
  headerBg: '#09182C',
} as const;

/**
 * The roles a theme has to fill. Mapped to `string` rather than taken straight
 * from LIGHT, because `typeof LIGHT` pins every colour to its own literal and
 * nothing else -- not even DARK -- can then satisfy it.
 */
export type Palette = { [K in keyof typeof LIGHT]: string };

/**
 * The light palette, for the handful of places that run outside React and
 * cannot ask the theme -- a navigator option evaluated once, for instance.
 * Anything inside a component should use `useColors()`.
 */
export const Brand = LIGHT;

/**
 * The type scale.
 *
 * Seven steps, not the eleven ad-hoc sizes this started with: a size that
 * exists for one label is a size nobody can match later. Nothing is smaller
 * than 11, because this app is read on cheap phones in daylight and 10pt is a
 * guess rather than a read.
 */
export const Type = {
  /** A badge, a tab label: the smallest thing that still has to be legible. */
  badge: 11,
  caption: 12,
  small: 13,
  body: 15,
  title: 17,
  heading: 20,
  /** A price on a listing or a feed slide. */
  display: 26,
} as const;

export const Radius = {
  chip: 20,
  field: 12,
  card: 14,
  pill: 999,
} as const;

export const Space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
} as const;

/**
 * Converts a listing's price into the currency the reader chose, then formats
 * it. Via USD, as the Android app does, so one rate per currency covers every
 * pair.
 *
 * `display` omitted means show it as the seller priced it.
 */
export function formatPrice(amount: number, currency: string, display?: string): string {
  if (display && display !== currency) {
    const from = RATES[currency];
    const to = RATES[display];
    // An unknown code is better shown honestly in its own currency than
    // converted with a rate invented for it.
    if (from && to) return format(((amount / from) * to), display);
  }
  return format(amount, currency);
}

/** Units of each currency to one US dollar, matching the Android enum. */
const RATES: Record<string, number> = {
  USD: 1,
  SLSH: 8500,
  DJF: 177.72,
  SOS: 570,
  ETB: 125,
  KES: 130,
};

function format(amount: number, currency: string): string {
  const symbols: Record<string, string> = {
    USD: '$ ',
    KES: 'KSh ',
    ETB: 'Br ',
    DJF: 'Fdj ',
    SOS: 'So.Sh ',
    SLSH: 'Sl.Sh ',
  };
  // Currencies without sub-units read as nonsense with decimals, and four of
  // these five are whole-unit in practice.
  const decimals = currency === 'USD' && !Number.isInteger(amount) ? 2 : 0;
  const formatted = amount.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return `${symbols[currency] ?? `${currency} `}${formatted}`;
}

/** "0:42" -- the badge on a video tile. */
export function formatDuration(seconds: number): string {
  const whole = Math.max(0, Math.round(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}
