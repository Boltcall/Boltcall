/**
 * Agency OS — Health Page
 * =======================
 *
 * The single-page founder dashboard for OS state. Designed to be the
 * 30-second morning glance: "Is the OS healthy? Anything stuck? Anything red?"
 *
 * Killer-UX principles (per audit Layer 7, Killer Feature #5):
 *   - One round trip on load. No N+1 from card to card.
 *   - Predicted-impact / severity drives card ORDER and color.
 *   - Every number has a unit + a comparison (today vs week, p50 vs p99, etc).
 *   - Auto-refresh every 60s; manual refresh always available.
 *   - Forbidden cleanly + explicitly if not a founder — no infinite spinner.
 *
 * Data source: `/.netlify/functions/agency-health-stats` (founder-gated).
 *
 * This page intentionally uses the existing Boltcall UI primitives
 * (`Card`, lucide-react icons, Tailwind tokens like `text-text-main`,
 * `text-text-muted`, `border-border`, `bg-brand-blue`) so it slots into the
 * dashboard layout without needing new design tokens.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Bot,
  CheckCircle2,
  CircleSlash,
  Clock,
  DollarSign,
  Gauge,
  RefreshCw,
  ShieldAlert,
  TrendingDown,
  TrendingUp,
  Users,
  XCircle,
} from 'lucide-react';

import Card from '../../../components/ui/Card';
import { PageSkeleton } from '../../../components/ui/loading-skeleton';
import { authedFetch } from '../../../lib/authedFetch';

// ─────────────────────────────────────────────────────────────────────────────
//   Types — match the server response shape (agency-health-stats.ts)
// ─────────────────────────────────────────────────────────────────────────────

interface CostByAgent {
  agent_name: string;
  usd: number;
}
interface LatencyByAgent {
  agent_name: string;
  p50_ms: number;
  p95_ms: number;
  p99_ms: number;
  n: number;
}
interface QueueBucket {
  hours_bucket: number; // 1, 3, 6, 12, 24, 48, or 999 (>= 48h)
  count: number;
}
interface BenchmarkPoint {
  ts: string;
  score: number;
}
interface BenchmarkByAgent {
  agent_target: string;
  scores: BenchmarkPoint[];
  latest: number | null;
}
interface ActiveClient {
  id: string;
  business_name: string | null;
  vertical: string | null;
  churn_risk: 'green' | 'yellow' | 'red';
  churn_risk_drivers: string[];
  mrr_usd: number;
  kpi_trend_3d: Array<{ date: string; calls: number; leads: number; bookings: number }>;
}
interface HealthStats {
  generated_at: string;
  degraded: boolean;
  degraded_reasons: string[];
  clients: {
    active_count: number;
    churned_30d_count: number;
    mrr_usd: number;
    by_status: Record<string, number>;
  };
  artifacts_24h: {
    generated: number;
    approved: number;
    rejected: number;
    shipped: number;
    deferred: number;
    reverted: number;
    draft: number;
    by_status: Record<string, number>;
  };
  rejection_reasons_7d: Array<{ reason: string; count: number }>;
  cost_today_by_agent: CostByAgent[];
  cost_week_by_agent: CostByAgent[];
  cost_month_by_agent: CostByAgent[];
  latency_by_agent: LatencyByAgent[];
  queue_age_buckets: QueueBucket[];
  queue_oldest_hours: number;
  queue_total_drafts: number;
  benchmarks_by_agent: BenchmarkByAgent[];
  active_clients: ActiveClient[];
}

// ─────────────────────────────────────────────────────────────────────────────
//   Formatters
// ─────────────────────────────────────────────────────────────────────────────

const fmtUSD = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n);
const fmtNum = (n: number) => new Intl.NumberFormat('en-US').format(n);
const fmtMs = (n: number) => {
  if (n < 1000) return `${n}ms`;
  return `${(n / 1000).toFixed(1)}s`;
};

const queueLabel = (b: number) => {
  if (b === 999) return '48h+';
  if (b === 1) return '<1h';
  return `<${b}h`;
};

const riskColor = (r: 'green' | 'yellow' | 'red') =>
  r === 'red'
    ? 'bg-red-50 border-red-200 text-red-700'
    : r === 'yellow'
    ? 'bg-amber-50 border-amber-200 text-amber-700'
    : 'bg-emerald-50 border-emerald-200 text-emerald-700';

const riskDot = (r: 'green' | 'yellow' | 'red') =>
  r === 'red' ? 'bg-red-500' : r === 'yellow' ? 'bg-amber-400' : 'bg-emerald-500';

// ─────────────────────────────────────────────────────────────────────────────
//   Tiny inline charts (no Recharts dep — keeps page weight low)
// ─────────────────────────────────────────────────────────────────────────────

interface SparklineProps {
  values: number[];
  width?: number;
  height?: number;
  stroke?: string;
}
const Sparkline: React.FC<SparklineProps> = ({
  values,
  width = 140,
  height = 32,
  stroke = '#2563eb',
}) => {
  if (values.length === 0) {
    return (
      <svg width={width} height={height} aria-hidden="true">
        <line x1={0} y1={height / 2} x2={width} y2={height / 2} stroke="#e5e7eb" strokeWidth={1} />
      </svg>
    );
  }
  if (values.length === 1) {
    const y = height / 2;
    return (
      <svg width={width} height={height} aria-hidden="true">
        <circle cx={width / 2} cy={y} r={2.5} fill={stroke} />
      </svg>
    );
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stepX = width / (values.length - 1);
  const points = values
    .map((v, i) => {
      const x = i * stepX;
      const y = height - ((v - min) / range) * (height - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  return (
    <svg width={width} height={height} aria-hidden="true">
      <polyline points={points} fill="none" stroke={stroke} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

interface BarRowProps {
  label: string;
  value: number;
  max: number;
  unit?: string;
  alert?: boolean;
}
const BarRow: React.FC<BarRowProps> = ({ label, value, max, unit, alert }) => {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3 py-1.5">
      <div className="w-16 text-xs text-text-muted shrink-0">{label}</div>
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            alert ? 'bg-red-500' : 'bg-brand-blue'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className={`w-20 text-xs text-right font-medium tabular-nums ${alert ? 'text-red-600' : 'text-text-main'}`}>
        {fmtNum(value)} {unit || ''}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
//   Main page
// ─────────────────────────────────────────────────────────────────────────────

const REFRESH_MS = 60_000;

const HealthPage: React.FC = () => {
  const [stats, setStats] = useState<HealthStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);

  const load = useCallback(async (isInitial: boolean) => {
    if (isInitial) setLoading(true);
    else setRefreshing(true);
    setError(null);
    try {
      const res = await authedFetch('/.netlify/functions/agency-health-stats', { method: 'GET' });
      if (res.status === 401 || res.status === 403) {
        setForbidden(true);
        setStats(null);
        return;
      }
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`HTTP ${res.status}: ${body.slice(0, 200)}`);
      }
      const data = (await res.json()) as HealthStats;
      setStats(data);
      setForbidden(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load health stats');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load(true);
    const id = setInterval(() => load(false), REFRESH_MS);
    return () => clearInterval(id);
  }, [load]);

  // Forbidden — explicit screen, NOT a spinner. Founder-only is the rule.
  if (forbidden) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="p-8 max-w-md text-center">
          <ShieldAlert className="w-10 h-10 text-amber-500 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-text-main mb-2">Forbidden</h3>
          <p className="text-sm text-text-muted">
            The Agency OS health dashboard is founder-only. Your account does
            not have the <code className="px-1 bg-gray-100 rounded">role=founder</code> claim.
          </p>
        </Card>
      </div>
    );
  }

  if (loading && !stats) {
    return <PageSkeleton />;
  }

  if (error && !stats) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="p-8 max-w-md text-center">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-text-main mb-2">Unable to load OS health</h3>
          <p className="text-sm text-text-muted mb-4">{error}</p>
          <button
            onClick={() => load(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-blue text-white rounded-lg hover:bg-brand-blueDark transition-colors text-sm"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
        </Card>
      </div>
    );
  }

  if (!stats) return null;

  return <HealthDashboard stats={stats} refreshing={refreshing} error={error} onRefresh={() => load(false)} />;
};

// ─────────────────────────────────────────────────────────────────────────────
//   Dashboard body — split out so loading/error states above stay readable
// ─────────────────────────────────────────────────────────────────────────────

interface DashboardProps {
  stats: HealthStats;
  refreshing: boolean;
  error: string | null;
  onRefresh: () => void;
}

const HealthDashboard: React.FC<DashboardProps> = ({ stats, refreshing, error, onRefresh }) => {
  // Highest cost agent (sorted desc by server).
  const maxCostToday = useMemo(
    () => stats.cost_today_by_agent.reduce((m, c) => Math.max(m, c.usd), 0),
    [stats.cost_today_by_agent],
  );
  const maxLatencyN = useMemo(
    () => stats.latency_by_agent.reduce((m, l) => Math.max(m, l.n), 0),
    [stats.latency_by_agent],
  );
  // Stuck queue alert — any draft >= 48h.
  const stuckCount = useMemo(
    () => stats.queue_age_buckets.find((b) => b.hours_bucket === 999)?.count || 0,
    [stats.queue_age_buckets],
  );
  const maxQueueBucket = useMemo(
    () => stats.queue_age_buckets.reduce((m, b) => Math.max(m, b.count), 0),
    [stats.queue_age_buckets],
  );
  const generatedAtLocal = useMemo(() => new Date(stats.generated_at).toLocaleTimeString(), [stats.generated_at]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-semibold text-text-main flex items-center gap-2">
            <Gauge className="w-5 h-5 text-brand-blue" />
            OS Health
          </h2>
          <p className="text-xs text-text-muted mt-0.5">
            Auto-refreshes every 60s. Last updated {generatedAtLocal}.
          </p>
        </div>
        <button
          onClick={onRefresh}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-border hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Degraded / refresh-error banners */}
      {stats.degraded && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          OS partially degraded — some kernel tables not available:{' '}
          <span className="font-mono">{stats.degraded_reasons.join(', ')}</span>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          Refresh failed: {error}. Showing last-known snapshot.
        </div>
      )}

      {/* ─── Top row: portfolio summary ──────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-2 text-text-muted mb-2">
            <Users className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Active clients</span>
          </div>
          <div className="text-3xl font-bold text-text-main tabular-nums">{stats.clients.active_count}</div>
          <div className="text-xs text-text-muted mt-1">
            {stats.clients.churned_30d_count > 0 ? (
              <span className="inline-flex items-center gap-1 text-red-600">
                <TrendingDown className="w-3 h-3" />
                {stats.clients.churned_30d_count} churned in last 30d
              </span>
            ) : (
              <span className="text-emerald-600">0 churn in last 30d</span>
            )}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2 text-text-muted mb-2">
            <DollarSign className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wider">MRR</span>
          </div>
          <div className="text-3xl font-bold text-text-main tabular-nums">{fmtUSD(stats.clients.mrr_usd)}</div>
          <div className="text-xs text-text-muted mt-1">Sum of live client MRR</div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2 text-text-muted mb-2">
            <Bot className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Artifacts (24h)</span>
          </div>
          <div className="text-3xl font-bold text-text-main tabular-nums">{stats.artifacts_24h.generated}</div>
          <div className="flex items-center gap-3 text-xs mt-1">
            <span className="inline-flex items-center gap-1 text-emerald-600">
              <CheckCircle2 className="w-3 h-3" />
              {stats.artifacts_24h.approved} approved
            </span>
            <span className="inline-flex items-center gap-1 text-red-600">
              <XCircle className="w-3 h-3" />
              {stats.artifacts_24h.rejected} rejected
            </span>
          </div>
        </Card>

        <Card className={`p-5 ${stuckCount > 0 ? 'border-red-300 ring-1 ring-red-200' : ''}`}>
          <div className="flex items-center gap-2 text-text-muted mb-2">
            <Clock className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Queue</span>
          </div>
          <div className="text-3xl font-bold text-text-main tabular-nums">{stats.queue_total_drafts}</div>
          <div className="text-xs text-text-muted mt-1">
            {stuckCount > 0 ? (
              <span className="inline-flex items-center gap-1 text-red-600 font-medium">
                <AlertTriangle className="w-3 h-3" />
                {stuckCount} stuck &gt; 48h
              </span>
            ) : (
              <>Oldest {stats.queue_oldest_hours.toFixed(1)}h</>
            )}
          </div>
        </Card>
      </div>

      {/* ─── Middle row: cost + latency + rejection reasons ──────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cost per agent (today vs week vs month) */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-text-main inline-flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-amber-500" />
              Cost per agent
            </h3>
            <div className="text-xs text-text-muted">today &middot; week &middot; month</div>
          </div>
          {stats.cost_today_by_agent.length === 0 ? (
            <EmptyHint text="No cost_incurred events today." />
          ) : (
            <div className="space-y-2">
              {stats.cost_today_by_agent.slice(0, 8).map((c) => {
                const week = stats.cost_week_by_agent.find((w) => w.agent_name === c.agent_name)?.usd || 0;
                const month = stats.cost_month_by_agent.find((m) => m.agent_name === c.agent_name)?.usd || 0;
                return (
                  <div key={c.agent_name} className="flex items-center justify-between text-xs gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-text-main truncate">{c.agent_name}</div>
                      <div className="h-1.5 mt-1 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-400 rounded-full"
                          style={{ width: `${maxCostToday > 0 ? (c.usd / maxCostToday) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                    <div className="text-right tabular-nums shrink-0 w-32">
                      <span className="font-semibold text-text-main">{fmtUSD(c.usd)}</span>
                      <span className="text-text-muted"> &middot; {fmtUSD(week)} </span>
                      <span className="text-text-muted">&middot; {fmtUSD(month)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Latency p50/p95/p99 */}
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-text-main inline-flex items-center gap-2 mb-4">
            <Gauge className="w-4 h-4 text-brand-blue" />
            Latency by agent (7d)
          </h3>
          {stats.latency_by_agent.length === 0 ? (
            <EmptyHint text="No latency_ms events recorded." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-text-muted">
                    <th className="text-left font-medium py-1">Agent</th>
                    <th className="text-right font-medium py-1">p50</th>
                    <th className="text-right font-medium py-1">p95</th>
                    <th className="text-right font-medium py-1">p99</th>
                    <th className="text-right font-medium py-1">n</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.latency_by_agent.slice(0, 10).map((l) => (
                    <tr key={l.agent_name} className="border-t border-border">
                      <td className="py-1.5 text-text-main truncate max-w-[120px]">{l.agent_name}</td>
                      <td className="py-1.5 text-right tabular-nums">{fmtMs(l.p50_ms)}</td>
                      <td className="py-1.5 text-right tabular-nums">{fmtMs(l.p95_ms)}</td>
                      <td className="py-1.5 text-right tabular-nums text-amber-600">{fmtMs(l.p99_ms)}</td>
                      <td className="py-1.5 text-right tabular-nums text-text-muted">
                        {maxLatencyN > 0 ? l.n : 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Top rejection reasons (7d) */}
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-text-main inline-flex items-center gap-2 mb-4">
            <XCircle className="w-4 h-4 text-red-500" />
            Top rejection reasons (7d)
          </h3>
          {stats.rejection_reasons_7d.length === 0 ? (
            <EmptyHint text="No rejections recorded in the last 7 days." good />
          ) : (
            <div className="space-y-2">
              {stats.rejection_reasons_7d.map((r) => (
                <div
                  key={r.reason}
                  className="flex items-start justify-between gap-3 text-xs py-1.5 border-b border-border last:border-0"
                >
                  <span className="text-text-main flex-1 break-words leading-relaxed">{r.reason}</span>
                  <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-700 font-semibold tabular-nums shrink-0">
                    {r.count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* ─── Queue histogram + Benchmark sparklines ─────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-text-main inline-flex items-center gap-2">
              <Clock className="w-4 h-4 text-brand-blue" />
              Queue age distribution
            </h3>
            <span className="text-xs text-text-muted">
              {stats.queue_total_drafts} drafts &middot; oldest {stats.queue_oldest_hours.toFixed(1)}h
            </span>
          </div>
          {stats.queue_total_drafts === 0 ? (
            <EmptyHint text="No drafts in the queue. The fleet is current." good />
          ) : (
            <div>
              {stats.queue_age_buckets.map((b) => (
                <BarRow
                  key={b.hours_bucket}
                  label={queueLabel(b.hours_bucket)}
                  value={b.count}
                  max={maxQueueBucket}
                  alert={b.hours_bucket === 999 && b.count > 0}
                />
              ))}
              {stuckCount > 0 && (
                <div className="mt-3 flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded-md text-xs text-red-700">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                  {stuckCount} draft{stuckCount === 1 ? '' : 's'} stuck more than 48h — review the queue.
                </div>
              )}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-semibold text-text-main inline-flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            Benchmark scores (30d, by agent)
          </h3>
          {stats.benchmarks_by_agent.length === 0 ? (
            <EmptyHint text="No benchmark_score_recorded events in the last 30 days." />
          ) : (
            <div className="space-y-3">
              {stats.benchmarks_by_agent.slice(0, 8).map((b) => {
                const values = b.scores.map((s) => s.score);
                const latest = b.latest ?? 0;
                const passColor =
                  latest >= 8 ? '#16a34a' : latest >= 6 ? '#d97706' : '#dc2626';
                return (
                  <div key={b.agent_target} className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-text-main truncate">{b.agent_target}</div>
                      <div className="text-[10px] text-text-muted">
                        {values.length} run{values.length === 1 ? '' : 's'}
                      </div>
                    </div>
                    <Sparkline values={values} stroke={passColor} />
                    <div className="w-12 text-right text-sm font-semibold tabular-nums" style={{ color: passColor }}>
                      {latest.toFixed(1)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* ─── Active-clients health grid ──────────────────────────────────── */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-text-main inline-flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-500" />
            Active clients ({stats.active_clients.length})
          </h3>
          <div className="flex items-center gap-3 text-[10px] text-text-muted">
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> green
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400" /> yellow
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500" /> red
            </span>
          </div>
        </div>
        {stats.active_clients.length === 0 ? (
          <EmptyHint text="No live clients yet. Onboard your first engagement to populate this grid." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {[...stats.active_clients]
              // Red first, then yellow, then green. Within tier, biggest MRR first.
              .sort((a, b) => {
                const order = { red: 0, yellow: 1, green: 2 };
                if (order[a.churn_risk] !== order[b.churn_risk]) {
                  return order[a.churn_risk] - order[b.churn_risk];
                }
                return b.mrr_usd - a.mrr_usd;
              })
              .map((c) => (
                <ClientCard key={c.id} client={c} />
              ))}
          </div>
        )}
      </Card>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
//   Sub-components
// ─────────────────────────────────────────────────────────────────────────────

const EmptyHint: React.FC<{ text: string; good?: boolean }> = ({ text, good }) => (
  <div
    className={`flex items-center gap-2 text-xs py-6 ${
      good ? 'text-emerald-600' : 'text-text-muted'
    }`}
  >
    {good ? <CheckCircle2 className="w-4 h-4" /> : <CircleSlash className="w-4 h-4" />}
    <span>{text}</span>
  </div>
);

const ClientCard: React.FC<{ client: ActiveClient }> = ({ client }) => {
  // Combined 3-day trend: calls + leads + bookings = "activity".
  const activity = client.kpi_trend_3d.map((d) => d.calls + d.leads + d.bookings);
  const totalBookings = client.kpi_trend_3d.reduce((acc, d) => acc + d.bookings, 0);
  return (
    <div className={`rounded-lg border p-3 ${riskColor(client.churn_risk)}`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${riskDot(client.churn_risk)}`} />
            <span className="text-sm font-semibold text-text-main truncate">
              {client.business_name || 'Unnamed client'}
            </span>
          </div>
          <div className="text-[10px] text-text-muted mt-0.5 uppercase tracking-wide">
            {client.vertical || 'unspecified vertical'}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-xs font-semibold text-text-main tabular-nums">{fmtUSD(client.mrr_usd)}</div>
          <div className="text-[10px] text-text-muted">MRR</div>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 mt-2">
        <div className="text-[10px] text-text-muted">
          {totalBookings} booking{totalBookings === 1 ? '' : 's'} in 3d
        </div>
        <Sparkline
          values={activity}
          width={90}
          height={24}
          stroke={
            client.churn_risk === 'red'
              ? '#dc2626'
              : client.churn_risk === 'yellow'
              ? '#d97706'
              : '#059669'
          }
        />
      </div>
      {client.churn_risk_drivers.length > 0 && (
        <div className="mt-2 pt-2 border-t border-current border-opacity-20">
          <div className="text-[10px] uppercase tracking-wider mb-1 opacity-70">Risk drivers</div>
          <div className="flex flex-wrap gap-1">
            {client.churn_risk_drivers.slice(0, 3).map((d) => (
              <span
                key={d}
                className="px-1.5 py-0.5 bg-white/60 rounded text-[10px] font-mono"
              >
                {d}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Re-export with a default so the lazy import in AppRoutes works.
export default HealthPage;
