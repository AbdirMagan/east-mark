import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type MouseEvent } from 'react';

/**
 * Africa with the five East-Market countries lit, drawn after the Horn of
 * Africa animated background supplied for the brand.
 *
 * Two uses share one drawing:
 *  - `HornMap variant="hero"`: the home page centrepiece. Neon borders that
 *    flow, pulsing capitals, labels, and every country is a control -- hover
 *    (or focus) names it, click or tap selects it.
 *  - `HornBackdrop`: the same map, quiet and non-interactive, fixed behind
 *    every page.
 *
 * The shapes are stylised, not survey outlines: they exist to say "this is
 * where we trade" at a glance, and they stay tiny (a few kilobytes of path).
 * Animation is CSS only (see index.css) and switches off under
 * prefers-reduced-motion.
 */

export type HornCountryCode = 'XA' | 'SO' | 'ET' | 'KE' | 'DJ';

interface HornCountry {
  code: HornCountryCode;
  name: string;
  capital: string;
  /** CSS variable holding the country's colour for the active palette. */
  color: string;
  path: string;
  node: { x: number; y: number; r: number };
  label: { x: number; y: number; size: number; anchor?: 'start' | 'middle' | 'end' };
}

// `code` matches public.countries.code, so a selection maps straight onto the
// location filter. Somaliland is XA (user-assigned; it has no ISO code).
export const HORN_COUNTRIES: HornCountry[] = [
  {
    code: 'XA',
    name: 'Somaliland',
    capital: 'Hargeisa',
    color: 'var(--horn-somaliland)',
    path: 'M695,285 L755,295 L815,310 L870,335 L872,390 L780,390 L720,360 L705,325 L685,310 Z',
    node: { x: 735, y: 330, r: 4.5 },
    label: { x: 790, y: 372, size: 14 },
  },
  {
    code: 'SO',
    name: 'Somalia',
    capital: 'Mogadishu',
    color: 'var(--horn-somalia)',
    path: 'M870,335 L935,345 L970,380 L920,450 L835,530 L740,600 L680,645 L655,570 L705,520 L770,470 L810,410 L780,390 L872,390 Z',
    node: { x: 810, y: 530, r: 4.5 },
    label: { x: 860, y: 470, size: 15 },
  },
  {
    code: 'ET',
    name: 'Ethiopia',
    capital: 'Addis Ababa',
    color: 'var(--horn-ethiopia)',
    path: 'M510,275 L590,260 L650,285 L685,310 L705,325 L720,360 L780,390 L810,410 L770,470 L705,520 L655,570 L595,580 L550,620 L505,560 L485,480 L435,420 L475,350 Z',
    node: { x: 585, y: 410, r: 4.5 },
    label: { x: 585, y: 445, size: 16 },
  },
  {
    code: 'KE',
    name: 'Kenya',
    capital: 'Nairobi',
    color: 'var(--horn-kenya)',
    path: 'M550,620 L595,580 L655,570 L680,645 L625,715 L575,735 L555,685 Z',
    node: { x: 600, y: 660, r: 4.5 },
    label: { x: 612, y: 640, size: 15 },
  },
  {
    code: 'DJ',
    name: 'Djibouti',
    capital: 'Djibouti City',
    color: 'var(--horn-djibouti)',
    path: 'M670,280 L695,285 L705,310 L685,310 L668,292 Z',
    node: { x: 682, y: 295, r: 4 },
    label: { x: 660, y: 272, size: 11, anchor: 'end' },
  },
];

const AFRICA_OUTLINE =
  'M320,120 C340,110 380,90 420,85 C480,80 540,110 580,105 C630,100 680,120 720,135 C760,150 820,180 850,220 C880,260 920,280 940,320 C960,360 950,420 900,470 C860,510 820,560 800,610 C780,660 740,710 710,760 C680,810 650,860 620,890 C590,920 560,910 540,860 C520,810 510,750 490,700 C470,650 430,620 400,580 C370,540 330,510 300,480 C270,450 220,440 180,420 C140,400 100,370 80,320 C60,270 90,230 120,200 C150,170 200,160 240,150 C280,140 300,130 320,120 Z';

const GRID_LINES = [
  'M200,300 Q500,320 850,220',
  'M300,450 Q550,480 800,610',
  'M540,110 Q520,500 620,890',
  'M420,85 Q650,400 710,760',
];

// Hargeisa is the hub: every market links back to it, and Mogadishu to Nairobi.
const NETWORK = 'M735,330 L585,410 M735,330 L810,530 M735,330 L682,295 M735,330 L600,660 M810,530 L600,660';

const VIEWBOX = '40 60 960 870';

