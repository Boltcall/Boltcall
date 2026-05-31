/**
 * NarratedChart — generic chart wrapper that enforces design principle #4:
 *   "Every number has a narrative. No naked charts."
 *
 * Used as the building block for trend sparklines on /client/insights.
 * Any chart in the client portal MUST be wrapped in this component or an
 * equivalent — a chart shipped without the AI reading underneath is a
 * regression against the design principles.
 */
import React from 'react';
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface NarratedChartProps {
  title: string;
  reading: string;
  unit: string;
  days: string[];
  values: number[];
  current: number;
  prior: number;
  delta_pct: number;
  /** Some metrics are "lower is better" — flips the delta color. */
  higherIsBetter?: boolean;
  formatValue?: (n: number) => string;
}

const NarratedChart: React.FC<NarratedChartProps> = ({
  title,
  reading,
  unit,
  days,
  values,
  current,
  delta_pct,
  higherIsBetter = true,
  formatValue,
}) => {
  const data = days.map((d, i) => ({ date: d, value: values[i] }));
  const fmt = formatValue ?? defaultFormatter(unit);
  const deltaPositive = (delta_pct >= 0) === higherIsBetter;
  const deltaText = `${delta_pct >= 0 ? '+' : ''}${delta_pct.toFixed(1)}%`;

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
            {title}
          </h3>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-zinc-900">
            {fmt(current)}
          </p>
        </div>
        <span
          className={`rounded-md px-2 py-0.5 text-xs font-medium tabular-nums ${
            deltaPositive
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-rose-50 text-rose-700'
          }`}
        >
          {deltaText} vs prior week
        </span>
      </div>

      <div className="mt-3 h-20 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id={`grad-${title}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <XAxis dataKey="date" hide />
            <YAxis hide />
            <Tooltip
              cursor={{ stroke: '#e4e4e7', strokeWidth: 1 }}
              contentStyle={{
                background: '#fff',
                border: '1px solid #e4e4e7',
                borderRadius: 6,
                fontSize: 12,
              }}
              labelFormatter={(d: string) =>
                new Date(d).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                })
              }
              formatter={(v: number) => [fmt(v), title]}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#3b82f6"
              strokeWidth={1.75}
              fill={`url(#grad-${title})`}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <p className="mt-3 text-[13px] leading-relaxed text-zinc-600">{reading}</p>
    </div>
  );
};

function defaultFormatter(unit: string): (n: number) => string {
  if (unit === 'percent') return (n) => `${n.toFixed(1)}%`;
  if (unit === 'usd') return (n) => `$${n.toLocaleString()}`;
  if (unit === 'seconds') return (n) => `${n.toFixed(1)}s`;
  return (n) => n.toLocaleString();
}

export default NarratedChart;
