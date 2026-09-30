/**
 * The icon set, drawn inline.
 *
 * A general-purpose icon package would add 40-80KB to the bundle for the two
 * dozen glyphs this product actually uses. These are 24x24 stroke paths on a
 * consistent grid, tree-shaken to only what is imported, and they inherit
 * currentColor so they follow the theme without extra work.
 */

export type IconName =
  | 'search'
  | 'heart'
  | 'heart-filled'
  | 'map-pin'
  | 'chevron-down'
  | 'chevron-right'
  | 'chevron-left'
  | 'menu'
  | 'close'
  | 'sun'
  | 'moon'
  | 'monitor'
  | 'phone'
  | 'message'
  | 'share'
  | 'check'
  | 'sliders'
  | 'plus'
  | 'globe'
  | 'user'
  | 'arrow-right'
  | 'eye'
  | 'verified'
  | 'image'
  | 'alert'
  | 'offline'
  | 'package'
  | 'grid'
  | 'coins'
  | 'cart'
  | 'play'
  | 'volume'
  | 'volume-off'
  | 'expand'
  | 'refresh'
  // Categories. Top level first, then the subcategory glyphs the database names.
  | 'electronics'
  | 'house'
  | 'car'
  | 'land'
  | 'livestock'
  | 'goods'
  | 'cpu'
  | 'tv'
  | 'smartphone'
  | 'laptop'
  | 'tablet'
  | 'speaker'
  | 'camera'
  | 'printer'
  | 'gamepad'
  | 'wifi'
  | 'cable'
  | 'hard-drive'
  | 'zap'
  | 'key'
  | 'bus'
  | 'bird'
  | 'store'
  | 'map';

