import { lazy, Suspense } from 'react';
import AppRoutes from './routes/AppRoutes';
import { ToastProvider } from './contexts/ToastContext';
import EnsureImageTitles from './components/seo/EnsureImageTitles';
import CookieBanner from './components/CookieBanner';
import ErrorBoundary from './components/ErrorBoundary';
import { useDirection } from './hooks/useDirection';
import { useAttributionCapture } from './hooks/useAttributionCapture';

const PWAUpdatePrompt = lazy(() => import('./components/PWAUpdatePrompt'));
const OfflineBanner = lazy(() => import('./components/OfflineBanner'));

function reportRootError(error: Error) {
  // PostHog captures window.onerror via its own bootstrap, but a React
  // render error inside a Suspense boundary never triggers window.onerror.
  // Forward it explicitly so we still get a Sentry-style signal.
  try {
    const ph = (window as unknown as { posthog?: { captureException?: (e: Error) => void } }).posthog;
    ph?.captureException?.(error);
  } catch { /* no-op */ }
}

function App() {
  useDirection(); // sync html[dir] + RTL Tailwind class globally for all pages
  useAttributionCapture(); // capture ?ref=<uid> from outbound emails for silent self-serve attribution
  return (
    <ErrorBoundary onError={reportRootError}>
      <ToastProvider>
        <EnsureImageTitles />
        <Suspense fallback={null}>
          <OfflineBanner />
        </Suspense>
        <AppRoutes />
        <Suspense fallback={null}>
          <PWAUpdatePrompt />
        </Suspense>
        <CookieBanner />
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;
