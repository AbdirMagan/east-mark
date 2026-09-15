import { Suspense, lazy, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';

import { BottomNav, Header } from './components/layout/Header.js';
import { HornBackdrop } from './components/brand/HornMap.js';
import { Footer } from './components/layout/Footer.js';
import { Spinner } from './components/ui/index.js';
import { I18nProvider } from './i18n/index.js';
import { ApiError } from './lib/api.js';
import { initAuth } from './store/auth.js';
import { applyTheme, usePreferences } from './store/preferences.js';
import { HomePage } from './pages/HomePage.js';

// Only the home page ships in the initial bundle. Everything else arrives when
// a visitor actually navigates to it, which keeps the first paint small on a
// connection where the first paint is the expensive part.
const BrowsePage = lazy(() => import('./pages/BrowsePage.js').then((m) => ({ default: m.BrowsePage })));
const ProductPage = lazy(() => import('./pages/ProductPage.js').then((m) => ({ default: m.ProductPage })));
const SignInPage = lazy(() => import('./pages/AuthPages.js').then((m) => ({ default: m.SignInPage })));
const RegisterPage = lazy(() => import('./pages/AuthPages.js').then((m) => ({ default: m.RegisterPage })));
const CategoriesPage = lazy(() =>
  import('./pages/MiscPages.js').then((m) => ({ default: m.CategoriesPage })),
);
const SavedPage = lazy(() => import('./pages/MiscPages.js').then((m) => ({ default: m.SavedPage })));
const SellPage = lazy(() => import('./pages/SellPage.js').then((m) => ({ default: m.SellPage })));
const MessagesPage = lazy(() =>
  import('./pages/MessagesPage.js').then((m) => ({ default: m.MessagesPage })),
);
const NotFoundPage = lazy(() =>
  import('./pages/MiscPages.js').then((m) => ({ default: m.NotFoundPage })),
);
const ComingSoonPage = lazy(() =>
  import('./pages/MiscPages.js').then((m) => ({ default: m.ComingSoonPage })),
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Three retries on a 404 only delays the error by several seconds on a
      // slow link. Retry what retrying can actually fix.
      retry: (failureCount, error) =>
        error instanceof ApiError && !error.isTransient ? false : failureCount < 2,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
});

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function PageFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center text-text-muted">
      <Spinner size={26} />
    </div>
  );
}

function Shell() {
  const theme = usePreferences((state) => state.theme);
  const { pathname } = useLocation();
  // The messages screen fills the viewport like a chat app; a footer under it
  // would push the composer off screen.
  const fullHeight = pathname.startsWith('/messages');

  useEffect(() => applyTheme(theme), [theme]);
  useEffect(() => initAuth(), []);

  return (
    <div className="relative isolate flex min-h-screen flex-col">
      <HornBackdrop />
      <a
        href="#main"
        className="em-sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-(--radius-field) focus:bg-brand focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>

      <Header />

      {/* pb-16 on mobile clears the fixed bottom navigation. */}
      <main id="main" className="flex-1 pb-16 md:pb-0">
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/browse" element={<BrowsePage />} />
            <Route path="/categories" element={<CategoriesPage />} />
            <Route path="/product/:ref" element={<ProductPage />} />
            <Route path="/saved" element={<SavedPage />} />
            <Route path="/signin" element={<SignInPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/sell" element={<SellPage />} />
            <Route path="/my-listings" element={<ComingSoonPage titleKey="nav.myListings" />} />
            <Route path="/messages" element={<MessagesPage />} />
            <Route path="/messages/:conversationId" element={<MessagesPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </main>

      {fullHeight ? null : <Footer />}
      <BottomNav />
    </div>
  );
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <BrowserRouter>
          <ScrollToTop />
          <Shell />
        </BrowserRouter>
      </I18nProvider>
    </QueryClientProvider>
  );
}