const PATHS: Record<IconName, string> = {
  search: 'M11 3a8 8 0 1 0 0 16 8 8 0 0 0 0-16ZM21 21l-4.35-4.35',
  heart:
    'M20.8 5.6a5.5 5.5 0 0 0-7.8 0L12 6.6l-1-1a5.5 5.5 0 1 0-7.8 7.8l1 1L12 22l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z',
  'heart-filled':
    'M20.8 5.6a5.5 5.5 0 0 0-7.8 0L12 6.6l-1-1a5.5 5.5 0 1 0-7.8 7.8l1 1L12 22l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z',
  'map-pin': 'M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0ZM12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  'chevron-down': 'm6 9 6 6 6-6',
  'chevron-right': 'm9 18 6-6-6-6',
  'chevron-left': 'm15 18-6-6 6-6',
  menu: 'M4 6h16M4 12h16M4 18h16',
  close: 'M18 6 6 18M6 6l12 12',
  sun: 'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10ZM12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4',
  moon: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z',
  monitor: 'M3 4h18v12H3zM8 20h8M12 16v4',
  phone:
    'M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z',
  message: 'M21 11.5a8.4 8.4 0 0 1-9 8.4 8.9 8.9 0 0 1-4-.9L3 21l1.9-5a8.5 8.5 0 0 1-.9-4 8.4 8.4 0 0 1 8.5-8.4h.5a8.4 8.4 0 0 1 8 8.4Z',
  share: 'M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7M16 6l-4-4-4 4M12 2v14',
  check: 'm20 6-11 11-5-5',
  sliders: 'M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0M16 4v4M10 10v4M18 16v4',
  plus: 'M12 5v14M5 12h14',
  globe: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM3 12h18M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18Z',
  user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
  'arrow-right': 'M5 12h14M13 6l6 6-6 6',
  eye: 'M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7ZM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  verified: 'm9 12 2 2 4-4M12 2 4 5v6c0 5 3.4 9.7 8 11 4.6-1.3 8-6 8-11V5l-8-3Z',
  image: 'M3 5h18v14H3zM8.5 11a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM21 15l-5-5L5 19',
  alert: 'M12 8v5M12 17h.01M12 3 2 20h20L12 3Z',
  offline: 'M2 2l20 20M8.5 16.4a5 5 0 0 1 7 0M5 12.9a10 10 0 0 1 3-2M19 12.9a10 10 0 0 0-7-2.9M1.4 9.3a15 15 0 0 1 5-3.3M22.6 9.3a15 15 0 0 0-8-3.9M12 20h.01',
  package: 'M21 8v8l-9 5-9-5V8l9-5 9 5ZM3.3 7.3 12 12l8.7-4.7M12 12v9',
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  cart: 'M3 4h2l2.3 11.1a2 2 0 0 0 2 1.6h8.1a2 2 0 0 0 2-1.6L21 7.5H6M10 20.5a1.2 1.2 0 1 0 0-2.4 1.2 1.2 0 0 0 0 2.4ZM17.5 20.5a1.2 1.2 0 1 0 0-2.4 1.2 1.2 0 0 0 0 2.4Z',
  // A filled triangle: the one glyph every buyer already knows means video.
  play: 'm8 5 11 7-11 7V5Z',
  volume: 'M11 5 6 9H2v6h4l5 4V5ZM15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13',
  refresh: 'M21 12a9 9 0 1 1-2.6-6.4M21 3v6h-6',
  expand: 'M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3',
  'volume-off': 'M11 5 6 9H2v6h4l5 4V5ZM22 9l-6 6M16 9l6 6',
  coins: 'M9 14a6 6 0 1 0 0-12 6 6 0 0 0 0 12ZM15 22a6 6 0 1 0 0-12 6 6 0 0 0 0 12ZM9 8h.01M15 16h.01',

  // A laptop with a phone in front of it: reads as "devices", not one product.
  electronics:
    'M4 5h11a1 1 0 0 1 1 1v8H3V6a1 1 0 0 1 1-1ZM1.5 17.5h13M18 9h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-3a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1ZM19.5 17.5h.01',
  house: 'M3 10.5 12 3l9 7.5M5 9v11h14V9M10 20v-6h4v6',
  car: 'M5 17H3v-5l2-5h14l2 5v5h-2M4 12h16M7.5 15.5a2 2 0 1 1 0 4 2 2 0 0 1 0-4ZM16.5 15.5a2 2 0 1 1 0 4 2 2 0 0 1 0-4ZM9.5 17.5h5',
  // Hills under the sun with a boundary stake: a plot of land, not a map.
  land: 'M2 20h20M3 20l6-8 4 5 3-3 5 6M17 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM6 20v-5M6 15l2.5 1-2.5 1',
  // A cow's head, the most recognisable livestock silhouette at 18px.
  livestock:
    'M5 4c0 2.2 1.2 3.6 3 4M19 4c0 2.2-1.2 3.6-3 4M8 8h8l1 5-1.4 5.4A2 2 0 0 1 13.7 20h-3.4a2 2 0 0 1-1.9-1.6L7 13l1-5ZM8 9.5 4 10.5l3.4 2M16 9.5l4 1-3.4 2M10 12.5h.01M14 12.5h.01M10.5 17h.01M13.5 17h.01',
  // A sofa: home and office goods.
  goods: 'M4 11V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3M2 13a2 2 0 0 1 4 0v2h12v-2a2 2 0 0 1 4 0v5H2v-5ZM5 18v2M19 18v2',
  cpu: 'M6 6h12v12H6zM9.5 9.5h5v5h-5zM9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4',
  tv: 'M3 7h18v12H3zM8 3l4 4 4-4',
  smartphone: 'M7.5 2h9a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1ZM11 18.5h2',
  laptop: 'M4 5h16v11H4zM2 19.5h20',
  tablet: 'M5 2h14a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1ZM11 18.5h2',
  speaker: 'M6 2h12v20H6zM12 18a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM12 6.5h.01',
  camera: 'M3 8h4l2-3h6l2 3h4v12H3zM12 17a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z',
  printer: 'M6 9V3h12v6M6 17H3V9h18v8h-3M6 14h12v7H6z',
  gamepad:
    'M6 8h12a4 4 0 0 1 4 4v1a4 4 0 0 1-7 2.6L14 14h-4l-1 1.6A4 4 0 0 1 2 13v-1a4 4 0 0 1 4-4ZM7 10.5v3M5.5 12h3M16 11h.01M18 13h.01',
  wifi: 'M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0M2 9a15 15 0 0 1 20 0M12 20h.01',
  cable: 'M9 2v5M15 2v5M6 7h12v4a6 6 0 0 1-12 0V7ZM12 17v5',
  'hard-drive': 'M22 12H2M5.5 5h13L22 12v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6l3.5-7ZM6 16h.01M10 16h.01',
  zap: 'M13 2 3 14h9l-1 8 10-12h-9l1-8Z',
  key: 'M16 3a5 5 0 1 1 0 10 5 5 0 0 1 0-10ZM12.5 11.5 3 21M6 18l2.5 2.5M9 15l2.5 2.5',
  bus: 'M5 3h14a2 2 0 0 1 2 2v12H3V5a2 2 0 0 1 2-2ZM3 11h18M7 20v-3M17 20v-3M7 14h.01M17 14h.01',
  bird: 'M16 7h.01M3.5 18H12a8 8 0 0 0 8-8V7a4 4 0 0 0-7.3-2.3L2 20M20 7l2 .5-2 .5M10 18v3M14 17.8V21',
  store: 'M3 9l1.5-5h15L21 9M4 9v11h16V9M3 9h18M9 20v-6h6v6',
  map: 'M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2ZM9 4v14M15 6v14',
};

