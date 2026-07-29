import React, { useState, useEffect, useMemo } from 'react';
import { PageSkeleton } from '../../components/ui/loading-skeleton';
import { PopButton } from '../../components/ui/pop-button';
import {
  RefreshCw,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  ExternalLink,
  Wrench,
  Heart,
  Thermometer,
  Home,
  Scale,
  Sparkles,
  Users,
  CalendarDays,
  CalendarClock,
  Activity,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { supabase } from '../../lib/supabase';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const AUTO_REFRESH_MS = 60_000;

const DRIP_DAYS = [0, 1, 2, 3, 5, 6, 7] as const;

interface NicheConfig {
  key: string;
  label: string;
  color: string;
  bgLight: string;
  icon: React.FC<{ className?: string }>;
  calcUrl: string;
}

const NICHES: NicheConfig[] = [
  {
    key: 'plumber',
    label: 'Plumber',
    color: '#3B82F6',
    bgLight: 'bg-blue-50',
    icon: Wrench,
    calcUrl: 'https://boltcall.org/ai-revenue-calculator/plumber',
  },
  {
    key: 'dentist',
    label: 'Dentist',
    color: '#14B8A6',
    bgLight: 'bg-teal-50',
    icon: Heart,
    calcUrl: 'https://boltcall.org/ai-revenue-calculator/dentist',
  },
  {
    key: 'hvac',
    label: 'HVAC',
    color: '#F97316',
    bgLight: 'bg-orange-50',
    icon: Thermometer,
    calcUrl: 'https://boltcall.org/ai-revenue-calculator/hvac',
  },
  {
    key: 'real estate',
    label: 'Real Estate',
    color: '#10B981',
    bgLight: 'bg-emerald-50',
    icon: Home,
    calcUrl: 'https://boltcall.org/ai-revenue-calculator/real-estate',
  },
  {
    key: 'lawyer',
    label: 'Lawyer',
    color: '#6366F1',
    bgLight: 'bg-indigo-50',
    icon: Scale,
    calcUrl: 'https://boltcall.org/ai-revenue-calculator/lawyer',
  },
  {
    key: 'med spa',
    label: 'Med Spa',
    color: '#EC4899',
    bgLight: 'bg-pink-50',
    icon: Sparkles,
    calcUrl: 'https://boltcall.org/ai-revenue-calculator/med-spa',
  },
];

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface LeadRow {
  id: string;
  name: string;
  email: string;
  business_name?: string;
  niche: string;
  source?: string;
  drip_day?: number;
  drip_completed?: boolean;
  created_at: string;
}

interface PerformanceRow {
  niche: string;
  total_leads: number;
  leads_today: number;
  leads_this_week: number;
  drip_completed_count: number;
  active_drip_count: number;
  leads_last_week?: number;
  drip_day_0?: number;
  drip_day_1?: number;
  drip_day_2?: number;
  drip_day_3?: number;
  drip_day_5?: number;
  drip_day_6?: number;
  drip_day_7?: number;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const fmt = new Intl.NumberFormat('en-US');
function fmtNum(n: number): string {
  return fmt.format(n);
}

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffSec = Math.floor((now - then) / 1000);

  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  const diffWeek = Math.floor(diffDay / 7);
  if (diffWeek < 5) return `${diffWeek}w ago`;
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function nicheConfig(niche: string): NicheConfig | undefined {
  return NICHES.find(
    (n) => n.key.toLowerCase() === (niche ?? '').toLowerCase()
  );
}

/* ------------------------------------------------------------------ */
/*  Fetchers                                                           */
/* ------------------------------------------------------------------ */

async function fetchPerformance(): Promise<PerformanceRow[]> {
  const { data, error } = await supabase
    .from('lead_magnet_performance')
    .select('*');
  if (error) throw new Error(`Performance fetch failed: ${error.message}`);
  return data as PerformanceRow[];
}

async function fetchLeads(): Promise<LeadRow[]> {
  const { data, error } = await supabase
    .from('Lead Magnet Leads')
    .select('*')
    .not('niche', 'is', null)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw new Error(`Leads fetch failed: ${error.message}`);
  return data as LeadRow[];
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

const StatCard: React.FC<{
  title: string;
  value: number;
  icon: React.FC<{ className?: string }>;
  accent?: string;
}> = ({ title, value, icon: Icon, accent = '#2563EB' }) => (
  <Card className="p-5 bg-white dark:bg-[#111114]">
    <div className="flex items-center gap-3 mb-3">
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center"
        style={{ backgroundColor: `${accent}15` }}
      >
        {React.createElement(Icon as any, { className: 'w-5 h-5', color: accent })}
      </div>
      <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</span>
    </div>
    <p className="text-3xl font-bold text-gray-900 dark:text-white">{fmtNum(value)}</p>
  </Card>
);

const TrendIndicator: React.FC<{
  current: number;
  previous: number;
  color: string;
}> = ({ current, previous }) => {
  if (previous === 0 && current === 0) {
    return (
      <span className="flex items-center text-xs text-gray-400 dark:text-gray-500">
        <Minus className="w-3 h-3 mr-0.5" />
        --
      </span>
    );
  }
  const isUp = current >= previous;
  const Icon = isUp ? TrendingUp : TrendingDown;
  const pct =
    previous === 0
      ? 100
      : Math.round(((current - previous) / previous) * 100);
  return (
    <span
      className="flex items-center text-xs font-medium"
      style={{ color: isUp ? '#16A34A' : '#DC2626' }}
    >
      <Icon className="w-3 h-3 mr-0.5" />
      {Math.abs(pct)}%
    </span>
  );
};

const ProgressBar: React.FC<{
  value: number;
  max: number;
  color: string;
}> = ({ value, max, color }) => {
  const pct = max === 0 ? 0 : Math.round((value / max) * 100);
  return (
    <div className="w-full">
      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
        <span>Drip completed</span>
        <span className="font-medium">{pct}%</span>
      </div>
      <div className="w-full h-2 bg-gray-100 dark:bg-[#17171b] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-200 ease-out"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
};

const NicheCard: React.FC<{
  config: NicheConfig;
  data: PerformanceRow | undefined;
}> = ({ config, data }) => {
  const Icon = config.icon;
  const total = data?.total_leads ?? 0;
  const week = data?.leads_this_week ?? 0;
  const lastWeek = data?.leads_last_week ?? 0;
  const completed = data?.drip_completed_count ?? 0;

  return (
    <Card className="p-5 bg-white dark:bg-[#111114] hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 ease-out">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${config.color}15` }}
          >
            {React.createElement(Icon as any, { className: 'w-5 h-5', color: config.color })}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              {config.label}
            </h3>
            <p className="text-xs text-gray-400 dark:text-gray-500">Lead Magnet</p>
          </div>
        </div>
        <TrendIndicator
          current={week}
          previous={lastWeek}
          color={config.color}
        />
      </div>

      {/* Big number */}
      <p className="text-4xl font-bold text-gray-900 dark:text-white mb-1">{fmtNum(total)}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
        {fmtNum(week)} this week
      </p>

      {/* Drip progress */}
      <ProgressBar value={completed} max={total} color={config.color} />

      {/* Link */}
      <a
        href={config.calcUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 flex items-center gap-1.5 text-xs font-medium hover:underline"
        style={{ color: config.color }}
      >
        View Calculator
        <ExternalLink className="w-3 h-3" />
      </a>
    </Card>
  );
};

const NicheBadge: React.FC<{ niche: string }> = ({ niche }) => {
  const cfg = nicheConfig(niche);
  const color = cfg?.color ?? '#6B7280';
  const label = cfg?.label ?? niche;
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
      style={{
        backgroundColor: `${color}15`,
        color,
      }}
    >
      {label}
    </span>
  );
};

/* ------------------------------------------------------------------ */
/*  Drip Funnel                                                        */
/* ------------------------------------------------------------------ */

const DripFunnel: React.FC<{ rows: PerformanceRow[] }> = ({ rows }) => {
  const stages = useMemo(() => {
    return DRIP_DAYS.map((day) => {
      const key = `drip_day_${day}` as keyof PerformanceRow;
      const count = rows.reduce((sum, r) => sum + ((r[key] as number) ?? 0), 0);
      return { day, count };
    });
  }, [rows]);

  const maxCount = Math.max(...stages.map((s) => s.count), 1);

  return (
    <Card className="p-6 bg-white dark:bg-[#111114]">
      <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
        7-Day Drip Funnel
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Conversion through the nurture sequence across all niches
      </p>

      <div className="flex items-end gap-2 sm:gap-4">
        {stages.map((stage, i) => {
          const height = Math.max((stage.count / maxCount) * 140, 12);
          const prevCount = i > 0 ? stages[i - 1].count : null;
          const dropOff =
            prevCount !== null && prevCount > 0
              ? Math.round(((prevCount - stage.count) / prevCount) * 100)
              : null;

          return (
            <div key={stage.day} className="flex-1 flex flex-col items-center">
              {/* Drop-off label */}
              <div className="h-5 flex items-center justify-center mb-1">
                {dropOff !== null && dropOff > 0 && (
                  <span className="text-[10px] text-red-500 font-medium">
                    -{dropOff}%
                  </span>
                )}
              </div>

              {/* Bar */}
              <div
                className="w-full rounded-t-md transition-all duration-200 ease-out"
                style={{
                  height: `${height}px`,
                  backgroundColor: '#2563EB',
                  opacity: 1 - i * 0.1,
                }}
              />

              {/* Count */}
              <p className="text-xs font-semibold text-gray-900 dark:text-white mt-2">
                {fmtNum(stage.count)}
              </p>

              {/* Day label */}
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                Day {stage.day}
              </p>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

/* ------------------------------------------------------------------ */
/*  Leads Table                                                        */
/* ------------------------------------------------------------------ */

const LeadsTable: React.FC<{ leads: LeadRow[] }> = ({ leads }) => (
  <Card className="bg-white dark:bg-[#111114] overflow-hidden">
    <div className="p-5 border-b border-gray-100 dark:border-[#17171b]">
      <h3 className="text-base font-semibold text-gray-900 dark:text-white">Recent Leads</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400">Last 50 captured leads</p>
    </div>

    <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 dark:bg-[#17171b] sticky top-0 z-10">
          <tr>
            {['Name', 'Email', 'Business', 'Niche', 'Source', 'Drip Day', 'Date'].map(
              (h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  {h}
                </th>
              )
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50 dark:divide-[#17171b]">
          {leads.map((lead) => (
            <tr
              key={lead.id}
              className="hover:bg-gray-50/50 dark:hover:bg-[#17171b] transition-colors duration-200 ease-out"
            >
              <td className="px-4 py-3 font-medium text-gray-900 dark:text-white whitespace-nowrap">
                {lead.name || '--'}
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <a
                  href={`mailto:${lead.email}`}
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {lead.email}
                </a>
              </td>
              <td className="px-4 py-3 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                {lead.business_name || '--'}
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <NicheBadge niche={lead.niche} />
              </td>
              <td className="px-4 py-3 text-gray-500 dark:text-gray-500 whitespace-nowrap">
                {lead.source || '--'}
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                {lead.drip_completed ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300">
                    Completed
                  </span>
                ) : (
                  <span className="text-gray-600 dark:text-gray-400">
                    {lead.drip_day != null ? `Day ${lead.drip_day}` : '--'}
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-gray-400 dark:text-gray-500 whitespace-nowrap">
                {relativeTime(lead.created_at)}
              </td>
            </tr>
          ))}
          {leads.length === 0 && (
            <tr>
              <td
                colSpan={7}
                className="px-4 py-12 text-center text-gray-400 dark:text-gray-500"
              >
                No leads captured yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </Card>
);

/* ------------------------------------------------------------------ */
/*  Quick Links                                                        */
/* ------------------------------------------------------------------ */

const QuickLinks: React.FC = () => (
  <Card className="p-5 bg-white dark:bg-[#111114]">
    <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
      Calculator Quick Links
    </h3>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {NICHES.map((n) => {
        const Icon = n.icon;
        return (
          <a
            key={n.key}
            href={n.calcUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-4 py-3 rounded-lg border border-gray-200 dark:border-[#1e1e24] hover:border-gray-300 dark:hover:border-[#2a2a30] hover:shadow-sm hover:-translate-y-0.5 transition-all duration-200 ease-out group"
          >
            <div
              className="w-8 h-8 rounded-md flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${n.color}15` }}
            >
              {React.createElement(Icon as any, { className: 'w-4 h-4', color: n.color })}
            </div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white">
              View {n.label} Calculator
            </span>
            <ExternalLink className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 ml-auto group-hover:text-gray-500 dark:group-hover:text-gray-400" />
          </a>
        );
      })}
    </div>
  </Card>
);

