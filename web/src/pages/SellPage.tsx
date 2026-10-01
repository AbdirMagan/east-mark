import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';

import { CulturalPattern } from '../components/brand/CulturalPattern.js';
import {
  AttributeFields,
  CategoryStep,
  type AttributeValues,
} from '../components/sell/CategoryStep.js';
import { ImageUploader } from '../components/sell/ImageUploader.js';
import { VideoUploader } from '../components/sell/VideoUploader.js';
import { Button, Checkbox, SelectField, Skeleton, TextField } from '../components/ui/index.js';
import { Icon } from '../components/ui/Icon.js';
import { useCategories, useConfig, useCountries, useMe } from '../hooks/useMarketData.js';
import { useCreateListing } from '../hooks/useCreateListing.js';
import { useSeo } from '../hooks/useSeo.js';
import { useI18n, useT, type TranslationKey } from '../i18n/index.js';
import { endpoints, type Category, type CategoryTree, type Place } from '../lib/api.js';
import { targetsFromConfig, type ProcessedImage } from '../lib/image.js';
import { categoryGroup, coreExample } from '../lib/listingFields.js';
import type { SelectedVideo } from '../lib/video.js';
import { useAuth } from '../store/auth.js';
import { usePreferences } from '../store/preferences.js';

const CONDITIONS = ['new', 'like_new', 'used', 'refurbished'] as const;
const DRAFT_KEY = 'em.sell.draft';
const STEPS = 3;

/** The parts of the form worth surviving a reload. Photos cannot be. */
interface DraftState {
  categoryId: number | null;
  subcategoryId: number | null;
  title: string;
  description: string;
  price: string;
  currency: string;
  condition: string;
  negotiable: boolean;
  delivery: boolean;
  quantity: string;
  brand: string;
  model: string;
  year: string;
  color: string;
  size: string;
  attributes: AttributeValues;
  countryId: number | null;
  regionId: number | null;
  cityId: number | null;
  phone: string;
  whatsapp: string;
  whatsappSame: boolean;
}

/** True when the seller has actually entered something. */
function hasContent(draft: DraftState): boolean {
  return (
    draft.categoryId !== null ||
    draft.title.trim() !== '' ||
    draft.description.trim() !== '' ||
    draft.price.trim() !== ''
  );
}

function emptyDraft(currency: string): DraftState {
  return {
    categoryId: null,
    subcategoryId: null,
    title: '',
    description: '',
    price: '',
    currency,
    condition: 'used',
    negotiable: false,
    delivery: false,
    quantity: '1',
    brand: '',
    model: '',
    year: '',
    color: '',
    size: '',
    attributes: {},
    countryId: null,
    regionId: null,
    cityId: null,
    phone: '',
    whatsapp: '',
    whatsappSame: true,
  };
}

