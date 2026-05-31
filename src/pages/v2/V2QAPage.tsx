/**
 * V2 QA Page — /v2/qa
 *
 * Wave-3 page. Wrapped externally in AppRoutes.tsx as:
 *   <Route path="qa" element={<V2OptInGate><V2QAPage /></V2OptInGate>} />
 *
 * The parent DashboardLayoutV2 supplies the centered container
 * (max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-10) — this page starts directly
 * with its narrative slot.
 *
 * Layout:
 *   1. KPI strip:   avg score this week, scored count, failing count, trend arrow
 *   2. Filter bar:  date range, score threshold slider, rubric-dimension multi-select,
 *                   "Run QA on unscored calls" button
 *   3. Failed/low-score call list: per-row rubric mini-bars + verdict + link to /v2/calls?call=<id>
 *
 * Cold-start guard: <30 scored calls OR <14 days history -> "Unlock at 30 calls"
 * placeholder (data list hidden; KPI strip + run button stay visible so users
 * can kick off the first scoring pass).
 *
 * Data:
 *   GET /.netlify/functions/saas-v2-qa-list
 *   POST /.netlify/functions/saas-v2-qa-run
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ClipboardCheck,
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertCircle,
  Play,
  RefreshCw,
  CheckCircle2,
  ChevronRight,
  Filter as FilterIcon,
} from 'lucide-react';
import { authedFetch } from '../../lib/authedFetch';
import { FUNCTIONS_BASE } from '../../lib/api';

// ─── Types ─────────────────────────────────────────────────────────────────

type DimKey = 'empathy' | 'accuracy' | 'intent_capture' | 'transfer_handled';

const DIM_LABELS: Record<DimKey, string> = {
  empathy: 'Empathy',
  accuracy: 'Accuracy',
  intent_capture: 'Intent capture',
  transfer_handled: 'Transfer',
};

const ALL_DIMS: DimKey[] = ['empathy', 'accuracy', 'intent_capture', 'transfer_handled'];

interface Kpi {
  avg_score: number | null;
  scored_count: number;
  failing_count: number;
  trend_pct: number | null;
}

interface ScoredCall {
  call_id: string;
  scored_at: string;
  rubric: Record<DimKey, number | null>;
  overall: number;
  verdict_oneliner: string;
}

interface QaListResponse {
  kpi: Kpi;
  calls: ScoredCall[];
  total: number;
  warning?: string;
}

interface QaRunResponse {
  scored_count: number;
  skipped_count: number;
  failures: Array<{ call_id: string; reason: string }>;
  average_score: number | null;
  low_score_count: number;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function isoToday(): string {
  return new Date().toISOString().split('T')[0];
}

function isoDaysAgo(n: number): string {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
}

function formatScore(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '—';
  return n.toFixed(1);
}

function relativeTime(iso: string): string {
  try {
    const d = new Date(iso);
    const diffMs = Date.now() - d.getTime();
    const mins = Math.round(diffMs / 60_000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.round(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.round(hours / 24);
    return `${days}d ago`;
  } catch {
    return iso.split('T')[0] ?? '';
  }
}

// ─── Sub-components ─────────────────────────────────────────────────────────

const DimBar: React.FC<{ dim: DimKey; value: number | null }> = ({ dim, value }) => {
  const hasValue = typeof value === 'number';
  const pct = hasValue ? Math.max(0, Math.min(100, (value / 10) * 100)) : 0;
  const tone =
    !hasValue ? 'bg-zinc-200'
      : value >= 8 ? 'bg-emerald-500'
        : value >= 6 ? 'bg-amber-500'
          : 'bg-rose-500';
  return (
    <div className="flex items-center gap-2 min-w-0">
      <span className="text-[10px] uppercase tracking-wide text-zinc-500 w-16 flex-shrink-0">
        {DIM_LABELS[dim]}
      </span>
      <div className="flex-1 h-1.5 rounded-full bg-zinc-100 overflow-hidden">
        <div
          className={`h-full ${tone} transition-all`}
          style={{ width: `${pct}%` }}
          aria-label={`${DIM_LABELS[dim]} score ${hasValue ? value : 'unscored'}`}
        />
      </div>
      <span className="text-[10px] tabular-nums text-zinc-600 w-6 text-right">
        {hasValue ? value : '—'}
      </span>
    </div>
  );
};

const TrendArrow: React.FC<{ pct: number | null }> = ({ pct }) => {
  if (pct === null || !Number.isFinite(pct)) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-zinc-400">
        <Minus className="w-3.5 h-3.5" />
        <span>no prior</span>
      </span>
    );
  }
  if (Math.abs(pct) < 1) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-zinc-500">
        <Minus className="w-3.5 h-3.5" />
        <span>flat</span>
      </span>
    );
  }
  if (pct > 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
        <TrendingUp className="w-3.5 h-3.5" />
        <span>+{pct.toFixed(1)}%</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-rose-700">
      <TrendingDown className="w-3.5 h-3.5" />
      <span>{pct.toFixed(1)}%</span>
    </span>
  );
};

const KpiCard: React.FC<{
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  tone?: 'neutral' | 'warn' | 'good';
}> = ({ label, value, sub, tone = 'neutral' }) => {
  const ring =
    tone === 'warn' ? 'ring-rose-200 bg-rose-50/40'
      : tone === 'good' ? 'ring-emerald-200 bg-emerald-50/40'
        : 'ring-zinc-200 bg-white';
  return (
    <div className={`rounded-2xl ring-1 ${ring} p-4 md:p-5 flex flex-col gap-1`}>
      <div className="text-[11px] uppercase tracking-wide text-zinc-500 font-medium">{label}</div>
      <div className="text-2xl md:text-3xl font-semibold text-zinc-900 tabular-nums leading-tight">
        {value}
      </div>
      {sub && <div className="text-xs text-zinc-600 mt-0.5">{sub}</div>}
    </div>
  );
};

// ─── Main page ──────────────────────────────────────────────────────────────

const V2QAPage: React.FC = () => {
  // Filters
  const [dateFrom, setDateFrom] = useState<string>(isoDaysAgo(7));
  const [dateTo, setDateTo] = useState<string>(isoToday());
  const [maxScore, setMaxScore] = useState<number>(5);
  const [selectedDims, setSelectedDims] = useState<DimKey[]>([]);

  // Data + UI state
  const [kpi, setKpi] = useState<Kpi>({
    avg_score: null,
    scored_count: 0,
    failing_count: 0,
    trend_pct: null,
  });
  const [calls, setCalls] = useState<ScoredCall[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [warning, setWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState<boolean>(false);
  const [runResult, setRunResult] = useState<QaRunResponse | null>(null);

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError(null);
    setWarning(null);
    try {
      const params = new URLSearchParams({
        date_from: dateFrom,
        date_to: dateTo,
        max_score: String(maxScore),
      });
      if (selectedDims.length > 0) {
        params.set('dimensions', selectedDims.join(','));
      }
      const res = await authedFetch(`${FUNCTIONS_BASE}/saas-v2-qa-list?${params.toString()}`);
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`Failed to load QA list (${res.status}) ${body.slice(0, 200)}`);
      }
      const data = (await res.json()) as QaListResponse;
      setKpi(data.kpi);
      setCalls(data.calls);
      if (data.warning) setWarning(data.warning);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load QA data');
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, maxScore, selectedDims]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const handleRunQa = useCallback(async () => {
    if (running) return;
    setRunning(true);
    setRunResult(null);
    setError(null);
    try {
      const res = await authedFetch(`${FUNCTIONS_BASE}/saas-v2-qa-run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ window_days: 7 }),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`Failed to run QA (${res.status}) ${body.slice(0, 200)}`);
      }
      const data = (await res.json()) as QaRunResponse;
      setRunResult(data);
      // Refresh list so newly scored rows appear.
      await fetchList();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run QA');
    } finally {
      setRunning(false);
    }
  }, [running, fetchList]);

  const toggleDim = useCallback((dim: DimKey) => {
    setSelectedDims((prev) =>
      prev.includes(dim) ? prev.filter((d) => d !== dim) : [...prev, dim],
    );
  }, []);

  const coldStart = useMemo(
    () => kpi.scored_count < 30,
    [kpi.scored_count],
  );

  const avgTone: 'neutral' | 'warn' | 'good' =
    kpi.avg_score === null ? 'neutral'
      : kpi.avg_score >= 8 ? 'good'
        : kpi.avg_score < 6 ? 'warn'
          : 'neutral';

  return (
    <div className="space-y-6">
      {/* Narrative header */}
      <header className="space-y-1">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-zinc-500 font-medium">
          <ClipboardCheck className="w-3.5 h-3.5" />
          <span>Call QA</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-semibold text-zinc-900 leading-tight">
          How your agent handled this week&apos;s calls
        </h1>
        <p className="text-sm text-zinc-600 max-w-2xl">
          Every call is scored on four dimensions: empathy, accuracy, intent capture, and
          transfer handling. Low-score calls below show where the agent missed — open one to
          listen and decide whether to tighten the prompt.
        </p>
      </header>

      {/* KPI strip */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <KpiCard
          label="Average score (this window)"
          value={formatScore(kpi.avg_score)}
          sub={<TrendArrow pct={kpi.trend_pct} />}
          tone={avgTone}
        />
        <KpiCard
          label="Calls scored"
          value={kpi.scored_count.toLocaleString()}
          sub={<span>{dateFrom} → {dateTo}</span>}
        />
        <KpiCard
          label="Failing (&lt; 6.0)"
          value={kpi.failing_count.toLocaleString()}
          sub={
            kpi.scored_count > 0 ? (
              <span>
                {Math.round((kpi.failing_count / kpi.scored_count) * 100)}% of scored
              </span>
            ) : (
              <span>—</span>
            )
          }
          tone={kpi.failing_count > 0 ? 'warn' : 'neutral'}
        />
        <KpiCard
          label="Threshold"
          value={`≤ ${maxScore.toFixed(1)}`}
          sub={<span>Showing calls at or under this score</span>}
        />
      </section>

      {/* Filter bar */}
      <section className="rounded-2xl ring-1 ring-zinc-200 bg-white p-4 md:p-5">
        <div className="flex flex-col md:flex-row md:items-end md:flex-wrap gap-4">
          <div className="flex items-center gap-2 text-xs font-medium text-zinc-500 uppercase tracking-wide">
            <FilterIcon className="w-3.5 h-3.5" />
            <span>Filters</span>
          </div>

          {/* Date range */}
          <label className="flex flex-col gap-1 text-xs text-zinc-600">
            <span className="font-medium">From</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              max={dateTo}
              className="rounded-md border border-zinc-300 bg-white text-sm text-zinc-900 px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-zinc-600">
            <span className="font-medium">To</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              min={dateFrom}
              max={isoToday()}
              className="rounded-md border border-zinc-300 bg-white text-sm text-zinc-900 px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            />
          </label>

          {/* Score threshold slider */}
          <label className="flex flex-col gap-1 text-xs text-zinc-600 flex-1 min-w-[180px]">
            <span className="font-medium">
              Max overall score:{' '}
              <span className="tabular-nums text-zinc-900">{maxScore.toFixed(1)}</span>
            </span>
            <input
              type="range"
              min={0}
              max={10}
              step={0.5}
              value={maxScore}
              onChange={(e) => setMaxScore(Number.parseFloat(e.target.value))}
              className="w-full accent-blue-600"
              aria-label="Maximum overall score filter"
            />
          </label>

          {/* Dimensions multi-select */}
          <div className="flex flex-col gap-1 text-xs text-zinc-600">
            <span className="font-medium">Failing dimensions</span>
            <div className="flex flex-wrap gap-1.5">
              {ALL_DIMS.map((dim) => {
                const active = selectedDims.includes(dim);
                return (
                  <button
                    key={dim}
                    type="button"
                    onClick={() => toggleDim(dim)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                      active
                        ? 'bg-zinc-900 text-white border-zinc-900'
                        : 'bg-white text-zinc-700 border-zinc-300 hover:border-zinc-400'
                    }`}
                  >
                    {DIM_LABELS[dim]}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-end gap-2 ml-auto">
            <button
              type="button"
              onClick={fetchList}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-700 border border-zinc-300 rounded-md hover:bg-zinc-50 disabled:opacity-50"
              aria-label="Refresh QA list"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              type="button"
              onClick={handleRunQa}
              disabled={running}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-60 disabled:cursor-not-allowed"
              title="Score every unscored call from the last 7 days"
            >
              {running ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Scoring…
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  Run QA on unscored calls
                </>
              )}
            </button>
          </div>
        </div>

        {/* Run result toast */}
        {runResult && (
          <div className="mt-4 flex items-start gap-2 rounded-md bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs text-emerald-900">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <div className="font-medium">
                Scored {runResult.scored_count} call{runResult.scored_count === 1 ? '' : 's'}
                {runResult.average_score !== null && (
                  <> — avg {runResult.average_score.toFixed(1)}/10</>
                )}
              </div>
              {(runResult.skipped_count > 0 || runResult.failures.length > 0) && (
                <div className="text-emerald-800">
                  {runResult.skipped_count > 0 && (
                    <>{runResult.skipped_count} skipped (already scored or cap reached)</>
                  )}
                  {runResult.failures.length > 0 && (
                    <>
                      {runResult.skipped_count > 0 ? ' · ' : ''}
                      {runResult.failures.length} failed (
                      {runResult.failures
                        .slice(0, 3)
                        .map((f) => f.reason)
                        .join(', ')}
                      {runResult.failures.length > 3 ? '…' : ''})
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Warnings + errors */}
      {warning && (
        <div className="flex items-start gap-2 rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-900">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{warning}</span>
        </div>
      )}
      {error && (
        <div className="flex items-start gap-2 rounded-md bg-rose-50 border border-rose-200 px-3 py-2 text-xs text-rose-900">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Cold-start placeholder */}
      {coldStart && !loading && (
        <div className="rounded-2xl ring-1 ring-zinc-200 bg-gradient-to-br from-zinc-50 to-white p-8 text-center space-y-3">
          <ClipboardCheck className="w-10 h-10 mx-auto text-zinc-400" />
          <h2 className="text-lg font-semibold text-zinc-900">QA insights unlock at 30 calls</h2>
          <p className="text-sm text-zinc-600 max-w-md mx-auto">
            Your workspace has scored {kpi.scored_count}{' '}
            {kpi.scored_count === 1 ? 'call' : 'calls'} so far. Once you cross 30 scored calls,
            this page will surface trend lines, recurring failure patterns, and per-dimension
            breakdowns. Run scoring on unscored calls to get there faster.
          </p>
        </div>
      )}

      {/* Failed/low-score call list */}
      {!coldStart && (
        <section className="rounded-2xl ring-1 ring-zinc-200 bg-white">
          <div className="flex items-center justify-between px-4 md:px-5 py-3 border-b border-zinc-100">
            <h2 className="text-sm font-semibold text-zinc-900">
              Low-score calls{' '}
              <span className="text-zinc-500 font-normal">
                ({calls.length} {calls.length === 1 ? 'call' : 'calls'})
              </span>
            </h2>
            <span className="text-xs text-zinc-500">Threshold: overall ≤ {maxScore.toFixed(1)}</span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-10 text-sm text-zinc-500 gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading scored calls…
            </div>
          ) : calls.length === 0 ? (
            <div className="py-10 text-center text-sm text-zinc-500">
              No calls under {maxScore.toFixed(1)} in this window. Loosen the threshold or
              widen the date range.
            </div>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {calls.map((c) => (
                <li key={c.call_id}>
                  <Link
                    to={`/v2/calls?call=${encodeURIComponent(c.call_id)}`}
                    className="block px-4 md:px-5 py-4 hover:bg-zinc-50 transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      {/* Left: overall + call meta */}
                      <div className="flex flex-col items-center gap-1 w-16 flex-shrink-0">
                        <div
                          className={`text-2xl font-semibold tabular-nums leading-none ${
                            c.overall >= 6 ? 'text-amber-600' : 'text-rose-600'
                          }`}
                        >
                          {c.overall.toFixed(1)}
                        </div>
                        <div className="text-[10px] uppercase tracking-wide text-zinc-500">
                          overall
                        </div>
                      </div>

                      {/* Middle: rubric bars + verdict */}
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
                          {ALL_DIMS.map((dim) => (
                            <DimBar key={dim} dim={dim} value={c.rubric[dim]} />
                          ))}
                        </div>
                        {c.verdict_oneliner && (
                          <p className="text-sm text-zinc-700 leading-snug line-clamp-2">
                            {c.verdict_oneliner}
                          </p>
                        )}
                        <div className="text-[11px] text-zinc-500 flex items-center gap-2">
                          <span className="font-mono">{c.call_id.slice(0, 12)}…</span>
                          <span>·</span>
                          <span>scored {relativeTime(c.scored_at)}</span>
                        </div>
                      </div>

                      <ChevronRight className="w-4 h-4 text-zinc-400 flex-shrink-0 mt-1" />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
};

export default V2QAPage;
