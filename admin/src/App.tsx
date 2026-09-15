import { useEffect, useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { Layout } from './components/Layout.js';
import { Spinner } from './components/ui.js';
import { ApiError, api, auth } from './lib/api.js';
import { Dashboard } from './pages/Dashboard.js';
import { Listings } from './pages/Listings.js';
import { Promotions } from './pages/Promotions.js';
import { Audit, Reports, Verifications } from './pages/Queues.js';
import { SignIn } from './pages/SignIn.js';
import { Users } from './pages/Users.js';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // A 403 means this account is not staff; retrying cannot change that.
      retry: (failureCount, error) =>
        error instanceof ApiError && error.status < 500 ? false : failureCount < 2,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
});

/**
 * Authenticating is not the same as being staff.
 *
 * This runs the role check BEFORE the dashboard mounts. Doing it inside the
 * sign-in form instead meant the session flipped first, the dashboard mounted
 * and fired admin requests that 403'd, and then signing the user back out
 * unmounted the form — taking its error message with it. A rejected seller saw
 * a blank sign-in page and no explanation.
 */
function StaffGate({ children, onRefuse }: { children: ReactNode; onRefuse: (reason: string) => void }) {
  const { data, isLoading, isError, error } = useQuery({ queryKey: ['me'], queryFn: api.me, retry: false });
  const isStaff = data?.role === 'admin' || data?.role === 'moderator';

  useEffect(() => {
    if (data && !isStaff) {
      void auth.signOut().then(() => onRefuse('That account does not have staff access.'));
    } else if (isError) {
      void auth.signOut().then(() =>
        onRefuse(error instanceof ApiError ? error.message : 'Could not verify your account.'),
      );
    }
  }, [data, isStaff, isError, error, onRefuse]);

  if (isLoading || !isStaff) {
    return (
      <div className="flex min-h-screen items-center justify-center text-text-muted">
        <Spinner size={26} />
      </div>
    );
  }
  return <>{children}</>;
}

export function App() {
  const [session, setSession] = useState<unknown>(null);
  const [checking, setChecking] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let currentUserId: string | null = null;

    void auth.getSession().then(({ data }) => {
      currentUserId = data.session?.user.id ?? null;
      setSession(data.session);
      setChecking(false);
    });

    const { data } = auth.onAuthStateChange((_event, next) => {
      const nextUserId = next?.user.id ?? null;

      // Clear the cache whenever the account changes, including on sign-out.
      // Without this the next person to sign in inherits the previous one's
      // cached ['me'] — so StaffGate reads the wrong role and either bounces a
      // legitimate admin or, worse, waves through whoever came after a staff
      // session. Token refreshes keep the same id and are left alone.
      if (nextUserId !== currentUserId) {
        queryClient.clear();
        currentUserId = nextUserId;
      }

      setSession(next);
    });

    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem('em.admin.theme');
    document.documentElement.classList.toggle('dark', stored === 'dark');
  }, []);

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center text-text-muted">
        <Spinner size={26} />
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {session ? (
          <StaffGate onRefuse={setNotice}>
            <Routes>
              <Route element={<Layout />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/listings" element={<Listings />} />
                <Route path="/promotions" element={<Promotions />} />
                <Route path="/users" element={<Users />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/verifications" element={<Verifications />} />
                <Route path="/audit" element={<Audit />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </StaffGate>
        ) : (
          <SignIn
            notice={notice}
            onSignedIn={() => {
              setNotice(null);
              void auth.getSession().then(({ data }) => setSession(data.session));
            }}
          />
        )}
      </BrowserRouter>
    </QueryClientProvider>
  );
}
