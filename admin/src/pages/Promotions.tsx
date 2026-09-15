import { useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api, uploadAdImage, type AdInput, type AdTheme, type AdminAd } from '../lib/api.js';
import {
  Button, Card, EmptyState, ErrorState, Icon, MutationError, PageHeader, Skeleton, StatusPill, formatDate,
} from '../components/ui.js';

/**
 * Advertisements: the slides in the home carousel, on the website and in the
 * Android app. Both render the same fields -- image or colour theme, badge,
 * title, subtitle, button and icon -- so the preview here is what shoppers see.
 */

const THEMES: Array<{ value: AdTheme; label: string; background: string }> = [
  { value: 'night', label: 'Night map', background: 'linear-gradient(135deg, #040914, #0b1630)' },
  { value: 'clay', label: 'Clay', background: 'linear-gradient(135deg, #281206, #7d3712, #d9743a)' },
  { value: 'acacia', label: 'Acacia', background: 'linear-gradient(135deg, #061a16, #144e41, #1e6f5c)' },
  { value: 'sun', label: 'Sun', background: 'linear-gradient(135deg, #26180a, #8b5a24, #d4913f)' },
  { value: 'navy', label: 'Navy', background: 'linear-gradient(135deg, #0b1a33, #1d3f72, #2f63ad)' },
];

const ICONS = [
  { value: 'map', label: 'Map (night theme shows the live map)' },
  { value: 'electronics', label: 'Electronics' },
  { value: 'house', label: 'House' },
  { value: 'car', label: 'Car' },
  { value: 'land', label: 'Land' },
  { value: 'livestock', label: 'Livestock' },
  { value: 'goods', label: 'Home & office goods' },
];

const TARGETS = [
  { value: 'category', label: 'A category', hint: 'Opens that category.' },
  { value: 'search', label: 'A search', hint: 'Search words, or empty for all listings.' },
  { value: 'product', label: 'A listing', hint: 'The listing number, e.g. 100013.' },
  { value: 'url', label: 'A page or website', hint: 'A path like /sell, or a full https:// address.' },
] as const;

const LANGUAGES = [
  { code: 'so', label: 'Somali' },
  { code: 'am', label: 'Amharic' },
  { code: 'sw', label: 'Swahili' },
] as const;

type Draft = {
  id?: string;
  title: string;
  subtitle: string;
  badge: string;
  ctaLabel: string;
  theme: AdTheme;
  icon: string;
  imageUrl: string;
  targetType: AdInput['targetType'];
  targetValue: string;
  status: AdInput['status'];
  priority: number;
  endsOn: string;
  translations: Record<string, Record<string, string>>;
};

const EMPTY: Draft = {
  title: '',
  subtitle: '',
  badge: '',
  ctaLabel: '',
  theme: 'clay',
  icon: 'electronics',
  imageUrl: '',
  targetType: 'category',
  targetValue: '',
  status: 'running',
  priority: 10,
  endsOn: '',
  translations: {},
};

function toDraft(ad: AdminAd): Draft {
  return {
    id: ad.id,
    title: ad.title,
    subtitle: ad.subtitle ?? '',
    badge: ad.badge ?? '',
    ctaLabel: ad.ctaLabel ?? '',
    theme: ad.theme,
    icon: ad.icon ?? 'map',
    imageUrl: ad.imageUrl ?? '',
    targetType: ad.targetType as AdInput['targetType'],
    targetValue: ad.targetValue ?? '',
    status: ad.status as AdInput['status'],
    priority: ad.priority,
    endsOn: ad.endsAt ? ad.endsAt.slice(0, 10) : '',
    translations: ad.translations ?? {},
  };
}

