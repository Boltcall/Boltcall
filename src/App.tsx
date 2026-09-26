import { lazy, Suspense, useEffect } from 'react';
import AppRoutes from './routes/AppRoutes';
import { ToastProvider } from './contexts/ToastContext';
import EnsureImageTitles from './components/seo/EnsureImageTitles';
import ErrorBoundary from './components/ErrorBoundary';
import { useDirection } from './hooks/useDirection';
import { useAttributionCapture } from './hooks/useAttributionCapture';
import { reportReactError } from './lib/errorReporting';
import { loadMarketingAnalytics } from './lib/marketingAnalytics';

const PWAUpdatePrompt = lazy(() => import('./components/PWAUpdatePrompt'));
const OfflineBanner = lazy(() => import('./components/OfflineBanner'));

function App() {
  useDirection(); // sync html[dir] + RTL Tailwind class globally for all pages
  useAttributionCapture(); // capture ?ref=<uid> from outbound emails for silent self-serve attribution
  useEffect(() => {
    // The cookie banner was removed 2026-08-01 and analytics only ever loaded from it, so GA4 and
    // Clarity went dark. Load by default now; a stored "rejected" from the old banner still wins.
    // navigator.webdriver skips the prerender puppeteer run (no baked-in tags, no fake hits).
    if (navigator.webdriver) return;
    try {
      if (localStorage.getItem('cookie_consent') === 'rejected') return;
    } catch { /* storage blocked: load anyway */ }
    loadMarketingAnalytics();
  }, []);
  return (
    <ErrorBoundary onError={reportReactError}>
      <ToastProvider>
        <EnsureImageTitles />
        <Suspense fallback={null}>
          <OfflineBanner />
        </Suspense>
        <AppRoutes />
        <Suspense fallback={null}>
          <PWAUpdatePrompt />
        </Suspense>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;
