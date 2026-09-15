import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { ProductGrid } from '../components/product/ProductCard.js';
import {
  Button,
  Checkbox,
  EmptyState,
  ErrorState,
  SelectField,
  TextField,
} from '../components/ui/index.js';
import { Icon } from '../components/ui/Icon.js';
import {
  useCategories,
  useCities,
  useCountries,
  useProductSearch,
  useToggleFavorite,
} from '../hooks/useMarketData.js';
import { useSeo } from '../hooks/useSeo.js';
import { useT, type TranslationKey } from '../i18n/index.js';
import type { ProductSearchParams } from '../lib/api.js';
import { useAuth } from '../store/auth.js';
import { usePreferences } from '../store/preferences.js';

const SORTS = ['newest', 'price_asc', 'price_desc', 'popular', 'relevance'] as const;
const CONDITIONS = ['new', 'like_new', 'used', 'refurbished'] as const;
const POSTED_WITHIN = [
  { value: '', labelKey: 'filters.anyTime' },
  { value: '1', labelKey: 'filters.last24h' },
  { value: '7', labelKey: 'filters.last7d' },
  { value: '30', labelKey: 'filters.last30d' },
] as const;

/**
 * Search state lives in the URL, not in component state.
 *
 * A filtered result on a marketplace gets shared — "here are the Corollas
 * under $10k in Hargeisa" pasted into a WhatsApp group is a real user journey.
 * Keeping it in the query string also means the back button behaves and a
 * reload does not silently drop what someone spent a minute setting up.
 */
