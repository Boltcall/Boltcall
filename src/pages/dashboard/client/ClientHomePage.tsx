/**
 * ClientHomePage — Boltcall Client Portal · Phase E · /client
 *
 * The single calm screen the agency client lands on. Lobby + strategist.
 *
 * Design contract (every line below is load-bearing — re-read the spec
 * if tempted to add a chart or a sidebar item here):
 *   - One screen, one action. We show at most 3 things to look at and 1
 *     to do (the chat input). Density lives behind "Show more" on other
 *     pages, never here.
 *   - Narrative-first. The hero shows ONE number; everything else is
 *     the strategist's voice or a quiet receipt.
 *   - Every alert paired with a fix. If an anomaly arrives without a
 *     paired fix, we still surface it — but we frame it as "our team is
 *     diagnosing now" rather than "your booking rate dropped, good luck".
 *   - The chat at the bottom IS the action. It is the only call-to-action
 *     on the page.
 *   - Auto-refresh every 30s. Quietly. No spinner on subsequent loads.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

import { authedFetch } from '../../../lib/authedFetch';
import HeroStatus from '../../../components/client/HeroStatus';
import DailyDigestCard from '../../../components/client/DailyDigestCard';
import PendingApprovalsRibbon from '../../../components/client/PendingApprovalsRibbon';
import LiveCallTicker from '../../../components/client/LiveCallTicker';
import AskBoltcallAI from '../../../components/client/AskBoltcallAI';

// ─── Types matching the agency-client-home payload ───────────────────────

interface HomePayload {
  hero: {
    agent_online: boolean;
    agent_phone_number: string | null;
    today_pipeline_value_usd: number;
    today_bookings: number;
    today_calls: number;
  };
  daily_digest: {
    narrative: string;
    generated_at: string;
    call_evidence: Array<{
      call_id: string;
      summary: string;
      started_at: string;
      outcome: string;
    }>;
    confidence: number;
  } | null;
  pending_approvals: {
    count: number;
    most_recent: {
      artifact_id: string;
      type: string;
      client_facing_note: string | null;
      created_at: string;
    } | null;
  };
  anomaly: {
    event_id: string;
    severity: 'warn' | 'error' | 'critical';
    why_explanation: string;
    created_at: string;
    fix: {
      artifact_id: string;
      type: string;
      status: 'draft' | 'approved' | 'shipped' | 'rejected';
      client_facing_note: string | null;
    } | null;
  } | null;
  live_calls: {
    active_count: number;
    last_call_started_at: string | null;
  };
  starter_questions: string[];
}

interface LoadingState {
  initial: boolean;
  refreshing: boolean;
  error: string | null;
  noClient: boolean;
}

const REFRESH_INTERVAL_MS = 30_000;

const ClientHomePage: React.FC = () => {
  const [data, setData] = useState<HomePayload | null>(null);
  const [load, setLoad] = useState<LoadingState>({
    initial: true,
    refreshing: false,
    error: null,
    noClient: false,
  });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inFlightRef = useRef(false);

  const fetchHome = useCallback(async (mode: 'initial' | 'refresh') => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    if (mode === 'refresh') {
      setLoad((s) => ({ ...s, refreshing: true }));
    }
    try {
      const res = await authedFetch('/.netlify/functions/agency-client-home', {
        method: 'GET',
      });
      if (res.status === 404) {
        const body = await res.json().catch(() => ({}));
        if (body?.code === 'no_client') {
          setLoad({
            initial: false,
            refreshing: false,
            error: null,
            noClient: true,
          });
          // Stop polling — there's nothing to poll.
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          return;
        }
      }
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || `Request failed (${res.status})`);
      }
      const payload = (await res.json()) as HomePayload;
      setData(payload);
      setLoad({
        initial: false,
        refreshing: false,
        error: null,
        noClient: false,
      });
    } catch (err) {
      setLoad((s) => ({
        ...s,
        initial: false,
        refreshing: false,
        error: err instanceof Error ? err.message : 'Failed to load home',
      }));
    } finally {
      inFlightRef.current = false;
    }
  }, []);

  useEffect(() => {
    void fetchHome('initial');
    intervalRef.current = setInterval(() => {
      void fetchHome('refresh');
    }, REFRESH_INTERVAL_MS);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [fetchHome]);

  // ── States ───────────────────────────────────────────────────────────

  if (load.initial) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-3xl items-center justify-center px-6">
        <div className="flex flex-col items-center gap-3 text-sm text-zinc-500">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          <span>Reading your account…</span>
        </div>
      </div>
    );
  }

  if (load.noClient) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16">
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center">
          <h1 className="text-lg font-semibold text-zinc-900">
            No agency client found
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            This account is not yet linked to an active agency client. If your
            onboarding just finished, give it a minute and refresh. Otherwise,{' '}
            <Link to="/dashboard" className="text-zinc-900 underline">
              head back to your dashboard
            </Link>
            .
          </p>
        </div>
      </div>
    );
  }

  if (load.error && !data) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center">
          <AlertTriangle
            className="mx-auto h-6 w-6 text-rose-600"
            aria-hidden="true"
          />
          <h1 className="mt-3 text-lg font-semibold text-rose-900">
            Could not load your portal
          </h1>
          <p className="mt-2 text-sm text-rose-800">{load.error}</p>
          <button
            type="button"
            onClick={() => void fetchHome('initial')}
            className="mt-4 rounded-lg bg-rose-900 px-4 py-2 text-sm font-medium text-white hover:bg-rose-800"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null; // Defensive — won't hit in practice.

  // ── Render ───────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      {/* Top row — quiet meta: live call ticker. The page header is
          intentionally NOT a big "Welcome back, John!" — we don't yell
          at the client. */}
      <div className="mb-5 flex items-center justify-between">
        <div className="text-xs text-zinc-400">
          {load.refreshing ? 'Updating…' : 'Live · refreshes every 30s'}
        </div>
        <LiveCallTicker
          activeCount={data.live_calls.active_count}
          lastCallStartedAt={data.live_calls.last_call_started_at}
        />
      </div>

      {/* Hero — agent status + today's pipeline. The only number on this
          page that gets large type. */}
      <HeroStatus
        agentOnline={data.hero.agent_online}
        agentPhoneNumber={data.hero.agent_phone_number}
        todayPipelineValueUsd={data.hero.today_pipeline_value_usd}
        todayBookings={data.hero.today_bookings}
        todayCalls={data.hero.today_calls}
      />

      {/* Approvals — ONLY when there are any. Hidden state is the calm state. */}
      {data.pending_approvals.count > 0 ? (
        <div className="mt-4">
          <PendingApprovalsRibbon
            count={data.pending_approvals.count}
            mostRecent={data.pending_approvals.most_recent}
          />
        </div>
      ) : null}

      {/* Anomaly — only when one exists. Always paired with fix status. */}
      {data.anomaly ? (
        <AnomalyCard anomaly={data.anomaly} />
      ) : null}

      {/* Daily digest — narrative-first, second item. */}
      {data.daily_digest ? (
        <div className="mt-6">
          <DailyDigestCard
            narrative={data.daily_digest.narrative}
            generatedAt={data.daily_digest.generated_at}
            callEvidence={data.daily_digest.call_evidence}
            confidence={data.daily_digest.confidence}
          />
        </div>
      ) : null}

      {/* The action: Ask Boltcall AI. The chat hero lives here and only
          here on the portal home. */}
      <div className="mt-8">
        <AskBoltcallAI starterQuestions={data.starter_questions} />
      </div>
    </div>
  );
};

