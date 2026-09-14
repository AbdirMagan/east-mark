import { useId } from 'react';

/**
 * The East-Market mark.
 *
 * Three diamonds joined into a triangle: a marketplace is people meeting, and
 * the smallest shape that reads as "more than a transaction" is three parties
 * connected. The diamond itself is the unit the cultural pattern layer repeats,
 * so the mark and the background motifs are visibly the same family.
 *
 * Drawn from primitives, not traced from anything, and it survives being
 * rendered at 20px in a header or 512px on a store listing.
 */

interface LogoMarkProps {
  size?: number;
  className?: string;
  /** Flat single-colour version for favicons and monochrome contexts. */
  monochrome?: boolean;
}

export function LogoMark({ size = 32, className = '', monochrome = false }: LogoMarkProps) {
  const id = useId().replace(/:/g, '');

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      role="img"
      aria-label="East-Market"
      className={className}
    >
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--color-acacia-500)" />
          <stop offset="100%" stopColor="var(--color-acacia-700)" />
        </linearGradient>
      </defs>

      <rect
        width="48"
        height="48"
        rx="12"
        fill={monochrome ? 'currentColor' : `url(#${id}-bg)`}
      />

      {/* Connecting lines, behind the diamonds. */}
      <g
        stroke={monochrome ? 'var(--color-surface-raised)' : 'var(--color-acacia-200)'}
        strokeWidth="1.75"
        opacity="0.75"
      >
        <line x1="24" y1="16" x2="15" y2="31" />
        <line x1="24" y1="16" x2="33" y2="31" />
        <line x1="15" y1="31" x2="33" y2="31" />
      </g>

      {/* Top diamond in clay: the seller, the one who starts the exchange. */}
      <path
        d="M24 9 L30 16 L24 23 L18 16 Z"
        fill={monochrome ? 'var(--color-surface-raised)' : 'var(--color-clay-400)'}
      />
      <path
        d="M15 24 L21 31 L15 38 L9 31 Z"
        fill={monochrome ? 'var(--color-surface-raised)' : 'var(--color-sand-100)'}
      />
      <path
        d="M33 24 L39 31 L33 38 L27 31 Z"
        fill={monochrome ? 'var(--color-surface-raised)' : 'var(--color-sun-300)'}
      />
    </svg>
  );
}

interface LogoProps {
  size?: number;
  className?: string;
  /** Hide the wordmark on narrow screens where the mark alone is enough. */
  responsive?: boolean;
}

export function Logo({ size = 32, className = '', responsive = true }: LogoProps) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark size={size} />
      <span
        className={`font-display text-[1.0625rem] font-bold leading-none tracking-tight text-text-primary ${
          responsive ? 'hidden sm:inline' : ''
        }`}
      >
        East<span className="text-accent">-</span>Market
      </span>
    </span>
  );
}

/** The tagline, used under the logo in the hero and the footer. */
export function Tagline({ className = '' }: { className?: string }) {
  return (
    <span className={`text-sm font-medium tracking-wide text-text-secondary ${className}`}>
      Buy. Sell. Connect.
    </span>
  );
}
