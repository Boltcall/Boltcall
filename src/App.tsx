import { lazy, Suspense } from 'react';
import AppRoutes from './routes/AppRoutes';
import { ToastProvider } from './contexts/ToastContext';
import EnsureImageTitles from './components/seo/EnsureImageTitles';
import CookieBanner from './components/CookieBanner';
import { useDirection } from './hooks/useDirection';
import { useAttributionCapture } from './hooks/useAttributionCapture';

const PWAUpdatePrompt = lazy(() => import('./components/PWAUpdatePrompt'));
const OfflineBanner = lazy(() => import('./components/OfflineBanner'));

function App() {
  useDirection(); // sync html[dir] + RTL Tailwind class globally for all pages
  useAttributionCapture(); // capture ?ref=<uid> from outbound emails for silent self-serve attribution
  return (
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
  );
}

export default App;