export function SellPage() {
  const t = useT();
  const { language } = useI18n();
  const session = useAuth((state) => state.session);
  const preferences = usePreferences();

  const { data: categories, isLoading: categoriesLoading } = useCategories();
  const { data: countries } = useCountries();
  const { data: config } = useConfig();
  const { data: me } = useMe();

  const { publish, progress, reset } = useCreateListing();

  const [step, setStep] = useState(0);
  const [images, setImages] = useState<ProcessedImage[]>([]);
  const [video, setVideo] = useState<SelectedVideo | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [restored, setRestored] = useState(false);
  const [result, setResult] = useState<{ ref: number; draft: boolean } | null>(null);

  const [draft, setDraft] = useState<DraftState>(() => {
    // A half-typed listing is real work. Losing it to a dropped connection or
    // a backgrounded tab is the kind of thing that stops someone trying again.
    try {
      const stored = localStorage.getItem(DRAFT_KEY);
      if (stored) return { ...emptyDraft('USD'), ...(JSON.parse(stored) as DraftState) };
    } catch {
      // Corrupt or blocked storage: start clean rather than crash.
    }
    return emptyDraft('USD');
  });

  useEffect(() => {
    // Only claim to have restored something if there is something worth
    // restoring. The persist effect below writes on mount, so a bare
    // "is there a key?" check announces a recovery on a first visit.
    if (hasContent(draft)) setRestored(true);
    // Checked once, against the draft as it was loaded.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist on every change, but never the photos: blobs cannot be serialised
  // and a base64 copy of five photos would blow past the storage quota.
  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      /* quota or private mode */
    }
  }, [draft]);

  // Seed location and contact from the profile once it loads.
  useEffect(() => {
    if (!me) return;
    setDraft((previous) => ({
      ...previous,
      countryId: previous.countryId ?? me.countryId ?? preferences.countryId,
      cityId: previous.cityId ?? me.cityId ?? preferences.cityId,
      currency: previous.currency || preferences.currency,
      phone: previous.phone || me.contact.phone || '',
      whatsapp: previous.whatsapp || me.contact.whatsapp || '',
    }));
  }, [me, preferences.countryId, preferences.cityId, preferences.currency]);

  const [regions, setRegions] = useState<Place[]>([]);
  const [cities, setCities] = useState<Place[]>([]);

  useEffect(() => {
    if (!draft.countryId) {
      setRegions([]);
      setCities([]);
      return;
    }
    let cancelled = false;
    void endpoints.regions(draft.countryId, language).then((data) => {
      if (!cancelled) setRegions(data);
    });
    void endpoints
      .cities({ countryId: draft.countryId, lang: language })
      .then((data) => {
        if (!cancelled) setCities(data);
      });
    return () => {
      cancelled = true;
    };
  }, [draft.countryId, language]);

  const selected = useMemo(() => {
    if (!categories || !draft.categoryId) return null;
    for (const parent of categories) {
      if (parent.id === draft.categoryId) return { parent, child: null as Category | null };
      const child = parent.children.find((item) => item.id === draft.categoryId);
      if (child) return { parent, child };
    }
    return null;
  }, [categories, draft.categoryId]);

  const schema = selected?.child?.fieldSchema ?? selected?.parent.fieldSchema;
  const core = schema?.core ?? [];
  // Which set of examples the empty boxes show. A phone seller and a car
  // seller are both told "say what it is, plainly" -- the example underneath
  // is the part that has to differ, or it teaches the wrong thing.
  const group = categoryGroup(selected?.parent.slug, selected?.child?.slug);
  const titleExample = selected
    ? t(`sell.titleExample.${group}` as TranslationKey)
    : t('sell.titlePlaceholder');
  const targets = targetsFromConfig(config?.settings.media as Record<string, unknown> | undefined);
  const maxImages = Number((config?.settings.listings as { max_images?: number } | undefined)?.max_images ?? 10);

  useSeo({ title: t('sell.title'), noIndex: true, path: '/sell' });

  if (!session) return <Navigate to="/signin?next=/sell" replace />;

  /* ---------------------------------------------------------------------- */

  const update = <K extends keyof DraftState>(key: K, value: DraftState[K]) => {
    setDraft((previous) => ({ ...previous, [key]: value }));
    setErrors((previous) => {
      if (!(key in previous)) return previous;
      const next = { ...previous };
      delete next[key as string];
      return next;
    });
  };

  const validateStep = (current: number): boolean => {
    const found: Record<string, string> = {};

    if (current === 0 && !draft.categoryId) found.categoryId = t('sell.categoryRequired');

    if (current === 1) {
      if (draft.title.trim().length < 3) found.title = t('sell.titleTooShort');
      if (draft.price.trim() === '' || Number.isNaN(Number(draft.price))) {
        found.price = t('sell.priceRequired');
      }
    }

    if (current === 2 && !draft.countryId) found.countryId = t('sell.countryRequired');

    setErrors(found);
    return Object.keys(found).length === 0;
  };

  const goNext = () => {
    if (!validateStep(step)) return;
    setStep((previous) => Math.min(previous + 1, STEPS - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goBack = () => {
    setStep((previous) => Math.max(previous - 1, 0));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submit = async (asDraft: boolean) => {
    if (!validateStep(2)) return;

    const whatsapp = draft.whatsappSame ? draft.phone : draft.whatsapp;

    // Contact details live on the profile, not the listing, so save them once
    // rather than retyping a phone number for every item someone sells.
    if (draft.phone && draft.phone !== me?.contact.phone) {
      await endpoints
        .updateContact({ phone: draft.phone, whatsapp: whatsapp || null })
        .catch(() => undefined);
    }

    const created = await publish(
      {
        title: draft.title.trim(),
        description: draft.description.trim() || undefined,
        categoryId: draft.categoryId!,
        price: Number(draft.price),
        currency: draft.currency,
        negotiable: draft.negotiable,
        condition: draft.condition,
        countryId: draft.countryId!,
        regionId: draft.regionId ?? undefined,
        cityId: draft.cityId ?? undefined,
        quantity: Number(draft.quantity) || 1,
        deliveryAvailable: draft.delivery,
        brand: draft.brand.trim() || undefined,
        model: draft.model.trim() || undefined,
        year: draft.year ? Number(draft.year) : undefined,
        color: draft.color.trim() || undefined,
        size: draft.size.trim() || undefined,
        phone: draft.phone || undefined,
        whatsapp: whatsapp || undefined,
        attributes: Object.keys(draft.attributes).length ? draft.attributes : undefined,
      },
      images,
      { asDraft, video },
    );

    if (created) {
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {
        /* storage blocked */
      }
      setResult({ ref: created.ref, draft: asDraft });
    }
  };

  if (result) {
    return (
      <SuccessScreen
        productRef={result.ref}
        isDraft={result.draft}
        failedImages={progress.failedImages}
        onPostAnother={() => {
          setDraft(emptyDraft(preferences.currency));
          setImages([]);
          setVideo(null);
          setResult(null);
          setStep(0);
          reset();
        }}
      />
    );
  }

  const publishing = progress.stage !== 'idle' && progress.stage !== 'error';

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 lg:px-6">
      <header className="mb-6">
        <h1 className="font-display text-2xl font-bold tracking-tight text-text-primary">
          {t('sell.title')}
        </h1>
        <p className="mt-1 text-sm text-text-secondary">{t('sell.subtitle')}</p>
      </header>

      <StepIndicator current={step} />

      {restored && step === 0 ? (
        <div className="mb-5 flex items-center justify-between gap-3 rounded-(--radius-field) bg-brand-subtle px-4 py-2.5 text-sm text-brand">
          <span className="flex items-center gap-2">
            <Icon name="check" size={16} />
            {t('sell.draftRestored')}
          </span>
          <button
            type="button"
            className="shrink-0 font-semibold underline"
            onClick={() => {
              setDraft(emptyDraft(preferences.currency));
              setRestored(false);
            }}
          >
            {t('sell.discardDraft')}
          </button>
        </div>
      ) : null}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (step < STEPS - 1) goNext();
          else void submit(false);
        }}
        className="space-y-6"
      >
        {/* Step 1 — category ------------------------------------------------ */}
        {step === 0 ? (
          categoriesLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 8 }, (_, index) => (
                <Skeleton key={index} className="h-14" />
              ))}
            </div>
          ) : (
            <>
              <CategoryStep
                categories={categories ?? []}
                selected={selected as { parent: CategoryTree; child: Category | null } | null}
                onSelect={(parent, child) => {
                  setDraft((previous) => ({
                    ...previous,
                    categoryId: child?.id ?? parent.id,
                    subcategoryId: null,
                    // Attributes belong to the old category's schema; keeping
                    // them would write meaningless keys onto the listing.
                    attributes: {},
                  }));
                  setErrors({});
                  setStep(1);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
              {errors.categoryId ? (
                <p className="text-sm text-(--color-danger)">{errors.categoryId}</p>
              ) : null}
            </>
          )
        ) : null}

        {/* Step 2 — details ------------------------------------------------- */}
        {step === 1 ? (
          <>
            {selected ? (
              <div className="flex items-center justify-between gap-3 rounded-(--radius-field) border border-border-subtle bg-surface-raised px-4 py-2.5">
                <span className="min-w-0 truncate text-sm">
                  <span className="text-text-muted">{selected.parent.name}</span>
                  {selected.child ? (
                    <>
                      <span className="mx-1.5 text-text-muted">/</span>
                      <span className="font-medium text-text-primary">{selected.child.name}</span>
                    </>
                  ) : null}
                </span>
                <button
                  type="button"
                  onClick={() => setStep(0)}
                  className="shrink-0 text-sm font-semibold text-brand hover:underline"
                >
                  {t('sell.changeCategory')}
                </button>
              </div>
            ) : null}

            <section className="space-y-4 rounded-(--radius-card) border border-border-subtle bg-surface-raised p-5">
              <h2 className="font-display text-base font-bold text-text-primary">
                {t('sell.detailsTitle')}
              </h2>

              <TextField
                label={t('sell.titleLabel')}
                value={draft.title}
                onChange={(event) => update('title', event.target.value)}
                maxLength={120}
                hint={t('sell.titleHint')}
                error={errors.title}
                placeholder={titleExample}
                required
              />

              <div className="space-y-1.5">
                <label htmlFor="description" className="block text-sm font-medium text-text-secondary">
                  {t('sell.descriptionLabel')}{' '}
                  <span className="font-normal text-text-muted">({t('sell.optional')})</span>
                </label>
                <textarea
                  id="description"
                  rows={5}
                  maxLength={5000}
                  value={draft.description}
                  onChange={(event) => update('description', event.target.value)}
                  placeholder={t('sell.descriptionPlaceholder')}
                  className="w-full rounded-(--radius-field) border border-border-subtle bg-surface-raised px-3 py-2.5 text-text-primary placeholder:text-text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25"
                />
                <p className="text-right text-xs text-text-muted">{draft.description.length}/5000</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
                <TextField
                  label={t('sell.priceLabel')}
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="any"
                  value={draft.price}
                  onChange={(event) => update('price', event.target.value)}
                  error={errors.price}
                  required
                />
                <SelectField
                  label={t('common.currency')}
                  value={draft.currency}
                  onChange={(event) => update('currency', event.target.value)}
                  className="sm:w-36"
                >
                  {(config?.currencies ?? [{ code: 'USD', name: 'US Dollar', symbol: '$', decimals: 2 }]).map(
                    (currency) => (
                      <option key={currency.code} value={currency.code}>
                        {currency.code}
                      </option>
                    ),
                  )}
                </SelectField>
              </div>

              <SelectField
                label={t('sell.conditionLabel')}
                value={draft.condition}
                onChange={(event) => update('condition', event.target.value)}
              >
                {CONDITIONS.map((condition) => (
                  <option key={condition} value={condition}>
                    {t(`condition.${condition}` as TranslationKey)}
                  </option>
                ))}
              </SelectField>

              {/* Core fields the category asks for, and only those. */}
              <div className="grid gap-4 sm:grid-cols-2">
                {core.includes('brand') ? (
                  <TextField
                    label="Brand"
                    value={draft.brand}
                    placeholder={coreExample(group, 'brand')}
                    onChange={(event) => update('brand', event.target.value)}
                  />
                ) : null}
                {core.includes('model') ? (
                  <TextField
                    label="Model"
                    value={draft.model}
                    placeholder={coreExample(group, 'model')}
                    onChange={(event) => update('model', event.target.value)}
                  />
                ) : null}
                {core.includes('year') ? (
                  <TextField
                    label="Year"
                    type="number"
                    inputMode="numeric"
                    min={1900}
                    max={2100}
                    value={draft.year}
                    placeholder={coreExample(group, 'year')}
                    onChange={(event) => update('year', event.target.value)}
                  />
                ) : null}
                {core.includes('color') ? (
                  <TextField
                    label="Colour"
                    value={draft.color}
                    placeholder={t('sell.colorPlaceholder')}
                    onChange={(event) => update('color', event.target.value)}
                  />
                ) : null}
                {core.includes('size') ? (
                  <TextField
                    label="Size"
                    value={draft.size}
                    placeholder={t('sell.sizePlaceholder')}
                    onChange={(event) => update('size', event.target.value)}
                  />
                ) : null}
                {core.includes('quantity') ? (
                  <TextField
                    label="Quantity"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    value={draft.quantity}
                    placeholder={coreExample(group, 'quantity')}
                    onChange={(event) => update('quantity', event.target.value)}
                  />
                ) : null}
              </div>

              <AttributeFields
                fields={schema?.extra ?? []}
                values={draft.attributes}
                onChange={(values) => update('attributes', values)}
              />

              <div className="space-y-1 border-t border-border-subtle pt-4">
                <Checkbox
                  label={t('sell.negotiableLabel')}
                  checked={draft.negotiable}
                  onChange={(checked) => update('negotiable', checked)}
                />
                <Checkbox
                  label={t('sell.deliveryLabel')}
                  checked={draft.delivery}
                  onChange={(checked) => update('delivery', checked)}
                />
              </div>
            </section>

            <section className="space-y-3 rounded-(--radius-card) border border-border-subtle bg-surface-raised p-5">
              <h2 className="font-display text-base font-bold text-text-primary">
                {t('sell.photosTitle')}
              </h2>
              <ImageUploader
                images={images}
                onChange={setImages}
                targets={targets}
                maxImages={maxImages}
              />
            </section>

            <section className="space-y-3 rounded-(--radius-card) border border-border-subtle bg-surface-raised p-5">
              <h2 className="font-display text-base font-bold text-text-primary">
                {t('sell.videoTitle')}{' '}
                <span className="font-sans text-xs font-normal text-text-muted">
                  {t('sell.optional')}
                </span>
              </h2>
              <VideoUploader video={video} onChange={setVideo} />
            </section>
          </>
        ) : null}

        {/* Step 3 — location and contact ------------------------------------ */}
        {step === 2 ? (
          <>
            <section className="space-y-4 rounded-(--radius-card) border border-border-subtle bg-surface-raised p-5">
              <div>
                <h2 className="font-display text-base font-bold text-text-primary">
                  {t('sell.locationTitle')}
                </h2>
                <p className="mt-1 text-sm text-text-secondary">{t('sell.locationHint')}</p>
              </div>

              <SelectField
                label={t('filters.country')}
                value={draft.countryId ? String(draft.countryId) : ''}
                onChange={(event) => {
                  const id = event.target.value ? Number(event.target.value) : null;
                  setDraft((previous) => ({
                    ...previous,
                    countryId: id,
                    regionId: null,
                    cityId: null,
                    currency:
                      countries?.find((country) => country.id === id)?.defaultCurrency ??
                      previous.currency,
                  }));
                }}
              >
                <option value="">—</option>
                {(countries ?? []).map((country) => (
                  <option key={country.id} value={country.id}>
                    {country.name} ({country.dialCode})
                  </option>
                ))}
              </SelectField>
              {errors.countryId ? (
                <p className="-mt-2 text-sm text-(--color-danger)">{errors.countryId}</p>
              ) : null}

              {regions.length > 0 ? (
                <SelectField
                  label="Region"
                  value={draft.regionId ? String(draft.regionId) : ''}
                  onChange={(event) =>
                    update('regionId', event.target.value ? Number(event.target.value) : null)
                  }
                >
                  <option value="">—</option>
                  {regions.map((region) => (
                    <option key={region.id} value={region.id}>
                      {region.name}
                    </option>
                  ))}
                </SelectField>
              ) : null}

              {cities.length > 0 ? (
                <SelectField
                  label={t('filters.city')}
                  value={draft.cityId ? String(draft.cityId) : ''}
                  onChange={(event) =>
                    update('cityId', event.target.value ? Number(event.target.value) : null)
                  }
                >
                  <option value="">—</option>
                  {cities.map((city) => (
                    <option key={city.id} value={city.id}>
                      {city.name}
                    </option>
                  ))}
                </SelectField>
              ) : null}
            </section>

            <section className="space-y-4 rounded-(--radius-card) border border-border-subtle bg-surface-raised p-5">
              <div>
                <h2 className="font-display text-base font-bold text-text-primary">
                  {t('sell.contactTitle')}
                </h2>
                <p className="mt-1 text-sm text-text-secondary">{t('sell.contactHint')}</p>
              </div>

              <TextField
                label={t('sell.phoneLabel')}
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="+252634000000"
                value={draft.phone}
                onChange={(event) => update('phone', event.target.value)}
              />

              <Checkbox
                label={t('sell.whatsappSame')}
                checked={draft.whatsappSame}
                onChange={(checked) => update('whatsappSame', checked)}
              />

              {!draft.whatsappSame ? (
                <TextField
                  label={t('sell.whatsappLabel')}
                  type="tel"
                  inputMode="tel"
                  placeholder="+252634000000"
                  value={draft.whatsapp}
                  onChange={(event) => update('whatsapp', event.target.value)}
                />
              ) : null}
            </section>
          </>
        ) : null}

        {/* Navigation ------------------------------------------------------- */}
        <div className="flex flex-wrap items-center gap-3">
          {step > 0 ? (
            <Button type="button" variant="secondary" icon="chevron-left" onClick={goBack}>
              {t('common.back')}
            </Button>
          ) : null}

          {step < STEPS - 1 ? (
            step > 0 ? (
              <Button type="submit" iconRight="chevron-right" className="ml-auto">
                {t('sell.continue')}
              </Button>
            ) : null
          ) : (
            <>
              <Button
                type="button"
                variant="ghost"
                onClick={() => void submit(true)}
                disabled={publishing}
              >
                {t('sell.saveDraft')}
              </Button>
              <Button type="submit" size="lg" className="ml-auto" loading={publishing}>
                {t('sell.publish')}
              </Button>
            </>
          )}
        </div>
      </form>

      {publishing ? <PublishOverlay /> : null}

      {progress.stage === 'error' ? (
        <p
          role="alert"
          className="mt-4 flex items-start gap-2 rounded-(--radius-field) bg-(--color-danger)/10 px-4 py-3 text-sm text-(--color-danger)"
        >
          <Icon name="alert" size={16} className="mt-0.5" />
          {progress.error === 'offline' ? t('error.offlineBody') : progress.error}
        </p>
      ) : null}
    </div>
  );

  function PublishOverlay() {
    const label =
      progress.stage === 'creating'
        ? t('sell.creating')
        : progress.stage === 'uploading'
          ? t('sell.uploadingPhotos', {
              done: progress.uploadedImages + 1,
              total: progress.totalImages,
            })
          : progress.stage === 'uploading-video'
            ? t('sell.uploadingVideo')
            : t('sell.publishing');

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/60 p-4 backdrop-blur-sm">
        <div className="w-full max-w-sm rounded-(--radius-card) bg-surface-raised p-6 text-center shadow-(--shadow-raised)">
          <p className="font-display font-bold text-text-primary">{label}</p>
          <div
            className="mt-4 h-2 overflow-hidden rounded-full bg-surface-sunken"
            role="progressbar"
            aria-valuenow={Math.round(progress.fraction * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full rounded-full bg-brand transition-[width] duration-300"
              style={{ width: `${Math.max(4, progress.fraction * 100)}%` }}
            />
          </div>
          <p className="mt-3 text-xs text-text-muted">{t('sell.subtitle')}</p>
        </div>
      </div>
    );
  }
}