/* ------------------------------------------------------------------ */
/*  Main Page Component                                                */
/* ------------------------------------------------------------------ */

export default function LeadMagnetDashboardPage() {
  const [performance, setPerformance] = useState<PerformanceRow[]>([]);
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  /* ---- data loader ---- */
  const loadData = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const [perfData, leadData] = await Promise.all([
        fetchPerformance(),
        fetchLeads(),
      ]);

      setPerformance(perfData);
      setLeads(leadData);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(() => loadData(true), AUTO_REFRESH_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---- aggregated stats ---- */
  const totals = useMemo(() => {
    const totalLeads = performance.reduce((s, r) => s + (r.total_leads ?? 0), 0);
    const today = performance.reduce((s, r) => s + (r.leads_today ?? 0), 0);
    const week = performance.reduce((s, r) => s + (r.leads_this_week ?? 0), 0);
    const activeDrip = performance.reduce(
      (s, r) => s + (r.active_drip_count ?? 0),
      0
    );
    return { totalLeads, today, week, activeDrip };
  }, [performance]);

  /* ---- performance lookup by niche ---- */
  const perfByNiche = useMemo(() => {
    const map: Record<string, PerformanceRow> = {};
    for (const row of performance) {
      map[(row.niche ?? '').toLowerCase()] = row;
    }
    return map;
  }, [performance]);

  /* ---- loading state ---- */
  if (loading) {
    return <PageSkeleton />;
  }

  /* ---- error state ---- */
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <AlertCircle className="w-10 h-10 text-red-500" />
        <p className="text-sm text-gray-600 dark:text-gray-400">{error}</p>
        <PopButton color="blue" onClick={() => loadData()}>
          Retry
        </PopButton>
      </div>
    );
  }

  /* ---- render ---- */
  return (
    <div className="space-y-6">
      {/* ============ Header ============ */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
            Lead Magnet Performance
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Track all niche calculator lead magnets
          </p>
        </div>

        <button
          onClick={() => loadData(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-[#111114] border border-gray-200 dark:border-[#1e1e24] rounded-lg hover:bg-gray-50 dark:hover:bg-[#17171b] disabled:opacity-50 transition-colors duration-200 ease-out self-start sm:self-auto"
        >
          <RefreshCw
            className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`}
          />
          Refresh
        </button>
      </div>

      {/* ============ Top Stats ============ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Leads"
          value={totals.totalLeads}
          icon={Users}
          accent="#2563EB"
        />
        <StatCard
          title="Leads Today"
          value={totals.today}
          icon={CalendarDays}
          accent="#16A34A"
        />
        <StatCard
          title="Leads This Week"
          value={totals.week}
          icon={CalendarClock}
          accent="#9333EA"
        />
        <StatCard
          title="Active Drip Sequences"
          value={totals.activeDrip}
          icon={Activity}
          accent="#F97316"
        />
      </div>

      {/* ============ Niche Cards Grid ============ */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {NICHES.map((n) => (
          <NicheCard
            key={n.key}
            config={n}
            data={perfByNiche[n.key.toLowerCase()]}
          />
        ))}
      </div>

      {/* ============ Drip Funnel ============ */}
      <DripFunnel rows={performance} />

      {/* ============ Recent Leads Table ============ */}
      <LeadsTable leads={leads} />

      {/* ============ Quick Links ============ */}
      <QuickLinks />
    </div>
  );
}
