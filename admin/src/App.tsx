import { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { Layout } from './components/Layout.js';
import { Spinner } from './components/ui.js';
import { ApiError, auth } from './lib/api.js';
import { Dashboard } from './pages/Dashboard.js';
import { Listings } from './pages/Listings.js';
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

export function App() {
  const [session, setSession] = useState<unknown>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    void auth.getSession().then(({ data }) => {
      setSession(data.session);
      setChecking(false);
    });
    const { data } = auth.onAuthStateChange((_event, next) => setSession(next));
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
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/listings" element={<Listings />} />
              <Route path="/users" element={<Users />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/verifications" element={<Verifications />} />
              <Route path="/audit" element={<Audit />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        ) : (
          <SignIn onSignedIn={() => void auth.getSession().then(({ data }) => setSession(data.session))} />
        )}
      </BrowserRouter>
    </QueryClientProvider>
  );
}
