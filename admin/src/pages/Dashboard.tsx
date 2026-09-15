import { useQuery } from '@tanstack/react-query';
import {
  Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from 'recharts';

import { api } from '../lib/api.js';
import { Link } from 'react-router-dom';

import { Button, Card, ErrorState, PageHeader, Skeleton, formatPrice } from '../components/ui.js';

/**
 * Chart colours come from the brand ramps rather than Recharts' defaults, and
 * are ordered so adjacent bars stay distinguishable in greyscale and for the
 * most common forms of colour blindness.
 */
const SERIES = ['#1e6f5c', '#b8531a', '#2b4c7e', '#d4913f', '#449a82', '#9c4516', '#7f9ccc', '#67421b'];

export function Dashboard() {
  const stats = useQuery({ queryKey: ['stats'], queryFn: api.stats, staleTime: 60_000 });
  const analytics = useQuery({ queryKey: ['analytics'], queryFn: api.analytics, staleTime: 60_000 });

  if (stats.isError) {
    return <ErrorState message="Could not load the dashboard" onRetry={() => void stats.refetch()} />;
  }

  const s = stats.data;

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Marketplace health at a glance."
        action={
          <Link to="/promotions">
            <Button icon="megaphone">Post an advertisement</Button>
          </Link>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Users"
          value={s?.users.total}
          hint={s ? `${s.users.sellers} sellers · ${s.users.newThisWeek} new this week` : undefined}
          loading={stats.isLoading}
        />
        <Stat
          label="Live listings"
          value={s?.listings.active}
          hint={s ? `${s.listings.total} total · ${s.listings.newThisWeek} new this week` : undefined}
          loading={stats.isLoading}
        />
        <Stat
          label="Awaiting review"
          value={s?.listings.pending}
          hint={s?.listings.pending ? 'Needs your attention' : 'Queue is clear'}
          tone={s?.listings.pending ? 'warning' : 'default'}
          loading={stats.isLoading}
        />
        <Stat
          label="Open reports"
          value={s?.moderation.openReports}
          hint={s ? `${s.moderation.pendingVerifications} verifications pending` : undefined}
          tone={s?.moderation.openReports ? 'danger' : 'default'}
          loading={stats.isLoading}
        />
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Sold" value={s?.listings.sold} loading={stats.isLoading} small />
        <Stat label="Rejected" value={s?.listings.rejected} loading={stats.isLoading} small />
        <Stat label="Featured active" value={s?.commerce.featuredActive} loading={stats.isLoading} small />
        <Stat
          label="Revenue"
          value={s ? formatPrice(s.commerce.revenue, s.commerce.currency) : undefined}
          hint="Payments are not wired up yet"
          loading={stats.isLoading}
          small
        />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <ChartCard title="Listings posted" subtitle="Last 30 days">
          {analytics.isLoading ? (
            <Skeleton className="h-56" />
          ) : (
            <ResponsiveContainer width="100%" height={224}>
              <LineChart data={analytics.data?.listingsOverTime ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                  tickFormatter={(value: string) => value.slice(5)}
                  interval="preserveStartEnd"
                  minTickGap={24}
                  stroke="var(--border-strong)"
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                  stroke="var(--border-strong)"
                  width={28}
                />
                <Tooltip content={<ChartTooltip />} />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={SERIES[0]}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Listings by country">
          {analytics.isLoading ? (
            <Skeleton className="h-56" />
          ) : (
            <ResponsiveContainer width="100%" height={224}>
              <BarChart data={analytics.data?.listingsByCountry ?? []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} stroke="var(--border-strong)" />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={92}
                  tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                  stroke="var(--border-strong)"
                />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--surface-sunken)' }} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {(analytics.data?.listingsByCountry ?? []).map((_, index) => (
                    <Cell key={index} fill={SERIES[index % SERIES.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Top categories">
          {analytics.isLoading ? (
            <Skeleton className="h-56" />
          ) : (
            <ResponsiveContainer width="100%" height={224}>
              <BarChart data={analytics.data?.topCategories ?? []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} stroke="var(--border-strong)" />
                <YAxis type="category" dataKey="label" width={112} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} stroke="var(--border-strong)" />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--surface-sunken)' }} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {(analytics.data?.topCategories ?? []).map((_, index) => (
                    <Cell key={index} fill={SERIES[(index + 2) % SERIES.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Most viewed listings">
          {analytics.isLoading ? (
            <Skeleton className="h-56" />
          ) : (analytics.data?.mostViewed.length ?? 0) === 0 ? (
            <p className="py-16 text-center text-sm text-text-muted">No views recorded yet</p>
          ) : (
            <ul className="divide-y divide-border-subtle">
              {analytics.data?.mostViewed.map((item) => (
                <li key={item.id} className="flex items-center gap-3 py-2">
                  <span className="w-12 shrink-0 font-mono text-xs text-text-muted">#{item.ref}</span>
                  <span className="min-w-0 flex-1 truncate text-sm text-text-primary">{item.title}</span>
                  <span className="shrink-0 text-xs font-semibold text-text-secondary">{item.views} views</span>
                </li>
              ))}
            </ul>
          )}
        </ChartCard>
      </div>
    </>
  );
}

function Stat({
  label, value, hint, loading, tone = 'default', small = false,
}: {
  label: string;
  value: number | string | undefined;
  hint?: string;
  loading?: boolean;
  tone?: 'default' | 'warning' | 'danger';
  small?: boolean;
}) {
  const accent =
    tone === 'warning' ? 'text-(--color-warning)' : tone === 'danger' ? 'text-(--color-danger)' : 'text-text-primary';

  return (
    <Card className="p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-text-muted">{label}</p>
      {loading ? (
        <Skeleton className={`mt-2 ${small ? 'h-6 w-16' : 'h-8 w-20'}`} />
      ) : (
        <p className={`mt-1 font-bold tracking-tight ${small ? 'text-xl' : 'text-2xl'} ${accent}`}>
          {value ?? '—'}
        </p>
      )}
      {hint ? <p className="mt-1 text-xs text-text-muted">{hint}</p> : null}
    </Card>
  );
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <Card className="p-4">
      <div className="mb-3">
        <h2 className="text-sm font-bold text-text-primary">{title}</h2>
        {subtitle ? <p className="text-xs text-text-muted">{subtitle}</p> : null}
      </div>
      {children}
    </Card>
  );
}

/** Recharts' default tooltip ignores the theme, so this one uses the tokens. */
function ChartTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-(--radius-field) border border-border-subtle bg-surface-raised px-2.5 py-1.5 text-xs shadow-lg">
      <p className="font-medium text-text-primary">{label}</p>
      <p className="text-text-secondary">{payload[0]?.value} listings</p>
    </div>
  );
}
