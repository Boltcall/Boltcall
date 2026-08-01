import { lazy, Suspense } from 'react';
import AppRoutes from './routes/AppRoutes';
import { ToastProvider } from './contexts/ToastContext';
import EnsureImageTitles from './components/seo/EnsureImageTitles';
import ErrorBoundary from './components/ErrorBoundary';
import { useDirection } from './hooks/useDirection';
import { useAttributionCapture } from './hooks/useAttributionCapture';
import { reportReactError } from './lib/errorReporting';

const PWAUpdatePrompt = lazy(() => import('./components/PWAUpdatePrompt'));
const OfflineBanner = lazy(() => import('./components/OfflineBanner'));

function App() {
  useDirection(); // sync html[dir] + RTL Tailwind class globally for all pages
  useAttributionCapture(); // capture ?ref=<uid> from outbound emails for silent self-serve attribution
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
