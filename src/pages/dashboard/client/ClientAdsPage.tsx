/**
 * ClientAdsPage — /client/ads
 * ============================
 *
 * Bolt System SKU only — client-facing creative review surface.
 *
 * Layout (one screen, two zones — design principle #6):
 *   1. Currently running ads (LiveCreativeGrid)
 *   2. Queued for your approval (QueuedCreativeReview)
 *
 * If the client is NOT on the Bolt System SKU, we render an upgrade CTA card
 * and stop. We don't try to "be helpful" by showing empty grids — that's noise.
 *
 * The page sits under the existing /dashboard/* router but the URL surface is
 * /client/* (registered separately in AppRoutes.tsx).
 */
import { useCallback, useEffect, useState } from 'react';
import { authedFetch } from '../../../lib/authedFetch';
import LiveCreativeGrid, { type LiveCreative } from '../../../components/client/LiveCreativeGrid';
import QueuedCreativeReview, {
  type QueuedCreative,
} from '../../../components/client/QueuedCreativeReview';

interface AdsResponse {
  client: { id: string; business_name: string; vertical: string; sku: string };
  live_creatives: LiveCreative[];
  queued_creatives: QueuedCreative[];
}

interface SkuGateError {
  error: 'bolt_system_required';
  message: string;
  sku: string | null;
}

export default function ClientAdsPage() {
  const [state, setState] = useState<'loading' | 'ready' | 'sku_gate' | 'error'>('loading');
  const [data, setData] = useState<AdsResponse | null>(null);
  const [skuGate, setSkuGate] = useState<SkuGateError | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setState('loading');
    setError(null);
    try {
      const res = await authedFetch('/.netlify/functions/agency-client-ads', { method: 'GET' });
      if (res.status === 403) {
        const body = (await res.json()) as SkuGateError;
        if (body.error === 'bolt_system_required') {
          setSkuGate(body);
          setState('sku_gate');
          return;
        }
        throw new Error(body.message || 'Forbidden');
      }
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody?.error ?? `Request failed (HTTP ${res.status})`);
      }
      const body = (await res.json()) as AdsResponse;
      setData(body);
      setState('ready');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load creatives');
      setState('error');
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const handleDecision = useCallback(
    async (artifact_id: string, action: 'approve' | 'reject' | 'swap', reason?: string) => {
      const res = await authedFetch('/.netlify/functions/agency-client-ad-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artifact_id, action, reason }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody?.error ?? `Action failed (HTTP ${res.status})`);
      }
      // Refetch in the background so the queue + live grid stay in sync, but
      // don't block the optimistic UI — QueuedCreativeReview shows its own
      // "Done" state immediately.
      void refetch();
    },
    [refetch],
  );

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 sm:p-6 lg:p-8">
      <header>
        <p className="text-xs uppercase tracking-wide text-zinc-500">Creative review</p>
        <h1 className="mt-1 text-2xl font-bold text-zinc-900">Your ads</h1>
        <p className="mt-1 max-w-2xl text-sm text-zinc-600">
          Every creative your team runs lives here — what's live, what's waiting on your yes,
          and what your account strategist thinks about each one.
        </p>
      </header>

      {state === 'loading' && <LoadingState />}

      {state === 'error' && (
        <ErrorState message={error ?? 'Failed to load creatives'} onRetry={refetch} />
      )}

      {state === 'sku_gate' && skuGate && <SkuGateCard message={skuGate.message} />}

      {state === 'ready' && data && (
        <>
          <section>
            <SectionHeading
              title="Currently running"
              count={data.live_creatives.length}
              hint="Live performance from Meta with your team's read on each one."
            />
            <LiveCreativeGrid creatives={data.live_creatives} />
          </section>

          <section>
            <SectionHeading
              title="Queued for your approval"
              count={data.queued_creatives.length}
              hint="One tap decides each batch. Your creative team already passed compliance and the predicted-CTR gate."
              alert={data.queued_creatives.length > 0}
            />
            <QueuedCreativeReview queued={data.queued_creatives} onDecision={handleDecision} />
          </section>
        </>
      )}
    </div>
  );
}

function SectionHeading({
  title,
  count,
  hint,
  alert,
}: {
  title: string;
  count: number;
  hint: string;
  alert?: boolean;
}) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <div>
        <h2 className="text-base font-semibold text-zinc-900">
          {title}
          <span
            className={`ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              alert ? 'bg-amber-100 text-amber-900' : 'bg-zinc-100 text-zinc-700'
            }`}
          >
            {count}
          </span>
        </h2>
        <p className="mt-0.5 text-xs text-zinc-500">{hint}</p>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-500">
      Loading creatives…
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-6">
      <p className="text-sm font-semibold text-red-900">We couldn't load your creatives.</p>
      <p className="mt-1 text-xs text-red-800">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-3 inline-flex items-center rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-900 hover:bg-red-100"
      >
        Try again
      </button>
    </div>
  );
}

function SkuGateCard({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-gradient-to-br from-white to-zinc-50 p-8">
      <div className="mx-auto max-w-xl text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-900 text-white">
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 2l2.39 4.84L18 7.62l-4 3.9.94 5.48L10 14.4l-4.94 2.6L6 11.52 2 7.62l5.61-.78L10 2z" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-zinc-900">Ad management is a Bolt System feature</h2>
        <p className="mt-2 text-sm text-zinc-600">{message}</p>
        <a
          href="/dashboard/settings/plan-billing"
          className="mt-4 inline-flex items-center justify-center rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-black"
        >
          Upgrade to Bolt System
        </a>
        <p className="mt-3 text-[11px] text-zinc-500">
          Or message your account strategist — they can flip the switch for you.
        </p>
      </div>
    </div>
  );
}
