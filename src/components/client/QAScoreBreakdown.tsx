/**
 * QAScoreBreakdown — 5-dimension rubric scores with an AI explanation per dim.
 *
 * This is what the client sees inside the per-call drawer on /client/calls.
 * Design principle #4: every number has a narrative. We render the score
 * bar AND a one-line strategist note from the explanation payload.
 * Design principle #1: NOT chatbot styling — strategist note, not a bubble.
 */
import React from 'react';

export interface DimScore {
  dim_key: string;
  label: string;
  score: number | null;
}

export interface DimNote {
  dim_key: string;
  note: string;
}

interface QAScoreBreakdownProps {
  final_score: number | null;
  dim_scores: DimScore[];
  per_dim_notes?: DimNote[];
}

const QAScoreBreakdown: React.FC<QAScoreBreakdownProps> = ({
  final_score,
  dim_scores,
  per_dim_notes,
}) => {
  const noteByDim = new Map<string, string>(
    (per_dim_notes || []).map((n) => [n.dim_key, n.note]),
  );

  const overallTone = scoreTone(final_score);

  return (
    <div className="space-y-5">
      <div className="flex items-baseline justify-between border-b border-zinc-200 pb-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
          QA score breakdown
        </h3>
        <div className="flex items-baseline gap-1">
          <span className={`text-3xl font-semibold tabular-nums ${overallTone.textClass}`}>
            {final_score === null ? '—' : final_score.toFixed(1)}
          </span>
          <span className="text-sm text-zinc-400">/ 10</span>
        </div>
      </div>
      <ul className="space-y-4">
        {dim_scores.map((d) => {
          const tone = scoreTone(d.score);
          const pct = d.score === null ? 0 : (d.score / 10) * 100;
          const note = noteByDim.get(d.dim_key);
          return (
            <li key={d.dim_key} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-zinc-800">{d.label}</span>
                <span className={`tabular-nums ${tone.textClass}`}>
                  {d.score === null ? '—' : d.score.toFixed(1)}
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-zinc-100">
                <div
                  className={`h-full rounded-full ${tone.barClass}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              {note && (
                <p className="pt-1 text-[13px] leading-relaxed text-zinc-600">
                  {note}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};

function scoreTone(score: number | null): { textClass: string; barClass: string } {
  if (score === null) {
    return { textClass: 'text-zinc-400', barClass: 'bg-zinc-200' };
  }
  if (score >= 8) {
    return { textClass: 'text-emerald-600', barClass: 'bg-emerald-500' };
  }
  if (score >= 6) {
    return { textClass: 'text-amber-600', barClass: 'bg-amber-500' };
  }
  return { textClass: 'text-rose-600', barClass: 'bg-rose-500' };
}

export default QAScoreBreakdown;
