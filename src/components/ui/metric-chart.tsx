import { Area, AreaChart, Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export interface SeriesPoint {
  value: number;
  date: string;
}

export interface MetricSeries {
  name: string;
  data: SeriesPoint[];
  accent?: MetricAccent;
}

export type MetricAccent = 'blue' | 'emerald' | 'amber' | 'rose' | 'violet' | 'neutral';
export type ChartView = 'curve' | 'bars';

export interface ChartSeries {
  name: string;
  data: SeriesPoint[];
  color: string;
}

export const SERIES_COLORS = ['#2563eb', '#059669', '#f59e0b', '#7c3aed', '#ef4444', '#0891b2'];

export const ACCENTS: Record<
  MetricAccent,
  { stroke: string; text: string; fill: string; soft: string }
> = {
  blue: { stroke: '#2563eb', text: '#1d4ed8', fill: '#dbeafe', soft: 'rgba(37,99,235,0.16)' },
  emerald: { stroke: '#059669', text: '#047857', fill: '#d1fae5', soft: 'rgba(5,150,105,0.16)' },
  amber: { stroke: '#d97706', text: '#b45309', fill: '#fef3c7', soft: 'rgba(217,119,6,0.18)' },
  rose: { stroke: '#e11d48', text: '#be123c', fill: '#ffe4e6', soft: 'rgba(225,29,72,0.16)' },
  violet: { stroke: '#7c3aed', text: '#6d28d9', fill: '#ede9fe', soft: 'rgba(124,58,237,0.16)' },
  neutral: { stroke: '#475569', text: '#334155', fill: '#e2e8f0', soft: 'rgba(71,85,105,0.15)' },
};

export function formatCompact(value: number) {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: value >= 100 ? 0 : 1,
  }).format(value);
}

interface MetricChartProps {
  series: ChartSeries[];
  view?: ChartView;
  defaultIndex?: number;
  valueFormatter?: (value: number) => string;
  dateFormatter?: (date: string) => string;
}

export function MetricChart({
  series,
  view = 'curve',
  valueFormatter = (value) => value.toLocaleString(),
  dateFormatter = (date) => date,
}: MetricChartProps) {
  const primary = series[0];
  const data = primary?.data ?? [];

  if (data.length < 2) {
    return null;
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      {view === 'bars' ? (
        <BarChart data={data} margin={{ top: 18, right: 6, bottom: 6, left: 0 }}>
          <XAxis dataKey="date" hide />
          <YAxis hide />
          <Tooltip
            cursor={{ fill: 'rgba(148, 163, 184, 0.08)' }}
            contentStyle={{
              borderRadius: 14,
              border: '1px solid rgba(148, 163, 184, 0.2)',
              boxShadow: '0 12px 32px rgba(15, 23, 42, 0.12)',
            }}
            formatter={(value: number) => [valueFormatter(value), primary.name]}
            labelFormatter={(label: string) => dateFormatter(label)}
          />
          <Bar dataKey="value" radius={[10, 10, 4, 4]} fill={primary.color} fillOpacity={0.9} />
        </BarChart>
      ) : (
        <AreaChart data={data} margin={{ top: 18, right: 6, bottom: 6, left: 0 }}>
          <defs>
            <linearGradient id={`metric-fill-${primary.name.replace(/\s+/g, '-').toLowerCase()}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={primary.color} stopOpacity={0.26} />
              <stop offset="100%" stopColor={primary.color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <XAxis dataKey="date" hide />
          <YAxis hide />
          <Tooltip
            cursor={{ stroke: primary.color, strokeDasharray: '4 4' }}
            contentStyle={{
              borderRadius: 14,
              border: '1px solid rgba(148, 163, 184, 0.2)',
              boxShadow: '0 12px 32px rgba(15, 23, 42, 0.12)',
            }}
            formatter={(value: number) => [valueFormatter(value), primary.name]}
            labelFormatter={(label: string) => dateFormatter(label)}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={primary.color}
            strokeWidth={2.5}
            fill={`url(#metric-fill-${primary.name.replace(/\s+/g, '-').toLowerCase()})`}
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      )}
    </ResponsiveContainer>
  );
}
