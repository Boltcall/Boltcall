/**
 * ClientApprovalsPage — /client/approvals
 *
 * Client-side approval queue for artifacts flagged for client review.
 * Smart-sorted by urgency (irreversible → oldest → highest risk).
 * One-tap approve / reject / defer — no confirmation modal.
 *
 * Design principles:
 *   1. AI never feels like a chatbot — copy says "your team", "your strategist".
 *   2. Every alert paired with an action — each row has three action buttons inline.
 *   3. Founder invisible — attribution is "your strategist team", not a name.
 *   4. Every number paired with a narrative — impact metric shown in context.
 *   5. One screen, one action — the primary action per row is Approve; other
 *      actions are available but visually secondary.
 *   8. Auditable — diff shows Before / After / Why so the client can verify
 *      every claim before tapping.
 *
 * Data flow:
 *   GET  /.netlify/functions/agency-client-approvals  — list on mount
 *   POST /.netlify/functions/agency-client-approvals  — action (approve/reject/defer)
 *   Refetch after each successful action (keeps list fresh, no stale state).
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Card, CardContent } from '../../../components/ui/Card';
import { authedFetch } from '../../../lib/authedFetch';

// ─── Types mirroring backend PendingArtifact shape ───────────────────────────

interface ClientDiff {
  before: string;
  after: string;
  why: string;
}

interface PredictedImpact {
  metric?: string;
  value?: number;
}

interface PendingArtifact {
  id: string;
  type: string;
  generated_by: string;
  created_at: string;
  reversible: boolean;
  hours_old: number;
  defer_count: number;
  client_diff: ClientDiff;
  risk_level: 'low' | 'medium' | 'high';
  predicted_impact: PredictedImpact | null;
  shipping_deadline: string | null;
}

interface ApprovalsResponse {
  artifacts: PendingArtifact[];
  auto_approve_low_risk: boolean;
  counts: {
    pending: number;
    high_risk: number;
    irreversible: number;
  };
}

// ─── Friendly display maps ────────────────────────────────────────────────────

const FRIENDLY_TYPE: Record<string, string> = {
  prompt_revision: 'Agent script update',
  knowledge_base: 'Knowledge base addition',
  ad_creative: 'New ad creative',
  ad_copy: 'New ad copy',
  optimization_brief: 'Strategy update',
  agent_prompt: 'New agent version',
  experiment_plan: 'Experiment proposal',
  client_outreach: 'Outreach draft',
};

function friendlyType(raw: string): string {
  return FRIENDLY_TYPE[raw] ?? raw.replace(/_/g, ' ');
}

function formatAge(hours: number): string {
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${Math.round(hours)}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

function formatDeadline(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Skeleton row shown while loading. */
const SkeletonRow: React.FC = () => (
  <Card className="animate-pulse border-zinc-100">
    <CardContent className="p-5">
      <div className="flex items-start gap-4">
        <div className="h-4 w-32 rounded bg-zinc-100" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-full rounded bg-zinc-100" />
          <div className="h-3 w-5/6 rounded bg-zinc-100" />
        </div>
      </div>
    </CardContent>
  </Card>
);