function toInput(draft: Draft): AdInput {
  return {
    placement: 'home_hero',
    title: draft.title,
    subtitle: draft.subtitle,
    badge: draft.badge,
    ctaLabel: draft.ctaLabel,
    theme: draft.theme,
    icon: draft.icon,
    imageUrl: draft.imageUrl.trim() || null,
    targetType: draft.targetType,
    targetValue: draft.targetValue,
    status: draft.status,
    priority: draft.priority,
    // The end of the chosen day, in the admin's own time zone.
    endsAt: draft.endsOn ? new Date(`${draft.endsOn}T23:59:59`).toISOString() : null,
    translations: draft.translations,
  };
}

/** Resizes and re-encodes in the browser: an ad banner never needs the 5 MB original. */
async function toWebp(file: File, maxWidth = 1600, maxHeight = 900): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const scale = Math.min(1, maxWidth / bitmap.width, maxHeight / bitmap.height);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not process the image');
  context.imageSmoothingQuality = 'high';
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not process the image'))), 'image/webp', 0.85);
  });
}

function ImagePicker({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const webp = await toWebp(file);
      onChange(await uploadAdImage(webp, file.name.replace(/\.[^.]+$/, '.webp')));
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Could not upload the image');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-(--radius-card) border border-border-subtle p-3">
      <div className="flex flex-wrap items-center gap-3">
        {value ? (
          <img src={value} alt="" className="h-16 w-28 rounded-(--radius-field) object-cover" />
        ) : (
          <div className="flex h-16 w-28 items-center justify-center rounded-(--radius-field) bg-surface-sunken text-xs text-text-muted">
            No image
          </div>
        )}
        <div className="min-w-0 flex-1">
          <span className="block text-xs font-semibold text-text-secondary">Advertisement image (optional)</span>
          <span className="block text-[0.6875rem] text-text-muted">
            A wide banner works best (1600&times;900). It is resized and saved as WebP. Without an image the slide
            shows its colour and icon.
          </span>
        </div>
        <div className="flex items-center gap-2">
          <label className="inline-flex h-9 cursor-pointer items-center rounded-(--radius-field) border border-border-subtle px-3 text-sm font-semibold text-text-primary hover:bg-surface-sunken">
            {busy ? 'Uploading…' : value ? 'Replace' : 'Upload image'}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              disabled={busy}
              onChange={(event) => void pick(event.target.files?.[0])}
            />
          </label>
          {value ? (
            <Button type="button" size="sm" variant="ghost" onClick={() => onChange('')}>
              Remove
            </Button>
          ) : null}
        </div>
      </div>
      {error ? <p className="mt-2 text-xs text-(--color-danger)">{error}</p> : null}
    </div>
  );
}