interface HornMapProps {
  variant: 'hero' | 'backdrop';
  className?: string;
  /** Localised country names by code; falls back to the English name. */
  names?: Partial<Record<HornCountryCode, string>>;
  selected?: HornCountryCode | null;
  onSelect?: (code: HornCountryCode) => void;
  /** Accessible name for the whole map. */
  label?: string;
}

export function HornMap({ variant, className = '', names, selected = null, onSelect, label }: HornMapProps) {
  const hero = variant === 'hero';
  const [hovered, setHovered] = useState<{ code: HornCountryCode; x: number; y: number } | null>(null);
  const hoveredCountry = HORN_COUNTRIES.find((country) => country.code === hovered?.code);

  const nameOf = (country: HornCountry) => names?.[country.code] ?? country.name;

  const onKey = (event: KeyboardEvent, code: HornCountryCode) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect?.(code);
    }
  };

  const track = (event: MouseEvent, code: HornCountryCode) => {
    setHovered({ code, x: event.clientX, y: event.clientY });
  };

  return (
    <div className={`relative ${className}`}>
      <svg
        viewBox={VIEWBOX}
        className={`size-full overflow-visible ${hero ? 'motion-safe:animate-map-float' : ''}`}
        role={hero ? 'group' : undefined}
        aria-label={hero ? label : undefined}
        aria-hidden={hero ? undefined : true}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <radialGradient id={`horn-glow-${variant}`} cx="65%" cy="40%" r="55%">
            <stop offset="0%" stopColor="var(--horn-somalia)" stopOpacity={hero ? 0.14 : 0.1} />
            <stop offset="60%" stopColor="var(--horn-kenya)" stopOpacity={0.03} />
            <stop offset="100%" stopColor="var(--horn-kenya)" stopOpacity={0} />
          </radialGradient>
        </defs>

        <circle cx={650} cy={400} r={480} fill={`url(#horn-glow-${variant})`} />

        {/* The continent, dashed, with a faint survey grid across it. */}
        <path
          d={AFRICA_OUTLINE}
          fill="var(--horn-land)"
          stroke="var(--horn-land-border)"
          strokeWidth={1.2}
          strokeDasharray="6 6"
        />
        {GRID_LINES.map((d) => (
          <path key={d} d={d} fill="none" stroke="var(--horn-grid)" strokeDasharray="4 8" />
        ))}

        {HORN_COUNTRIES.map((country) => {
          const isSelected = selected === country.code;
          const isHovered = hovered?.code === country.code;
          const lit = isSelected || isHovered;
          const style = { '--c': country.color, color: country.color } as CSSProperties;

          return (
            <g
              key={country.code}
              style={style}
              className={hero ? 'cursor-pointer outline-none [&:focus-visible>path:first-child]:stroke-[5]' : undefined}
              role={hero ? 'button' : undefined}
              tabIndex={hero ? 0 : undefined}
              aria-label={hero ? `${nameOf(country)}, ${country.capital}` : undefined}
              aria-pressed={hero ? isSelected : undefined}
              onClick={hero ? () => onSelect?.(country.code) : undefined}
              onKeyDown={hero ? (event) => onKey(event, country.code) : undefined}
              onMouseEnter={hero ? (event) => track(event, country.code) : undefined}
              onMouseMove={hero ? (event) => track(event, country.code) : undefined}
              onMouseLeave={hero ? () => setHovered(null) : undefined}
              onFocus={hero ? () => setHovered(null) : undefined}
            >
              <path
                d={country.path}
                fill="currentColor"
                fillOpacity={lit ? 0.4 : hero ? 0.12 : 0.1}
                stroke="currentColor"
                strokeWidth={lit ? 4 : 2.2}
                strokeLinejoin="round"
                strokeLinecap="round"
                // Drop shadows are the expensive part; the page backdrop skips them.
                className={`transition-[fill-opacity,stroke-width] duration-300 ${
                  hero ? '[filter:drop-shadow(0_0_8px_var(--c))]' : ''
                }`}
              />
              <path
                d={country.path}
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                strokeDasharray="14 28 8 28"
                className={`pointer-events-none opacity-90 ${
                  hero ? 'motion-safe:animate-dash-flow' : 'md:motion-safe:animate-dash-flow'
                }`}
              />
            </g>
          );
        })}

        <path d={NETWORK} fill="none" stroke="var(--horn-network)" strokeWidth={1} strokeDasharray="3 6" className="pointer-events-none" />

        {HORN_COUNTRIES.map((country) => (
          <g key={country.code} transform={`translate(${country.node.x} ${country.node.y})`} className="pointer-events-none">
            <circle
              r={4}
              fill="none"
              stroke={country.color}
              strokeWidth={1.5}
              className="origin-center [transform-box:fill-box] motion-safe:animate-node-ring"
            />
            <circle
              r={country.node.r}
              fill="var(--horn-node)"
              className="origin-center [transform-box:fill-box] motion-safe:animate-node-pulse"
            />
          </g>
        ))}

        {hero ? (
          <g className="pointer-events-none select-none" fontWeight={800}>
            {HORN_COUNTRIES.map((country) => (
              <text
                key={country.code}
                x={country.label.x}
                y={country.label.y}
                fill={country.color}
                fontSize={country.label.size}
                letterSpacing={country.label.size > 12 ? 2 : 1}
                textAnchor={country.label.anchor ?? 'middle'}
              >
                {nameOf(country).toLocaleUpperCase()}
              </text>
            ))}
            <text x={310} y={380} fill="rgb(255 255 255 / 0.18)" fontSize={28} letterSpacing={6} textAnchor="middle">
              AFRICA
            </text>
            <text x={880} y={262} fill="var(--horn-somalia)" fillOpacity={0.45} fontSize={12} fontStyle="italic" fontWeight={500} letterSpacing={3}>
              GULF OF ADEN
            </text>
            <text x={890} y={600} fill="var(--horn-somalia)" fillOpacity={0.45} fontSize={13} fontStyle="italic" fontWeight={500} letterSpacing={3}>
              INDIAN OCEAN
            </text>
          </g>
        ) : null}
      </svg>

      {/* Hover card follows the pointer; touch and keyboard users get the
          selection card the page renders instead. */}
      {hero && hovered && hoveredCountry ? (
        <div
          className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-[calc(100%+14px)] rounded-xl border border-white/15 bg-[#08101e]/80 px-4 py-3 shadow-2xl backdrop-blur-md"
          style={{ left: hovered.x, top: hovered.y }}
        >
          <div className="flex items-center gap-3">
            <span className="h-9 w-2.5 rounded-full" style={{ backgroundColor: hoveredCountry.color, boxShadow: `0 0 12px ${hoveredCountry.color}` }} />
            <div>
              <p className="text-sm font-bold uppercase tracking-wider text-white">{nameOf(hoveredCountry)}</p>
              <p className="font-mono text-xs text-slate-300">{hoveredCountry.capital}</p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Drifting points of light, from the same design. Canvas, so a hundred dots
 * cost one layer rather than a hundred DOM nodes. It stops drawing when the
 * element is off screen or the tab is hidden, and never starts under
 * prefers-reduced-motion -- this is decoration, and phones pay for it in
 * battery.
 */
export function ParticleField({ className = '', color = '0 216 255' }: { className?: string; color?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    type Dot = { x: number; y: number; size: number; vx: number; vy: number; alpha: number };
    let dots: Dot[] = [];
    let width = 0;
    let height = 0;
    let frame = 0;
    let visible = true;

    const spawn = (): Dot => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 2 + 0.5,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      alpha: Math.random() * 0.5 + 0.15,
    });

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      dots = Array.from({ length: Math.min(110, Math.floor((width * height) / 16000)) }, spawn);
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      for (const dot of dots) {
        dot.x += dot.vx;
        dot.y += dot.vy;
        if (dot.x < 0 || dot.x > width || dot.y < 0 || dot.y > height) Object.assign(dot, spawn());
        ctx.fillStyle = `rgb(${color} / ${dot.alpha})`;
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, dot.size, 0, Math.PI * 2);
        ctx.fill();
      }
      frame = requestAnimationFrame(draw);
    };

    const sync = () => {
      cancelAnimationFrame(frame);
      if (visible && !document.hidden) frame = requestAnimationFrame(draw);
    };

    const observer = new IntersectionObserver(([entry]) => {
      visible = Boolean(entry?.isIntersecting);
      sync();
    });
    const resizeObserver = new ResizeObserver(resize);

    resize();
    observer.observe(canvas);
    resizeObserver.observe(canvas);
    document.addEventListener('visibilitychange', sync);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      resizeObserver.disconnect();
      document.removeEventListener('visibilitychange', sync);
    };
  }, [color]);

  return <canvas ref={canvasRef} aria-hidden="true" className={`pointer-events-none size-full ${className}`} />;
}

/**
 * The page background: dot grid plus the map, fixed behind every page.
 * Cards, the header and forms are opaque, so it never touches the legibility
 * of a photo or a price. Colours come from the --horn-* tokens in index.css,
 * which are muted on light and brighter on dark.
 */
export function HornBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: 'radial-gradient(var(--horn-dots) 1px, transparent 1px)',
          backgroundSize: '36px 36px',
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center opacity-[var(--horn-backdrop-opacity)] lg:justify-end">
        {/* Sized by width on phones so the whole continent shows; by height
            from sm up so it never outgrows the viewport. */}
        <HornMap variant="backdrop" className="aspect-[960/870] w-[125vw] shrink-0 sm:h-[94vh] sm:w-auto lg:mr-[2vw]" />
      </div>
    </div>
  );
}
