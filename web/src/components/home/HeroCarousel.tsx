import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import { useCountries } from '../../hooks/useMarketData.js';
import { useT } from '../../i18n/index.js';
import { endpoints, type HomeAd } from '../../lib/api.js';
import { usePreferences } from '../../store/preferences.js';
import { HornMap, ParticleField, type HornCountryCode } from '../brand/HornMap.js';
import { Icon, categoryIcon } from '../ui/Icon.js';

/**
 * The home page hero: a carousel of promotions -- discounts, featured
 * categories, "sell for free" -- served by /api/v1/ads?placement=home_hero.
 *
 * The Android app renders the same slides from the same endpoint (theme,
 * badge, title, subtitle, button, icon), so a promotion is created once in the
 * admin dashboard and looks the same everywhere.
 *
 * Accessibility: it auto-advances every 6 seconds, but pauses while hovered or
 * focused, has a visible pause button (WCAG 2.2.2), never auto-advances under
 * prefers-reduced-motion, and hidden slides are taken out of the tab order.
 */

const INTERVAL_MS = 6000;

/**
 * Slide buttons use fixed colours rather than the theme tokens.
 *
 * Every slide sits on a dark artwork whatever the page theme is, so a button
 * that follows light/dark would flip to an unreadable pairing -- which is
 * exactly what happened to the clay slide in dark mode (white on white).
 * These pairings are all at least 5:1 against their slide.
 */
const CTA_CLASS: Record<HomeAd['theme'], string> = {
  night: 'bg-[#b8531a] text-white hover:bg-[#9c4516]',
  acacia: 'bg-[#b8531a] text-white hover:bg-[#9c4516]',
  navy: 'bg-[#b8531a] text-white hover:bg-[#9c4516]',
  clay: 'bg-white text-[#7d3712] hover:bg-[#faebce]',
  sun: 'bg-[#1a1713] text-white hover:bg-[#2c2620]',
};


