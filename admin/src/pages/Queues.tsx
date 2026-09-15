import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '../lib/api.js';
import {
  Button, Card, EmptyState, ErrorState, MutationError, PageHeader, Pagination, Skeleton,
  StatusPill, formatRelative,
} from '../components/ui.js';

/* -------------------------------------------------------------------------- */
/* Reports                                                                    */
/* -------------------------------------------------------------------------- */

const REPORT_TABS = [
  { value: 'open', label: 'Open' },
  { value: 'under_review', label: 'Under review' },
  { value: 'actioned', label: 'Actioned' },
  { value: 'dismissed', label: 'Dismissed' },
  { value: '', label: 'All' },
] as const;

export function Reports() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<string>('open');
  const [page, setPage] = useState(1);
  const [note, setNote] = useState<Record<string, string>>({});

  const reports = useQuery({
    queryKey: ['admin-reports', status, page],
    queryFn: () => api.reports({ status: status || undefined, page, limit: 20 }),
    staleTime: 15_000,
  });

  const resolve = useMutation({
    mutationFn: ({ id, body }: { id: string; body: { status: string; resolutionNote?: string } }) =>
      api.resolveReport(id, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-reports'] });
      void queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });

  const items = reports.data?.data ?? [];
  const meta = reports.data?.meta;

  return (
    <>
      <PageHeader title="Reports" description="What users have flagged for review." />

      <Tabs tabs={REPORT_TABS} value={status} onChange={(value) => { setStatus(value); setPage(1); }} />

      <MutationError error={resolve.error} />

      <Card>
        {reports.isError ? (
          <ErrorState message="Could not load reports" onRetry={() => void reports.refetch()} />
        ) : reports.isLoading ? (
          <div className="space-y-2 p-4">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-24" />)}</div>
        ) : items.length === 0 ? (
          <EmptyState
            title={status === 'open' ? 'No open reports' : 'Nothing here'}
            body={status === 'open' ? 'Nothing has been flagged.' : undefined}
          />
        ) : (
          <>
            <ul className="divide-y divide-border-subtle">
              {items.map((report) => (
                <li key={report.id} className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold capitalize text-text-primary">
                          {report.reason.replace(/_/g, ' ')}
                        </span>
                        <StatusPill status={report.status} />
                        <span className="text-xs text-text-muted">
                          {report.target_type} · {formatRelative(report.created_at)}
                        </span>
                      </div>
                      {report.details ? (
                        <p className="mt-1.5 max-w-2xl text-sm text-text-secondary">{report.details}</p>
                      ) : null}
                      <p className="mt-1 font-mono text-xs text-text-muted">{report.target_id}</p>
                      {report.resolution_note ? (
                        <p className="mt-1.5 text-xs text-text-muted">Note: {report.resolution_note}</p>
                      ) : null}
                    </div>
                  </div>

                  {report.status === 'open' || report.status === 'under_review' ? (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <input
                        value={note[report.id] ?? ''}
                        onChange={(event) => setNote((n) => ({ ...n, [report.id]: event.target.value }))}
                        placeholder="What did you decide? (optional)"
                        aria-label="Resolution note"
                        className="h-9 min-w-0 flex-1 rounded-(--radius-field) border border-border-subtle bg-surface-raised px-3 text-sm text-text-primary placeholder:text-text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25"
                      />
                      <Button
                        size="sm"
                        variant="success"
                        icon="check"
                        loading={resolve.isPending && resolve.variables?.id === report.id}
                        onClick={() => resolve.mutate({ id: report.id, body: { status: 'actioned', resolutionNote: note[report.id] } })}
                      >
                        Actioned
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        icon="close"
                        onClick={() => resolve.mutate({ id: report.id, body: { status: 'dismissed', resolutionNote: note[report.id] } })}
                      >
                        Dismiss
                      </Button>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
            <Pagination page={meta?.page ?? 1} totalPages={meta?.totalPages ?? 1} onChange={setPage} />
          </>
        )}
      </Card>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Verification                                                               */
/* -------------------------------------------------------------------------- */

const VERIFICATION_TABS = [
  { value: 'pending', label: 'Pending' },
  { value: 'verified', label: 'Verified' },
  { value: 'rejected', label: 'Rejected' },
  { value: '', label: 'All' },
] as const;

export function Verifications() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<string>('pending');
  const [page, setPage] = useState(1);
  const [note, setNote] = useState<Record<string, string>>({});

  const requests = useQuery({
    queryKey: ['admin-verifications', status, page],
    queryFn: () => api.verifications({ status: status || undefined, page, limit: 20 }),
    staleTime: 15_000,
  });

  const decide = useMutation({
    mutationFn: ({ id, body }: { id: string; body: { status: 'verified' | 'rejected'; reviewNote?: string } }) =>
      api.decideVerification(id, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-verifications'] });
      void queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });

  const items = requests.data?.data ?? [];
  const meta = requests.data?.meta;

  return (
    <>
      <PageHeader
        title="Verification"
        description="Approving a request marks the seller verified across the marketplace."
      />

      <Tabs tabs={VERIFICATION_TABS} value={status} onChange={(value) => { setStatus(value); setPage(1); }} />

      <MutationError error={decide.error} />

      <Card>
        {requests.isError ? (
          <ErrorState message="Could not load requests" onRetry={() => void requests.refetch()} />
        ) : requests.isLoading ? (
          <div className="space-y-2 p-4">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-20" />)}</div>
        ) : items.length === 0 ? (
          <EmptyState
            title={status === 'pending' ? 'No requests waiting' : 'Nothing here'}
            body={status === 'pending' ? 'Sellers can apply for verification from their profile.' : undefined}
          />
        ) : (
          <>
            <ul className="divide-y divide-border-subtle">
              {items.map((request) => (
                <li key={request.id} className="p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-text-primary">{request.full_name ?? 'Unnamed applicant'}</span>
                    <StatusPill status={request.status} />
                    <span className="text-xs capitalize text-text-muted">
                      {request.kind} · {request.document_type ?? 'no document type'} · {formatRelative(request.created_at)}
                    </span>
                  </div>
                  <p className="mt-1 font-mono text-xs text-text-muted">{request.user_id}</p>
                  {request.review_note ? (
                    <p className="mt-1.5 text-xs text-text-muted">Note: {request.review_note}</p>
                  ) : null}

                  {request.status === 'pending' ? (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <input
                        value={note[request.id] ?? ''}
                        onChange={(event) => setNote((n) => ({ ...n, [request.id]: event.target.value }))}
                        placeholder="Note for the applicant (optional)"
                        aria-label="Review note"
                        className="h-9 min-w-0 flex-1 rounded-(--radius-field) border border-border-subtle bg-surface-raised px-3 text-sm text-text-primary placeholder:text-text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25"
                      />
                      <Button
                        size="sm"
                        variant="success"
                        icon="check"
                        loading={decide.isPending && decide.variables?.id === request.id}
                        onClick={() => decide.mutate({ id: request.id, body: { status: 'verified', reviewNote: note[request.id] } })}
                      >
                        Verify
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        icon="close"
                        onClick={() => decide.mutate({ id: request.id, body: { status: 'rejected', reviewNote: note[request.id] } })}
                      >
                        Reject
                      </Button>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
            <Pagination page={meta?.page ?? 1} totalPages={meta?.totalPages ?? 1} onChange={setPage} />
          </>
        )}
      </Card>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Audit log                                                                  */
/* -------------------------------------------------------------------------- */

export function Audit() {
  const [page, setPage] = useState(1);
  const entries = useQuery({
    queryKey: ['admin-audit', page],
    queryFn: () => api.audit({ page, limit: 30 }),
    staleTime: 15_000,
  });

  const items = entries.data?.data ?? [];
  const meta = entries.data?.meta;

  return (
    <>
      <PageHeader
        title="Audit log"
        description="Every moderation action, append-only. Staff cannot edit or delete entries."
      />

      <Card>
        {entries.isError ? (
          <ErrorState message="Could not load the audit log" onRetry={() => void entries.refetch()} />
        ) : entries.isLoading ? (
          <div className="space-y-2 p-4">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-10" />)}</div>
        ) : items.length === 0 ? (
          <EmptyState title="Nothing logged yet" body="Moderation actions appear here as they happen." />
        ) : (
          <>
            <div className="em-table-scroll">
              <table className="w-full min-w-[40rem] text-sm">
                <thead>
                  <tr className="border-b border-border-subtle text-left text-xs uppercase tracking-wide text-text-muted">
                    <th className="px-4 py-2.5 font-semibold">Action</th>
                    <th className="px-3 py-2.5 font-semibold">Entity</th>
                    <th className="px-3 py-2.5 font-semibold">Details</th>
                    <th className="px-4 py-2.5 font-semibold">When</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {items.map((entry) => (
                    <tr key={entry.id} className="hover:bg-surface-sunken/50">
                      <td className="whitespace-nowrap px-4 py-2.5 font-medium text-text-primary">{entry.action}</td>
                      <td className="px-3 py-2.5">
                        <span className="text-text-secondary">{entry.entity_type}</span>
                        <span className="ml-1.5 font-mono text-xs text-text-muted">
                          {entry.entity_id?.slice(0, 8) ?? '—'}
                        </span>
                      </td>
                      <td className="max-w-md truncate px-3 py-2.5 font-mono text-xs text-text-muted">
                        {JSON.stringify(entry.payload)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-xs text-text-muted">
                        {formatRelative(entry.created_at)}
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
    </>
  );
}

/* -------------------------------------------------------------------------- */

function Tabs({
  tabs, value, onChange,
}: {
  tabs: ReadonlyArray<{ value: string; label: string }>;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="mb-4 flex flex-wrap gap-1">
      {tabs.map((tab) => (
        <button
          key={tab.value || 'all'}
          type="button"
          onClick={() => onChange(tab.value)}
          className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
            value === tab.value
              ? 'bg-brand text-white dark:text-ink-950'
              : 'bg-surface-raised text-text-secondary hover:bg-surface-sunken'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
