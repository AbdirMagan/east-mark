import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api, type AdminProduct } from '../lib/api.js';
import {
  Button, Card, EmptyState, ErrorState, Icon, PageHeader, Pagination, Skeleton,
  StatusPill, formatPrice, formatRelative,
} from '../components/ui.js';

const TABS = [
  { value: 'pending_approval', label: 'Awaiting review' },
  { value: 'active', label: 'Live' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'sold', label: 'Sold' },
  { value: '', label: 'All' },
] as const;

export function Listings() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<string>('pending_approval');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [rejecting, setRejecting] = useState<AdminProduct | null>(null);

  const listings = useQuery({
    queryKey: ['admin-products', status, query, page],
    queryFn: () => api.products({ status: status || undefined, q: query || undefined, page, limit: 20 }),
    staleTime: 15_000,
  });

  const moderate = useMutation({
    mutationFn: ({ id, decision, reason }: { id: string; decision: 'approve' | 'reject' | 'suspend' | 'restore'; reason?: string }) =>
      api.moderate(id, decision, reason),
    onSuccess: () => {
      // The queue count in the sidebar comes from stats, so refresh both.
      void queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      void queryClient.invalidateQueries({ queryKey: ['stats'] });
      setRejecting(null);
    },
  });

  const items = listings.data?.data ?? [];
  const meta = listings.data?.meta;

  return (
    <>
      <PageHeader
        title="Listings"
        description="Approve what belongs on the marketplace, reject what does not."
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => { setStatus(tab.value); setPage(1); }}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                status === tab.value
                  ? 'bg-brand text-white dark:text-ink-950'
                  : 'bg-surface-raised text-text-secondary hover:bg-surface-sunken'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <form
          className="relative ml-auto"
          onSubmit={(event) => { event.preventDefault(); setQuery(search.trim()); setPage(1); }}
        >
          <Icon name="search" size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search titles"
            aria-label="Search listings"
            className="h-9 w-56 rounded-[--radius-field] border border-border-subtle bg-surface-raised pl-9 pr-3 text-sm text-text-primary placeholder:text-text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25"
          />
        </form>
      </div>

      <Card>
        {listings.isError ? (
          <ErrorState message="Could not load listings" onRetry={() => void listings.refetch()} />
        ) : listings.isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-16" />)}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            title={status === 'pending_approval' ? 'Nothing waiting for review' : 'No listings here'}
            body={status === 'pending_approval' ? 'The moderation queue is clear.' : undefined}
          />
        ) : (
          <>
            <div className="em-table-scroll">
              <table className="w-full min-w-[46rem] text-sm">
                <thead>
                  <tr className="border-b border-border-subtle text-left text-xs uppercase tracking-wide text-text-muted">
                    <th className="px-4 py-2.5 font-semibold">Listing</th>
                    <th className="px-3 py-2.5 font-semibold">Seller</th>
                    <th className="px-3 py-2.5 font-semibold">Price</th>
                    <th className="px-3 py-2.5 font-semibold">Status</th>
                    <th className="px-3 py-2.5 font-semibold">Posted</th>
                    <th className="px-4 py-2.5 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {items.map((item) => (
                    <tr key={item.id} className="hover:bg-surface-sunken/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {item.thumbnailUrl ? (
                            <img
                              src={item.thumbnailUrl}
                              alt=""
                              width={44}
                              height={44}
                              loading="lazy"
                              className="size-11 shrink-0 rounded-[--radius-field] object-cover"
                            />
                          ) : (
                            <span className="flex size-11 shrink-0 items-center justify-center rounded-[--radius-field] bg-surface-sunken text-text-muted">
                              <Icon name="listings" size={16} />
                            </span>
                          )}
                          <div className="min-w-0">
                            <a
                              href={`http://localhost:5173/product/${item.ref}`}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-1 truncate font-medium text-text-primary hover:text-brand"
                            >
                              {item.title}
                              <Icon name="external" size={12} className="shrink-0 opacity-60" />
                            </a>
                            <p className="text-xs text-text-muted">
                              #{item.ref} · {item.condition.replace('_', ' ')} · {item.imageCount} photo
                              {item.imageCount === 1 ? '' : 's'}
                            </p>
                            {item.rejection_reason ? (
                              <p className="mt-0.5 text-xs text-[--color-danger]">{item.rejection_reason}</p>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-text-secondary">{item.sellerName}</td>
                      <td className="whitespace-nowrap px-3 py-3 font-medium text-text-primary">
                        {formatPrice(item.price, item.currency_code)}
                      </td>
                      <td className="px-3 py-3"><StatusPill status={item.status} /></td>
                      <td className="whitespace-nowrap px-3 py-3 text-xs text-text-muted">
                        {formatRelative(item.published_at ?? item.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1.5">
                          {item.status === 'pending_approval' ? (
                            <>
                              <Button
                                size="sm"
                                variant="success"
                                icon="check"
                                loading={moderate.isPending && moderate.variables?.id === item.id}
                                onClick={() => moderate.mutate({ id: item.id, decision: 'approve' })}
                              >
                                Approve
                              </Button>
                              <Button size="sm" variant="secondary" icon="close" onClick={() => setRejecting(item)}>
                                Reject
                              </Button>
                            </>
                          ) : item.status === 'active' ? (
                            <Button size="sm" variant="secondary" icon="ban" onClick={() => setRejecting(item)}>
                              Suspend
                            </Button>
                          ) : item.status === 'rejected' || item.status === 'suspended' ? (
                            <Button
                              size="sm"
                              variant="secondary"
                              icon="check"
                              loading={moderate.isPending && moderate.variables?.id === item.id}
                              onClick={() => moderate.mutate({ id: item.id, decision: 'restore' })}
                            >
                              Restore
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={meta?.page ?? 1} totalPages={meta?.totalPages ?? 1} onChange={setPage} />
          </>
        )}
      </Card>

      {rejecting ? (
        <ReasonDialog
          product={rejecting}
          pending={moderate.isPending}
          onCancel={() => setRejecting(null)}
          onConfirm={(reason) =>
            moderate.mutate({
              id: rejecting.id,
              decision: rejecting.status === 'active' ? 'suspend' : 'reject',
              reason,
            })
          }
        />
      ) : null}
    </>
  );
}

/**
 * Rejecting without saying why leaves the seller with a dead listing and no
 * idea what to fix, so the reason is required — it is sent to them as a
 * notification and shown on the listing.
 */
function ReasonDialog({
  product, pending, onCancel, onConfirm,
}: {
  product: AdminProduct;
  pending: boolean;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState('');
  const suspending = product.status === 'active';

  const PRESETS = [
    'Photos do not match the item described',
    'Prohibited item',
    'Suspected scam or misleading listing',
    'Duplicate of another listing',
    'Not enough detail to be useful to buyers',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/50 p-4" role="dialog" aria-modal="true">
      <Card className="w-full max-w-md p-5">
        <h2 className="text-base font-bold text-text-primary">
          {suspending ? 'Suspend this listing' : 'Reject this listing'}
        </h2>
        <p className="mt-1 truncate text-sm text-text-secondary">{product.title}</p>

        <div className="mt-4 space-y-1.5">
          {PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setReason(preset)}
              className={`block w-full rounded-[--radius-field] border px-3 py-2 text-left text-sm transition-colors ${
                reason === preset
                  ? 'border-brand bg-brand-subtle text-brand'
                  : 'border-border-subtle text-text-secondary hover:bg-surface-sunken'
              }`}
            >
              {preset}
            </button>
          ))}
        </div>

        <textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          rows={3}
          maxLength={500}
          placeholder="Or write your own. The seller sees this."
          aria-label="Reason"
          className="mt-3 w-full rounded-[--radius-field] border border-border-subtle bg-surface-raised px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25"
        />

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button
            variant="danger"
            loading={pending}
            disabled={reason.trim().length < 3}
            onClick={() => onConfirm(reason.trim())}
          >
            {suspending ? 'Suspend' : 'Reject'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