// Literal class strings so Tailwind generates them.
const THEME_BG: Record<HomeAd['theme'], string> = {
  night: 'bg-[#040914]',
  acacia: 'bg-gradient-to-br from-acacia-950 via-acacia-800 to-acacia-600',
  clay: 'bg-gradient-to-br from-clay-950 via-clay-700 to-clay-400',
  sun: 'bg-gradient-to-br from-sun-950 via-sun-700 to-sun-500',
  navy: 'bg-gradient-to-br from-[#0b1a33] via-[#1d3f72] to-[#2f63ad]',
};

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  useEffect(() => {
    const query = matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduced(query.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

export function HeroCarousel({ slides, loading = false }: { slides: HomeAd[]; loading?: boolean }) {
  const t = useT();
  const reducedMotion = usePrefersReducedMotion();
  const [index, setIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const dragStart = useRef<number | null>(null);

  const count = slides.length;
  const current = count ? index % count : 0;
  const playing = count > 1 && !hovered && !focused && !userPaused && !reducedMotion;

  useEffect(() => {
    if (!playing) return;
    const timer = window.setTimeout(() => setIndex((value) => (value + 1) % count), INTERVAL_MS);
    return () => window.clearTimeout(timer);
  }, [playing, current, count]);

  const go = (next: number) => setIndex(((next % count) + count) % count);

  const onPointerDown = (event: PointerEvent) => {
    dragStart.current = event.clientX;
  };
  const onPointerUp = (event: PointerEvent) => {
    if (dragStart.current === null) return;
    const delta = event.clientX - dragStart.current;
    dragStart.current = null;
    if (Math.abs(delta) > 50) go(current + (delta < 0 ? 1 : -1));
  };

  if (loading && count === 0) {
    return (
      <section aria-busy="true" className="relative overflow-hidden border-b border-white/10 bg-[#040914]">
        <div className="mx-auto flex min-h-[14rem] max-w-[90rem] flex-col justify-center gap-4 px-4 sm:min-h-[15rem] lg:min-h-[16rem] lg:px-6">
          <div className="h-6 w-32 animate-pulse rounded-full bg-white/10" />
          <div className="h-12 w-3/4 max-w-xl animate-pulse rounded-xl bg-white/10" />
          <div className="h-5 w-2/3 max-w-lg animate-pulse rounded bg-white/10" />
        </div>
      </section>
    );
  }

  return (
    <section
      aria-roledescription="carousel"
      aria-label={t('home.carouselLabel')}
      className="relative isolate overflow-hidden border-b border-white/10 bg-[#040914]"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false);
      }}
    >
      <div
        className="flex touch-pan-y transition-transform duration-500 ease-out motion-reduce:transition-none"
        style={{ transform: `translateX(-${current * 100}%)` }}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          dragStart.current = null;
        }}
      >
        {slides.map((slide, position) => (
          <Slide key={slide.id} slide={slide} active={position === current} position={position} count={count} />
        ))}
      </div>

      {count > 1 ? (
        <>
          <button
            type="button"
            onClick={() => go(current - 1)}
            aria-label={t('home.prevSlide')}
            className="absolute left-3 top-1/2 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-black/25 text-white backdrop-blur transition duration-200 hover:bg-black/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 active:scale-90 motion-safe:hover:scale-110 md:flex"
          >
            <Icon name="chevron-left" size={22} />
          </button>
          <button
            type="button"
            onClick={() => go(current + 1)}
            aria-label={t('home.nextSlide')}
            className="absolute right-3 top-1/2 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-black/25 text-white backdrop-blur transition duration-200 hover:bg-black/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 active:scale-90 motion-safe:hover:scale-110 md:flex"
          >
            <Icon name="chevron-right" size={22} />
          </button>

          <div className="absolute inset-x-0 bottom-2.5 flex items-center justify-center gap-2">
            {slides.map((slide, position) => (
              <button
                key={slide.id}
                type="button"
                onClick={() => go(position)}
                aria-label={t('home.goToSlide', { n: String(position + 1) })}
                aria-current={position === current ? 'true' : undefined}
                // 24px hit area around a small dot.
                className="group flex h-6 items-center px-0.5"
              >
                <span
                  className={`block h-2 rounded-full transition-all duration-300 ${
                    position === current ? 'w-7 bg-white' : 'w-2 bg-white/45 group-hover:bg-white/70'
                  }`}
                />
              </button>
            ))}
            {!reducedMotion ? (
              <button
                type="button"
                onClick={() => setUserPaused((value) => !value)}
                aria-label={userPaused ? t('home.playSlides') : t('home.pauseSlides')}
                className="ml-1 flex size-6 items-center justify-center rounded-full text-white/80 hover:text-white"
              >
                {userPaused ? (
                  <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
                    <path d="M3 1.5v9l7.5-4.5z" fill="currentColor" />
                  </svg>
                ) : (
                  <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
                    <path d="M2.5 1.5h2.5v9H2.5zM7 1.5h2.5v9H7z" fill="currentColor" />
                  </svg>
                )}
              </button>
            ) : null}
          </div>
        </>
      ) : null}
    </section>
  );
}

