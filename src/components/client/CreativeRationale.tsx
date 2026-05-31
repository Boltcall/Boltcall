/**
 * CreativeRationale — collapsible "Why this angle?" explanation per variant.
 *
 * Design-principle wins:
 *  - #1 Strategist's-note styling (no chat bubbles, no robot icon).
 *  - #4 Every number has a narrative (predicted CTR/CPL paired with
 *       interpretation copy + the historical angle performance).
 *  - #8 The client can audit every claim — compliance findings are surfaced
 *       inline rather than hidden.
 *
 * Lives inside QueuedCreativeReview's per-variant card. Closed by default;
 * one-tap reveal that reads in <10 seconds.
 */
import { useState } from 'react';

interface AngleHistory {
  wins: number;
  losses: number;
  avg_ctr: number | null;
}

interface ComplianceNote {
  kind: string;
  finding: string;
}

interface Props {
  angle: string;
  rationale: string;
  predicted_ctr: number | null;
  predicted_cpl_usd: number | null;
  ctr_ci_low: number | null;
  ctr_ci_high: number | null;
  cpl_ci_low: number | null;
  cpl_ci_high: number | null;
  predictor_model: string;
  angle_history: AngleHistory;
  compliance_notes: ComplianceNote[];
}

const ANGLE_DESCRIPTION: Record<string, string> = {
  proof: 'Proof — leads with social validation (customer outcomes, before/afters, reviews). Best for high-consideration verticals where trust is the friction.',
  fear: 'Fear of loss — frames the cost of inaction (missed slots, lost savings, problem-getting-worse). Best for verticals where the problem is acute and time-bound.',
  status: 'Status — speaks to people who pay for the premium experience. Best for med spas, cosmetic dentistry, premium home services.',
  curiosity: 'Curiosity — pattern-interrupts the scroll with an unanswered question or unusual frame. Best for top-of-feed discovery.',
};

export default function CreativeRationale({
  angle,
  rationale,
  predicted_ctr,
  predicted_cpl_usd,
  ctr_ci_low,
  ctr_ci_high,
  cpl_ci_low,
  cpl_ci_high,
  predictor_model,
  angle_history,
  compliance_notes,
}: Props) {
  const [open, setOpen] = useState(false);

  const ctrPct = predicted_ctr != null ? `${(predicted_ctr * 100).toFixed(2)}%` : '—';
  const ctrCi =
    ctr_ci_low != null && ctr_ci_high != null
      ? `${(ctr_ci_low * 100).toFixed(2)}–${(ctr_ci_high * 100).toFixed(2)}%`
      : null;
  const cplStr = predicted_cpl_usd != null ? `$${predicted_cpl_usd.toFixed(2)}` : '—';
  const cplCi =
    cpl_ci_low != null && cpl_ci_high != null
      ? `$${cpl_ci_low.toFixed(2)}–$${cpl_ci_high.toFixed(2)}`
      : null;

  const angleHistoryReading = (() => {
    const total = angle_history.wins + angle_history.losses;
    if (total === 0) {
      return `First time we're testing the ${angle} angle for you.`;
    }
    const winPct = total > 0 ? Math.round((angle_history.wins / total) * 100) : 0;
    return `On the ${angle} angle, ${angle_history.wins} of ${total} variants we've put in front of you have shipped (${winPct}%).`;
  })();

  const predictorReading =
    predictor_model === 'ridge'
      ? 'Prediction trained on your own ad history (ridge regression).'
      : predictor_model === 'vertical_prior'
        ? 'Prediction based on the median for your vertical — not enough of your own data yet.'
        : 'Prediction based on a baseline prior; treat as directional, not exact.';

  return (
    <div className="border-t border-zinc-200 bg-zinc-50/40">
      <button
        type="button"
        onClick={() => setOpen((x) => !x)}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-4 py-2.5 text-left text-xs font-medium text-zinc-700 hover:bg-zinc-100"
      >
        <span className="flex items-center gap-2">
          <span className="text-zinc-400">{open ? '▾' : '▸'}</span>
          Why this angle? Strategist's note
        </span>
        <span className="text-[10px] uppercase tracking-wide text-zinc-400">
          {open ? 'Hide' : 'Read · 10s'}
        </span>
      </button>

      {open && (
        <div className="px-4 pb-4 pt-1 text-sm leading-relaxed text-zinc-700">
          <p className="italic text-zinc-800">{rationale}</p>

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-md border border-zinc-200 bg-white p-3">
              <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                Angle: {angle}
              </p>
              <p className="mt-1 text-xs text-zinc-700">
                {ANGLE_DESCRIPTION[angle] ?? 'Custom angle.'}
              </p>
              <p className="mt-2 text-xs text-zinc-600">{angleHistoryReading}</p>
            </div>

            <div className="rounded-md border border-zinc-200 bg-white p-3">
              <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                Predicted performance
              </p>
              <p className="mt-1 text-xs text-zinc-700">
                CTR <span className="font-semibold text-zinc-900">{ctrPct}</span>
                {ctrCi && <span className="text-zinc-500"> (80% CI {ctrCi})</span>}
              </p>
              <p className="mt-0.5 text-xs text-zinc-700">
                CPL <span className="font-semibold text-zinc-900">{cplStr}</span>
                {cplCi && <span className="text-zinc-500"> (80% CI {cplCi})</span>}
              </p>
              <p className="mt-2 text-[11px] text-zinc-500">{predictorReading}</p>
            </div>
          </div>

          {compliance_notes.length > 0 && (
            <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3">
              <p className="text-[11px] uppercase tracking-wide text-amber-700">
                Compliance check — passed with notes
              </p>
              <ul className="mt-1.5 space-y-1 text-xs text-amber-900">
                {compliance_notes.map((n, i) => (
                  <li key={i}>
                    <span className="font-medium capitalize">
                      {n.kind.replace(/_/g, ' ')}:
                    </span>{' '}
                    {n.finding}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