export function Promotions() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Draft | null>(null);

  const ads = useQuery({ queryKey: ['admin-ads'], queryFn: api.ads });

  const remove = useMutation({
    mutationFn: (id: string) => api.deleteAd(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['admin-ads'] }),
  });

  const items = ads.data ?? [];

  return (
    <>
      <PageHeader
        title="Advertisements"
        description="Slides in the home page carousel, on the website and in the Android app."
        action={
          <Button icon="plus" onClick={() => setEditing({ ...EMPTY })}>
            New advertisement
          </Button>
        }
      />

      <MutationError error={remove.error} />

      {ads.isError ? (
        <Card>
          <ErrorState message="Could not load advertisements" onRetry={() => void ads.refetch()} />
        </Card>
      ) : ads.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-44" />)}
        </div>
      ) : items.length === 0 ? (
        <Card>
          <EmptyState title="No advertisements yet" body="Post one and it appears in the home carousel straight away." />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((ad) => (
            <Card key={ad.id} className="overflow-hidden">
              <SlidePreview theme={ad.theme} badge={ad.badge} title={ad.title} subtitle={ad.subtitle} cta={ad.ctaLabel} />
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 p-4 text-xs text-text-muted">
                <StatusPill status={ad.status} />
                <span>Order {ad.priority}</span>
                <span>{ad.clicks} clicks</span>
                {ad.endsAt ? <span>Ends {formatDate(ad.endsAt)}</span> : <span>No end date</span>}
                {ad.link ? <span className="truncate font-mono">{ad.link}</span> : <span>Not a link</span>}
                <div className="ml-auto flex gap-1.5">
                  <Button size="sm" variant="secondary" icon="edit" onClick={() => setEditing(toDraft(ad))}>
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    icon="trash"
                    loading={remove.isPending && remove.variables === ad.id}
                    onClick={() => {
                      if (window.confirm(`Delete "${ad.title}"? It disappears from the carousel.`)) remove.mutate(ad.id);
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {editing ? <Editor initial={editing} onClose={() => setEditing(null)} /> : null}
    </>
  );
}

function SlidePreview({
  theme, badge, title, subtitle, cta,
}: { theme: AdTheme; badge: string | null; title: string; subtitle: string | null; cta: string | null }) {
  const background = THEMES.find((item) => item.value === theme)?.background ?? THEMES[0]!.background;
  return (
    <div className="relative px-5 py-6 text-white" style={{ background }}>
      {badge ? (
        <span className="inline-block -rotate-2 rounded-md bg-[#e9bb63] px-2 py-0.5 text-[0.6875rem] font-extrabold uppercase text-[#1a1713]">
          {badge}
        </span>
      ) : null}
      <p className="mt-2 text-lg font-extrabold leading-tight">{title || 'Slide title'}</p>
      {subtitle ? <p className="mt-1 line-clamp-2 text-xs text-white/80">{subtitle}</p> : null}
      {cta ? (
        <span className="mt-3 inline-block rounded-md bg-[#b8531a] px-3 py-1.5 text-xs font-semibold">{cta}</span>
      ) : null}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-text-secondary">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-[0.6875rem] text-text-muted">{hint}</span> : null}
    </label>
  );
}

const inputClass =
  'w-full rounded-(--radius-field) border border-border-subtle bg-surface-raised px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25';

function Editor({ initial, onClose }: { initial: Draft; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Draft>(initial);
  const [language, setLanguage] = useState<string | null>(null);
  const categories = useQuery({ queryKey: ['admin-category-options'], queryFn: api.categories, staleTime: 5 * 60_000 });

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const setCopy = (lang: string, key: string, value: string) =>
    setDraft((current) => ({
      ...current,
      translations: { ...current.translations, [lang]: { ...(current.translations[lang] ?? {}), [key]: value } },
    }));

  const save = useMutation({
    mutationFn: () => (draft.id ? api.updateAd(draft.id, toInput(draft)) : api.createAd(toInput(draft))),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-ads'] });
      onClose();
    },
  });

  const target = TARGETS.find((item) => item.value === draft.targetType) ?? TARGETS[0];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink-950/50 p-4" role="dialog" aria-modal="true" aria-label="Edit advertisement">
      <Card className="my-6 w-full max-w-2xl">
        <div className="flex items-center justify-between border-b border-border-subtle px-5 py-3">
          <h2 className="text-base font-bold text-text-primary">{draft.id ? 'Edit advertisement' : 'New advertisement'}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-(--radius-field) p-1.5 text-text-muted hover:bg-surface-sunken">
            <Icon name="close" size={18} />
          </button>
        </div>

        <SlidePreview theme={draft.theme} badge={draft.badge || null} title={draft.title} subtitle={draft.subtitle || null} cta={draft.ctaLabel || null} />

        <form
          className="space-y-4 p-5"
          onSubmit={(event) => {
            event.preventDefault();
            save.mutate();
          }}
        >
          <MutationError error={save.error} />

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Title">
              <input className={inputClass} value={draft.title} maxLength={80} required onChange={(e) => set('title', e.target.value)} placeholder="Mega Electronics Deals" />
            </Field>
            <Field label="Badge" hint="Short sticker text. Leave empty for none.">
              <input className={inputClass} value={draft.badge} maxLength={24} onChange={(e) => set('badge', e.target.value)} placeholder="UP TO 60% OFF" />
            </Field>
          </div>

          <Field label="Subtitle">
            <textarea className={inputClass} rows={2} value={draft.subtitle} maxLength={200} onChange={(e) => set('subtitle', e.target.value)} />
          </Field>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Button text">
              <input className={inputClass} value={draft.ctaLabel} maxLength={40} onChange={(e) => set('ctaLabel', e.target.value)} placeholder="Shop now" />
            </Field>
            <Field label="Colour">
              <select className={inputClass} value={draft.theme} onChange={(e) => set('theme', e.target.value as AdTheme)}>
                {THEMES.map((theme) => <option key={theme.value} value={theme.value}>{theme.label}</option>)}
              </select>
            </Field>
            <Field label="Icon">
              <select className={inputClass} value={draft.icon} onChange={(e) => set('icon', e.target.value)}>
                {ICONS.map((icon) => <option key={icon.value} value={icon.value}>{icon.label}</option>)}
              </select>
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Opens">
              <select
                className={inputClass}
                value={draft.targetType}
                onChange={(e) => {
                  set('targetType', e.target.value as AdInput['targetType']);
                  set('targetValue', '');
                }}
              >
                {TARGETS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </Field>
            <Field label="Where" hint={target.hint}>
              {draft.targetType === 'category' ? (
                <select className={inputClass} value={draft.targetValue} required onChange={(e) => set('targetValue', e.target.value)}>
                  <option value="">Choose a category</option>
                  {(categories.data ?? []).map((category) => (
                    <option key={category.id} value={category.slug}>{category.name}</option>
                  ))}
                </select>
              ) : (
                <input
                  className={inputClass}
                  value={draft.targetValue}
                  onChange={(e) => set('targetValue', e.target.value)}
                  placeholder={draft.targetType === 'url' ? '/sell' : draft.targetType === 'product' ? '100013' : 'iphone'}
                />
              )}
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Status">
              <select className={inputClass} value={draft.status} onChange={(e) => set('status', e.target.value as AdInput['status'])}>
                <option value="running">Showing</option>
                <option value="paused">Paused</option>
                <option value="draft">Draft</option>
              </select>
            </Field>
            <Field label="Order" hint="Higher shows first.">
              <input className={inputClass} type="number" min={0} max={1000} value={draft.priority} onChange={(e) => set('priority', Number(e.target.value))} />
            </Field>
            <Field label="Ends on" hint="Leave empty to keep it running.">
              <input className={inputClass} type="date" value={draft.endsOn} onChange={(e) => set('endsOn', e.target.value)} />
            </Field>
          </div>

          <ImagePicker value={draft.imageUrl} onChange={(url) => set('imageUrl', url)} />

          <div className="rounded-(--radius-card) border border-border-subtle">
            <div className="flex flex-wrap items-center gap-1.5 border-b border-border-subtle px-3 py-2">
              <span className="mr-1 text-xs font-semibold text-text-secondary">Translations</span>
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => setLanguage(language === lang.code ? null : lang.code)}
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    language === lang.code ? 'bg-brand text-white dark:text-ink-950' : 'bg-surface-sunken text-text-secondary'
                  }`}
                >
                  {lang.label}
                </button>
              ))}
              <span className="text-[0.6875rem] text-text-muted">Empty fields fall back to English.</span>
            </div>
            {language ? (
              <div className="grid gap-3 p-3 sm:grid-cols-2">
                {(['title', 'badge', 'subtitle', 'cta_label'] as const).map((key) => (
                  <Field key={key} label={{ title: 'Title', badge: 'Badge', subtitle: 'Subtitle', cta_label: 'Button text' }[key]}>
                    <input
                      className={inputClass}
                      value={draft.translations[language]?.[key] ?? ''}
                      maxLength={{ title: 80, badge: 24, subtitle: 200, cta_label: 40 }[key]}
                      onChange={(e) => setCopy(language, key, e.target.value)}
                    />
                  </Field>
                ))}
              </div>
            ) : null}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" loading={save.isPending}>{draft.id ? 'Save' : 'Create'}</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
