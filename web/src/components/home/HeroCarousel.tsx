import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import { useCountries } from '../../hooks/useMarketData.js';
import { useT } from '../../i18n/index.js';
import { endpoints, type HomeAd } from '../../lib/api.js';
import { usePreferences } from '../../store/preferences.js';
import { HornMap, ParticleField, type HornCountryCode } from '../brand/HornMap.js';
import { Button } from '../ui/index.js';
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
        <div className="mx-auto flex min-h-[22rem] max-w-[90rem] flex-col justify-center gap-4 px-4 sm:min-h-[26rem] lg:px-6">
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
            className="absolute left-3 top-1/2 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/25 text-white ring-1 ring-white/20 backdrop-blur transition hover:bg-black/40 md:flex"
          >
            <Icon name="chevron-left" size={22} />
          </button>
          <button
            type="button"
            onClick={() => go(current + 1)}
            aria-label={t('home.nextSlide')}
            className="absolute right-3 top-1/2 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/25 text-white ring-1 ring-white/20 backdrop-blur transition hover:bg-black/40 md:flex"
          >
            <Icon name="chevron-right" size={22} />
          </button>

          <div className="absolute inset-x-0 bottom-3 flex items-center justify-center gap-2">
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
      {/* Decoration: the neon dot grid and particles on the night theme, soft
          light and a large faint glyph on the colour themes. */}
      {night ? (
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
          <Icon name={icon} size={420} strokeWidth={0.6} className="absolute -right-16 top-1/2 -translate-y-1/2 text-white/[0.07] lg:hidden" />
        </div>
      )}

      <div className="relative mx-auto grid min-h-[22rem] max-w-[90rem] items-center gap-6 px-4 pb-12 pt-10 sm:min-h-[26rem] md:px-16 lg:grid-cols-[1.15fr_1fr] lg:px-20">
        <div className="text-center lg:text-left">
          {slide.badge ? (
            <span className="inline-flex -rotate-2 items-center rounded-lg bg-sun-300 px-3 py-1 text-sm font-extrabold uppercase tracking-wide text-ink-950 shadow-lg shadow-black/20">
              {slide.badge}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-[--radius-pill] bg-white/5 px-3 py-1 text-xs font-semibold text-cyan-200 ring-1 ring-inset ring-white/15">
              <Icon name="map-pin" size={13} />
              {t('footer.countries')}
            </span>
          )}

          <Heading className="mx-auto mt-4 max-w-2xl text-balance font-display text-3xl font-extrabold leading-[1.1] tracking-tight text-white sm:text-5xl lg:mx-0 lg:text-[3.5rem]">
            {slide.title}
          </Heading>

          {slide.subtitle ? (
            <p className="mx-auto mt-3 max-w-xl text-base leading-relaxed text-white/80 sm:text-lg lg:mx-0">{slide.subtitle}</p>
          ) : null}

          {slide.link && slide.ctaLabel ? (
            <div className="mt-6 flex justify-center lg:justify-start">
              <Button
                size="lg"
                variant={slide.theme === 'clay' ? 'secondary' : 'accent'}
                icon="arrow-right"
                onClick={open}
                tabIndex={active ? 0 : -1}
                className={slide.theme === 'clay' ? 'border-white/30 bg-white text-clay-700 hover:bg-sand-100' : ''}
              >
                {slide.ctaLabel}
              </Button>
            </div>
          ) : null}
        </div>

        <div className="hidden justify-center lg:flex">
          {slide.imageUrl ? (
            <img
              src={slide.imageUrl}
              alt=""
              loading={position === 0 ? 'eager' : 'lazy'}
              className="max-h-80 w-full max-w-lg rounded-3xl object-cover shadow-2xl shadow-black/30"
            />
          ) : night ? (
            <NightMap active={active} />
          ) : (
            <div className="relative flex size-72 items-center justify-center rounded-[3rem] bg-white/10 ring-1 ring-white/25 backdrop-blur-sm">
              <Icon name={icon} size={150} strokeWidth={1.1} className="text-white drop-shadow-lg" />
              {slide.badge ? (
                <span className="absolute -right-6 -top-5 rotate-6 rounded-2xl bg-sun-300 px-4 py-2 text-lg font-black uppercase leading-none text-ink-950 shadow-xl">
                  {slide.badge}
                </span>
              ) : null}
            </div>
          )}
        </div>
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
    <div className={`w-full max-w-lg ${active ? '' : 'pointer-events-none'}`}>
      <HornMap variant="hero" className="aspect-[960/870] w-full" names={names} onSelect={browse} label={t('home.mapLabel')} />
    </div>
  );
}