export function BrowsePage() {
  const t = useT();
  const [params, setParams] = useSearchParams();
  const session = useAuth((state) => state.session);
  const preferences = usePreferences();
  const toggleFavorite = useToggleFavorite();
  const [filtersOpen, setFiltersOpen] = useState(false);

  const { data: categories } = useCategories();
  const { data: countries } = useCountries();

  const categorySlug = params.get('category') ?? '';
  const category = categories?.find((item) => item.slug === categorySlug);

  // A country in the URL wins over the stored preference, so a shared link
  // shows the sender's results rather than the recipient's home city.
  const countryId = params.get('countryId')
    ? Number(params.get('countryId'))
    : (preferences.countryId ?? undefined);
  const cityId = params.get('cityId')
    ? Number(params.get('cityId'))
    : (preferences.cityId ?? undefined);

  const { data: cities } = useCities(countryId ?? null);

  const query: ProductSearchParams = useMemo(() => {
    const conditions = params.get('conditions')?.split(',').filter(Boolean) ?? [];
    return {
      q: params.get('q') || undefined,
      categoryId: category?.id,
      countryId,
      cityId,
      conditions: conditions.length ? conditions : undefined,
      minPrice: params.get('minPrice') ? Number(params.get('minPrice')) : undefined,
      maxPrice: params.get('maxPrice') ? Number(params.get('maxPrice')) : undefined,
      sellerType: params.get('sellerType') || undefined,
      verifiedOnly: params.get('verifiedOnly') === 'true' || undefined,
      deliveryOnly: params.get('deliveryOnly') === 'true' || undefined,
      negotiableOnly: params.get('negotiableOnly') === 'true' || undefined,
      featuredOnly: params.get('featuredOnly') === 'true' || undefined,
      postedWithinDays: params.get('postedWithin') ? Number(params.get('postedWithin')) : undefined,
      sort: params.get('sort') ?? (params.get('q') ? 'relevance' : 'newest'),
      page: Number(params.get('page') ?? 1),
      limit: 24,
    };
  }, [params, category?.id, countryId, cityId]);

  const search = useProductSearch(query);
  const products = search.data?.data ?? [];
  const meta = search.data?.meta;

  const searchTerm = params.get('q');
  const heading = searchTerm
    ? t('browse.searchedFor', { query: searchTerm })
    : (category?.name ?? t('browse.title'));

  useSeo({
    title: heading,
    description: searchTerm
      ? `Listings matching "${searchTerm}" on East-Market.`
      : `Browse ${category?.name ?? 'listings'} across Somaliland, Somalia, Ethiopia, Kenya and Djibouti.`,
    path: `/browse${params.toString() ? `?${params.toString()}` : ''}`,
    // Filter permutations are near-infinite; indexing them all would be thin
    // content. Category and product pages carry the SEO weight instead.
    noIndex: Boolean(searchTerm) || params.size > 1,
  });

  // Any filter change resets to page 1: staying on page 7 of a result set that
  // now has two pages shows an empty grid and reads as a bug.
  const update = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value === null || value === '') next.delete(key);
      else next.set(key, value);
    }
    if (!('page' in changes)) next.delete('page');
    setParams(next, { replace: true });
  };

  const activeFilterCount = ['conditions', 'minPrice', 'maxPrice', 'sellerType', 'verifiedOnly', 'deliveryOnly', 'negotiableOnly', 'postedWithin', 'cityId', 'countryId'].filter(
    (key) => params.get(key),
  ).length;

  const filterPanel = (
    <FilterPanel
      params={params}
      update={update}
      categories={categories ?? []}
      countries={countries ?? []}
      cities={cities ?? []}
      countryId={countryId}
      onClearAll={() => setParams(searchTerm ? { q: searchTerm } : {}, { replace: true })}
      activeFilterCount={activeFilterCount}
    />
  );

  return (
    <div className="mx-auto max-w-[90rem] px-4 py-6 lg:px-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-xl font-bold tracking-tight text-text-primary sm:text-2xl">
            {heading}
          </h1>
          <p className="mt-0.5 text-sm text-text-muted" aria-live="polite">
            {search.isLoading
              ? t('common.loading')
              : meta?.total === 1
                ? t('browse.resultsOne')
                : t('browse.resultsMany', { count: meta?.total ?? 0 })}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon="sliders"
            className="lg:hidden"
            onClick={() => setFiltersOpen(true)}
          >
            {t('common.filters')}
            {activeFilterCount > 0 ? (
              <span className="ml-1 rounded-(--radius-pill) bg-brand px-1.5 text-[0.625rem] text-white">
                {activeFilterCount}
              </span>
            ) : null}
          </Button>

          <label className="sr-only" htmlFor="sort-select">
            {t('common.sort')}
          </label>
          <select
            id="sort-select"
            value={query.sort}
            onChange={(event) => update({ sort: event.target.value })}
            className="h-9 rounded-(--radius-field) border border-border-subtle bg-surface-raised px-3 text-sm text-text-primary focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25"
          >
            {SORTS.map((sort) => (
              <option key={sort} value={sort}>
                {t(`sort.${sort}` as TranslationKey)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-6 flex gap-6">
        <aside className="hidden w-64 shrink-0 lg:block">
          <div className="sticky top-24">{filterPanel}</div>
        </aside>

        <div className="min-w-0 flex-1">
          {search.isError ? (
            <ErrorState
              title={t('error.generic')}
              body={t('error.genericBody')}
              onRetry={() => void search.refetch()}
              retryLabel={t('common.retry')}
            />
          ) : !search.isLoading && products.length === 0 ? (
            <EmptyState
              icon="search"
              title={t('browse.noResults')}
              body={t('browse.noResultsBody')}
              action={
                activeFilterCount > 0 ? (
                  <Button
                    variant="secondary"
                    onClick={() => setParams(searchTerm ? { q: searchTerm } : {}, { replace: true })}
                  >
                    {t('common.clearAll')}
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <>
              <ProductGrid
                products={products}
                loading={search.isLoading}
                skeletonCount={24}
                showFavorite={Boolean(session)}
                onToggleFavorite={session ? (product) => toggleFavorite.mutate(product) : undefined}
              />

              {meta && meta.totalPages > 1 ? (
                <Pagination
                  page={meta.page}
                  totalPages={meta.totalPages}
                  onChange={(page) => {
                    update({ page: String(page) });
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                />
              ) : null}
            </>
          )}
        </div>
      </div>

      {filtersOpen ? (
        <FilterSheet onClose={() => setFiltersOpen(false)}>{filterPanel}</FilterSheet>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

interface FilterPanelProps {
  params: URLSearchParams;
  update: (changes: Record<string, string | null>) => void;
  categories: Array<{ id: number; slug: string; name: string }>;
  countries: Array<{ id: number; name: string }>;
  cities: Array<{ id: number; name: string }>;
  countryId: number | undefined;
  onClearAll: () => void;
  activeFilterCount: number;
}

function FilterPanel({
  params,
  update,
  categories,
  countries,
  cities,
  countryId,
  onClearAll,
  activeFilterCount,
}: FilterPanelProps) {
  const t = useT();
  const conditions = params.get('conditions')?.split(',').filter(Boolean) ?? [];

  // Price inputs are local so typing does not fire a request per keystroke;
  // they commit on blur or Enter.
  const [minPrice, setMinPrice] = useState(params.get('minPrice') ?? '');
  const [maxPrice, setMaxPrice] = useState(params.get('maxPrice') ?? '');

  useEffect(() => {
    setMinPrice(params.get('minPrice') ?? '');
    setMaxPrice(params.get('maxPrice') ?? '');
  }, [params]);

  const toggleCondition = (condition: string) => {
    const next = conditions.includes(condition)
      ? conditions.filter((item) => item !== condition)
      : [...conditions, condition];
    update({ conditions: next.join(',') || null });
  };

  return (
    <div className="space-y-5 rounded-(--radius-card) border border-border-subtle bg-surface-raised p-4">
      {activeFilterCount > 0 ? (
        <button
          type="button"
          onClick={onClearAll}
          className="flex w-full items-center justify-between text-sm font-semibold text-accent hover:underline"
        >
          {t('common.clearAll')}
          <Icon name="close" size={15} />
        </button>
      ) : null}

      <SelectField
        label={t('filters.category')}
        value={params.get('category') ?? ''}
        onChange={(event) => update({ category: event.target.value || null })}
      >
        <option value="">{t('filters.allCategories')}</option>
        {categories.map((category) => (
          <option key={category.id} value={category.slug}>
            {category.name}
          </option>
        ))}
      </SelectField>

      <SelectField
        label={t('filters.country')}
        value={countryId ? String(countryId) : ''}
        onChange={(event) => update({ countryId: event.target.value || null, cityId: null })}
      >
        <option value="">{t('common.allLocations')}</option>
        {countries.map((country) => (
          <option key={country.id} value={country.id}>
            {country.name}
          </option>
        ))}
      </SelectField>

      {countryId && cities.length > 0 ? (
        <SelectField
          label={t('filters.city')}
          value={params.get('cityId') ?? ''}
          onChange={(event) => update({ cityId: event.target.value || null })}
        >
          <option value="">{t('filters.anyCity')}</option>
          {cities.map((city) => (
            <option key={city.id} value={city.id}>
              {city.name}
            </option>
          ))}
        </SelectField>
      ) : null}

      <fieldset>
        <legend className="mb-1.5 text-sm font-medium text-text-secondary">
          {t('filters.price')}
        </legend>
        <div className="flex items-center gap-2">
          <TextField
            type="number"
            inputMode="numeric"
            min={0}
            placeholder={t('filters.minPrice')}
            aria-label={t('filters.minPrice')}
            value={minPrice}
            onChange={(event) => setMinPrice(event.target.value)}
            onBlur={() => update({ minPrice: minPrice || null })}
            onKeyDown={(event) => {
              if (event.key === 'Enter') update({ minPrice: minPrice || null });
            }}
          />
          <span className="pt-1 text-text-muted">–</span>
          <TextField
            type="number"
            inputMode="numeric"
            min={0}
            placeholder={t('filters.maxPrice')}
            aria-label={t('filters.maxPrice')}
            value={maxPrice}
            onChange={(event) => setMaxPrice(event.target.value)}
            onBlur={() => update({ maxPrice: maxPrice || null })}
            onKeyDown={(event) => {
              if (event.key === 'Enter') update({ maxPrice: maxPrice || null });
            }}
          />
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-1 text-sm font-medium text-text-secondary">
          {t('filters.condition')}
        </legend>
        {CONDITIONS.map((condition) => (
          <Checkbox
            key={condition}
            label={t(`condition.${condition}` as TranslationKey)}
            checked={conditions.includes(condition)}
            onChange={() => toggleCondition(condition)}
          />
        ))}
      </fieldset>

      <SelectField
        label={t('filters.sellerType')}
        value={params.get('sellerType') ?? ''}
        onChange={(event) => update({ sellerType: event.target.value || null })}
      >
        <option value="">{t('filters.allSellers')}</option>
        <option value="individual">{t('filters.individual')}</option>
        <option value="business">{t('filters.business')}</option>
      </SelectField>

      <SelectField
        label={t('filters.postedWithin')}
        value={params.get('postedWithin') ?? ''}
        onChange={(event) => update({ postedWithin: event.target.value || null })}
      >
        {POSTED_WITHIN.map((option) => (
          <option key={option.value} value={option.value}>
            {t(option.labelKey)}
          </option>
        ))}
      </SelectField>

      <fieldset className="space-y-0.5">
        <Checkbox
          label={t('filters.verifiedOnly')}
          checked={params.get('verifiedOnly') === 'true'}
          onChange={(checked) => update({ verifiedOnly: checked ? 'true' : null })}
        />
        <Checkbox
          label={t('filters.deliveryOnly')}
          checked={params.get('deliveryOnly') === 'true'}
          onChange={(checked) => update({ deliveryOnly: checked ? 'true' : null })}
        />
        <Checkbox
          label={t('filters.negotiableOnly')}
          checked={params.get('negotiableOnly') === 'true'}
          onChange={(checked) => update({ negotiableOnly: checked ? 'true' : null })}
        />
      </fieldset>
    </div>
  );
}

/** Filters as a bottom sheet on mobile, which is where a thumb already is. */
function FilterSheet({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  const t = useT();

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-ink-950/50 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="absolute inset-x-0 bottom-0 flex max-h-[85vh] flex-col rounded-t-[1.25rem] bg-surface-raised shadow-(--shadow-raised)">
        <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
          <span className="font-display font-bold text-text-primary">{t('common.filters')}</span>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="inline-flex size-9 items-center justify-center rounded-(--radius-field) text-text-secondary hover:bg-surface-sunken"
          >
            <Icon name="close" size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
        <div className="border-t border-border-subtle p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <Button fullWidth onClick={onClose}>
            {t('common.apply')}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  const t = useT();
  return (
    <nav className="mt-8 flex items-center justify-center gap-3" aria-label="Pagination">
      <Button
        variant="secondary"
        size="sm"
        icon="chevron-left"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        {t('common.previous')}
      </Button>
      <span className="text-sm text-text-secondary">
        {t('common.page', { page, total: totalPages })}
      </span>
      <Button
        variant="secondary"
        size="sm"
        iconRight="chevron-right"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
      >
        {t('common.next')}
      </Button>
    </nav>
  );
}
