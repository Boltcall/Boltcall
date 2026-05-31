/**
 * QueuedCreativeReview — variants awaiting client decision.
 *
 * Each queued artifact renders as a card with up to N variants side-by-side.
 * Per variant: image, headline, primary text, predicted CTR/CPL with CI,
 * a collapsible CreativeRationale ("Why this angle?"), and one-tap
 * Approve / Swap / Reject actions on the parent artifact.
 *
 * Design principles enforced:
 *  - #9 Approvals feel like supervision, not work: <10s, one tap, never >30s.
 *  - #2 Every alert paired with an action — the AI's rationale appears beside
 *       the predicted impact so the decision context is right there.
 *  - #10 The 20-person team illusion — language uses "your creative team
 *        queued this", never names the LLM.
 */
import { useState } from 'react';
import CreativeRationale from './CreativeRationale';

export interface QueuedVariant {
  seed: number | null;
  angle: string;
  image_url: string;
  headline: string;
  primary_text: string;
  cta: string;
  predicted_ctr: number | null;
  predicted_cpl_usd: number | null;
  ctr_ci_low: number | null;
  ctr_ci_high: number | null;
  cpl_ci_low: number | null;
  cpl_ci_high: number | null;
  predictor_model: string;
  rationale: string;
  angle_history: { wins: number; losses: number; avg_ctr: number | null };
  compliance_notes: Array<{ kind: string; finding: string }>;
}

export interface QueuedCreative {
  artifact_id: string;
  created_at: string;
  status: string;
  variants: QueuedVariant[];
  agent_reasoning: string[];
}

interface Props {
  queued: QueuedCreative[];
  onDecision: (artifact_id: string, action: 'approve' | 'reject' | 'swap', reason?: string) => Promise<void>;
}

export default function QueuedCreativeReview({ queued, onDecision }: Props) {
  if (queued.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-white p-6 text-center">
        <p className="text-sm font-medium text-zinc-700">
          You're all caught up. No creatives are waiting on your approval.
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          Your creative team queues fresh variants every Monday. We'll surface them here
          and notify you when one needs your eyes.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {queued.map((q) => (
        <QueuedArtifactCard key={q.artifact_id} queued={q} onDecision={onDecision} />
      ))}
    </div>
  );
}

