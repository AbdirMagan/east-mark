import { useId } from 'react';

/**
 * East-Market's cultural pattern layer.
 *
 * The motifs are geometric abstractions of the kinds of repeating forms found
 * across East African weaving and architecture — interlocking diamonds, zigzag
 * borders, stepped horizons, beadwork grids. They are drawn from scratch as
 * simple geometry rather than traced from any particular textile, which keeps
 * the identity original and keeps the files tiny.
 *
 * The rule for using them: they are a whisper, never a shout. Opacity is bound
 * to --pattern-opacity (about 5-7%, tuned per theme) so a pattern can never
 * compete with a product photo or make body text harder to read. They belong
 * behind headers, heroes, empty states and promotional strips — never behind a
 * product grid.
 *
 * Each is a tiling <pattern>, so a full-bleed banner costs a few hundred bytes
 * and scales to any screen without a raster asset.
 */

export type PatternVariant = 'weave' | 'chevron' | 'horizon' | 'beads';

interface CulturalPatternProps {
  variant?: PatternVariant;
  /** Tile size in px. Larger reads calmer; smaller reads busier. */
  scale?: number;
  className?: string;
  /** Set when the pattern sits on a coloured band rather than a page surface. */
  tone?: 'brand' | 'ink' | 'current';
}

export function CulturalPattern({
  variant = 'weave',
  scale = 56,
  className = '',
  tone = 'current',
}: CulturalPatternProps) {
  const id = useId().replace(/:/g, '');
  const stroke =
    tone === 'brand'
      ? 'var(--color-acacia-500)'
      : tone === 'ink'
        ? 'var(--color-ink-900)'
        : 'currentColor';

  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
      style={{ opacity: 'var(--pattern-opacity)', color: stroke }}
    >
      <defs>
        <pattern
          id={id}
          width={scale}
          height={scale}
          patternUnits="userSpaceOnUse"
          patternTransform={variant === 'weave' ? 'rotate(0)' : undefined}
        >
          {variant === 'weave' && <WeaveTile size={scale} />}
          {variant === 'chevron' && <ChevronTile size={scale} />}
          {variant === 'horizon' && <HorizonTile size={scale} />}
          {variant === 'beads' && <BeadsTile size={scale} />}
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}

/** Interlocking diamond lattice — the calmest of the four. */
function WeaveTile({ size }: { size: number }) {
  const h = size / 2;
  return (
    <g fill="none" stroke="currentColor" strokeWidth="1.25">
      <path d={`M${h} 0 L${size} ${h} L${h} ${size} L0 ${h} Z`} />
      <path d={`M${h} ${size * 0.28} L${size * 0.72} ${h} L${h} ${size * 0.72} L${size * 0.28} ${h} Z`} />
    </g>
  );
}

/** Zigzag border, the kind that edges a woven cloth. */
function ChevronTile({ size }: { size: number }) {
  const q = size / 4;
  return (
    <g fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
      <polyline points={`0,${q * 2} ${q},${q} ${q * 2},${q * 2} ${q * 3},${q} ${size},${q * 2}`} />
      <polyline
        points={`0,${size} ${q},${q * 3} ${q * 2},${size} ${q * 3},${q * 3} ${size},${size}`}
      />
    </g>
  );
}

/** Stepped triangles — escarpment and rooftop silhouettes. */
function HorizonTile({ size }: { size: number }) {
  const h = size / 2;
  return (
    <g fill="none" stroke="currentColor" strokeWidth="1.25">
      <path d={`M0 ${size} L${h} ${h * 0.6} L${size} ${size}`} />
      <path d={`M0 ${size} L${h} ${h * 1.25} L${size} ${size}`} />
      <line x1="0" y1={size} x2={size} y2={size} />
    </g>
  );
}

/** Beadwork grid — rings on a staggered lattice. */
function BeadsTile({ size }: { size: number }) {
  const h = size / 2;
  const r = size * 0.11;
  return (
    <g fill="none" stroke="currentColor" strokeWidth="1.25">
      <circle cx={h} cy={h} r={r} />
      <circle cx="0" cy="0" r={r} />
      <circle cx={size} cy="0" r={r} />
      <circle cx="0" cy={size} r={r} />
      <circle cx={size} cy={size} r={r} />
    </g>
  );
}
