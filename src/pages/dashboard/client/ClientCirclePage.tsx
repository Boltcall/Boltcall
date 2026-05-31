/**
 * ClientCirclePage — Boltcall Client Portal · Phase E · /client/circle
 *
 * Cohort hub. Day-14+ gated: clients who went live fewer than 14 days ago
 * see a simple holding card — no partial data, no half-painted UI.
 *
 * Layout (once eligible):
 *   1. CohortRoster  — anonymized peer list, no avatars, no "online" dots
 *   2. This-week wins feed  — peer experiment results, inline
 *   3. Weekly Cohort Pulse  — AI summary card (no chatbot framing)
 *   4. Peer Experiments  — one-tap "Apply to my account" per experiment
 *
 * Design principles applied:
 *   - No chatbot UI (Principle 1): Pulse is a plain prose card, not a bubble.
 *   - Every alert paired with an action (Principle 2): "Apply" is the action
 *     surfaced with every experiment — the read is never passive.
 *   - Founder invisible (Principle 3): copy says "your circle", "your strategist",
 *     never "Noam" or "we hand-picked".
 *   - Every number paired with a narrative (Principle 4): lift_summary is always
 *     shown next to the metric label.
 *   - One screen, one action (Principle 5): the primary CTA is "Apply" —
 *     nothing competes with it on this page.
 *   - Auditable claims (Principle 6): each win card links to evidence_url when
 *     the backend provides one.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, ExternalLink, Loader2 } from 'lucide-react';

import { authedFetch } from '../../../lib/authedFetch';
import CohortRoster, {
  type CohortRosterMember,
} from '../../../components/client/CohortRoster';

// ─── Types matching agency-client-circle payload ──────────────────────────

interface Win {
  artifact_id: string;
  peer_anonymized_label: string;
  metric: string;
  lift_summary: string;
  shipped_at: string;
  evidence_url: string | null;
}

interface PeerExperiment {
  artifact_id: string;
  peer_anonymized_label: string;
  metric: string;
  lift_summary: string;
  shipped_at: string;
  evidence_url: string | null;
}

interface CirclePayload {
  eligible: boolean;
  days_until_eligible: number | null;
  cohort_channel_id: string | null;
  members: CohortRosterMember[];
  wins: Win[];
  cohort_pulse: string | null;
}

// The peer experiments section reuses the same win objects — every shipped
// peer experiment is both a win (feed) and an adoptable experiment (list).
// We keep separate rendered sections for clarity of intent.

// ─── Apply-experiment state keyed by artifact_id ──────────────────────────

type ApplyState = 'idle' | 'loading' | 'done' | 'error';

// ─── Component ────────────────────────────────────────────────────────────

const ClientCirclePage: React.FC = () => {
  const [data, setData] = useState<CirclePayload | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Per-experiment apply state — no global spinner, each row is independent.
  const [applyStates, setApplyStates] = useState<Record<string, ApplyState>>({});

  const inFlightRef = useRef(false);

  const fetchCircle = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      const res = await authedFetch('/.netlify/functions/agency-client-circle', {
        method: 'GET',
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || `Request failed (${res.status})`);
      }
      const payload = (await res.json()) as CirclePayload;
      setData(payload);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not load your circle',
      );
    } finally {
      inFlightRef.current = false;
      setInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchCircle();
  }, [fetchCircle]);

  // ── Apply a peer experiment ──────────────────────────────────────────────

  const applyExperiment = useCallback(async (artifactId: string) => {
    setApplyStates((s) => ({ ...s, [artifactId]: 'loading' }));
    try {
      const res = await authedFetch(
        '/.netlify/functions/agency-client-apply-cohort-experiment',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ peer_artifact_id: artifactId }),
        },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          (body as { error?: string }).error ?? `Error ${res.status}`,
        );
      }
      setApplyStates((s) => ({ ...s, [artifactId]: 'done' }));
    } catch (err) {
      console.error('[ClientCirclePage] apply experiment failed', err);
      setApplyStates((s) => ({ ...s, [artifactId]: 'error' }));
    }
  }, []);

  // ── Loading skeleton ─────────────────────────────────────────────────────

  if (initialLoading) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-3xl items-center justify-center px-6">
        <div className="flex flex-col items-center gap-3 text-sm text-zinc-500">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          <span>Loading your circle…</span>
        </div>
      </div>
    );
  }

  // ── Fetch error ──────────────────────────────────────────────────────────

  if (error && !data) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center">
          <AlertTriangle
            className="mx-auto h-6 w-6 text-rose-600"
            aria-hidden="true"
          />
          <h1 className="mt-3 text-lg font-semibold text-rose-900">
            Could not load your circle
          </h1>
          <p className="mt-2 text-sm text-rose-800">{error}</p>
          <button
            type="button"
            onClick={() => {
              setInitialLoading(true);
              void fetchCircle();
            }}
            className="mt-4 rounded-lg bg-rose-900 px-4 py-2 text-sm font-medium text-white hover:bg-rose-800"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  // ── Day-14 gate ──────────────────────────────────────────────────────────

  if (!data.eligible) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16">
        <div className="rounded-2xl border border-border bg-white p-8 text-center">
          <h1 className="text-lg font-semibold text-text-main">
            Your cohort opens on Day 14
          </h1>
          <p className="mt-3 text-sm text-zinc-600">
            {typeof data.days_until_eligible === 'number' &&
            data.days_until_eligible > 0 ? (
              <>
                You have{' '}
                <span className="font-semibold text-text-main">
                  {data.days_until_eligible}{' '}
                  {data.days_until_eligible === 1 ? 'day' : 'days'}
                </span>{' '}
                left before your circle seats. We match you with operators in
                your vertical and revenue tier — geographies never overlap.
              </>
            ) : (
              'Your circle is seating now. Check back in a day.'
            )}
          </p>
          <p className="mt-4 text-xs text-zinc-400">
            Once seated, you will see anonymized peer wins, a weekly pulse
            summary, and one-tap experiment adoption.
          </p>
        </div>
      </div>
    );
  }

  // ── Main cohort hub layout ───────────────────────────────────────────────

  const { members, wins, cohort_pulse } = data;

  // peer_experiments is the same dataset as wins — every shipped peer
  // experiment is both a win to learn from and an experiment to adopt.
  const peerExperiments: PeerExperiment[] = wins;

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8 sm:px-6 sm:py-12">
      {/* ── Section header ───────────────────────────────────────────── */}
      <div>
        <h1 className="text-base font-semibold text-text-main">Your circle</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Anonymized operators in your vertical — wins, experiments, and a
          weekly pulse from your strategist.
        </p>
      </div>

      {/* ── 1. CohortRoster ──────────────────────────────────────────── */}
      <CohortRoster members={members} isLoading={false} />

      {/* ── 2. This-week cohort wins ──────────────────────────────────── */}
      <section aria-labelledby="wins-heading">
        <h2
          id="wins-heading"
          className="mb-3 text-sm font-semibold text-text-main"
        >
          This week in your circle
        </h2>

        {wins.length === 0 ? (
          <div className="rounded-lg border border-border bg-white px-5 py-4 text-sm text-zinc-500">
            No shipped experiments from your peers in the last 14 days. Wins
            will appear here as your circle runs experiments.
          </div>
        ) : (
          <ul className="space-y-3">
            {wins.map((win) => (
              <WinCard key={win.artifact_id} win={win} />
            ))}
          </ul>
        )}
      </section>

      {/* ── 3. Weekly Cohort Pulse ───────────────────────────────────── */}
      <section aria-labelledby="pulse-heading">
        <h2
          id="pulse-heading"
          className="mb-3 text-sm font-semibold text-text-main"
        >
          Weekly cohort pulse
        </h2>

        <div className="rounded-lg border border-border bg-white px-5 py-5">
          {cohort_pulse ? (
            <p className="text-sm leading-relaxed text-zinc-700">
              {cohort_pulse}
            </p>
          ) : (
            <p className="text-sm text-zinc-500">
              Pulse refreshes every Friday. Check back then for a narrative
              summary of what your cohort tested and learned this week.
            </p>
          )}
        </div>
      </section>

      {/* ── 4. Peer experiments — one-tap apply ──────────────────────── */}
      <section aria-labelledby="experiments-heading">
        <h2
          id="experiments-heading"
          className="mb-1 text-sm font-semibold text-text-main"
        >
          Peer experiments
        </h2>
        <p className="mb-4 text-xs text-zinc-500">
          Applying queues the experiment as a draft in your approvals — your
          strategist reviews it against your baseline before anything ships.
        </p>

        {peerExperiments.length === 0 ? (
          <div className="rounded-lg border border-border bg-white px-5 py-4 text-sm text-zinc-500">
            No adoptable experiments yet. As peers ship and validate results,
            their experiments will appear here for one-tap adoption.
          </div>
        ) : (
          <ul className="space-y-3">
            {peerExperiments.map((exp) => (
              <ExperimentCard
                key={exp.artifact_id}
                experiment={exp}
                applyState={applyStates[exp.artifact_id] ?? 'idle'}
                onApply={() => void applyExperiment(exp.artifact_id)}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};

// ─── WinCard ─────────────────────────────────────────────────────────────────

const WinCard: React.FC<{ win: Win }> = ({ win }) => {
  const shippedDate = win.shipped_at
    ? new Date(win.shipped_at).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      })
    : null;

  return (
    <li className="rounded-lg border border-border bg-white px-5 py-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          {/* Peer label — always anonymized */}
          <span className="text-xs font-medium text-zinc-400 uppercase tracking-wide">
            {win.peer_anonymized_label}
          </span>

          {/* Metric — what was tested */}
          <p className="mt-1 text-sm font-medium text-text-main">
            {win.metric}
          </p>

          {/* Lift summary — the result, always shown as a narrative reading */}
          <p className="mt-1 text-sm text-zinc-600">{win.lift_summary}</p>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          {shippedDate ? (
            <span className="text-xs text-zinc-400">{shippedDate}</span>
          ) : null}
          {win.evidence_url ? (
            <a
              href={win.evidence_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-zinc-500 hover:text-text-main"
              aria-label="View evidence"
            >
              <ExternalLink className="h-3 w-3" aria-hidden="true" />
              <span>Source</span>
            </a>
          ) : null}
        </div>
      </div>
    </li>
  );
};

// ─── ExperimentCard ───────────────────────────────────────────────────────────

interface ExperimentCardProps {
  experiment: PeerExperiment;
  applyState: ApplyState;
  onApply: () => void;
}

const ExperimentCard: React.FC<ExperimentCardProps> = ({
  experiment,
  applyState,
  onApply,
}) => {
  const shippedDate = experiment.shipped_at
    ? new Date(experiment.shipped_at).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      })
    : null;

  const isDone = applyState === 'done';
  const isLoading = applyState === 'loading';
  const isError = applyState === 'error';

  return (
    <li className="rounded-lg border border-border bg-white px-5 py-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <span className="text-xs font-medium text-zinc-400 uppercase tracking-wide">
            {experiment.peer_anonymized_label}
          </span>

          <p className="mt-1 text-sm font-medium text-text-main">
            {experiment.metric}
          </p>

          <p className="mt-1 text-sm text-zinc-600">{experiment.lift_summary}</p>

          {shippedDate ? (
            <p className="mt-2 text-xs text-zinc-400">Shipped {shippedDate}</p>
          ) : null}

          {isError ? (
            <p className="mt-2 text-xs text-rose-600">
              Could not queue — try again in a moment.
            </p>
          ) : null}
        </div>

        <div className="shrink-0">
          {isDone ? (
            /* Success state — calm confirmation, not a celebration banner */
            <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-700">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              Queued for review
            </span>
          ) : (
            <button
              type="button"
              disabled={isLoading}
              onClick={onApply}
              className={[
                'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                isLoading
                  ? 'cursor-wait bg-zinc-100 text-zinc-400'
                  : 'bg-text-main text-white hover:bg-zinc-800',
              ].join(' ')}
              aria-busy={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center gap-1.5">
                  <Loader2
                    className="h-3 w-3 animate-spin"
                    aria-hidden="true"
                  />
                  Applying…
                </span>
              ) : (
                'Apply to my account'
              )}
            </button>
          )}
        </div>
      </div>

      {/* Evidence link — auditable claims: every result links to its source */}
      {experiment.evidence_url ? (
        <div className="mt-3 border-t border-border pt-3">
          <a
            href={experiment.evidence_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-zinc-500 hover:text-text-main"
          >
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
            <span>View source data</span>
          </a>
        </div>
      ) : null}
    </li>
  );
};

export default ClientCirclePage;