// ─── Anomaly card — paired alert + fix status ─────────────────────────────

const AnomalyCard: React.FC<{
  anomaly: NonNullable<HomePayload['anomaly']>;
}> = ({ anomaly }) => {
  const severityClasses =
    anomaly.severity === 'critical'
      ? 'border-rose-200 bg-rose-50/70'
      : anomaly.severity === 'error'
        ? 'border-orange-200 bg-orange-50/70'
        : 'border-amber-200 bg-amber-50/70';

  const iconColor =
    anomaly.severity === 'critical'
      ? 'text-rose-700'
      : anomaly.severity === 'error'
        ? 'text-orange-700'
        : 'text-amber-700';

  // The "every alert paired with a fix" promise. If there's no fix, we
  // soften the line — never leave the client staring at a bare problem.
  const fixLine = anomaly.fix
    ? anomaly.fix.status === 'draft'
      ? 'Your strategist queued a fix for your approval.'
      : anomaly.fix.status === 'approved'
        ? 'Fix approved — shipping shortly.'
        : anomaly.fix.status === 'shipped'
          ? 'Fix shipped. Watching for improvement.'
          : 'Fix was rejected — your strategist is iterating.'
    : 'Your strategist is diagnosing now — fix will queue here when ready.';

  return (
    <div className={`mt-4 rounded-xl border ${severityClasses} px-5 py-4`}>
      <div className="flex items-start gap-3">
        <AlertTriangle
          className={`mt-0.5 h-4 w-4 shrink-0 ${iconColor}`}
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-zinc-900">
            {anomaly.why_explanation}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-600">
            <span>{fixLine}</span>
            {anomaly.fix?.status === 'draft' ? (
              <Link
                to="/client/approvals"
                className="font-medium text-zinc-900 underline-offset-2 hover:underline"
              >
                Review (30 sec)
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientHomePage;
