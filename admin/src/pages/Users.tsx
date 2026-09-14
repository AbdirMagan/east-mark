import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api, type AdminUser } from '../lib/api.js';
import {
  Button, Card, EmptyState, ErrorState, Icon, PageHeader, Pagination, Skeleton,
  StatusPill, formatDate, formatRelative,
} from '../components/ui.js';

const ROLES = ['', 'buyer', 'seller', 'business', 'moderator', 'admin'] as const;

export function Users() {
  const queryClient = useQueryClient();
  const [role, setRole] = useState('');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [banning, setBanning] = useState<AdminUser | null>(null);

  const users = useQuery({
    queryKey: ['admin-users', role, query, page],
    queryFn: () => api.users({ role: role || undefined, q: query || undefined, page, limit: 20 }),
    staleTime: 15_000,
  });

  const update = useMutation({
    mutationFn: ({ id, body }: { id: string; body: { role?: string; isBanned?: boolean; banReason?: string } }) =>
      api.updateUser(id, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      void queryClient.invalidateQueries({ queryKey: ['stats'] });
      setBanning(null);
    },
  });

  const items = users.data?.data ?? [];
  const meta = users.data?.meta;

  return (
    <>
      <PageHeader title="Users" description="Accounts, roles and access." />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1">
          {ROLES.map((value) => (
            <button
              key={value || 'all'}
              type="button"
              onClick={() => { setRole(value); setPage(1); }}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${
                role === value ? 'bg-brand text-white dark:text-ink-950' : 'bg-surface-raised text-text-secondary hover:bg-surface-sunken'
              }`}
            >
              {value || 'All'}
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
            placeholder="Search name or username"
            aria-label="Search users"
            className="h-9 w-60 rounded-[--radius-field] border border-border-subtle bg-surface-raised pl-9 pr-3 text-sm text-text-primary placeholder:text-text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25"
          />
        </form>
      </div>

      <Card>
        {users.isError ? (
          <ErrorState message="Could not load users" onRetry={() => void users.refetch()} />
        ) : users.isLoading ? (
          <div className="space-y-2 p-4">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-14" />)}</div>
        ) : items.length === 0 ? (
          <EmptyState title="No users match that" />
        ) : (
          <>
            <div className="em-table-scroll">
              <table className="w-full min-w-[44rem] text-sm">
                <thead>
                  <tr className="border-b border-border-subtle text-left text-xs uppercase tracking-wide text-text-muted">
                    <th className="px-4 py-2.5 font-semibold">User</th>
                    <th className="px-3 py-2.5 font-semibold">Role</th>
                    <th className="px-3 py-2.5 font-semibold">Joined</th>
                    <th className="px-3 py-2.5 font-semibold">Last seen</th>
                    <th className="px-4 py-2.5 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {items.map((user) => (
                    <tr key={user.id} className="hover:bg-surface-sunken/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {user.avatar_url ? (
                            <img src={user.avatar_url} alt="" width={36} height={36} loading="lazy" className="size-9 rounded-full object-cover" />
                          ) : (
                            <span className="flex size-9 items-center justify-center rounded-full bg-brand-subtle text-sm font-bold text-brand">
                              {(user.full_name ?? user.username ?? '?').charAt(0).toUpperCase()}
                            </span>
                          )}
                          <div className="min-w-0">
                            <p className="truncate font-medium text-text-primary">{user.full_name ?? '—'}</p>
                            <p className="truncate text-xs text-text-muted">
                              {user.username ? `@${user.username}` : user.id.slice(0, 8)}
                            </p>
                            {user.is_banned ? (
                              <p className="mt-0.5 text-xs text-[--color-danger]">
                                Suspended{user.ban_reason ? `: ${user.ban_reason}` : ''}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1.5">
                          <StatusPill status={user.role} />
                          {user.is_banned ? <StatusPill status="suspended" /> : null}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-xs text-text-muted">{formatDate(user.created_at)}</td>
                      <td className="whitespace-nowrap px-3 py-3 text-xs text-text-muted">{formatRelative(user.last_seen_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1.5">
                          {user.is_banned ? (
                            <Button
                              size="sm"
                              variant="secondary"
                              icon="check"
                              loading={update.isPending && update.variables?.id === user.id}
                              onClick={() => update.mutate({ id: user.id, body: { isBanned: false } })}
                            >
                              Unsuspend
                            </Button>
                          ) : (
                            <Button size="sm" variant="secondary" icon="ban" onClick={() => setBanning(user)}>
                              Suspend
                            </Button>
                          )}
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

      {banning ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/50 p-4" role="dialog" aria-modal="true">
          <Card className="w-full max-w-md p-5">
            <h2 className="text-base font-bold text-text-primary">Suspend this account</h2>
            <p className="mt-1 text-sm text-text-secondary">
              {banning.full_name ?? banning.username}. Their listings stay up; they cannot sign in or post.
            </p>
            <BanForm
              pending={update.isPending}
              onCancel={() => setBanning(null)}
              onConfirm={(reason) => update.mutate({ id: banning.id, body: { isBanned: true, banReason: reason } })}
            />
          </Card>
        </div>
      ) : null}
    </>
  );
}

function BanForm({
  pending, onCancel, onConfirm,
}: { pending: boolean; onCancel: () => void; onConfirm: (reason: string) => void }) {
  const [reason, setReason] = useState('');
  return (
    <>
      <textarea
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        rows={3}
        maxLength={500}
        placeholder="Why is this account being suspended?"
        aria-label="Suspension reason"
        className="mt-4 w-full rounded-[--radius-field] border border-border-subtle bg-surface-raised px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25"
      />
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button variant="danger" loading={pending} disabled={reason.trim().length < 3} onClick={() => onConfirm(reason.trim())}>
          Suspend
        </Button>
      </div>
    </>
  );
}
