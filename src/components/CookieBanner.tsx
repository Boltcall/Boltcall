import { useState, useEffect } from 'react';
import { Cookie, X, ChevronDown, ChevronUp } from 'lucide-react';
import { loadMarketingAnalytics } from '../lib/marketingAnalytics';

const CONSENT_KEY = 'cookie_consent';

type ConsentChoice = 'accepted' | 'rejected';

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_KEY) as ConsentChoice | null;
    if (!stored) {
      // Slight delay so the banner doesn't flash before React hydrates
      const t = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(t);
    }
    if (stored === 'accepted') {
      loadMarketingAnalytics();
    }
  }, []);

  function accept() {
    localStorage.setItem(CONSENT_KEY, 'accepted');
    loadMarketingAnalytics();
    setVisible(false);
  }

  function reject() {
    localStorage.setItem(CONSENT_KEY, 'rejected');
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-0 inset-x-0 z-[9999] p-4 pointer-events-none"
      role="dialog"
      aria-label="Cookie consent"
      aria-modal="false"
    >
      <div className="max-w-4xl mx-auto bg-white border border-gray-200 rounded-2xl shadow-2xl p-5 pointer-events-auto">
        <div className="flex items-start gap-4">
          <div className="p-2 bg-blue-50 rounded-lg shrink-0">
            <Cookie className="w-5 h-5 text-blue-600" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 mb-1">
              We use cookies to improve your experience
            </p>
            <p className="text-xs text-gray-600 leading-relaxed">
              Essential cookies keep the site working. Analytics cookies help us understand
              how visitors use Boltcall so we can improve it.{' '}
              <button
                onClick={() => setExpanded(v => !v)}
                className="text-blue-600 hover:underline inline-flex items-center gap-0.5 font-medium"
              >
                {expanded ? 'Less info' : 'More info'}
                {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </p>

            {expanded && (
              <div className="mt-3 text-xs text-gray-600 bg-gray-50 rounded-lg p-3 space-y-1.5">
                <p><strong>Essential cookies:</strong> Auth session, language preference, cookie consent choice. Always active — cannot be disabled.</p>
                <p><strong>Analytics cookies (requires consent):</strong> Google Analytics, Google Tag Manager, and Microsoft Clarity. We track pages visited, feature usage, heatmaps, and session behavior on public pages to improve the product. No personal data is shared with third parties for advertising.</p>
                <p>
                  See our{' '}
                  <a href="/privacy-policy" className="text-blue-600 hover:underline">Privacy Policy</a>
                  {' '}for full details including your data rights under Israeli law (PPL) and GDPR.
                </p>
              </div>
            )}
          </div>

          <button
            onClick={reject}
            className="shrink-0 p-1 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Decline and close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-4 flex items-center justify-end gap-3">
          <button
            onClick={reject}
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Essential only
          </button>
          <button
            onClick={accept}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            Accept all
          </button>
        </div>
      </div>
    </div>
  );
}
