import React, { useState, useEffect, useCallback } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  TrendingUp, ShieldCheck, Clock, AlertTriangle, RefreshCw, Activity,
  BarChart2, Target, Zap,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

interface HealLog {
  id: string;
  agent_id: string;
  failure_type: string | null;
  fix_verified: boolean | null;
  fix_success_rate: number | null;
  fix_pass_count: number | null;
  fix_total_runs: number | null;
  created_at: string;
}

interface QAReview {
  id: string;
  agent_id: string;
  call_type: 'success' | 'failure';
  status: 'pending' | 'approved' | 'rejected' | 'flagged';
  overall_score: number | null;
  friction_score: number | null;
  created_at: string;
}

interface SuccessInsight {
  id: string;
  agent_id: string;
  friction_points: string[];
  friction_score: number;
}

interface Agent {
  id: string;
  name: string;
  retell_agent_id: string;
}

interface KPI {
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
  color: string;
}

const CHART_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
const PIE_COLORS: Record<string, string> = {
  pending:  '#f59e0b',
  approved: '#10b981',
  rejected: '#ef4444',
  flagged:  '#f97316',
};

// Group by day (YYYY-MM-DD)
function toDay(iso: string) {
  return iso.slice(0, 10);
}

function last30Days(): string[] {
  const days: string[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

export default function QAAnalyticsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [healLogs, setHealLogs] = useState<HealLog[]>([]);
  const [reviews, setReviews] = useState<QAReview[]>([]);
  const [insights, setInsights] = useState<SuccessInsight[]>([]);
  const [agentMap, setAgentMap] = useState<Map<string, string>>(new Map());

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 30);
      const cutoffStr = cutoff.toISOString();

      const [healRes, reviewRes, insightRes, agentRes] = await Promise.all([
        supabase
          .from('agent_self_heal_log')
          .select('id, agent_id, failure_type, fix_verified, fix_success_rate, fix_pass_count, fix_total_runs, created_at')
          .eq('user_id', user.id)
          .gte('created_at', cutoffStr)
          .order('created_at', { ascending: true }),
        supabase
          .from('qa_reviews')
          .select('id, agent_id, call_type, status, overall_score, friction_score, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true }),
        supabase
          .from('qa_success_insights')
          .select('id, agent_id, friction_points, friction_score')
          .eq('user_id', user.id),
        supabase
          .from('agents')
          .select('id, name, retell_agent_id')
          .eq('user_id', user.id),
      ]);

      setHealLogs((healRes.data || []) as HealLog[]);
      setReviews((reviewRes.data || []) as QAReview[]);
      setInsights((insightRes.data || []) as SuccessInsight[]);

      const map = new Map<string, string>();
      ((agentRes.data || []) as Agent[]).forEach(a => {
        map.set(a.retell_agent_id, a.name);
        map.set(a.id, a.name);
      });
      setAgentMap(map);
    } catch {
      showToast({ variant: 'error', message: 'Failed to load analytics data' });
    } finally {
      setLoading(false);
    }
  }, [user, showToast]);

  useEffect(() => { load(); }, [load]);

  // ג”€ג”€ Derived data ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€

  const totalHeals = healLogs.length;
  const successfulHeals = healLogs.filter(h => h.fix_verified === true).length;
  const healSuccessRate = totalHeals > 0 ? Math.round((successfulHeals / totalHeals) * 100) : 0;

  const pendingCount = reviews.filter(r => r.status === 'pending').length;

  const successReviews = reviews.filter(r => r.call_type === 'success' && r.friction_score != null);
  const avgFriction = successReviews.length > 0
    ? (successReviews.reduce((s, r) => s + (r.friction_score ?? 0), 0) / successReviews.length).toFixed(1)
    : 'ג€”';

  const kpis: KPI[] = [
    {
      label: 'Heal success rate',
      value: `${healSuccessRate}%`,
      sub: `${successfulHeals} of ${totalHeals} heals fixed (30d)`,
      icon: <ShieldCheck className="w-5 h-5" />,
      color: healSuccessRate >= 70 ? 'text-green-400' : 'text-red-400',
    },
    {
      label: 'Pending reviews',
      value: String(pendingCount),
      sub: `${reviews.length} total reviews`,
      icon: <Clock className="w-5 h-5" />,
      color: pendingCount > 5 ? 'text-orange-400' : 'text-yellow-400',
    },
    {
      label: 'Avg friction score',
      value: avgFriction === 'ג€”' ? 'ג€”' : `${avgFriction}/10`,
      sub: `from ${successReviews.length} success calls`,
      icon: <Activity className="w-5 h-5" />,
      color: Number(avgFriction) >= 6 ? 'text-orange-400' : 'text-green-400',
    },
    {
      label: 'Total QA reviews',
      value: String(reviews.length),
      sub: `${reviews.filter(r => r.status === 'approved').length} approved`,
      icon: <Target className="w-5 h-5" />,
      color: 'text-indigo-400',
    },
  ];

  // Heal success rate over 30 days (line chart)
  const days = last30Days();
  const healByDay = new Map<string, { total: number; passed: number }>();
  days.forEach(d => healByDay.set(d, { total: 0, passed: 0 }));
  healLogs.forEach(h => {
    const d = toDay(h.created_at);
    const entry = healByDay.get(d);
    if (entry) {
      entry.total++;
      if (h.fix_verified) entry.passed++;
    }
  });
  const healTimelineData = days.map(d => {
    const entry = healByDay.get(d)!;
    return {
      date: d.slice(5), // MM-DD
      rate: entry.total > 0 ? Math.round((entry.passed / entry.total) * 100) : null,
      heals: entry.total,
    };
  }).filter(d => d.heals > 0 || days.indexOf(`2026-${d.date}`) > days.length - 7);

  // Failure type distribution (bar chart)
  const failTypeCounts = new Map<string, number>();
  healLogs.forEach(h => {
    const t = h.failure_type || 'unknown';
    failTypeCounts.set(t, (failTypeCounts.get(t) || 0) + 1);
  });
  const failureTypeData = Array.from(failTypeCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, count]) => ({ name: name.replace(/_/g, ' '), count }));

  // Agent health scores (bar chart)
  const agentIds = Array.from(new Set([
    ...healLogs.map(h => h.agent_id),
    ...reviews.map(r => r.agent_id),
  ]));
  const agentHealthData = agentIds.map(agentId => {
    const agentHeals = healLogs.filter(h => h.agent_id === agentId);
    const agentReviews = reviews.filter(r => r.agent_id === agentId);
    const agentSuccessReviews = agentReviews.filter(r => r.call_type === 'success' && r.friction_score != null);

    const healRate = agentHeals.length > 0
      ? Math.round((agentHeals.filter(h => h.fix_verified).length / agentHeals.length) * 100)
      : 0;
    const approvalRate = agentReviews.length > 0
      ? Math.round((agentReviews.filter(r => r.status === 'approved').length / agentReviews.length) * 100)
      : 0;
    const frictionAvg = agentSuccessReviews.length > 0
      ? Math.round(agentSuccessReviews.reduce((s, r) => s + (r.friction_score ?? 0), 0) / agentSuccessReviews.length)
      : 0;
    const health = Math.round((healRate * 0.5) + (approvalRate * 0.3) + ((10 - frictionAvg) * 2));

    return {
      name: (agentMap.get(agentId) || agentId).slice(0, 16),
      healRate,
      approvalRate,
      health: Math.min(100, health),
    };
  }).filter(a => a.healRate > 0 || a.approvalRate > 0);

  // Top friction themes (word frequency from friction_points)
  const wordCounts = new Map<string, number>();
  const stopWords = new Set(['the','a','an','and','or','to','in','of','for','that','this','was','is','it','with','be','not','are','on','at','as','by','from','but','were','have','had','has','they','i','we','you','he','she','did','do','so','if','when','than','its']);
  insights.forEach(insight => {
    (insight.friction_points || []).forEach(point => {
      point.toLowerCase().split(/\W+/).filter(w => w.length > 3 && !stopWords.has(w)).forEach(word => {
        wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
      });
    });
  });
  const frictionThemes = Array.from(wordCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([word, count]) => ({ word, count }));

  // Review queue status donut
  const statusCounts: Record<string, number> = { pending: 0, approved: 0, rejected: 0, flagged: 0 };
  reviews.forEach(r => { statusCounts[r.status]++; });
  const donutData = Object.entries(statusCounts)
    .filter(([, count]) => count > 0)
    .map(([status, count]) => ({ name: status.charAt(0).toUpperCase() + status.slice(1), value: count, color: PIE_COLORS[status] }));

  if (loading) {
    return (
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <div className="h-8 w-48 rounded-lg bg-white/5 animate-pulse" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-24 rounded-xl bg-white/5 animate-pulse" />)}
        </div>
        <div className="grid grid-cols-2 gap-6">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-64 rounded-xl bg-white/5 animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">QA Analytics</h1>
          <p className="text-sm text-gray-400 mt-1">Heal performance, friction trends, and agent health ג€” last 30 days</p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 text-sm transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <div key={i} className="p-4 rounded-xl border border-white/10 bg-white/5">
            <div className={`${kpi.color} mb-2`}>{kpi.icon}</div>
            <div className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{kpi.label}</div>
            <div className="text-xs text-gray-600 mt-1">{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* 1. Heal success rate over time */}
        <ChartCard title="Heal success rate" icon={<TrendingUp className="w-4 h-4" />} subtitle="30-day window">
          {healTimelineData.length < 2 ? (
            <EmptyChart message="Not enough heal events yet" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={healTimelineData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fill: '#6b7280', fontSize: 11 }} unit="%" />
                <Tooltip
                  contentStyle={{ background: '#1f2937', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                  labelStyle={{ color: '#d1d5db' }}
                  formatter={(v: any) => [`${v}%`, 'Success rate']}
                />
                <Line
                  type="monotone" dataKey="rate" stroke="#6366f1" strokeWidth={2}
                  dot={{ fill: '#6366f1', r: 3 }} connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* 2. Review queue status donut */}
        <ChartCard title="Review queue status" icon={<BarChart2 className="w-4 h-4" />} subtitle="All time">
          {donutData.length === 0 ? (
            <EmptyChart message="No reviews yet" />
          ) : (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie data={donutData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={3}>
                    {donutData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: '#1f2937', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                    formatter={(v: any, name: any) => [v, name]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 flex-1">
                {donutData.map((entry, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: entry.color }} />
                      <span className="text-sm text-gray-400">{entry.name}</span>
                    </div>
                    <span className="text-sm font-semibold text-white">{entry.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </ChartCard>

        {/* 3. Failure type distribution */}
        <ChartCard title="Failure type distribution" icon={<AlertTriangle className="w-4 h-4" />} subtitle="From heal logs (30d)">
          {failureTypeData.length === 0 ? (
            <EmptyChart message="No heal logs in this period" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={failureTypeData} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fill: '#9ca3af', fontSize: 11 }} width={110} />
                <Tooltip
                  contentStyle={{ background: '#1f2937', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                  formatter={(v: any) => [v, 'Occurrences']}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {failureTypeData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* 4. Agent health scores */}
        <ChartCard title="Agent health scores" icon={<Activity className="w-4 h-4" />} subtitle="Composite: heal rate + approval rate + friction">
          {agentHealthData.length === 0 ? (
            <EmptyChart message="No agent data available" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={agentHealthData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fill: '#6b7280', fontSize: 11 }} unit="%" />
                <Tooltip
                  contentStyle={{ background: '#1f2937', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                  formatter={(v: any, name: any) => [`${v}%`, name]}
                />
                <Legend wrapperStyle={{ fontSize: 11, color: '#9ca3af' }} />
                <Bar dataKey="healRate" name="Heal rate" fill="#6366f1" radius={[2, 2, 0, 0]} />
                <Bar dataKey="approvalRate" name="Approval rate" fill="#10b981" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* 5. Top friction themes */}
        <ChartCard title="Top friction themes" icon={<Zap className="w-4 h-4" />} subtitle="Keywords from success call friction points">
          {frictionThemes.length === 0 ? (
            <EmptyChart message="No success call insights yet" />
          ) : (
            <div className="space-y-2">
              {frictionThemes.map((item, i) => {
                const maxCount = frictionThemes[0].count;
                const pct = Math.round((item.count / maxCount) * 100);
                return (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-sm text-gray-400 capitalize w-24 shrink-0 truncate">{item.word}</span>
                    <div className="flex-1 h-2 rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-indigo-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 w-6 text-right">{item.count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </ChartCard>

        {/* 6. Heal iterations / efficiency */}
        <ChartCard title="Heal efficiency" icon={<ShieldCheck className="w-4 h-4" />} subtitle="Fix verified vs not (30d)">
          {totalHeals === 0 ? (
            <EmptyChart message="No heal logs yet" />
          ) : (
            <div className="space-y-6 pt-2">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-400">Fixed successfully</span>
                  <span className="font-semibold text-green-400">{successfulHeals}</span>
                </div>
                <div className="h-3 rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-green-500 transition-all"
                    style={{ width: `${healSuccessRate}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-400">Not fixed / reverted</span>
                  <span className="font-semibold text-red-400">{totalHeals - successfulHeals}</span>
                </div>
                <div className="h-3 rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-red-500 transition-all"
                    style={{ width: `${100 - healSuccessRate}%` }}
                  />
                </div>
              </div>
              <div className="pt-2 border-t border-white/10">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Overall heal rate</span>
                  <span className={`text-2xl font-bold ${healSuccessRate >= 70 ? 'text-green-400' : 'text-red-400'}`}>
                    {healSuccessRate}%
                  </span>
                </div>
              </div>
            </div>
          )}
        </ChartCard>

      </div>
    </div>
  );
}

function ChartCard({
  title, subtitle, icon, children,
}: {
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="p-5 rounded-xl border border-white/10 bg-white/5">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-indigo-400">{icon}</span>
        <h3 className="text-sm font-semibold text-white">{title}</h3>
      </div>
      {subtitle && <p className="text-xs text-gray-500 mb-4">{subtitle}</p>}
      {children}
    </div>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-40 text-gray-600 text-sm">
      {message}
    </div>
  );
}
