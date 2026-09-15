/**
 * The East Market logo.
 *
 * The emblem -- the sun over East Africa, market towns, and a handshake
 * closing the circle -- is raster artwork, so it is served as a 256px WebP
 * (about 30 KB, cached once) rather than inlined. public/brand/ also holds a
 * 512px PNG and the full lockup with the wordmark; the favicons, the web app
 * manifest icons, the admin favicon and the Android launcher icons are all
 * cut from the same source image.
 */

interface LogoMarkProps {
  size?: number;
  className?: string;
}

export function LogoMark({ size = 40, className = '' }: LogoMarkProps) {
  return (
    <img
      src="/brand/logo-mark.webp"
      width={size}
      height={size}
      alt=""
      decoding="async"
      className={`shrink-0 object-contain ${className}`}
    />
  );
}

interface LogoProps {
  size?: number;
  className?: string;
  /** Hide the wordmark on narrow screens where the emblem alone is enough. */
  responsive?: boolean;
}

export function Logo({ size = 40, className = '', responsive = true }: LogoProps) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LogoMark size={size} />
      <span className={`flex-col leading-none ${responsive ? 'hidden sm:flex' : 'flex'}`}>
        <span className="font-display text-[1.0625rem] font-extrabold uppercase tracking-tight text-[#1d3f72] dark:text-sand-50">
          East Market
        </span>
        <span className="mt-1 text-[0.5625rem] font-semibold uppercase tracking-[0.14em] text-text-muted">
          East Africa Online Market
        </span>
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