function Slide({ slide, active, position, count }: { slide: HomeAd; active: boolean; position: number; count: number }) {
  const t = useT();
  const navigate = useNavigate();
  const night = slide.theme === 'night';
  const Heading = position === 0 ? 'h1' : 'h2';
  const icon = categoryIcon(slide.icon === 'map' ? null : slide.icon, slide.icon);

  const open = () => {
    if (!slide.link) return;
    // Fire-and-forget: counting a click must never slow the tap down.
    if (!slide.id.startsWith('fallback')) void endpoints.adClick(slide.id).catch(() => undefined);
    if (slide.link.startsWith('https://')) window.open(slide.link, '_blank', 'noopener,noreferrer');
    else navigate(slide.link);
  };

  return (
    <div
      role="group"
      aria-roledescription="slide"
      aria-label={t('home.slideOf', { n: String(position + 1), total: String(count) })}
      aria-hidden={!active}
      className={`relative w-full shrink-0 overflow-hidden ${THEME_BG[slide.theme] ?? THEME_BG.night} ${night ? 'horn-neon' : ''}`}
    >
      {slide.imageUrl ? (
        <>
          <img
            src={slide.imageUrl}
            alt=""
            loading={position === 0 ? 'eager' : 'lazy'}
            className="absolute inset-0 size-full object-cover"
          />
          {/* Keeps the words readable whatever the advertiser uploaded. */}
          <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/60 to-black/25" />
        </>
      ) : null}

      {/* Decoration: the neon dot grid and particles on the night theme, soft
          light and a large faint glyph on the colour themes. */}
      {slide.imageUrl ? null : night ? (
        <>
          <div
            aria-hidden="true"
            className="absolute inset-0 opacity-25"
            style={{ backgroundImage: 'radial-gradient(rgb(255 255 255 / 0.16) 1px, transparent 1px)', backgroundSize: '36px 36px' }}
          />
          <ParticleField className="absolute inset-0" />
        </>
      ) : (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="absolute -right-24 -top-24 size-96 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-32 left-1/3 size-80 rounded-full bg-black/20 blur-3xl" />
          <Icon name={icon} size={260} strokeWidth={0.6} className="absolute -right-10 top-1/2 size-64 -translate-y-1/2 text-white/[0.07] lg:hidden" />
        </div>
      )}

      <div
        className={`relative mx-auto grid min-h-[14rem] max-w-[90rem] items-center gap-4 px-4 pb-8 pt-6 sm:min-h-[15rem] md:px-16 lg:min-h-[16rem] lg:px-20 ${
          slide.imageUrl ? '' : 'lg:grid-cols-[1.15fr_0.85fr]'
        }`}
      >
        <div className="text-center lg:text-left">
          {slide.badge ? (
            <span className="inline-flex -rotate-2 items-center rounded-lg bg-sun-300 px-3 py-1 text-sm font-extrabold uppercase tracking-wide text-ink-950 shadow-lg shadow-black/20">
              {slide.badge}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-(--radius-pill) bg-white/5 px-3 py-1 text-xs font-semibold text-cyan-200 ring-1 ring-inset ring-white/15">
              <Icon name="map-pin" size={13} />
              {t('footer.countries')}
            </span>
          )}

          <Heading className="mx-auto mt-3 max-w-2xl text-balance font-display text-2xl font-extrabold leading-[1.15] tracking-tight text-white sm:text-3xl lg:mx-0 lg:text-4xl">
            {slide.title}
          </Heading>

          {slide.subtitle ? (
            <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-white/85 sm:text-base lg:mx-0">{slide.subtitle}</p>
          ) : null}

          {slide.link && slide.ctaLabel ? (
            <div className="mt-5 flex justify-center lg:justify-start">
              <button
                type="button"
                onClick={open}
                tabIndex={active ? 0 : -1}
                className={`group/cta inline-flex h-11 items-center gap-2 rounded-(--radius-pill) border border-white/25 px-5 text-sm font-semibold shadow-sm transition-[background-color,box-shadow,translate,scale] duration-200 ease-(--ease-out-soft) hover:shadow-lg hover:shadow-black/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black/40 active:scale-[0.97] motion-safe:hover:-translate-y-0.5 ${
                  CTA_CLASS[slide.theme] ?? CTA_CLASS.night
                }`}
              >
                {slide.ctaLabel}
                <Icon
                  name="arrow-right"
                  size={17}
                  className="motion-safe:transition-transform motion-safe:group-hover/cta:translate-x-1"
                />
              </button>
            </div>
          ) : null}
        </div>

        {slide.imageUrl ? null : (
        <div className="hidden justify-center lg:flex">
          {night ? (
            <NightMap active={active} />
          ) : (
            <div className="relative flex size-40 items-center justify-center rounded-[2rem] bg-white/10 ring-1 ring-white/25 backdrop-blur-sm">
              <Icon name={icon} size={96} strokeWidth={1.1} className="text-white drop-shadow-lg" />
              {slide.badge ? (
                <span className="absolute -right-5 -top-4 rotate-6 rounded-xl bg-sun-300 px-3 py-1.5 text-sm font-black uppercase leading-none text-ink-950 shadow-xl">
                  {slide.badge}
                </span>
              ) : null}
            </div>
          )}
        </div>
        )}
      </div>
    </div>
  );
}

/** The interactive Horn of Africa map: tap a country to browse its listings. */
function NightMap({ active }: { active: boolean }) {
  const t = useT();
  const navigate = useNavigate();
  const { data: countries } = useCountries();
  const setCountry = usePreferences((state) => state.setCountry);

  const names = Object.fromEntries((countries ?? []).map((country) => [country.code, country.name])) as Partial<
    Record<HornCountryCode, string>
  >;

  const browse = (code: HornCountryCode) => {
    const row = countries?.find((country) => country.code === code);
    if (!row) return;
    setCountry({ id: row.id, code: row.code, name: row.name });
    navigate('/browse');
  };

  return (
    <div className={`w-full max-w-[14rem] lg:max-w-[16rem] ${active ? '' : 'pointer-events-none'}`}>
      <HornMap variant="hero" className="aspect-[960/870] w-full" names={names} onSelect={browse} label={t('home.mapLabel')} />
    </div>
  );
}
