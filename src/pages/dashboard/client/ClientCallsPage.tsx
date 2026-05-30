/**
 * ClientCallsPage — /client/calls
 *
 * Full call history surface for the client portal. Renders the
 * CallList (with all filters), a one-card daily summary above it,
 * and the CallDetailDrawer on row click.
 *
 * Data flow:
 *   GET /agency-client-calls    — list
 *   GET /agency-client-call-detail — drawer (per-call, lazy)
 *
 * Design principles respected:
 *   1. AI never feels like a chatbot — drawer is a strategist's note.
 *   2. Alerts pair with actions — sideways filter surfaces failures
 *      AND the explanation drawer always shows the fix in motion.
 *   3. Founder is invisible — copy says "our team" / "your strategist".
 *   4. Every number has a narrative — each call row has a one-liner.
 *   6. One screen, one action — the "Calls that went sideways" button is
 *      the one prominent action; filters are secondary.
 *   8. Every claim auditable — drawer ships transcript + recording.
 */
import React, { useCallback, useEffect, useState } from 'react';

import { authedFetch } from '../../../lib/authedFetch';
import CallList, { CallRow } from '../../../components/client/CallList';
import CallDetailDrawer from '../../../components/client/CallDetailDrawer';

interface CallsResponse {
  client: {
    id: string;
    business_name: string | null;
    vertical: string | null;
  };
  calls: CallRow[];
  paging: {
    limit: number;
    next_cursor: string | null;
    returned: number;
    scanned: number;
  };
}

const ClientCallsPage: React.FC = () => {
  const [client, setClient] = useState<CallsResponse['client'] | null>(null);
  const [calls, setCalls] = useState<CallRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sideways, setSideways] = useState(false);
  const [outcomeFilter, setOutcomeFilter] = useState<
    CallRow['outcome'] | 'all'
  >('all');
  const [selectedCall, setSelectedCall] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchCalls = useCallback(
    async (opts: { append?: boolean } = {}) => {
      const params = new URLSearchParams({ limit: '50' });
      if (opts.append && nextCursor) params.set('cursor', nextCursor);
      if (sideways) params.set('sideways', '1');
      if (outcomeFilter !== 'all') params.set('outcome', outcomeFilter);

      try {
        if (!opts.append) setLoading(true);
        else setLoadingMore(true);
        setError(null);
        const res = await authedFetch(
          `/.netlify/functions/agency-client-calls?${params.toString()}`,
        );
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const json = (await res.json()) as CallsResponse;
        setClient(json.client);
        setCalls((prev) => (opts.append ? [...prev, ...json.calls] : json.calls));
        setNextCursor(json.paging.next_cursor);
      } catch (err) {
        setError(
          'We could not load your calls right now. The strategist will be looking into this shortly.',
        );
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [sideways, outcomeFilter, nextCursor],
  );

  useEffect(() => {
    setNextCursor(null);
    void fetchCalls({ append: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sideways, outcomeFilter]);

  // Top-of-page summary numbers (computed from the current page — fine for
  // the calm-by-default principle, density lives below)
  const total = calls.length;
  const booked = calls.filter((c) => c.outcome === 'booked').length;
  const sidewaysCount = calls.filter((c) => c.is_sideways).length;
  const bookRate = total > 0 ? Math.round((booked / total) * 100) : 0;

  return (
    <div className="space-y-6 px-4 py-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Your call history
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-zinc-900">
            {client?.business_name
              ? `${client.business_name} · Calls`
              : 'Calls'}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-zinc-600">
            Every call your agent has handled. Tap any row to see the transcript,
            the QA breakdown, and the strategist's read on what happened.
          </p>
        </div>
        <SummaryStrip total={total} booked={booked} bookRate={bookRate} sideways={sidewaysCount} />
      </div>

      {error && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <CallList
        calls={calls}
        loading={loading}
        onSelect={setSelectedCall}
        sidewaysActive={sideways}
        onSidewaysToggle={() => setSideways((v) => !v)}
        outcomeFilter={outcomeFilter}
        onOutcomeChange={setOutcomeFilter}
      />

      {nextCursor && !loading && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => fetchCalls({ append: true })}
            disabled={loadingMore}
            className="rounded-md border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:border-zinc-300 disabled:opacity-50"
          >
            {loadingMore ? 'Loading…' : 'Load older calls'}
          </button>
        </div>
      )}

      <CallDetailDrawer
        call_id={selectedCall}
        onClose={() => setSelectedCall(null)}
      />
    </div>
  );
};

const SummaryStrip: React.FC<{
  total: number;
  booked: number;
  bookRate: number;
  sideways: number;
}> = ({ total, booked, bookRate, sideways }) => (
  <div className="flex items-stretch gap-4 text-right text-xs">
    <Stat label="Calls" value={String(total)} />
    <Stat label="Booked" value={String(booked)} accent="emerald" />
    <Stat label="Book rate" value={`${bookRate}%`} />
    <Stat label="Sideways" value={String(sideways)} accent={sideways > 0 ? 'rose' : 'zinc'} />
  </div>
);

const Stat: React.FC<{
  label: string;
  value: string;
  accent?: 'emerald' | 'rose' | 'zinc';
}> = ({ label, value, accent = 'zinc' }) => {
  const tone =
    accent === 'emerald'
      ? 'text-emerald-700'
      : accent === 'rose'
        ? 'text-rose-700'
        : 'text-zinc-900';
  return (
    <div className="min-w-[64px] rounded-md border border-zinc-200 bg-white px-3 py-2">
      <div className={`text-base font-semibold tabular-nums ${tone}`}>
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-wider text-zinc-500">
        {label}
      </div>
    </div>
  );
};

export default ClientCallsPage;
