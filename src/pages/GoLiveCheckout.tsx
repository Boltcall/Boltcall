import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { redirectToPayPalCheckout } from '../lib/paypal-checkout';

// Bridge between /go-live/:slug and billing. Signup comes first (checkout needs an
// authed user), then this page hands off to the existing PayPal subscription flow.
// Plan keys map to PlanLevel in lib/stripe.ts: starter = $549/mo, pro = $897/mo.
const SELF_SERVE = ['starter', 'pro'] as const;
type Plan = (typeof SELF_SERVE)[number];

export default function GoLiveCheckout() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();
  const [params] = useSearchParams();
  const plan = params.get('plan') as Plan;
  const firm = params.get('firm')?.trim().slice(0, 80) || '';
  const slug = params.get('slug') || '';
  const [error, setError] = useState('');
  const started = useRef(false);

  const validPlan = SELF_SERVE.includes(plan);

  useEffect(() => {
    if (!validPlan || !isAuthenticated || started.current) return;
    started.current = true;
    (async () => {
      try {
        // Carry the firm name onto the account (user_metadata.company is what signup uses).
        if (firm && !user?.company) {
          await supabase.auth.updateUser({ data: { company: firm } }).catch(() => undefined);
        }
        window.gtag?.('event', 'go_live_checkout_start', { slug, plan });
        await redirectToPayPalCheckout({ plan, interval: 'monthly' });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not start checkout.');
      }
    })();
  }, [validPlan, isAuthenticated, firm, slug, plan, user?.company]);

  if (!validPlan) return <Navigate to={slug ? `/go-live/${slug}` : '/pricing'} replace />;
  if (!isLoading && !isAuthenticated) {
    const back = `${location.pathname}${location.search}`;
    return <Navigate to={`/signup?redirect=${encodeURIComponent(back)}`} replace />;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-4 text-center" role="status" aria-live="polite">
      {error ? (
        <div className="max-w-sm">
          <h1 className="text-xl font-bold text-gray-900">We could not open checkout</h1>
          <p className="mt-2 text-gray-600">{error} Your account is saved, so nothing is lost.</p>
          <div className="mt-6 flex flex-col gap-3">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="min-h-[48px] rounded-full bg-blue-600 px-6 font-semibold text-white hover:bg-blue-700"
            >
              Try again
            </button>
            <Link to="/dashboard/settings/plan-billing" className="text-sm font-semibold text-blue-700 underline underline-offset-4">
              Choose a plan in your dashboard
            </Link>
          </div>
        </div>
      ) : (
        <div>
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" aria-hidden />
          <p className="mt-4 font-semibold text-gray-900">Taking you to secure checkout…</p>
        </div>
      )}
    </main>
  );
}
