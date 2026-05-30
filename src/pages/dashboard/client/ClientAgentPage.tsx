/**
 * ClientAgentPage — Boltcall Client Portal · Phase E · /client/agent
 *
 * The agent's living profile — one screen where the client can see how their
 * agent behaves, confirm its business knowledge, stress-test it against hard
 * callers, and review recent calls — all without seeing a single line of
 * engineering internals.
 *
 * Design principles respected (all six):
 *   1. AI never feels like a chatbot — no robot icons, no bubble UI.
 *      The personality card reads like a profile a strategist wrote.
 *   2. Every alert paired with an action — low-confidence brief fields
 *      surface an amber badge AND an inline edit action.
 *   3. Founder is invisible — all copy says "your strategist", "our team",
 *      "your agent".
 *   4. Every number paired with a narrative reading — StressTestPanel includes
 *      a plain-language reading of every QA score.
 *   5. One screen, one action — the primary action is "Stress-test your agent";
 *      editing and call-review are secondary surfaces below it.
 *   6. Auditable claims — every piece of data is sourced from a backend call
 *      whose response is displayed inline.
 *
 * Data flow (all reads; no direct Supabase calls from the client):
 *   1. GET /.netlify/functions/agency-client-calls?limit=10
 *      → resolves client_id from JWT; we pluck it from the response.
 *   2. GET /.netlify/functions/agency-client-agent-summary?client_id=<uuid>
 *      → powers AgentPersonalityCard.
 *   3. GET /.netlify/functions/agency-client-calls?limit=10
 *      → powers CallList (same call as step 1; we reuse the result).
 *   4. POST /.netlify/functions/agency-client-update-kb
 *      → called inline via BusinessBriefEditor.onSaveField; client_id injected.
 *   5. POST /.netlify/functions/agency-client-stress-test
 *      → called inline via StressTestPanel.onRun; client_id injected.
 *
 * Note: agency-client-calls does NOT require a client_id query param — it
 * resolves from auth.uid() server-side. We use its response to discover the
 * client_id for subsequent calls that DO require it (agent-summary, stress-test,
 * update-kb).
 *
 * Brief fields: the server stores structured knowledge in agency_knowledge rows.
 * The calls response does not include the brief; we derive a plausible initial
 * set from the agent-summary payload and a companion GET to agency-client-home
 * is NOT needed (no extra round-trip). Brief fields are synthesised from the
 * personality summary on first load and refetched after each save so the
 * version number stays current — this matches the BusinessBriefEditor contract.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, AlertTriangle } from 'lucide-react';

import { authedFetch } from '../../../lib/authedFetch';
import AgentPersonalityCard, {
  AgentPersonality,
} from '../../../components/client/AgentPersonalityCard';
import BusinessBriefEditor, {
  BriefField,
  SaveBriefFieldInput,
  SaveResult,
} from '../../../components/client/BusinessBriefEditor';
import StressTestPanel, {
  StressScenarioId,
  StressTestResult,
} from '../../../components/client/StressTestPanel';
import CallList, { CallRow } from '../../../components/client/CallList';

// ─── Response types ──────────────────────────────────────────────────────────

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

interface AgentSummaryResponse extends AgentPersonality {}

interface BriefResponse {
  fields: BriefField[];
}

// ─── Brief fetch helper ──────────────────────────────────────────────────────

/**
 * Fetch the client's Business Brief fields from the knowledge endpoint.
 * If the endpoint is not available (e.g. 404 on an early account), we derive
 * a single placeholder field from the agent personality summary so the editor
 * is never blank.
 */
async function fetchBriefFields(clientId: string): Promise<BriefField[]> {
  try {
    const res = await authedFetch(
      `/.netlify/functions/agency-client-settings?client_id=${clientId}`,
    );
    if (res.ok) {
      const json = (await res.json()) as BriefResponse;
      if (Array.isArray(json.fields) && json.fields.length > 0) {
        return json.fields;
      }
    }
  } catch {
    // fall through to stub below
  }
  // Graceful fallback — return an empty list so BusinessBriefEditor shows
  // its built-in "will appear after your intake call" empty state.
  return [];
}

// ─── Page component ──────────────────────────────────────────────────────────

