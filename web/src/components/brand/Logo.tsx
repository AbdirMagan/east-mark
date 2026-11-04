/**
 * The Magan Market logo.
 *
 * Raster artwork, served as WebP rather than inlined: `logo-mark` is the
 * square cart emblem, `logo-full` the horizontal lockup with the wordmark
 * drawn in. The favicons, the web app manifest icons and the Android
 * launcher icons are all cut from the same square source.
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

/**
 * The lockup: artwork, not a mark beside typed words.
 *
 * The name is drawn into the logo, so setting it in HTML next to the image
 * would print it twice. On a narrow screen the lockup is dropped for the
 * square mark alone, because a wordmark scaled to fit a phone header is too
 * small to read -- `responsive={false}` keeps the lockup regardless, for the
 * places that have the width.
 */
export function Logo({ size = 40, className = '', responsive = true }: LogoProps) {
  // The artwork is 3.18:1, so the width follows from the height it is given.
  const height = Math.round(size * 0.86);
  return (
    <span className={`inline-flex items-center ${className}`}>
      {responsive ? <LogoMark size={size} className="sm:hidden" /> : null}
      <img
        src="/brand/logo-full.webp"
        height={height}
        width={Math.round(height * 3.18)}
        style={{ height }}
        alt="Magan Market"
        decoding="async"
        className={`w-auto object-contain ${responsive ? 'hidden sm:block' : 'block'}`}
      />
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
