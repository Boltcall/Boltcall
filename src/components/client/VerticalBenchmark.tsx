/**
 * VerticalBenchmark — "you vs vertical" comparison with percentile rank.
 *
 * For each metric we show:
 *   - The client's current value
 *   - The vertical median
 *   - The top-quartile threshold
 *   - A percentile rank bar (0 = bottom of vertical, 100 = best)
 *
 * Reading lives at the top of the card per design principle #4. Each metric
 * also gets a one-line action implication when the gap is meaningful
 * ("top quartile — keep it" vs "below median — here's how we close it").
 */
import React from 'react';
import { Trophy } from 'lucide-react';

interface BenchmarkMetric {
  metric: string;
  you: number;
  vertical_median: number;
  top_quartile: number;
  unit: string;
  percentile_rank: number;
}

interface VerticalBenchmarkProps {
  vertical: string;
  metrics: BenchmarkMetric[];
  reading: string;
  source: 'agency_knowledge' | 'computed_default';
}

const METRIC_LABEL: Record<string, string> = {
  response_time: 'Response time',
  booking_rate: 'Booking rate',
  lead_volume: 'Lead volume',
  ad_cpl: 'Ad cost per lead',
};

const VerticalBenchmark: React.FC<VerticalBenchmarkProps> = ({
  vertical,
  metrics,
  reading,
  source,
}) => (
  <div className="rounded-lg border border-zinc-200 bg-white p-5">
    <div className="flex items-start justify-between">
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
          Vertical benchmark
        </h3>
        <p className="mt-0.5 text-sm text-zinc-700">
          You vs other {prettyVertical(vertical)} on the Boltcall network
        </p>
      </div>
      <Trophy size={20} className="text-amber-500" aria-hidden />
    </div>

    <p className="mt-3 text-[13px] leading-relaxed text-zinc-600">{reading}</p>

    <ul className="mt-4 space-y-4">
      {metrics.map((m) => (
        <li key={m.metric} className="space-y-1.5">
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-medium text-zinc-800">
              {METRIC_LABEL[m.metric] || m.metric}
            </span>
            <span className="tabular-nums text-zinc-600">
              you: <span className="font-semibold text-zinc-900">{fmt(m.you, m.unit)}</span>
              <span className="ml-2 text-zinc-400">
                median {fmt(m.vertical_median, m.unit)} · top 25% {fmt(m.top_quartile, m.unit)}
              </span>
            </span>
          </div>
          <PercentileBar value={m.percentile_rank} />
          <p className="text-[12px] text-zinc-500">{percentileMicrocopy(m)}</p>
        </li>
      ))}
    </ul>

    {source === 'computed_default' && (
      <p className="mt-4 text-[11px] italic text-zinc-400">
        Baselines from our vertical research playbook. Your personalized
        benchmark refreshes weekly as more peer data accumulates.
      </p>
    )}
  </div>
);

const PercentileBar: React.FC<{ value: number }> = ({ value }) => (
  <div className="relative h-2 w-full overflow-hidden rounded-full bg-zinc-100">
    <div
      className={`h-full rounded-full ${barTone(value)}`}
      style={{ width: `${Math.max(2, Math.min(100, value))}%` }}
    />
    {/* median marker at 50% */}
    <div
      aria-hidden
      className="absolute top-0 h-full w-px bg-zinc-300"
      style={{ left: '50%' }}
    />
    {/* top-quartile marker at 75% */}
    <div
      aria-hidden
      className="absolute top-0 h-full w-px bg-zinc-300"
      style={{ left: '75%' }}
    />
  </div>
);

function barTone(p: number): string {
  if (p >= 75) return 'bg-emerald-500';
  if (p >= 50) return 'bg-sky-500';
  if (p >= 25) return 'bg-amber-500';
  return 'bg-rose-500';
}

function percentileMicrocopy(m: BenchmarkMetric): string {
  const top = 100 - m.percentile_rank;
  if (m.percentile_rank >= 80) return `Top ${top}% — keep it.`;
  if (m.percentile_rank >= 60) return `Above the median — small wins from here.`;
  if (m.percentile_rank >= 40) return `Around the median — there's room to climb.`;
  return `Below the median — biggest unlock on the page.`;
}

function fmt(n: number, unit: string): string {
  if (unit === 'percent') return `${n.toFixed(1)}%`;
  if (unit === 'usd') return `$${n.toFixed(2)}`;
  if (unit === 'seconds') return `${n.toFixed(1)}s`;
  return n.toLocaleString();
}

function prettyVertical(v: string): string {
  if (!v || v === 'other') return 'service businesses';
  return v.replace(/_/g, ' ') + (v.endsWith('s') ? '' : 's');
}

export default VerticalBenchmark;