/** Risk badge. Low risk is intentionally understated. */
const RiskBadge: React.FC<{ level: PendingArtifact['risk_level'] }> = ({
  level,
}) => {
  const styles = {
    low: 'bg-zinc-100 text-zinc-600',
    medium: 'bg-amber-50 text-amber-700',
    high: 'bg-rose-50 text-rose-700',
  };
  const labels = { low: 'Low risk', medium: 'Review carefully', high: 'High impact' };
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-medium ${styles[level]}`}
    >
      {labels[level]}
    </span>
  );
};

/** Irreversible badge shown when backend marks reversible=false. */
const IrreversibleBadge: React.FC = () => (
  <span className="inline-block rounded-full bg-rose-100 px-2.5 py-0.5 text-[11px] font-medium text-rose-700">
    Cannot be undone
  </span>
);

/** Impact chip — only shown when predicted_impact has a value. */
const ImpactChip: React.FC<{ impact: PredictedImpact }> = ({ impact }) => {
  if (!impact.metric || impact.value == null) return null;
  const pct = impact.value > 0 ? `+${impact.value}%` : `${impact.value}%`;
  return (
    <span className="inline-block rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700">
      Expected: {pct} {impact.metric}
    </span>
  );
};

/** One row in the queue. One-tap actions, no modal. */
const ArtifactRow: React.FC<{
  artifact: PendingArtifact;
  acting: boolean;
  onAction: (id: string, action: 'approve' | 'reject' | 'defer') => void;
}> = ({ artifact, acting, onAction }) => {
  const deadline = formatDeadline(artifact.shipping_deadline);

  return (
    <Card className="border-zinc-200 bg-white transition-shadow hover:shadow-md">
      <CardContent className="p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          {/* Left: metadata + diff */}
          <div className="min-w-0 flex-1 space-y-3">
            {/* Type + badges */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-zinc-900">
                {friendlyType(artifact.type)}
              </span>
              <RiskBadge level={artifact.risk_level} />
              {!artifact.reversible && <IrreversibleBadge />}
              {artifact.predicted_impact && (
                <ImpactChip impact={artifact.predicted_impact} />
              )}
            </div>

            {/* Plain-language diff */}
            <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-3 text-sm leading-relaxed">
              <div className="flex gap-2">
                <span className="mt-0.5 shrink-0 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Now
                </span>
                <p className="text-zinc-700">{artifact.client_diff.before}</p>
              </div>
              <div className="my-2 border-t border-zinc-100" />
              <div className="flex gap-2">
                <span className="mt-0.5 shrink-0 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  After
                </span>
                <p className="text-zinc-800 font-medium">{artifact.client_diff.after}</p>
              </div>
              <div className="my-2 border-t border-zinc-100" />
              <div className="flex gap-2">
                <span className="mt-0.5 shrink-0 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Why
                </span>
                <p className="text-zinc-600">{artifact.client_diff.why}</p>
              </div>
            </div>

            {/* Footer meta */}
            <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400">
              <span>{formatAge(artifact.hours_old)}</span>
              {deadline && (
                <>
                  <span>·</span>
                  <span className="text-amber-600">Ships by {deadline}</span>
                </>
              )}
              {artifact.defer_count > 0 && (
                <>
                  <span>·</span>
                  <span>Deferred {artifact.defer_count}×</span>
                </>
              )}
            </div>
          </div>

          {/* Right: action buttons */}
          <div className="flex shrink-0 gap-2 sm:flex-col sm:items-stretch">
            <button
              type="button"
              disabled={acting}
              onClick={() => onAction(artifact.id, 'approve')}
              className="flex-1 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none sm:min-w-[96px]"
            >
              {acting ? 'Saving…' : 'Approve'}
            </button>
            <button
              type="button"
              disabled={acting}
              onClick={() => onAction(artifact.id, 'defer')}
              className="flex-1 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none sm:min-w-[96px]"
            >
              Defer
            </button>
            <button
              type="button"
              disabled={acting}
              onClick={() => onAction(artifact.id, 'reject')}
              className="flex-1 rounded-lg border border-rose-100 bg-white px-4 py-2 text-sm font-medium text-rose-600 transition hover:border-rose-200 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none sm:min-w-[96px]"
            >
              Reject
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

/** Banner shown when the client has auto_approve_low_risk enabled. */
const AutoApproveBanner: React.FC<{ lowRiskCount: number }> = ({
  lowRiskCount,
}) => {
  if (lowRiskCount === 0) return null;
  return (
    <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50/60 px-5 py-3 text-sm">
      <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-blue-400" />
      <p className="text-blue-900">
        Your account is set to auto-approve low-risk changes after 72 hours.{' '}
        {lowRiskCount === 1
          ? '1 low-risk item below will self-approve if you take no action.'
          : `${lowRiskCount} low-risk items below will self-approve if you take no action.`}{' '}
        You can still reject at any time.
      </p>
    </div>
  );
};

/** Empty state — friendly, not alarming. */
const EmptyState: React.FC = () => (
  <div className="flex min-h-[40vh] flex-col items-center justify-center px-6 text-center">
    <div className="mb-4 grid h-12 w-12 place-items-center rounded-full bg-zinc-100">
      <svg
        className="h-6 w-6 text-zinc-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    </div>
    <p className="text-base font-medium text-zinc-700">
      Nothing needs your input right now — your AI team is on top of it.
    </p>
    <p className="mt-1 max-w-xs text-sm text-zinc-400">
      When your strategist prepares something that benefits from your sign-off,
      it will appear here.
    </p>
  </div>
);

// ─── Page ─────────────────────────────────────────────────────────────────────

const ClientApprovalsPage: React.FC = () => {
  const [data, setData] = useState<ApprovalsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Tracks which artifact is currently being acted upon (to disable its buttons).
  const [actingId, setActingId] = useState<string | null>(null);

  const fetchQueue = useCallback(async () => {
    try {
      setError(null);
      const res = await authedFetch(
        '/.netlify/functions/agency-client-approvals',
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as ApprovalsResponse;
      setData(json);
    } catch {
      setError(
        'We could not load your approval queue right now. Your strategist has been notified.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchQueue();
  }, [fetchQueue]);

  const handleAction = useCallback(
    async (id: string, action: 'approve' | 'reject' | 'defer') => {
      setActingId(id);
      try {
        const res = await authedFetch(
          '/.netlify/functions/agency-client-approvals',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ artifact_id: id, action }),
          },
        );
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
        }
        // Refetch the whole list so sort order stays correct.
        await fetchQueue();
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Something went wrong. Please try again.',
        );
      } finally {
        setActingId(null);
      }
    },
    [fetchQueue],
  );

  const artifacts = data?.artifacts ?? [];
  const autoApproveLowRisk = data?.auto_approve_low_risk ?? false;
  const lowRiskCount = artifacts.filter((a) => a.risk_level === 'low').length;
  const highRiskCount = data?.counts.high_risk ?? 0;
  const irreversibleCount = data?.counts.irreversible ?? 0;

  return (
    <div className="space-y-6 px-4 py-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Client portal
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-zinc-900">
            Your approval queue
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-zinc-500">
            Your strategist team surfaces items here when your sign-off helps
            them move faster. Approve, defer, or push back — one tap, no forms.
          </p>
        </div>

        {/* Summary strip — only when there's something to show */}
        {!loading && artifacts.length > 0 && (
          <div className="flex items-stretch gap-3 text-right text-xs">
            <CountStat label="Pending" value={artifacts.length} />
            {highRiskCount > 0 && (
              <CountStat
                label="High impact"
                value={highRiskCount}
                accent="rose"
              />
            )}
            {irreversibleCount > 0 && (
              <CountStat
                label="Irreversible"
                value={irreversibleCount}
                accent="amber"
              />
            )}
          </div>
        )}
      </div>

      {/* Auto-approve banner */}
      {autoApproveLowRisk && !loading && (
        <AutoApproveBanner lowRiskCount={lowRiskCount} />
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <span className="mt-0.5 shrink-0">&#9888;</span>
          <span>{error}</span>
        </div>
      )}

      {/* Loading skeletons */}
      {loading && (
        <div className="space-y-4">
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && artifacts.length === 0 && <EmptyState />}

      {/* Artifact rows */}
      {!loading && artifacts.length > 0 && (
        <div className="space-y-4">
          {artifacts.map((artifact) => (
            <ArtifactRow
              key={artifact.id}
              artifact={artifact}
              acting={actingId === artifact.id}
              onAction={handleAction}
            />
          ))}
        </div>
      )}

      {/* Footer note when list is non-empty */}
      {!loading && artifacts.length > 0 && (
        <p className="text-center text-xs text-zinc-400">
          Items are sorted by urgency. Irreversible and high-impact changes
          appear first.
        </p>
      )}
    </div>
  );
};

// ─── Helper ───────────────────────────────────────────────────────────────────

const CountStat: React.FC<{
  label: string;
  value: number;
  accent?: 'rose' | 'amber';
}> = ({ label, value, accent }) => {
  const tone =
    accent === 'rose'
      ? 'text-rose-700'
      : accent === 'amber'
        ? 'text-amber-700'
        : 'text-zinc-900';
  return (
    <div className="min-w-[72px] rounded-md border border-zinc-200 bg-white px-3 py-2">
      <div className={`text-base font-semibold tabular-nums ${tone}`}>
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-wider text-zinc-500">
        {label}
      </div>
    </div>
  );
};

export default ClientApprovalsPage;
