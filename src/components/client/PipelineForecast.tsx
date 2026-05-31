/**
 * PipelineForecast — next-7-days pipeline value projection with 80% CI band.
 *
 * Visual: a single area chart with two distinct segments — the solid past
 * 14 days, then a softer dashed segment for the 7-day forecast with a
 * shaded confidence band. The "you are here" gridline divides them.
 *
 * Reading comes from the server (`pipeline_forecast` in
 * narrative_readings). Renders below the chart, never separated.
 */
import React from 'react';
import {
  Area,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { TrendingUp } from 'lucide-react';

interface ForecastPoint {
  date: string;
  pipeline_value_usd: number;
  lower_80?: number;
  upper_80?: number;
}

interface PipelineForecastProps {
  history: Array<{ date: string; pipeline_value_usd: number; bookings: number }>;
  forecast: ForecastPoint[];
  reading: string;
}

const PipelineForecast: React.FC<PipelineForecastProps> = ({
  history,
  forecast,
  reading,
}) => {
  const lastHistDate = history[history.length - 1]?.date;
  const data: Array<
    {
      date: string;
      actual?: number;
      forecast?: number;
      band_low?: number;
      band_high?: number;
    }
  > = [
    ...history.map((h) => ({ date: h.date, actual: h.pipeline_value_usd })),
    ...forecast.map((f) => ({
      date: f.date,
      forecast: f.pipeline_value_usd,
      band_low: f.lower_80 ?? f.pipeline_value_usd,
      band_high: f.upper_80 ?? f.pipeline_value_usd,
    })),
  ];

  const next7dTotal = forecast.reduce(
    (acc, f) => acc + f.pipeline_value_usd,
    0,
  );
  const last7dTotal = history
    .slice(-7)
    .reduce((acc, h) => acc + h.pipeline_value_usd, 0);
  const lower7d = forecast.reduce(
    (acc, f) => acc + (f.lower_80 ?? f.pipeline_value_usd),
    0,
  );
  const upper7d = forecast.reduce(
    (acc, f) => acc + (f.upper_80 ?? f.pipeline_value_usd),
    0,
  );

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
            Pipeline value — next 7 days
          </h3>
          <p className="mt-1 text-3xl font-semibold tabular-nums text-zinc-900">
            ${Math.round(next7dTotal).toLocaleString()}
          </p>
          <p className="mt-0.5 text-xs tabular-nums text-zinc-500">
            80% likely between ${Math.round(lower7d).toLocaleString()} and ${Math.round(upper7d).toLocaleString()}
            {' · '}last 7 days: ${Math.round(last7dTotal).toLocaleString()}
          </p>
        </div>
        <TrendingUp size={20} className="text-emerald-500" aria-hidden />
      </div>

      <div className="mt-4 h-44 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="pipe-actual" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.5} />
                <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="pipe-band" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: '#71717a' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(d: string) =>
                new Date(d).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                })
              }
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#71717a' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) =>
                v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`
              }
              width={48}
            />
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
              formatter={(v: number, name: string) => [`$${Math.round(v).toLocaleString()}`, name === 'actual' ? 'Actual' : name === 'forecast' ? 'Forecast' : name === 'band_high' ? 'Upper 80%' : 'Lower 80%']}
            />
            {/* CI band — only renders for the forecast segment */}
            <Area
              dataKey="band_high"
              stroke="none"
              fill="url(#pipe-band)"
              isAnimationActive={false}
            />
            <Area
              dataKey="band_low"
              stroke="none"
              fill="#fff"
              isAnimationActive={false}
            />
            <Area
              dataKey="actual"
              stroke="#0ea5e9"
              strokeWidth={2}
              fill="url(#pipe-actual)"
              isAnimationActive={false}
            />
            <Line
              dataKey="forecast"
              stroke="#0ea5e9"
              strokeWidth={2}
              strokeDasharray="4 3"
              dot={false}
              isAnimationActive={false}
            />
            {lastHistDate && (
              <ReferenceLine
                x={lastHistDate}
                stroke="#a1a1aa"
                strokeDasharray="2 4"
                label={{
                  value: 'today',
                  position: 'top',
                  fill: '#71717a',
                  fontSize: 10,
                }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <p className="mt-3 text-[13px] leading-relaxed text-zinc-600">{reading}</p>
    </div>
  );
};

export default PipelineForecast;