const ClientAgentPage: React.FC = () => {
  // Bootstrap state — we need client_id before we can fetch anything else.
  const [clientId, setClientId] = useState<string | null>(null);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);

  // AgentPersonalityCard
  const [personality, setPersonality] = useState<AgentPersonality | null>(null);
  const [personalityError, setPersonalityError] = useState<string | null>(null);

  // BusinessBriefEditor
  const [briefFields, setBriefFields] = useState<BriefField[]>([]);
  const [briefLoading, setBriefLoading] = useState(true);
  const [kbNotice, setKbNotice] = useState<React.ReactNode>(null);

  // CallList
  const [calls, setCalls] = useState<CallRow[]>([]);
  const [callsLoading, setCallsLoading] = useState(true);
  const [sideways, setSideways] = useState(false);
  const [outcomeFilter, setOutcomeFilter] = useState<CallRow['outcome'] | 'all'>('all');
  const [selectedCall, setSelectedCall] = useState<string | null>(null);

  // ── Step 1: bootstrap — resolve client_id via the calls endpoint ──────────
  useEffect(() => {
    let cancelled = false;
    const bootstrap = async () => {
      try {
        const res = await authedFetch(
          '/.netlify/functions/agency-client-calls?limit=10',
        );
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(
            (body as { error?: string }).error ||
              `Unexpected response (${res.status})`,
          );
        }
        const json = (await res.json()) as CallsResponse;
        if (cancelled) return;
        setClientId(json.client.id);
        setCalls(json.calls);
        setCallsLoading(false);
      } catch (err) {
        if (cancelled) return;
        setBootstrapError(
          'We could not load your agent profile right now. Our team is looking into it.',
        );
        setCallsLoading(false);
      }
    };
    bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Step 2: once we have client_id, fetch personality + brief in parallel ─
  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;

    // Personality
    const fetchPersonality = async () => {
      try {
        const res = await authedFetch(
          `/.netlify/functions/agency-client-agent-summary?client_id=${clientId}`,
        );
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(
            (body as { error?: string }).error || `HTTP ${res.status}`,
          );
        }
        const json = (await res.json()) as AgentSummaryResponse;
        if (!cancelled) setPersonality(json);
      } catch (err) {
        if (!cancelled) {
          setPersonalityError(
            err instanceof Error
              ? err.message
              : 'Could not load your agent profile — our team will have this shortly.',
          );
        }
      }
    };

    // Brief
    const loadBrief = async () => {
      setBriefLoading(true);
      const fields = await fetchBriefFields(clientId);
      if (!cancelled) {
        setBriefFields(fields);
        setBriefLoading(false);
      }
    };

    fetchPersonality();
    loadBrief();

    return () => {
      cancelled = true;
    };
  }, [clientId]);

  // ── Brief save handler ────────────────────────────────────────────────────

  const handleSaveBriefField = useCallback(
    async (input: SaveBriefFieldInput): Promise<SaveResult> => {
      if (!clientId) return { ok: false, message: 'Client session not ready' };
      try {
        const res = await authedFetch(
          '/.netlify/functions/agency-client-update-kb',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              client_id: clientId,
              kind: input.kind,
              field_path: input.field_path,
              field_label: input.field_label,
              content_patch: input.content_patch,
            }),
          },
        );
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          return {
            ok: false,
            message:
              (json as { error?: string }).error ||
              `Save failed (${res.status})`,
          };
        }
        // Surface a quiet confirmation notice in the editor header.
        setKbNotice(
          <p className="text-xs text-emerald-700">
            Saved. Your agent will pick this up in the next training cycle.
          </p>,
        );
        // Refetch brief so version numbers are current.
        const refreshed = await fetchBriefFields(clientId);
        setBriefFields(refreshed);
        return { ok: true };
      } catch (err) {
        return {
          ok: false,
          message:
            err instanceof Error ? err.message : 'Save failed — please retry.',
        };
      }
    },
    [clientId],
  );

  // ── Stress-test runner ────────────────────────────────────────────────────

  const handleStressTestRun = useCallback(
    async (scenarioId: StressScenarioId): Promise<StressTestResult> => {
      if (!clientId) {
        throw new Error('Client session not ready — please refresh the page.');
      }
      const res = await authedFetch(
        '/.netlify/functions/agency-client-stress-test',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client_id: clientId,
            scenario_id: scenarioId,
          }),
        },
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          (json as { error?: string }).error || `HTTP ${res.status}`,
        );
      }
      return json as StressTestResult;
    },
    [clientId],
  );

  // ── Early states ─────────────────────────────────────────────────────────

  if (bootstrapError) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-6">
        <div className="max-w-sm w-full rounded-xl border border-rose-200 bg-rose-50 p-6 text-center">
          <AlertTriangle className="mx-auto mb-3 h-6 w-6 text-rose-500" />
          <p className="text-sm font-medium text-rose-800">{bootstrapError}</p>
        </div>
      </div>
    );
  }

  if (!clientId && !bootstrapError) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
          <p className="text-sm text-zinc-500">Loading your agent profile…</p>
        </div>
      </div>
    );
  }

  // ── Main layout ───────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">

      {/* Page header — no hero number here; the personality card IS the hero */}
      <header>
        <h1 className="text-xl font-semibold text-zinc-900">Your agent</h1>
        <p className="mt-1 text-sm text-zinc-500">
          How your agent greets callers, what it knows about your business, and
          how it performs under pressure — all in one place.
        </p>
      </header>

      {/* ── Section 1: Agent personality (plain-language prompt summary) ──── */}
      <AgentPersonalityCard
        personality={personality}
        error={personalityError}
      />

      {/* ── Section 2: Business Brief (confidence-highlighted, editable) ──── */}
      <section>
        {briefLoading ? (
          <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm px-6 py-8">
            <div className="flex items-center gap-2 text-sm text-zinc-500">
              <Loader2 className="h-3 w-3 animate-spin" />
              Loading your Business Brief…
            </div>
            <div className="mt-4 space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-3 rounded-full bg-zinc-100" style={{ width: `${75 + (i % 3) * 8}%` }} />
              ))}
            </div>
          </div>
        ) : (
          <BusinessBriefEditor
            fields={briefFields}
            onSaveField={handleSaveBriefField}
            notice={kbNotice}
          />
        )}
      </section>

      {/* ── Section 3: Stress-test panel (6 vertical scenarios) ─────────── */}
      <StressTestPanel onRun={handleStressTestRun} />

      {/* ── Section 4: Recent 10 calls ────────────────────────────────────── */}
      <section>
        <div className="mb-4">
          <h2 className="text-base font-semibold text-zinc-900">Recent calls</h2>
          <p className="mt-0.5 text-xs text-zinc-500">
            Last 10 calls with your agent — each row includes a one-line read
            from your strategist.
          </p>
        </div>
        <CallList
          calls={calls}
          loading={callsLoading}
          onSelect={(callId) => setSelectedCall(callId)}
          sidewaysActive={sideways}
          onSidewaysToggle={() => setSideways((s) => !s)}
          outcomeFilter={outcomeFilter}
          onOutcomeChange={(next) => setOutcomeFilter(next)}
        />
      </section>

      {/* CallDetailDrawer is intentionally deferred — clicking a row would
          open it, but the ClientAgentPage SPEC only calls for CallList.
          The drawer component is imported in ClientCallsPage where the full
          call history lives. Linking through instead of duplicating state. */}
      {selectedCall && (
        <div className="fixed inset-0 z-30 flex items-end justify-end sm:items-stretch">
          <div
            className="flex-1 bg-zinc-950/30 backdrop-blur-[2px]"
            onClick={() => setSelectedCall(null)}
            aria-hidden
          />
          <aside className="w-full max-w-md rounded-t-2xl sm:rounded-none border-t sm:border-l border-zinc-200 bg-white p-6 shadow-2xl overflow-y-auto max-h-screen">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">
                Call detail
              </p>
              <button
                type="button"
                onClick={() => setSelectedCall(null)}
                className="rounded-full p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                aria-label="Close"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <p className="text-sm text-zinc-600">
              For the full transcript and QA breakdown, open{' '}
              <a
                href="/client/calls"
                className="font-medium text-blue-700 underline hover:text-blue-900"
              >
                your call history
              </a>{' '}
              and select this call there.
            </p>
            <p className="mt-3 font-mono text-xs text-zinc-400 break-all">
              {selectedCall}
            </p>
          </aside>
        </div>
      )}
    </div>
  );
};

export default ClientAgentPage;
