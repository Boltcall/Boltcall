import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, BarChart3, Loader2, AlertCircle, MessageSquare, ArrowRight } from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import V2OptInGate from '../../components/v2/V2OptInGate';
import { authedFetch } from '../../lib/authedFetch';
import { FUNCTIONS_BASE } from '../../lib/api';
import {
  fetchFunnelData,
  fetchRoiTrend,
  fetchSourceAttribution,
  fetchResponseTimeStats,
  type FunnelStage,
  type RoiTrendPoint,
  type SourceAttribution,
  type ResponseTimeStats,
  type AnalyticsFilters,
} from '../../lib/analyticsApi';
import { useAuth } from '../../contexts/AuthContext';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface NarrativeInsight {
  id: string;
  headline: string;
  body: string;
  sparkline_data: Array<{ x: string | number; y: number }>;
  anomaly_score?: number;
  direction?: 'up' | 'down' | 'flat';
}

interface NarrativeResponse {
  insights: NarrativeInsight[];
  generated_at: string;
  cold_start?: boolean;
  reason?: string;
}

type TabKey = 'narrative' | 'charts';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function rangeFor14Days(): { start: string; end: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 14);
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}

function directionBadge(direction?: 'up' | 'down' | 'flat'): string {
  if (direction === 'up') return 'text-emerald-700 bg-emerald-50';
  if (direction === 'down') return 'text-rose-700 bg-rose-50';
  return 'text-zinc-600 bg-zinc-100';
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

const Sparkline: React.FC<{ data: Array<{ x: string | number; y: number }>; color?: string }> = ({
  data,
  color = '#2563EB',
}) => {
  if (!data || data.length === 0) {
    return <div className="h-12 w-full rounded bg-zinc-50" />;
  }
  return (
    <div className="h-12 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <Line
            type="monotone"
            dataKey="y"
            stroke={color}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

const InsightCard: React.FC<{ insight: NarrativeInsight }> = ({ insight }) => {
  const color =
    insight.direction === 'up' ? '#059669' : insight.direction === 'down' ? '#E11D48' : '#2563EB';
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="rounded-2xl border border-zinc-200 bg-white p-5 flex flex-col gap-3"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-semibold text-zinc-900 leading-snug">{insight.headline}</h3>
        {insight.direction && (
          <span
            className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${directionBadge(insight.direction)}`}
          >
            {insight.direction}
          </span>
        )}
      </div>
      <p className="text-sm text-zinc-600 leading-relaxed">{insight.body}</p>
      <Sparkline data={insight.sparkline_data} color={color} />
    </motion.div>
  );
};

const AskTheData: React.FC<{ chartId: string; chartLabel: string }> = ({ chartId, chartLabel }) => {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const q = question.trim();
      if (!q || loading) return;
      setLoading(true);
      setError(null);
      setAnswer(null);
      try {
        const res = await authedFetch(`${FUNCTIONS_BASE}/saas-v2-ask-ai`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: q,
            context: { chart_id: chartId, chart_label: chartLabel, page: 'analytics' },
          }),
        });
        if (!res.ok) {
          // Stubbed endpoint — fail gracefully
          setError(`Ask-AI is still wiring up (status ${res.status}).`);
          return;
        }
        const data = await res.json().catch(() => null);
        setAnswer(
          typeof data?.answer === 'string' ? data.answer : 'No answer returned yet — endpoint is stubbed.',
        );
      } catch {
        setError('Ask-AI is still wiring up.');
      } finally {
        setLoading(false);
      }
    },
    [question, chartId, chartLabel, loading],
  );

  return (
    <div className="mt-3 pt-3 border-t border-zinc-100">
      <form onSubmit={onSubmit} className="flex items-center gap-2">
        <MessageSquare className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={`Ask about ${chartLabel.toLowerCase()}…`}
          className="flex-1 text-xs px-2 py-1.5 rounded-md border border-zinc-200 bg-zinc-50 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !question.trim()}
          className="text-xs font-medium text-blue-600 hover:text-blue-700 disabled:text-zinc-300 px-2 py-1 rounded-md inline-flex items-center gap-1"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
        </button>
      </form>
      {answer && (
        <p className="mt-2 text-xs text-zinc-700 bg-blue-50/50 rounded-md px-2 py-1.5 border border-blue-100">
          {answer}
        </p>
      )}
      {error && <p className="mt-2 text-xs text-amber-700">{error}</p>}
    </div>
  );
};

const ChartCard: React.FC<{
  id: string;
  title: string;
  children: React.ReactNode;
}> = ({ id, title, children }) => (
  <div className="rounded-2xl border border-zinc-200 bg-white p-5">
    <h3 className="text-sm font-semibold text-zinc-900 mb-3">{title}</h3>
    <div className="h-64">{children}</div>
    <AskTheData chartId={id} chartLabel={title} />
  </div>
);

const ColdStartPlaceholder: React.FC<{ reason?: string }> = ({ reason }) => (
  <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50/50 p-10 text-center">
    <Sparkles className="w-8 h-8 text-zinc-400 mx-auto mb-3" />
    <h3 className="text-base font-semibold text-zinc-900 mb-1">
      Insights unlock at 30 calls
    </h3>
    <p className="text-sm text-zinc-600 max-w-md mx-auto">
      {reason ||
        'Boltcall needs at least 30 calls or 14 days of data before the narrative engine can spot meaningful patterns. Keep your agent running — insights will appear here automatically.'}
    </p>
  </div>
);

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

const V2AnalyticsPageInner: React.FC = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState<TabKey>('narrative');

  // Narrative state
  const [narrative, setNarrative] = useState<NarrativeResponse | null>(null);
  const [narrativeLoading, setNarrativeLoading] = useState(true);
  const [narrativeError, setNarrativeError] = useState<string | null>(null);

  // Charts state
  const [funnel, setFunnel] = useState<FunnelStage[]>([]);
  const [roiTrend, setRoiTrend] = useState<RoiTrendPoint[]>([]);
  const [sources, setSources] = useState<SourceAttribution[]>([]);
  const [responseStats, setResponseStats] = useState<ResponseTimeStats | null>(null);
  const [chartsLoading, setChartsLoading] = useState(false);

  const filters: AnalyticsFilters = useMemo(
    () => ({ dateRange: rangeFor14Days(), userId: user?.id }),
    [user?.id],
  );

  // Fetch narrative insights once on mount
  useEffect(() => {
    let aborted = false;
    (async () => {
      setNarrativeLoading(true);
      setNarrativeError(null);
      try {
        const res = await authedFetch(`${FUNCTIONS_BASE}/saas-v2-narrative-insights`, {
          method: 'GET',
        });
        if (!res.ok) {
          if (!aborted) setNarrativeError(`Narrative engine unavailable (${res.status}).`);
          return;
        }
        const data = (await res.json()) as NarrativeResponse;
        if (!aborted) setNarrative(data);
      } catch {
        if (!aborted) setNarrativeError('Narrative engine unavailable.');
      } finally {
        if (!aborted) setNarrativeLoading(false);
      }
    })();
    return () => {
      aborted = true;
    };
  }, [user?.id]);

  // Load charts data when Charts tab opens
  useEffect(() => {
    if (tab !== 'charts') return;
    let aborted = false;
    (async () => {
      setChartsLoading(true);
      try {
        const [f, r, s, rt] = await Promise.all([
          fetchFunnelData(filters).catch(() => []),
          fetchRoiTrend(6).catch(() => []),
          fetchSourceAttribution(filters).catch(() => []),
          fetchResponseTimeStats(filters).catch(() => null),
        ]);
        if (aborted) return;
        setFunnel(f);
        setRoiTrend(r);
        setSources(s);
        setResponseStats(rt);
      } finally {
        if (!aborted) setChartsLoading(false);
      }
    })();
    return () => {
      aborted = true;
    };
  }, [tab, filters]);

  const showColdStart =
    !narrativeLoading &&
    !narrativeError &&
    (narrative?.cold_start === true || (narrative?.insights || []).length === 0);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Analytics</h1>
          <p className="text-sm text-zinc-600 mt-1">
            Plain-English insights from the last 14 days. Switch to Charts for the
            classic view.
          </p>
        </div>
        <div className="inline-flex items-center bg-zinc-100 rounded-lg p-0.5 self-start">
          <button
            type="button"
            onClick={() => setTab('narrative')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md inline-flex items-center gap-1.5 transition-colors ${
              tab === 'narrative'
                ? 'bg-white text-zinc-900 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Narrative
          </button>
          <button
            type="button"
            onClick={() => setTab('charts')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md inline-flex items-center gap-1.5 transition-colors ${
              tab === 'charts'
                ? 'bg-white text-zinc-900 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Charts
          </button>
        </div>
      </div>

      {/* Narrative tab */}
      {tab === 'narrative' && (
        <section>
          {narrativeLoading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-zinc-200 bg-white p-5 animate-pulse"
                >
                  <div className="h-4 w-2/3 bg-zinc-100 rounded mb-3" />
                  <div className="h-3 w-full bg-zinc-100 rounded mb-2" />
                  <div className="h-3 w-5/6 bg-zinc-100 rounded mb-4" />
                  <div className="h-12 w-full bg-zinc-50 rounded" />
                </div>
              ))}
            </div>
          )}

          {!narrativeLoading && narrativeError && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-amber-800">{narrativeError}</div>
            </div>
          )}

          {!narrativeLoading && !narrativeError && showColdStart && (
            <ColdStartPlaceholder reason={narrative?.reason} />
          )}

          {!narrativeLoading && !narrativeError && !showColdStart && narrative && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {narrative.insights.map((insight) => (
                  <InsightCard key={insight.id} insight={insight} />
                ))}
              </div>
              {narrative.generated_at && (
                <p className="text-[11px] text-zinc-400 mt-3">
                  Generated {new Date(narrative.generated_at).toLocaleString()}
                </p>
              )}
            </>
          )}
        </section>
      )}

      {/* Charts tab */}
      {tab === 'charts' && (
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {chartsLoading && (
            <div className="col-span-full flex items-center justify-center h-32 text-sm text-zinc-500">
              <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading charts…
            </div>
          )}

          {!chartsLoading && (
            <>
              <ChartCard id="funnel" title="Conversion Funnel">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={funnel} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 10, fill: '#71717a' }}
                      interval={0}
                      angle={-20}
                      textAnchor="end"
                      height={50}
                    />
                    <YAxis tick={{ fontSize: 11, fill: '#71717a' }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#2563EB" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard id="roi-trend" title="ROI Trend (6 months)">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={roiTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="roiGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#71717a' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#71717a' }} />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="roi"
                      stroke="#7C3AED"
                      strokeWidth={2}
                      fill="url(#roiGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard id="sources" title="Lead Sources">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={sources}
                    layout="vertical"
                    margin={{ top: 10, right: 10, left: 50, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis type="number" tick={{ fontSize: 11, fill: '#71717a' }} />
                    <YAxis
                      type="category"
                      dataKey="source"
                      tick={{ fontSize: 11, fill: '#71717a' }}
                      width={70}
                    />
                    <Tooltip />
                    <Bar dataKey="count" fill="#059669" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard id="response-time" title="Response Time by Hour">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={responseStats?.byHour || []}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="hour" tick={{ fontSize: 11, fill: '#71717a' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#71717a' }} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="avgSeconds"
                      stroke="#F59E0B"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>
            </>
          )}
        </section>
      )}
    </div>
  );
};

const V2AnalyticsPage: React.FC = () => (
  <V2OptInGate>
    <V2AnalyticsPageInner />
  </V2OptInGate>
);

export default V2AnalyticsPage;
