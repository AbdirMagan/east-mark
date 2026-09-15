import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { api, auth } from '../lib/api.js';
import { Button, Icon, type IconName } from './ui.js';

const NAV: Array<{ to: string; label: string; icon: IconName }> = [
  { to: '/', label: 'Dashboard', icon: 'dashboard' },
  { to: '/listings', label: 'Listings', icon: 'listings' },
  { to: '/promotions', label: 'Advertisements', icon: 'megaphone' },
  { to: '/users', label: 'Users', icon: 'users' },
  { to: '/reports', label: 'Reports', icon: 'reports' },
  { to: '/verifications', label: 'Verification', icon: 'verified' },
  { to: '/audit', label: 'Audit log', icon: 'audit' },
];

function useTheme() {
  const [theme, setTheme] = useState<'light' | 'dark'>(
    () => (localStorage.getItem('em.admin.theme') as 'light' | 'dark') ?? 'light',
  );

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('em.admin.theme', theme);
  }, [theme]);

  return { theme, toggle: () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')) };
}

export function Layout() {
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { data: me } = useQuery({ queryKey: ['me'], queryFn: api.me, staleTime: 5 * 60_000 });

  // Badge counts on the nav: a moderation queue nobody can see the size of
  // does not get cleared.
  const { data: stats } = useQuery({
    queryKey: ['stats'],
    queryFn: api.stats,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  const badges: Record<string, number> = {
    '/listings': stats?.listings.pending ?? 0,
    '/reports': stats?.moderation.openReports ?? 0,
    '/verifications': stats?.moderation.pendingVerifications ?? 0,
  };

  const signOut = async () => {
    await auth.signOut();
    navigate('/signin', { replace: true });
  };

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-border-subtle bg-surface-raised transition-transform lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-14 items-center gap-2.5 border-b border-border-subtle px-4">
          <img src="/logo-mark.webp" width={32} height={32} alt="" className="size-8 shrink-0 object-contain" />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold leading-tight text-text-primary">East-Market</p>
            <p className="text-[0.6875rem] leading-tight text-text-muted">Admin</p>
          </div>
        </div>

        <nav className="flex-1 space-y-0.5 p-2">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-[--radius-field] px-3 py-2 text-sm font-medium transition-colors ${
                  isActive ? 'bg-brand-subtle text-brand' : 'text-text-secondary hover:bg-surface-sunken'
                }`
              }
            >
              <Icon name={item.icon} size={17} />
              <span className="flex-1">{item.label}</span>
              {badges[item.to] ? (
                <span className="rounded-full bg-[--color-warning] px-1.5 text-[0.625rem] font-bold text-white">
                  {badges[item.to]}
                </span>
              ) : null}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-border-subtle p-3">
          <div className="mb-2 min-w-0 px-1">
            <p className="truncate text-sm font-medium text-text-primary">{me?.fullName ?? '—'}</p>
            <p className="text-[0.6875rem] text-text-muted">{me?.role ?? ''}</p>
          </div>
          <div className="flex gap-1.5">
            <Button variant="ghost" size="sm" onClick={toggle} className="flex-1" aria-label="Toggle theme">
              <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={15} />
            </Button>
            <Button variant="ghost" size="sm" icon="logout" onClick={signOut} className="flex-1">
              Sign out
            </Button>
          </div>
          <a
            href="http://localhost:5173"
            target="_blank"
            rel="noreferrer"
            className="mt-2 flex items-center justify-center gap-1.5 rounded-[--radius-field] px-2 py-1.5 text-xs text-text-muted hover:bg-surface-sunken"
          >
            <Icon name="external" size={13} />
            Open marketplace
          </a>
        </div>
      </aside>

      {sidebarOpen ? (
        <div
          className="fixed inset-0 z-30 bg-ink-950/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center gap-3 border-b border-border-subtle bg-surface-raised px-4 lg:hidden">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
            className="rounded-[--radius-field] p-2 text-text-secondary hover:bg-surface-sunken"
          >
            <Icon name="dashboard" size={18} />
          </button>
          <span className="font-bold text-text-primary">East-Market Admin</span>
        </header>

        <main className="min-w-0 flex-1 p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
