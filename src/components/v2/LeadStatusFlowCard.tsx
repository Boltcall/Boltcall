import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  CalendarCheck2,
  CircleDotDashed,
  Loader2,
  MessageSquareReply,
  OctagonX,
} from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis } from 'recharts';

import { FUNCTIONS_BASE } from '../../lib/api';
import { authedFetch } from '../../lib/authedFetch';
import { cn } from '../../lib/utils';
import type { ChartConfig } from '../ui/area-charts-2';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '../ui/area-charts-2';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select-shadcn';

type LeadStatus = 'new' | 'contacted' | 'booked' | 'lost';
type PeriodKey = '7d' | '30d' | '90d' | '12m';
type MetricKey = LeadStatus;

interface LeadStatusFlowCardProps {
  filters: {
    status: LeadStatus | '';
    date_from: string;
    date_to: string;
    source: string;
  };
}

interface BucketRow {
  label: string;
  new: number;
  contacted: number;
  booked: number;
  lost: number;
}

interface LeadStatusFlowResponse {
  period: PeriodKey;
  period_label: string;
  comparison_label: string;
  filtered_total: number;
  series: BucketRow[];
  metrics: Array<{
    key: MetricKey;
    current_total: number;
    previous_total: number;
    delta: number;
  }>;
}

interface StatusSparkPoint {
  index: number;
  value: number;
}

const PERIODS: Record<
  PeriodKey,
  { label: string; rangeDays: number; bucketCount: number; formatter: Intl.DateTimeFormatOptions }
> = {
  '7d': {
    label: 'Last 7 days',
    rangeDays: 7,
    bucketCount: 7,
    formatter: { weekday: 'short' },
  },
  '30d': {
    label: 'Last 30 days',
    rangeDays: 30,
    bucketCount: 6,
    formatter: { month: 'short', day: 'numeric' },
  },
  '90d': {
    label: 'Last 90 days',
    rangeDays: 90,
    bucketCount: 6,
    formatter: { month: 'short', day: 'numeric' },
  },
  '12m': {
    label: 'Last 12 months',
    rangeDays: 365,
    bucketCount: 6,
    formatter: { month: 'short' },
  },
};

const chartConfig = {
  new: {
    label: 'New',
    color: '#2563eb',
  },
  contacted: {
    label: 'Contacted',
    color: '#f59e0b',
  },
  booked: {
    label: 'Booked',
    color: '#10b981',
  },
  lost: {
    label: 'Lost',
    color: '#64748b',
  },
} satisfies ChartConfig;

const stageMetrics: Array<{
  key: MetricKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
}> = [
  { key: 'new', label: 'New', icon: CircleDotDashed, tone: 'text-blue-600' },
  { key: 'contacted', label: 'Contacted', icon: MessageSquareReply, tone: 'text-amber-600' },
  { key: 'booked', label: 'Booked', icon: CalendarCheck2, tone: 'text-emerald-600' },
  { key: 'lost', label: 'Lost', icon: OctagonX, tone: 'text-slate-500' },
];

function emptySeries(period: PeriodKey): BucketRow[] {
  return Array.from({ length: PERIODS[period].bucketCount }, () => ({
    label: '',
    new: 0,
    contacted: 0,
    booked: 0,
    lost: 0,
  }));
}

function buildStatusSparkline(series: BucketRow[], key: MetricKey): StatusSparkPoint[] {
  return series.map((row, index) => ({
    index,
    value: row[key],
  }));
}

function parseLeadStatusFlowError(
  body: string,
  res: Pick<Response, 'status' | 'headers'>,
): Error {
  const contentType = res.headers.get('content-type') ?? '';
  const trimmed = body.trim();
  const htmlLike =
    contentType.includes('text/html') ||
    trimmed.startsWith('<!DOCTYPE') ||
    trimmed.startsWith('<html');

  if (htmlLike) {
    return new Error(
      'Lead status flow endpoint returned HTML instead of JSON. This usually means the function is missing or failed to deploy.',
    );
  }

  try {
    return new Error(JSON.parse(body).error ?? `Failed to load lead status flow (${res.status})`);
  } catch {
    return new Error(trimmed.slice(0, 160) || `Failed to load lead status flow (${res.status})`);
  }
}