function QueuedArtifactCard({
  queued,
  onDecision,
}: {
  queued: QueuedCreative;
  onDecision: Props['onDecision'];
}) {
  const [pending, setPending] = useState<null | 'approve' | 'reject' | 'swap'>(null);
  const [done, setDone] = useState<null | 'approve' | 'reject' | 'swap'>(null);
  const [error, setError] = useState<string | null>(null);

  const handle = async (action: 'approve' | 'reject' | 'swap') => {
    setPending(action);
    setError(null);
    try {
      await onDecision(queued.artifact_id, action);
      setDone(action);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed. Please try again.');
    } finally {
      setPending(null);
    }
  };

  return (
    <article className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
      <header className="border-b border-zinc-100 bg-zinc-50/60 px-5 py-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-zinc-500">
              Queued by your creative team
            </p>
            <h3 className="text-sm font-semibold text-zinc-900">
              {queued.variants.length} {queued.variants.length === 1 ? 'variant' : 'variants'} awaiting your yes
            </h3>
          </div>
          <p className="text-xs text-zinc-500">
            Queued {formatRelative(queued.created_at)}
          </p>
        </div>

        {queued.agent_reasoning.length > 0 && (
          <ul className="mt-2 space-y-0.5 border-l-2 border-zinc-300 pl-3 text-xs italic text-zinc-600">
            {queued.agent_reasoning.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        )}
      </header>

      <div className={`grid grid-cols-1 gap-0 md:grid-cols-${Math.min(queued.variants.length, 3)}`}>
        {queued.variants.map((v, i) => (
          <VariantPanel key={v.seed ?? i} variant={v} isFirst={i === 0} />
        ))}
      </div>

      <footer className="border-t border-zinc-100 bg-white px-5 py-3">
        {done ? (
          <DoneState action={done} />
        ) : (
          <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-zinc-500">
              One tap decides the whole batch — your creative team picks the top performer
              from the variants you approve.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <ActionButton
                action="reject"
                pending={pending}
                onClick={() => handle('reject')}
                variant="ghost"
              >
                Reject
              </ActionButton>
              <ActionButton
                action="swap"
                pending={pending}
                onClick={() => handle('swap')}
                variant="outline"
              >
                Ask for a swap
              </ActionButton>
              <ActionButton
                action="approve"
                pending={pending}
                onClick={() => handle('approve')}
                variant="primary"
              >
                Approve — launch this batch
              </ActionButton>
            </div>
          </div>
        )}
        {error && (
          <p className="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-800">
            {error}
          </p>
        )}
      </footer>
    </article>
  );
}

function VariantPanel({ variant, isFirst }: { variant: QueuedVariant; isFirst: boolean }) {
  return (
    <div className={`flex flex-col ${isFirst ? '' : 'border-t border-zinc-100 md:border-l md:border-t-0'}`}>
      <div className="relative aspect-square w-full bg-zinc-100">
        {variant.image_url ? (
          <img
            src={variant.image_url}
            alt={variant.headline}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-zinc-400">
            (no preview)
          </div>
        )}
        <span className="absolute left-2 top-2 inline-flex items-center rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white backdrop-blur-sm">
          {variant.angle}
        </span>
      </div>

      <div className="p-4">
        <h4 className="text-sm font-semibold text-zinc-900">{variant.headline || '(no headline)'}</h4>
        {variant.primary_text && (
          <p className="mt-1 line-clamp-3 text-xs text-zinc-600">{variant.primary_text}</p>
        )}

        <div className="mt-3 flex items-center gap-3 text-xs">
          <PredictedPill
            label="CTR"
            value={variant.predicted_ctr != null ? `${(variant.predicted_ctr * 100).toFixed(2)}%` : '—'}
          />
          <PredictedPill
            label="CPL"
            value={variant.predicted_cpl_usd != null ? `$${variant.predicted_cpl_usd.toFixed(2)}` : '—'}
          />
        </div>
      </div>

      <div className="mt-auto">
        <CreativeRationale
          angle={variant.angle}
          rationale={variant.rationale}
          predicted_ctr={variant.predicted_ctr}
          predicted_cpl_usd={variant.predicted_cpl_usd}
          ctr_ci_low={variant.ctr_ci_low}
          ctr_ci_high={variant.ctr_ci_high}
          cpl_ci_low={variant.cpl_ci_low}
          cpl_ci_high={variant.cpl_ci_high}
          predictor_model={variant.predictor_model}
          angle_history={variant.angle_history}
          compliance_notes={variant.compliance_notes}
        />
      </div>
    </div>
  );
}

function PredictedPill({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-baseline gap-1.5 rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1">
      <span className="text-[10px] uppercase tracking-wide text-zinc-500">{label}</span>
      <span className="text-xs font-semibold text-zinc-900">{value}</span>
    </span>
  );
}

function ActionButton({
  children,
  onClick,
  pending,
  action,
  variant,
}: {
  children: React.ReactNode;
  onClick: () => void;
  pending: null | 'approve' | 'reject' | 'swap';
  action: 'approve' | 'reject' | 'swap';
  variant: 'primary' | 'outline' | 'ghost';
}) {
  const isPending = pending === action;
  const isOtherPending = pending !== null && pending !== action;

  const base =
    'inline-flex items-center justify-center rounded-md px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed';
  const styles =
    variant === 'primary'
      ? 'bg-zinc-900 text-white hover:bg-black'
      : variant === 'outline'
        ? 'border border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50'
        : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isPending || isOtherPending}
      className={`${base} ${styles}`}
    >
      {isPending ? 'Saving…' : children}
    </button>
  );
}

function DoneState({ action }: { action: 'approve' | 'reject' | 'swap' }) {
  const map: Record<typeof action, { label: string; classes: string }> = {
    approve: { label: 'Approved — your creative team is shipping this to Meta now.', classes: 'bg-emerald-50 text-emerald-900 border-emerald-200' },
    swap: { label: 'Got it. Your creative team is preparing a fresh take.', classes: 'bg-sky-50 text-sky-900 border-sky-200' },
    reject: { label: 'Rejected. Your creative team is on it.', classes: 'bg-zinc-50 text-zinc-800 border-zinc-200' },
  };
  const { label, classes } = map[action];
  return (
    <div className={`rounded-md border px-3 py-2 text-xs ${classes}`}>{label}</div>
  );
}

function formatRelative(iso: string): string {
  try {
    const then = new Date(iso).getTime();
    const now = Date.now();
    const diff = Math.max(0, now - then);
    const minutes = Math.floor(diff / 60_000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  } catch {
    return iso;
  }
}
