import type { CSSProperties } from 'react';

/**
 * Africa, as the site-wide backdrop and the hero's centrepiece.
 *
 * The outline is Natural Earth's 1:110m country data (public domain), with
 * every African country filled in one colour and no internal borders drawn.
 * That is deliberate. The product treats Somaliland and Somalia as separate
 * markets, and a map with national borders would have to draw lines --
 * Somaliland/Somalia, the Ogaden, Western Sahara -- that a marketplace has no
 * business taking a position on. The coastline is not in dispute.
 *
 * The artwork is a static file in public/ rather than inline JSX. The path is
 * downloaded once, cached, and shared by the backdrop and the hero instead of
 * shipping inside the JavaScript bundle. It is applied as a CSS mask, so its
 * colour comes from theme tokens and follows light and dark mode.
 *
 * Regenerate with: python web/scripts/build-africa-map.py
 */

const MAP_URL = '/africa-map.svg';

// Must match the projection in web/scripts/build-africa-map.py.
export const MAP_WIDTH = 700;
export const MAP_HEIGHT = 730;
const WEST = -18;
const NORTH = 38;
const SCALE = 10;

export function project(lat: number, lon: number): { x: number; y: number } {
  return { x: (lon - WEST) * SCALE, y: (NORTH - lat) * SCALE };
}

/** The main city of each market, in the order the hero links them. */
export const MARKETS = [
  { name: 'Djibouti', lat: 11.5886, lon: 43.145 },
  { name: 'Hargeisa', lat: 9.56, lon: 44.065 },
  { name: 'Mogadishu', lat: 2.0469, lon: 45.3182 },
  { name: 'Nairobi', lat: -1.2864, lon: 36.8172 },
  { name: 'Addis Ababa', lat: 9.03, lon: 38.74 },
] as const;

function maskStyle(color: string): CSSProperties {
  return {
    backgroundColor: color,
    WebkitMaskImage: `url(${MAP_URL})`,
    maskImage: `url(${MAP_URL})`,
    WebkitMaskRepeat: 'no-repeat',
    maskRepeat: 'no-repeat',
    WebkitMaskSize: '100% 100%',
    maskSize: '100% 100%',
  };
}

/**
 * The page background: a faint continent fixed behind every page.
 *
 * Product cards, the header and forms all sit on opaque surfaces, so the map
 * can never make text or photos harder to read. --map-tint is tuned per theme
 * in index.css.
 */
export function AfricaBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 flex items-center justify-center overflow-hidden lg:justify-end"
    >
      {/* The fallback matters: if --map-tint is ever missing (a stale dev
          stylesheet did exactly this), an undefined variable resolves to a
          transparent background and the map disappears without an error. */}
      {/* Phones size the map by width so the whole continent reads as Africa;
          sized by height, a 390px screen showed only a strip of it. */}
      <div
        className="aspect-[700/730] w-[115vw] shrink-0 sm:h-[92vh] sm:w-auto lg:mr-[3vw]"
        style={maskStyle('var(--map-tint, rgb(30 111 92 / 0.07))')}
      />
    </div>
  );
}

/** The hero map: the continent, with East-Market's markets lit and linked. */
export function AfricaMarketsMap({ className = '', label }: { className?: string; label: string }) {
  const points = MARKETS.map((market) => ({ ...market, ...project(market.lat, market.lon) }));
  const centreX = points.reduce((sum, point) => sum + point.x, 0) / points.length;
  const centreY = points.reduce((sum, point) => sum + point.y, 0) / points.length;

  // A closed ring through the markets reads as "connected" without implying
  // any particular route or border.
  const ring = [...points, points[0]!].map((point) => `${point.x},${point.y}`).join(' ');

  return (
    <div role="img" aria-label={label} className={`relative aspect-[700/730] ${className}`}>
      <div className="absolute inset-0" style={maskStyle('rgb(242 237 228 / 0.18)')} />

      <svg
        viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
        className="absolute inset-0 size-full overflow-visible"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id="em-markets-glow">
            <stop offset="0%" stopColor="#e9bb63" stopOpacity="0.38" />
            <stop offset="100%" stopColor="#e9bb63" stopOpacity="0" />
          </radialGradient>
        </defs>

        <circle cx={centreX} cy={centreY} r={140} fill="url(#em-markets-glow)" />

        <polyline
          points={ring}
          fill="none"
          stroke="#e99a68"
          strokeWidth={3}
          strokeLinejoin="round"
          opacity={0.9}
        />

        {points.map((point) => (
          <g key={point.name}>
            <title>{point.name}</title>
            <circle cx={point.x} cy={point.y} r={15} fill="#e9bb63" opacity={0.3} className="animate-pulse" />
            <circle cx={point.x} cy={point.y} r={6.5} fill="#faebce" stroke="#b8531a" strokeWidth={2.5} />
          </g>
        ))}
      </svg>
    </div>
  );
}