export default function LeadStatusFlowCard({ filters }: LeadStatusFlowCardProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodKey>('30d');
  const [data, setData] = useState<LeadStatusFlowResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadStatusFlow() {
      setLoading(true);
      setError(null);

      try {
        const qs = new URLSearchParams();
        qs.set('period', selectedPeriod);
        if (filters.status) qs.set('status', filters.status);
        if (filters.date_from) qs.set('date_from', filters.date_from);
        if (filters.date_to) qs.set('date_to', filters.date_to);
        if (filters.source) qs.set('source', filters.source);

        const res = await authedFetch(`${FUNCTIONS_BASE}/saas-v2-lead-status-flow?${qs.toString()}`);
        const body = await res.text();
        if (!res.ok) {
          throw parseLeadStatusFlowError(body, res);
        }

        let json: LeadStatusFlowResponse;
        try {
          json = JSON.parse(body) as LeadStatusFlowResponse;
        } catch {
          throw parseLeadStatusFlowError(body, res);
        }

        if (!cancelled) {
          setData(json);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unknown error');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadStatusFlow();
    return () => {
      cancelled = true;
    };
  }, [filters, selectedPeriod]);

  const metrics = useMemo(() => {
    const backendMetrics = new Map((data?.metrics ?? []).map((metric) => [metric.key, metric]));
    return stageMetrics.map((metric) => ({
      ...metric,
      currentTotal: backendMetrics.get(metric.key)?.current_total ?? 0,
      delta: backendMetrics.get(metric.key)?.delta ?? 0,
    }));
  }, [data]);

  return (
    <section className="mb-6 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-4 border-b border-zinc-100 pb-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-brand-blue/10 px-2.5 py-1 text-[11px] font-semibold text-brand-blue">
            <Activity className="h-3.5 w-3.5" />
            Backend lead velocity snapshot
          </div>
          <h2 className="text-lg font-semibold text-text-main">Lead status flow</h2>
          <p className="mt-1 text-sm text-zinc-600">
            See how filtered leads are moving from fresh inquiry to follow-up, booking, or loss based on real Supabase lead history.
          </p>
        </div>

        <Select value={selectedPeriod} onValueChange={(value) => setSelectedPeriod(value as PeriodKey)}>
          <SelectTrigger className="h-9 w-full rounded-lg border-zinc-200 text-sm lg:w-[180px]">
            <SelectValue placeholder="Choose range" />
          </SelectTrigger>
          <SelectContent align="end">
            {Object.entries(PERIODS).map(([key, period]) => (
              <SelectItem key={key} value={key}>
                {period.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => {
          const DeltaIcon = metric.delta >= 0 ? ArrowUpRight : ArrowDownRight;
          const sparkline = buildStatusSparkline(data?.series ?? emptySeries(selectedPeriod), metric.key);
          const sparklineColor = (chartConfig[metric.key] as { color: string }).color;

          return (
            <div key={metric.key} className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white shadow-sm',
                      metric.tone,
                    )}
                  >
                    <metric.icon className="h-4.5 w-4.5" />
                  </span>
                  <span className="text-sm font-medium text-zinc-600">{metric.label}</span>
                </div>
                <span
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold',
                    metric.delta >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700',
                  )}
                >
                  <DeltaIcon className="h-3.5 w-3.5" />
                  {Math.abs(metric.delta)}%
                </span>
              </div>
              <div className="mt-4 text-3xl font-semibold tracking-tight text-text-main">
                {metric.currentTotal.toLocaleString()}
              </div>
              <p className="mt-1 text-xs text-zinc-500">
                Compared with the {data?.comparison_label ?? `previous ${PERIODS[selectedPeriod].label.toLowerCase()}`}.
              </p>
              <div
                data-testid={`lead-status-mini-chart-${metric.key}`}
                className="mt-3 h-12 w-full rounded-lg bg-white/80 px-1 py-1.5"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={sparkline}
                    margin={{ top: 2, right: 0, bottom: 0, left: 0 }}
                  >
                    <defs>
                      <linearGradient id={`mini-fill-${metric.key}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={sparklineColor} stopOpacity={0.22} />
                        <stop offset="95%" stopColor={sparklineColor} stopOpacity={0.03} />
                      </linearGradient>
                    </defs>
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke={sparklineColor}
                      fill={`url(#mini-fill-${metric.key})`}
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          );
        })}
      </div>

      {loading && (
        <div className="mt-4 inline-flex items-center gap-2 text-sm text-zinc-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading chart from backend...
        </div>
      )}

      {error && (
        <div className="mt-4 inline-flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <ChartContainer
        config={chartConfig}
        className="mt-6 h-[300px] w-full [&_.recharts-curve.recharts-tooltip-cursor]:stroke-zinc-300"
      >
        <AreaChart
          accessibilityLayer
          data={data?.series ?? emptySeries(selectedPeriod)}
          margin={{
            top: 8,
            right: 8,
            left: 0,
            bottom: 0,
          }}
        >
          <defs>
            <linearGradient id="fill-new" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-new)" stopOpacity={0.35} />
              <stop offset="95%" stopColor="var(--color-new)" stopOpacity={0.04} />
            </linearGradient>
            <linearGradient id="fill-contacted" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-contacted)" stopOpacity={0.32} />
              <stop offset="95%" stopColor="var(--color-contacted)" stopOpacity={0.04} />
            </linearGradient>
            <linearGradient id="fill-booked" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-booked)" stopOpacity={0.28} />
              <stop offset="95%" stopColor="var(--color-booked)" stopOpacity={0.04} />
            </linearGradient>
            <linearGradient id="fill-lost" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-lost)" stopOpacity={0.2} />
              <stop offset="95%" stopColor="var(--color-lost)" stopOpacity={0.03} />
            </linearGradient>
          </defs>

          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={10} />
          <YAxis allowDecimals={false} width={28} tickLine={false} axisLine={false} />
          <ChartTooltip
            cursor={{ stroke: '#cbd5e1', strokeDasharray: '4 4' }}
            content={<ChartTooltipContent indicator="line" />}
          />

          <Area
            type="monotone"
            dataKey="lost"
            stroke="var(--color-lost)"
            fill="url(#fill-lost)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="booked"
            stroke="var(--color-booked)"
            fill="url(#fill-booked)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="contacted"
            stroke="var(--color-contacted)"
            fill="url(#fill-contacted)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="new"
            stroke="var(--color-new)"
            fill="url(#fill-new)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ChartContainer>
    </section>
  );
}
