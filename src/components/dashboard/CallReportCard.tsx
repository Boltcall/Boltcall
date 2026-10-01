import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle, AlertTriangle, CheckCircle2, CircleSlash, Lightbulb, RefreshCw, Scale, ThumbsUp, XCircle,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

// Mirrors the report written by netlify/functions/retell-call-scorer.ts
// (retell_calls.score_report) and the rows in retell_call_scores.
type ScoreReport =
  | {
      status: 'scored';
      summary?: string;
      went_well?: string;
      went_wrong?: string;
      top_improvement?: string;
      weighted_score?: number;
      law_firm?: boolean;
    }
  | { status: 'failed'; error?: string };

interface DimScore {
  dim: string;
  score: number;
  notes: string | null;
}

interface LoadedReport {
  report: ScoreReport | null;
  scores: DimScore[];
  durationS: number | null;
}

// Law-firm intake checks, in the order a managing partner thinks about them.
const LAW_CHECKS: Array<{ dim: string; label: string }> = [
  { dim: 'law_disclosure', label: "Said it's an AI and the call is recorded" },
  { dim: 'law_no_legal_advice', label: 'Gave no legal advice' },
  { dim: 'law_intake_complete', label: 'Collected full intake' },
  { dim: 'law_urgent_escalation', label: 'Escalated urgent matter' },
  { dim: 'law_consult_or_callback', label: 'Booked consult or captured callback' },
];

const GENERAL_CHECKS: Array<{ dim: string; label: string; lawLabel?: string }> = [
  { dim: 'booking_attempt', label: 'Moved toward booking', lawLabel: 'Moved toward a consultation' },
  { dim: 'objection_handling', label: 'Handled the caller’s concerns' },
  { dim: 'on_script', label: 'Gave the required disclosures' },
  { dim: 'caller_sentiment', label: 'Caller left satisfied' },
  { dim: 'hallucination_free', label: 'Stayed accurate, nothing made up' },
  { dim: 'latency_ok', label: 'Natural conversation flow' },
];

const pct = (n: number) => Math.round(Math.min(1, Math.max(0, n)) * 100);

function verdict(score: number) {
  if (score >= 0.8) return { label: 'Strong', tone: 'text-green-700 bg-green-50 border-green-200 dark:text-green-300 dark:bg-green-950/30 dark:border-green-900' };
  if (score >= 0.6) return { label: 'Mixed', tone: 'text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-950/30 dark:border-amber-900' };
  return { label: 'Needs attention', tone: 'text-red-700 bg-red-50 border-red-200 dark:text-red-300 dark:bg-red-950/30 dark:border-red-900' };
}