/* -------------------------------------------------------------------------- */

function StepIndicator({ current }: { current: number }) {
  const t = useT();
  const labels: TranslationKey[] = ['sell.stepCategory', 'sell.stepDetails', 'sell.stepLocation'];

  return (
    <ol className="mb-6 flex items-center gap-2" aria-label={t('sell.stepOf', { step: current + 1, total: STEPS })}>
      {labels.map((label, index) => {
        const state = index < current ? 'done' : index === current ? 'active' : 'todo';
        return (
          <li key={label} className="flex flex-1 items-center gap-2">
            <span
              aria-current={state === 'active' ? 'step' : undefined}
              className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                state === 'done'
                  ? 'bg-brand text-white'
                  : state === 'active'
                    ? 'bg-brand-subtle text-brand ring-2 ring-brand'
                    : 'bg-surface-sunken text-text-muted'
              }`}
            >
              {state === 'done' ? <Icon name="check" size={14} strokeWidth={2.5} /> : index + 1}
            </span>
            <span
              className={`hidden truncate text-xs font-medium sm:block ${
                state === 'todo' ? 'text-text-muted' : 'text-text-primary'
              }`}
            >
              {t(label)}
            </span>
            {index < labels.length - 1 ? (
              <span
                className={`h-px flex-1 ${index < current ? 'bg-brand' : 'bg-border-subtle'}`}
                aria-hidden="true"
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

function SuccessScreen({
  productRef,
  isDraft,
  failedImages,
  onPostAnother,
}: {
  productRef: number;
  isDraft: boolean;
  failedImages: number;
  onPostAnother: () => void;
}) {
  const t = useT();

  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <div className="relative overflow-hidden rounded-(--radius-card) border border-border-subtle bg-surface-raised p-8 text-center">
        <CulturalPattern variant="weave" scale={48} />
        <div className="relative">
          <span className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-brand-subtle text-brand">
            <Icon name="check" size={26} strokeWidth={2.5} />
          </span>

          <h1 className="font-display text-xl font-bold text-text-primary">
            {isDraft ? t('sell.draftSavedTitle') : t('sell.successTitle')}
          </h1>
          <p className="mt-2 text-sm text-text-secondary">
            {isDraft ? t('sell.draftSavedBody') : t('sell.successBody')}
          </p>

          {failedImages > 0 ? (
            <p className="mt-4 rounded-(--radius-field) bg-sun-100 px-3 py-2 text-xs text-sun-800 dark:bg-sun-900/40 dark:text-sun-200">
              {t('sell.someImagesFailed', { count: failedImages })}
            </p>
          ) : null}

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {!isDraft ? (
              <Link
                to={`/product/${productRef}`}
                className="inline-flex h-11 items-center rounded-(--radius-field) bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-hover dark:text-ink-950"
              >
                {t('sell.viewListing')}
              </Link>
            ) : null}
            <Button variant="secondary" icon="plus" onClick={onPostAnother}>
              {t('sell.postAnother')}
            </Button>
            <Link
              to="/my-listings"
              className="inline-flex h-11 items-center px-4 text-sm font-semibold text-text-secondary hover:text-brand"
            >
              {t('sell.myListings')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
