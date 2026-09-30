import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Icon } from '../components/ui/Icon.js';
import {
  Badge,
  Button,
  Checkbox,
  EmptyState,
  ErrorState,
  SelectField,
  Skeleton,
  TextField,
} from '../components/ui/index.js';
import { useSeo } from '../hooks/useSeo.js';
import { useI18n, useT, type TranslationKey } from '../i18n/index.js';
import { endpoints, type MyListing, type UpdateListingInput } from '../lib/api.js';
import { formatDate, formatNumber, formatPrice } from '../lib/format.js';
import { useAuth } from '../store/auth.js';

/** The tabs a seller actually thinks in. "All" first, because most have few. */
const TABS = [
  { value: '', key: 'myListings.all' },
  { value: 'active', key: 'myListings.active' },
  { value: 'pending_approval', key: 'myListings.pending' },
  { value: 'draft', key: 'myListings.drafts' },
  { value: 'sold', key: 'myListings.sold' },
  { value: 'rejected', key: 'myListings.rejected' },
] as const;

const STATUS_TONE: Record<string, 'brand' | 'sun' | 'success' | 'neutral' | 'danger'> = {
  active: 'success',
  pending_approval: 'sun',
  draft: 'neutral',
  sold: 'brand',
  rejected: 'danger',
  expired: 'neutral',
  suspended: 'danger',
};

/**
 * Everything this seller has posted, and the three things they came here to do:
 * change a listing, take it down, or find out why it was rejected.
 *
 * Editing happens in a panel on the row rather than on a separate screen. A
 * seller correcting a price should not lose their place in a list of twenty,
 * and the whole edit is four fields.
 */