function checkState(score: number) {
  if (score >= 0.8) return { text: 'Yes', icon: <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" aria-hidden="true" />, tone: 'text-green-700 dark:text-green-400' };
  if (score >= 0.5) return { text: 'Partly', icon: <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />, tone: 'text-amber-700 dark:text-amber-400' };
  return { text: 'No', icon: <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" aria-hidden="true" />, tone: 'text-red-700 dark:text-red-400' };
}

const urgencyLabel = (s: number) => (s >= 0.67 ? 'Urgent' : s >= 0.34 ? 'Time sensitive' : 'Routine');

const cardClass = 'rounded-xl border border-gray-200 dark:border-[#1e1e24] bg-white dark:bg-[#111114] p-4 md:p-5';

function notScoredReason(durationMs: number | undefined, callStatus: string | undefined, durationS: number | null) {
  const seconds = durationMs != null ? durationMs / 1000 : durationS;
  if (callStatus === 'not_connected' || callStatus === 'error') {
    return 'This call never connected, so there was nothing to score.';
  }
  if (seconds != null && seconds < 8) {
    return 'This call was under 8 seconds, too short to judge.';
  }
  return 'Reports are written for answered calls over 8 seconds that have a recorded conversation. A call that just ended can take a minute or two.';
}

interface Props {
  callId: string;
  durationMs?: number;
  callStatus?: string;
}

const CallReportCard: React.FC<Props> = ({ callId, durationMs, callStatus }) => {
  const [state, setState] = useState<'loading' | 'error' | 'ready'>('loading');
  const [data, setData] = useState<LoadedReport | null>(null);

  const load = useCallback(async () => {
    setState('loading');
    try {
      const [callRes, scoresRes] = await Promise.all([
        supabase.from('retell_calls').select('score_report, duration_s').eq('call_id', callId).maybeSingle(),
        supabase.from('retell_call_scores').select('dim, score, notes').eq('call_id', callId),
      ]);
      if (callRes.error) throw callRes.error;
      if (scoresRes.error) throw scoresRes.error;
      setData({
        report: (callRes.data?.score_report as ScoreReport | null) ?? null,
        scores: (scoresRes.data ?? []) as DimScore[],
        durationS: (callRes.data?.duration_s as number | null) ?? null,
      });
      setState('ready');
    } catch {
      setState('error');
    }
  }, [callId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (state === 'loading') {
    return (
      <div className={cardClass} aria-busy="true" aria-label="Loading call report">
        <div className="h-4 w-28 rounded bg-gray-100 dark:bg-neutral-800 animate-pulse" />
        <div className="mt-4 h-3 w-full rounded bg-gray-100 dark:bg-neutral-800 animate-pulse" />
        <div className="mt-2 h-3 w-4/5 rounded bg-gray-100 dark:bg-neutral-800 animate-pulse" />
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="h-16 rounded-lg bg-gray-100 dark:bg-neutral-800 animate-pulse" />
          <div className="h-16 rounded-lg bg-gray-100 dark:bg-neutral-800 animate-pulse" />
        </div>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className={cardClass} role="alert">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-600 dark:text-red-400 mt-0.5" aria-hidden="true" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Couldn&rsquo;t load the call report</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">Check your connection and try again.</p>
          </div>
          <button
            onClick={() => void load()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 dark:border-[#2a2a30] px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#17171b] transition-colors duration-200 ease-out"
          >
            <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { report, scores, durationS } = data!;

  if (!report) {
    return (
      <div className={cardClass}>
        <div className="flex items-start gap-3">
          <CircleSlash className="w-5 h-5 shrink-0 text-gray-400 mt-0.5" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">No report for this call</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">{notScoredReason(durationMs, callStatus, durationS)}</p>
          </div>
        </div>
      </div>
    );
  }

  if (report.status === 'failed') {
    return (
      <div className={cardClass}>
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">We couldn&rsquo;t analyze this call</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
              The analysis failed on our side. Nothing is wrong with the call, and your agent is unaffected. The transcript and recording below are still available.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const law = report.law_firm === true;
  const byDim = new Map(scores.map((s) => [s.dim, s]));
  const overall = typeof report.weighted_score === 'number' ? report.weighted_score : null;
  const v = overall != null ? verdict(overall) : null;
  const nothingWrong = !report.went_wrong || /^nothing notable\.?$/i.test(report.went_wrong.trim());

  const lawRows = law ? LAW_CHECKS.filter((c) => byDim.has(c.dim)) : [];
  const generalRows = GENERAL_CHECKS.filter((c) => byDim.has(c.dim));
  const urgency = byDim.get('urgency_signal');

  const renderRow = (key: string, label: string) => {
    const s = byDim.get(key)!;
    const st = checkState(s.score);
    return (
      <li key={key} className="flex items-start gap-3 py-2.5">
        <span className="mt-0.5 shrink-0">{st.icon}</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{label}</p>
          {s.notes && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{s.notes}</p>}
        </div>
        <span className={`shrink-0 text-xs font-semibold ${st.tone}`}>{st.text}</span>
      </li>
    );
  };

  return (
    <section className={cardClass} aria-label="Call report">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Call report</p>
          {report.summary && (
            <p className="mt-2 text-sm leading-relaxed text-gray-800 dark:text-gray-200">{report.summary}</p>
          )}
        </div>
        {overall != null && v && (
          <div className="shrink-0 text-right" aria-label={`Overall score ${pct(overall)} out of 100, ${v.label}`}>
            <p className="text-3xl font-bold leading-none tabular-nums text-gray-900 dark:text-gray-100">
              {pct(overall)}
              <span className="text-sm font-medium text-gray-400">/100</span>
            </p>
            <span className={`mt-2 inline-block rounded-full border px-2 py-0.5 text-xs font-semibold ${v.tone}`}>{v.label}</span>
          </div>
        )}
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {report.went_well && (
          <div className="rounded-lg bg-gray-50 dark:bg-[#17171b] p-3">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-green-700 dark:text-green-400">
              <ThumbsUp className="w-3.5 h-3.5" aria-hidden="true" /> What went well
            </p>
            <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">{report.went_well}</p>
          </div>
        )}
        {report.went_wrong && (
          <div className="rounded-lg bg-gray-50 dark:bg-[#17171b] p-3">
            <p className={`flex items-center gap-1.5 text-xs font-semibold ${nothingWrong ? 'text-gray-500 dark:text-gray-400' : 'text-amber-700 dark:text-amber-400'}`}>
              <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" /> What went wrong
            </p>
            <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">{nothingWrong ? 'Nothing notable on this call.' : report.went_wrong}</p>
          </div>
        )}
      </div>

      {report.top_improvement && (
        <div className="mt-3 rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50/60 dark:bg-blue-950/30 p-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300">
            <Lightbulb className="w-3.5 h-3.5" aria-hidden="true" /> Biggest improvement
          </p>
          <p className="mt-1 text-sm text-gray-800 dark:text-gray-200">{report.top_improvement}</p>
          <Link
            to="/dashboard/qa/review"
            className="mt-2 inline-block text-xs font-medium text-blue-700 dark:text-blue-300 hover:underline underline-offset-2"
          >
            Review suggested agent improvements
          </Link>
        </div>
      )}

      {(lawRows.length > 0 || generalRows.length > 0 || urgency) && (
        <div className="mt-5 space-y-4">
          {lawRows.length > 0 && (
            <div>
              <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                <Scale className="w-3.5 h-3.5" aria-hidden="true" /> Law firm intake checks
              </h4>
              <ul className="mt-1 divide-y divide-gray-100 dark:divide-[#1e1e24]">
                {lawRows.map((c) => renderRow(c.dim, c.label))}
              </ul>
            </div>
          )}
          {(generalRows.length > 0 || urgency) && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Call quality</h4>
              <ul className="mt-1 divide-y divide-gray-100 dark:divide-[#1e1e24]">
                {generalRows.map((c) => renderRow(c.dim, law && c.lawLabel ? c.lawLabel : c.label))}
                {urgency && (
                  <li className="flex items-start gap-3 py-2.5">
                    <span className="mt-0.5 shrink-0 w-4" aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">How urgent the call was</p>
                      {urgency.notes && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{urgency.notes}</p>}
                    </div>
                    <span className="shrink-0 text-xs font-semibold text-gray-700 dark:text-gray-300">{urgencyLabel(urgency.score)}</span>
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
};

export default CallReportCard;
