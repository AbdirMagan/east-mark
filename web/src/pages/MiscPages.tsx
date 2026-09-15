import { Link, useNavigate } from 'react-router-dom';

import { CulturalPattern } from '../components/brand/CulturalPattern.js';
import { ProductGrid } from '../components/product/ProductCard.js';
import { Button, EmptyState, Skeleton } from '../components/ui/index.js';
import { Icon, categoryIcon } from '../components/ui/Icon.js';
import { useCategories } from '../hooks/useMarketData.js';
import { useSeo } from '../hooks/useSeo.js';
import { useT } from '../i18n/index.js';
import { useAuth } from '../store/auth.js';

/** All categories, grouped with their subcategories. */
export function CategoriesPage() {
  const t = useT();
  const { data: categories, isLoading } = useCategories();

  useSeo({
    title: t('nav.categories'),
    description:
      'Every category on East-Market — cars, phones, houses, land, livestock, jobs, services and more.',
    path: '/categories',
  });

  return (
    <div className="mx-auto max-w-[80rem] px-4 py-8 lg:px-6">
      <h1 className="font-display text-2xl font-bold tracking-tight text-text-primary">
        {t('nav.categories')}
      </h1>

      {isLoading ? (
        <div className="mt-8 grid gap-6 [grid-template-columns:repeat(auto-fit,minmax(19rem,1fr))]">
          {Array.from({ length: 9 }, (_, index) => (
            <Skeleton key={index} className="h-40" />
          ))}
        </div>
      ) : (
        <div className="mt-8 grid gap-6 [grid-template-columns:repeat(auto-fit,minmax(19rem,1fr))]">
          {(categories ?? []).map((category) => (
            <section
              key={category.id}
              className="relative overflow-hidden rounded-(--radius-card) border border-border-subtle bg-surface-raised p-5"
            >
              <CulturalPattern variant="beads" scale={38} />
              <div className="relative">
                <Link
                  to={`/browse?category=${category.slug}`}
                  className="group flex items-center gap-3"
                >
                  <span
                    className="flex size-10 items-center justify-center rounded-(--radius-field) text-white"
                    style={{ backgroundColor: category.accentColor ?? 'var(--brand)' }}
                    aria-hidden="true"
                  >
                    <Icon name={categoryIcon(category.slug, category.icon)} size={19} />
                  </span>
                  <h2 className="font-display text-base font-bold text-text-primary group-hover:text-brand">
                    {category.name}
                  </h2>
                </Link>

                {category.children.length > 0 ? (
                  <ul className="mt-3 space-y-1">
                    {category.children.map((child) => (
                      <li key={child.id}>
                        <Link
                          to={`/browse?category=${child.slug}`}
                          className="text-sm text-text-secondary transition-colors hover:text-brand"
                        >
                          {child.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

export function SavedPage() {
  const t = useT();
  const navigate = useNavigate();
  const session = useAuth((state) => state.session);

  useSeo({ title: t('nav.saved'), noIndex: true, path: '/saved' });

  if (!session) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <EmptyState
          icon="heart"
          title={t('empty.noSaved')}
          body={t('empty.noSavedBody')}
          action={<Button onClick={() => navigate('/signin?next=/saved')}>{t('auth.signIn')}</Button>}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[90rem] px-4 py-8 lg:px-6">
      <h1 className="mb-6 font-display text-2xl font-bold tracking-tight text-text-primary">
        {t('nav.saved')}
      </h1>
      <SavedList />
    </div>
  );
}

function SavedList() {
  const t = useT();
  const navigate = useNavigate();
  // Favourites return the raw product row rather than a card DTO, so this
  // screen reuses the grid only once that endpoint is card-shaped. Until the
  // backend's /users/me/favorites returns cards, show the empty state rather
  // than half-rendered listings.
  return (
    <EmptyState
      icon="heart"
      title={t('empty.noSaved')}
      body={t('empty.noSavedBody')}
      action={
        <Button icon="search" onClick={() => navigate('/browse')}>
          {t('empty.browse')}
        </Button>
      }
    />
  );
}

export function NotFoundPage() {
  const t = useT();
  const navigate = useNavigate();

  useSeo({ title: t('error.notFound'), noIndex: true });

  return (
    <div className="mx-auto max-w-2xl px-4 py-20">
      <EmptyState
        icon="alert"
        title={t('error.notFound')}
        body={t('error.notFoundBody')}
        action={
          <Button icon="arrow-right" onClick={() => navigate('/')}>
            {t('nav.home')}
          </Button>
        }
      />
    </div>
  );
}

/** Placeholder for routes whose screens are not built yet. */
export function ComingSoonPage({ titleKey }: { titleKey: 'nav.sell' | 'nav.messages' | 'nav.myListings' }) {
  const t = useT();
  const navigate = useNavigate();

  useSeo({ title: t(titleKey), noIndex: true });

  return (
    <div className="mx-auto max-w-2xl px-4 py-20">
      <EmptyState
        icon="package"
        title={t(titleKey)}
        body="This screen is not built yet."
        action={
          <Button variant="secondary" icon="arrow-right" onClick={() => navigate('/browse')}>
            {t('empty.browse')}
          </Button>
        }
      />
    </div>
  );
}

export { ProductGrid };