export function MyListingsPage() {
  const t = useT();
  const { language } = useI18n();
  const session = useAuth((state) => state.session);
  const queryClient = useQueryClient();

  const [status, setStatus] = useState<string>('');
  const [editing, setEditing] = useState<MyListing | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<MyListing | null>(null);

  useSeo({ title: t('nav.myListings'), path: '/my-listings', noIndex: true });

  const listings = useQuery({
    queryKey: ['my-listings', status],
    queryFn: () => endpoints.myListings({ status: status || undefined, limit: 50 }),
    enabled: Boolean(session),
    staleTime: 30_000,
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['my-listings'] });
    // The public feed shows the same rows, so it is stale too.
    void queryClient.invalidateQueries({ queryKey: ['products'] });
  };

  const changeStatus = useMutation({
    mutationFn: ({ id, next }: { id: string; next: 'draft' | 'pending_approval' | 'active' | 'sold' }) =>
      endpoints.setListingStatus(id, next),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (id: string) => endpoints.deleteListing(id),
    onSuccess: () => {
      setConfirmDelete(null);
      invalidate();
    },
  });

  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateListingInput }) =>
      endpoints.updateListing(id, input),
    onSuccess: () => {
      setEditing(null);
      invalidate();
    },
  });

  if (!session) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-14">
        <EmptyState
          icon="user"
          title={t('myListings.signInTitle')}
          body={t('myListings.signInBody')}
          action={
            <Link
              to="/signin"
              className="inline-flex items-center gap-2 rounded-(--radius-pill) border border-brand bg-brand px-4 py-2 text-sm font-bold text-white"
            >
              {t('nav.signIn')}
            </Link>
          }
        />
      </div>
    );
  }

  const items = listings.data?.data ?? [];

  return (
    <div className="mx-auto max-w-5xl space-y-5 px-4 py-6 lg:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-black text-text-primary">
            {t('nav.myListings')}
          </h1>
          <p className="mt-1 text-sm text-text-secondary">{t('myListings.subtitle')}</p>
        </div>
        <Link
          to="/sell"
          className="inline-flex items-center gap-2 rounded-(--radius-pill) border border-brand bg-brand px-4 py-2 text-sm font-bold text-white transition-transform active:scale-[0.97]"
        >
          <Icon name="plus" size={16} />
          {t('nav.sell')}
        </Link>
      </div>

      <div className="em-scroll-x flex gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setStatus(tab.value)}
            aria-pressed={status === tab.value}
            className={`shrink-0 rounded-(--radius-pill) border px-3.5 py-2 text-sm font-semibold transition-colors ${
              status === tab.value
                ? 'border-brand bg-brand text-white'
                : 'border-border-subtle bg-surface-raised text-text-secondary hover:border-brand hover:text-brand'
            }`}
          >
            {t(tab.key as TranslationKey)}
          </button>
        ))}
      </div>

      {listings.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-28 rounded-(--radius-card)" />
          ))}
        </div>
      ) : listings.isError ? (
        <ErrorState
          title={t('error.generic')}
          body={t('error.genericBody')}
          onRetry={() => void listings.refetch()}
        />
      ) : items.length === 0 ? (
        <EmptyState
          icon="package"
          title={t('myListings.emptyTitle')}
          body={t('myListings.emptyBody')}
          action={
            <Link
              to="/sell"
              className="inline-flex items-center gap-2 rounded-(--radius-pill) border border-brand bg-brand px-4 py-2 text-sm font-bold text-white"
            >
              <Icon name="plus" size={16} />
              {t('nav.sell')}
            </Link>
          }
        />
      ) : (
        <ul className="space-y-3">
          {items.map((listing) => (
            <li key={listing.id}>
              <article className="rounded-(--radius-card) border border-border-subtle bg-surface-raised p-3">
                <div className="flex gap-3">
                  <Link
                    to={`/product/${listing.ref}`}
                    className="relative size-24 shrink-0 overflow-hidden rounded-(--radius-field) bg-surface-sunken"
                  >
                    {listing.thumbnailUrl ? (
                      <img
                        src={listing.thumbnailUrl}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="size-full object-cover"
                      />
                    ) : (
                      <span className="flex size-full items-center justify-center text-text-muted">
                        <Icon name="image" size={20} />
                      </span>
                    )}
                    {listing.hasVideo ? (
                      <span className="absolute bottom-1 left-1 inline-flex items-center gap-1 rounded-(--radius-pill) bg-ink-900/75 px-1.5 py-0.5 text-[0.625rem] font-bold text-white">
                        <Icon name="play" size={9} />
                        {t('product.videoBadge')}
                      </span>
                    ) : null}
                  </Link>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={STATUS_TONE[listing.status] ?? 'neutral'}>
                        {t(`status.${listing.status}` as TranslationKey)}
                      </Badge>
                      <span className="text-xs text-text-muted">#{listing.ref}</span>
                      {listing.featured ? (
                        <Badge tone="sun" icon="verified">
                          {t('common.featured')}
                        </Badge>
                      ) : null}
                    </div>

                    <Link
                      to={`/product/${listing.ref}`}
                      className="mt-1 block truncate font-semibold text-text-primary hover:text-brand"
                    >
                      {listing.title}
                    </Link>

                    <p className="font-display text-lg font-black text-text-primary">
                      {formatPrice(listing.price, listing.currency, language)}
                    </p>

                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-text-muted">
                      <span className="inline-flex items-center gap-1">
                        <Icon name="eye" size={12} />
                        {formatNumber(listing.viewCount, language)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Icon name="heart" size={12} />
                        {formatNumber(listing.favoriteCount, language)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Icon name="message" size={12} />
                        {formatNumber(listing.messageCount, language)}
                      </span>
                      <span>{formatDate(listing.createdAt, language)}</span>
                    </div>

                    {listing.status === 'rejected' && listing.rejectionReason ? (
                      <p className="mt-2 flex items-start gap-1.5 rounded-(--radius-field) bg-(--color-danger)/10 px-2.5 py-1.5 text-xs text-(--color-danger)">
                        <Icon name="alert" size={13} className="mt-px shrink-0" />
                        {listing.rejectionReason}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2 border-t border-border-subtle pt-3">
                  <Button
                    size="sm"
                    variant="secondary"
                    icon="sliders"
                    onClick={() => setEditing(editing?.id === listing.id ? null : listing)}
                  >
                    {t('myListings.edit')}
                  </Button>

                  {listing.status === 'draft' || listing.status === 'rejected' ? (
                    <Button
                      size="sm"
                      icon="arrow-right"
                      loading={
                        changeStatus.isPending && changeStatus.variables?.id === listing.id
                      }
                      onClick={() =>
                        changeStatus.mutate({ id: listing.id, next: 'pending_approval' })
                      }
                    >
                      {t('myListings.submit')}
                    </Button>
                  ) : null}

                  {listing.status === 'active' ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      icon="check"
                      loading={
                        changeStatus.isPending && changeStatus.variables?.id === listing.id
                      }
                      onClick={() => changeStatus.mutate({ id: listing.id, next: 'sold' })}
                    >
                      {t('myListings.markSold')}
                    </Button>
                  ) : null}

                  {listing.status === 'sold' ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      icon="refresh"
                      loading={
                        changeStatus.isPending && changeStatus.variables?.id === listing.id
                      }
                      onClick={() =>
                        changeStatus.mutate({ id: listing.id, next: 'pending_approval' })
                      }
                    >
                      {t('myListings.relist')}
                    </Button>
                  ) : null}

                  <Button
                    size="sm"
                    variant="ghost"
                    icon="close"
                    className="ml-auto text-(--color-danger)"
                    onClick={() => setConfirmDelete(listing)}
                  >
                    {t('myListings.delete')}
                  </Button>
                </div>

                {editing?.id === listing.id ? (
                  <EditPanel
                    listing={listing}
                    pending={update.isPending}
                    error={update.isError ? t('error.genericBody') : null}
                    onCancel={() => setEditing(null)}
                    onSave={(input) => update.mutate({ id: listing.id, input })}
                  />
                ) : null}
              </article>
            </li>
          ))}
        </ul>
      )}

      {confirmDelete ? (
        <ConfirmDelete
          listing={confirmDelete}
          pending={remove.isPending}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => remove.mutate(confirmDelete.id)}
        />
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

const CONDITIONS = ['new', 'like_new', 'used', 'refurbished'] as const;
const CURRENCIES = ['USD', 'SLSH', 'SOS', 'ETB', 'KES', 'DJF'] as const;

function EditPanel({
  listing,
  pending,
  error,
  onCancel,
  onSave,
}: {
  listing: MyListing;
  pending: boolean;
  error: string | null;
  onCancel: () => void;
  onSave: (input: UpdateListingInput) => void;
}) {
  const t = useT();
  const [title, setTitle] = useState(listing.title);
  const [description, setDescription] = useState(listing.description ?? '');
  const [price, setPrice] = useState(String(listing.price));
  const [currency, setCurrency] = useState(listing.currency);
  const [condition, setCondition] = useState(listing.condition);
  const [quantity, setQuantity] = useState(String(listing.quantity || 1));
  const [negotiable, setNegotiable] = useState(listing.negotiable);
  const [delivery, setDelivery] = useState(listing.deliveryAvailable);

  const priceValue = Number(price);
  const canSave = title.trim().length >= 3 && Number.isFinite(priceValue) && priceValue > 0;

  return (
    <form
      className="mt-3 space-y-3 rounded-(--radius-field) border border-border-subtle bg-surface-sunken p-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (!canSave) return;
        // Only what changed: a PATCH that resends every field would overwrite
        // anything edited elsewhere in the meantime.
        const input: UpdateListingInput = {};
        if (title.trim() !== listing.title) input.title = title.trim();
        if (description.trim() !== (listing.description ?? '')) {
          input.description = description.trim() || null;
        }
        if (priceValue !== listing.price) input.price = priceValue;
        if (currency !== listing.currency) input.currency = currency;
        if (condition !== listing.condition) input.condition = condition;
        if (Number(quantity) !== listing.quantity) input.quantity = Number(quantity) || 1;
        if (negotiable !== listing.negotiable) input.negotiable = negotiable;
        if (delivery !== listing.deliveryAvailable) input.deliveryAvailable = delivery;
        onSave(input);
      }}
    >
      <TextField
        label={t('sell.titleLabel')}
        value={title}
        maxLength={120}
        onChange={(event) => setTitle(event.target.value)}
      />

      <div className="space-y-1.5">
        <label
          htmlFor={`description-${listing.id}`}
          className="block text-sm font-medium text-text-secondary"
        >
          {t('sell.descriptionLabel')}
        </label>
        <textarea
          id={`description-${listing.id}`}
          value={description}
          rows={3}
          maxLength={5000}
          onChange={(event) => setDescription(event.target.value)}
          className="w-full rounded-(--radius-field) border border-border-subtle bg-surface-raised px-3 py-2 text-text-primary transition-colors focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <TextField
          label={t('sell.priceLabel')}
          type="number"
          min={0}
          step="0.01"
          value={price}
          onChange={(event) => setPrice(event.target.value)}
        />
        <SelectField
          label={t('common.currency')}
          value={currency}
          onChange={(event) => setCurrency(event.target.value)}
        >
          {CURRENCIES.map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </SelectField>
        <SelectField
          label={t('sell.conditionLabel')}
          value={condition}
          onChange={(event) => setCondition(event.target.value)}
        >
          {CONDITIONS.map((value) => (
            <option key={value} value={value}>
              {t(`condition.${value}` as TranslationKey)}
            </option>
          ))}
        </SelectField>
        <TextField
          label={t('myListings.quantity')}
          type="number"
          min={1}
          value={quantity}
          onChange={(event) => setQuantity(event.target.value)}
        />
      </div>

      <div className="flex flex-wrap gap-4">
        <Checkbox label={t('sell.negotiableLabel')} checked={negotiable} onChange={setNegotiable} />
        <Checkbox label={t('sell.deliveryLabel')} checked={delivery} onChange={setDelivery} />
      </div>

      <p className="text-xs text-text-muted">{t('myListings.editHint')}</p>

      {error ? (
        <p role="alert" className="text-sm text-(--color-danger)">
          {error}
        </p>
      ) : null}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" size="sm" loading={pending} disabled={!canSave}>
          {t('myListings.save')}
        </Button>
      </div>
    </form>
  );
}

function ConfirmDelete({
  listing,
  pending,
  onCancel,
  onConfirm,
}: {
  listing: MyListing;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const t = useT();
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/60 p-4 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-(--radius-card) border border-border-subtle bg-surface-raised p-5 shadow-(--shadow-raised)"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="font-display text-lg font-bold text-text-primary">
          {t('myListings.deleteTitle')}
        </h2>
        <p className="mt-1 truncate text-sm text-text-secondary">{listing.title}</p>
        <p className="mt-2 text-sm text-text-secondary">{t('myListings.deleteBody')}</p>

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            {t('common.cancel')}
          </Button>
          <Button variant="danger" size="sm" loading={pending} onClick={onConfirm}>
            {t('myListings.delete')}
          </Button>
        </div>
      </div>
    </div>
  );
}
