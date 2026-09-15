import { Link, useNavigate } from 'react-router-dom';

import { HeroCarousel } from '../components/home/HeroCarousel.js';
import { CulturalPattern } from '../components/brand/CulturalPattern.js';
import { ProductRail } from '../components/product/ProductCard.js';
import { Button, SectionHeading, Skeleton } from '../components/ui/index.js';
import { Icon, categoryIcon, type IconName } from '../components/ui/Icon.js';
import {
  useCategories,
  useCountries,
  useHomeAds,
  useProductSearch,
  useToggleFavorite,
} from '../hooks/useMarketData.js';
import { useSeo } from '../hooks/useSeo.js';
import type { HomeAd } from '../lib/api.js';
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
  const { data: ads, isLoading: adsLoading, isError: adsError } = useHomeAds();
  // While promotions load the carousel shows a skeleton; with none running
  // (or the API unreachable) it still has the welcome slide.
  const heroSlides: HomeAd[] = ads?.length ? ads : adsLoading && !adsError ? [] : [welcomeSlide(t)];

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
      'Buy and sell across Somaliland, Somalia, Ethiopia, Kenya and Djibouti. Electronics, houses, cars and motorcycles, land, livestock, and home and office goods — to buy or rent, from people near you.',
    path: '/',
  });

  const onToggleFavorite = session
    ? (product: Parameters<typeof toggleFavorite.mutate>[0]) => toggleFavorite.mutate(product)
    : undefined;

  return (
    <>
      <HeroCarousel slides={heroSlides} loading={adsLoading} />

      <div className="mx-auto max-w-[90rem] space-y-12 px-4 py-10 lg:px-6">
        {/* Categories ------------------------------------------------------ */}
        <section aria-labelledby="home-categories">
          <SectionHeading title={t('home.categories')} action={t('common.seeAll')} to="/categories" />

          {categoriesLoading ? (
            <div className="grid grid-cols-2 gap-3 sm:[grid-template-columns:repeat(auto-fit,minmax(9rem,1fr))]">
              {Array.from({ length: 5 }, (_, index) => (
                <Skeleton key={index} className="h-24" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:[grid-template-columns:repeat(auto-fit,minmax(9rem,1fr))]">
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

/**
 * The slide shown when no promotions are running or the API cannot be
 * reached, so the top of the home page is never empty.
 */
function welcomeSlide(t: ReturnType<typeof useT>): HomeAd {
  return {
    id: 'fallback-welcome',
    title: t('home.heroTitle'),
    subtitle: t('home.heroSubtitle'),
    badge: null,
    ctaLabel: t('home.browseCategories'),
    theme: 'night',
    icon: 'map',
    imageUrl: null,
    targetType: 'search',
    targetValue: '',
    link: '/browse',
    categoryId: null,
  };
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
