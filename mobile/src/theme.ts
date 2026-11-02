/**
 * The palette, carried over from the SwiftUI app and the web stylesheet so
 * the three clients look like one product.
 */
export const Brand = {
  acacia: '#1E6F5C',
  acaciaDark: '#144E41',
  clay: '#B8531A',
  clayDark: '#7D3712',
  sun: '#E9BB63',
  navy: '#1D3F72',
  ink: '#1A1713',
  sand: '#FAF7F2',
  sandDeep: '#F2EDE4',
  muted: '#8A7F70',
  whatsapp: '#25D366',
  white: '#FFFFFF',
} as const;

export const Radius = {
  field: 12,
  card: 20,
  pill: 999,
} as const;

export const Space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
} as const;

/** Prices arrive already converted by the backend; this only formats them. */
export function formatPrice(amount: number, currency: string): string {
  const symbols: Record<string, string> = {
    USD: '$',
    KES: 'KSh ',
    ETB: 'Br ',
    DJF: 'Fdj ',
    SOS: 'Sh ',
    SLSH: 'SL ',
  };
  // Currencies without sub-units read as nonsense with decimals, and these
  // four are all whole-unit in practice.
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
