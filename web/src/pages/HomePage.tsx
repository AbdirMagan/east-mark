import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { HORN_COUNTRIES, HornMap, ParticleField, type HornCountryCode } from '../components/brand/HornMap.js';
import { CulturalPattern } from '../components/brand/CulturalPattern.js';
import { ProductRail } from '../components/product/ProductCard.js';
import { Button, SectionHeading, Skeleton } from '../components/ui/index.js';
import { Icon, categoryIcon, type IconName } from '../components/ui/Icon.js';
import {
  useCategories,
  useCountries,
  useProductSearch,
  useToggleFavorite,
} from '../hooks/useMarketData.js';
import { useSeo } from '../hooks/useSeo.js';
import { useT } from '../i18n/index.js';
import { useAuth } from '../store/auth.js';
import { usePreferences } from '../store/preferences.js';

export function HomePage() {
  const t = useT();
  const navigate = useNavigate();
  const session = useAuth((state) => state.session);
  const preferences = usePreferences();
  const toggleFavorite = useToggleFavorite();

  const { data: categories, isLoading: categoriesLoading } = useCategories();
  const { data: countries } = useCountries();

  const scope = {
    countryId: preferences.countryId ?? undefined,
    cityId: preferences.cityId ?? undefined,
  };

  const featured = useProductSearch({ ...scope, featuredOnly: true, limit: 12 });
  const recent = useProductSearch({ ...scope, sort: 'newest', limit: 12 });
  const popular = useProductSearch({ ...scope, sort: 'popular', limit: 12 });

  useSeo({
    title: 'East-Market',
    description:
      'Buy and sell across Somaliland, Somalia, Ethiopia, Kenya and Djibouti. Electronics, houses, cars, land and livestock — from people near you.',
    path: '/',
  });

  const onToggleFavorite = session
    ? (product: Parameters<typeof toggleFavorite.mutate>[0]) => toggleFavorite.mutate(product)
    : undefined;

  return (
    <>
      <Hero />

      <div className="mx-auto max-w-[90rem] space-y-12 px-4 py-10 lg:px-6">
        {/* Categories ------------------------------------------------------ */}
        <section aria-labelledby="home-categories">
          <SectionHeading title={t('home.categories')} action={t('common.seeAll')} to="/categories" />

          {categoriesLoading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {Array.from({ length: 5 }, (_, index) => (
                <Skeleton key={index} className="h-24" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {(categories ?? []).slice(0, 16).map((category) => (
                <CategoryTile
                  key={category.id}
                  slug={category.slug}
                  name={category.name}
                  accent={category.accentColor}
                  icon={categoryIcon(category.slug, category.icon)}
                />
              ))}
            </div>
          )}
        </section>

        {/* Featured -------------------------------------------------------- */}
        {featured.data?.data.length ? (
          <section aria-labelledby="home-featured">
            <SectionHeading
              title={t('home.featured')}
              action={t('common.seeAll')}
              to="/browse?featuredOnly=true"
            />
            <ProductRail
              products={featured.data.data}
              onToggleFavorite={onToggleFavorite}
              showFavorite={Boolean(session)}
            />
          </section>
        ) : null}

        {/* Recent ---------------------------------------------------------- */}
        <section aria-labelledby="home-recent">
          <SectionHeading
            title={
              preferences.cityName
                ? t('home.nearby', { city: preferences.cityName })
                : t('home.recent')
            }
            action={t('common.seeAll')}
            to="/browse"
          />
          <ProductRail
            products={recent.data?.data ?? []}
            loading={recent.isLoading}
            onToggleFavorite={onToggleFavorite}
            showFavorite={Boolean(session)}
          />
        </section>

        {/* Popular --------------------------------------------------------- */}
        {popular.data?.data.length ? (
          <section aria-labelledby="home-popular">
            <SectionHeading
              title={t('home.popular')}
              action={t('common.seeAll')}
              to="/browse?sort=popular"
            />
            <ProductRail
              products={popular.data.data}
              onToggleFavorite={onToggleFavorite}
              showFavorite={Boolean(session)}
            />
          </section>
        ) : null}

        <TrustSection countryCount={countries?.length ?? 4} categoryCount={categories?.length ?? 5} />

        {/* Sell call to action --------------------------------------------- */}
        <section className="relative overflow-hidden rounded-[--radius-card] bg-acacia-900 px-6 py-12 text-center text-sand-50 sm:px-12">
          <CulturalPattern variant="weave" scale={52} className="text-sand-100" />
          <div className="relative mx-auto max-w-xl">
            <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
              {t('sell.title')}
            </h2>
            <p className="mt-3 text-sand-200">{t('sell.subtitle')}</p>
            <Button
              variant="accent"
              size="lg"
              icon="plus"
              className="mt-6"
              onClick={() => navigate(session ? '/sell' : '/signin?next=/sell')}
            >
              {t('home.startSelling')}
            </Button>
          </div>
        </section>
      </div>
    </>
  );
}

/* -------------------------------------------------------------------------- */

function Hero() {
  const t = useT();
  const navigate = useNavigate();
  const session = useAuth((state) => state.session);
  const { data: countries } = useCountries();
  const setCountry = usePreferences((state) => state.setCountry);
  const [selected, setSelected] = useState<HornCountryCode | null>(null);

  // Country names come from the API in the visitor's language.
  const names = Object.fromEntries((countries ?? []).map((country) => [country.code, country.name])) as Partial<
    Record<HornCountryCode, string>
  >;
  const chosen = HORN_COUNTRIES.find((country) => country.code === selected);
  const chosenRow = countries?.find((country) => country.code === selected);

  const browseCountry = () => {
    if (!chosenRow) return;
    setCountry({ id: chosenRow.id, code: chosenRow.code, name: chosenRow.name });
    navigate('/browse');
  };

  return (
    <section className="horn-neon relative isolate overflow-hidden border-b border-white/10 bg-[#040914] text-slate-100">
      {/* Dot grid and drifting particles, from the brand background design. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 opacity-25"
        style={{ backgroundImage: 'radial-gradient(rgb(255 255 255 / 0.16) 1px, transparent 1px)', backgroundSize: '36px 36px' }}
      />
      <ParticleField className="absolute inset-0 -z-10" />

      <div className="relative mx-auto grid max-w-[90rem] items-center gap-4 px-4 pb-8 pt-10 sm:pb-12 sm:pt-14 lg:grid-cols-[1fr_1.1fr] lg:gap-10 lg:px-6 lg:py-14">
        <div className="text-center lg:text-left">
          <span className="inline-flex items-center gap-1.5 rounded-[--radius-pill] bg-white/5 px-3 py-1 text-xs font-semibold text-cyan-200 ring-1 ring-inset ring-white/15">
            <Icon name="map-pin" size={13} />
            {t('footer.countries')}
          </span>

          <h1 className="mt-5 font-display text-4xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-6xl">
            {t('home.heroTitle')}
          </h1>

          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-slate-300 sm:text-lg lg:mx-0">
            {t('home.heroSubtitle')}
          </p>

          <div className="mt-7 flex flex-wrap justify-center gap-3 lg:justify-start">
            <Button size="lg" variant="accent" icon="search" onClick={() => navigate('/browse')}>
              {t('home.browseCategories')}
            </Button>
            <Button
              size="lg"
              variant="secondary"
              icon="plus"
              className="border-white/20 bg-white/5 text-white hover:bg-white/15"
              onClick={() => navigate(session ? '/sell' : '/signin?next=/sell')}
            >
              {t('home.startSelling')}
            </Button>
          </div>
        </div>

        <div className="mx-auto w-full max-w-md sm:max-w-lg lg:max-w-none">
          <HornMap
            variant="hero"
            className="aspect-[960/870] w-full"
            names={names}
            selected={selected}
            onSelect={(code) => setSelected((current) => (current === code ? null : code))}
            label={t('home.mapLabel')}
          />

          {/* The tap target on phones: hover cards do not exist on touch. */}
          <div aria-live="polite" className="mt-3 flex min-h-[4.25rem] items-center justify-center">
            {chosen ? (
              <div className="flex w-full max-w-sm items-center gap-3 rounded-xl border border-white/15 bg-white/5 px-4 py-3 backdrop-blur-md">
                <span
                  className="h-10 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: chosen.color, boxShadow: `0 0 12px ${chosen.color}` }}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold uppercase tracking-wider text-white">
                    {names[chosen.code] ?? chosen.name}
                  </p>
                  <p className="font-mono text-xs text-slate-300">{t('home.capital', { city: chosen.capital })}</p>
                </div>
                <Button size="sm" variant="accent" icon="arrow-right" onClick={browseCountry} disabled={!chosenRow}>
                  {t('home.browseCountry', { country: names[chosen.code] ?? chosen.name })}
                </Button>
              </div>
            ) : (
              <p className="text-center text-xs text-slate-400">{t('home.mapHint')}</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function CategoryTile({
  slug,
  name,
  accent,
  icon,
}: {
  slug: string;
  name: string;
  accent: string | null;
  icon: IconName;
}) {
  return (
    <Link
      to={`/browse?category=${slug}`}
      className="group relative flex flex-col items-center justify-center gap-2 overflow-hidden rounded-[--radius-card] border border-border-subtle bg-surface-raised p-3 text-center transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[--shadow-card]"
    >
      <span
        className="flex size-10 items-center justify-center rounded-full text-white transition-transform duration-200 group-hover:scale-110"
        // The accent colour comes from the database, so a new category added
        // from the admin dashboard styles itself without a code change.
        style={{ backgroundColor: accent ?? 'var(--brand)' }}
        aria-hidden="true"
      >
        <Icon name={icon} size={20} />
      </span>
      <span className="line-clamp-2 text-[0.6875rem] font-medium leading-tight text-text-secondary sm:text-xs">
        {name}
      </span>
    </Link>
  );
}

function TrustSection({
  countryCount,
  categoryCount,
}: {
  countryCount: number;
  categoryCount: number;
}) {
  const t = useT();

  const points = [
    { icon: 'map-pin' as const, title: t('home.trustLocal'), body: t('home.trustLocalBody') },
    { icon: 'globe' as const, title: t('home.trustLanguages'), body: t('home.trustLanguagesBody') },
    { icon: 'offline' as const, title: t('home.trustLight'), body: t('home.trustLightBody') },
  ];

  return (
    <section className="rounded-[--radius-card] border border-border-subtle bg-surface-raised p-6 sm:p-8">
      <div className="mb-6 flex flex-wrap items-baseline justify-between gap-4">
        <h2 className="font-display text-lg font-bold tracking-tight text-text-primary sm:text-xl">
          {t('home.trustTitle')}
        </h2>
        <p className="flex gap-4 text-sm text-text-muted">
          <span>
            <strong className="text-text-primary">{countryCount}</strong> {t('home.statsCountries')}
          </span>
          <span>
            <strong className="text-text-primary">{categoryCount}</strong> {t('home.statsCategories')}
          </span>
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-3">
        {points.map((point) => (
          <div key={point.title}>
            <span className="mb-3 flex size-9 items-center justify-center rounded-[--radius-field] bg-brand-subtle text-brand">
              <Icon name={point.icon} size={18} />
            </span>
            <h3 className="text-sm font-semibold text-text-primary">{point.title}</h3>
            <p className="mt-1 text-sm leading-relaxed text-text-secondary">{point.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