/**
 * Maps a category to its glyph. The top-level slug wins, so the five markets
 * always get their own icon whatever the database's icon column says; below
 * that the icon column is used, and anything unknown falls back to a parcel.
 */
const CATEGORY_BY_SLUG: Record<string, IconName> = {
  electronics: 'electronics',
  houses: 'house',
  cars: 'car',
  land: 'land',
  lands: 'land',
  livestock: 'livestock',
  'home-office-goods': 'goods',
};

const CATEGORY_BY_ICON: Record<string, IconName> = {
  cpu: 'electronics',
  home: 'house',
  cow: 'livestock',
  map: 'land',
};

export function categoryIcon(slug: string | null | undefined, icon?: string | null): IconName {
  if (slug && CATEGORY_BY_SLUG[slug]) return CATEGORY_BY_SLUG[slug]!;
  if (icon && CATEGORY_BY_ICON[icon]) return CATEGORY_BY_ICON[icon]!;
  if (icon && icon in PATHS) return icon as IconName;
  return 'package';
}

const FILLED = new Set<IconName>(['heart-filled']);

interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
  strokeWidth?: number;
}

export function Icon({ name, size = 20, className = '', strokeWidth = 1.75 }: IconProps) {
  const filled = FILLED.has(name);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={filled ? 0 : strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={`shrink-0 ${className}`}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}

/** WhatsApp's glyph is a brand mark, so it is kept separate and filled. */
export function WhatsAppIcon({ size = 20, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      className={`shrink-0 ${className}`}
    >
      <path d="M17.5 14.4c-.3-.2-1.8-.9-2-1s-.5-.1-.7.1-.8 1-1 1.2-.4.2-.7.1a8.2 8.2 0 0 1-2.4-1.5 9 9 0 0 1-1.7-2.1c-.2-.3 0-.5.1-.6l.5-.6.3-.5v-.5l-.9-2.2c-.3-.6-.5-.5-.7-.5h-.6a1.2 1.2 0 0 0-.9.4 3.6 3.6 0 0 0-1.1 2.7A6.3 6.3 0 0 0 6.9 13a14.3 14.3 0 0 0 5.5 4.8c.8.3 1.4.5 1.8.7a4.4 4.4 0 0 0 2 .1 3.3 3.3 0 0 0 2.1-1.5 2.6 2.6 0 0 0 .2-1.5c-.1-.1-.3-.2-.6-.3M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2Zm0 18.3a8.3 8.3 0 0 1-4.2-1.2l-.3-.2-3.1.8.8-3-.2-.3A8.3 8.3 0 1 1 12 20.3Z" />
    </svg>
  );
}
