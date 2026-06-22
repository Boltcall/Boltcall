import { useId, useMemo, useState } from 'react';
import { ArrowDown, ArrowRight, ArrowUp } from 'lucide-react';
import {
  ACCENTS,
  formatCompact,
  MetricChart,
  SERIES_COLORS,
  type ChartSeries,
  type ChartView,
  type MetricAccent,
  type MetricSeries,
  type SeriesPoint,
} from './metric-chart';
import { PeriodSelect, type PeriodOption } from './metric-controls';

export type { SeriesPoint, MetricSeries, MetricAccent, ChartView, PeriodOption };

export type CardSize = 'sm' | 'md' | 'lg';

export interface ProgressMetricCardProps {
  title: string;
  total?: string | number;
  delta?: string;
  deltaLabel?: string;
  percent?: string;
  trend?: 'up' | 'down';
  unit?: string;
  period?: string;
  periodOptions?: PeriodOption[];
  onPeriodChange?: (option: PeriodOption) => void;
  defaultView?: ChartView;
  accent?: MetricAccent;
  data?: SeriesPoint[];
  series?: MetricSeries[];
  defaultIndex?: number;
  size?: CardSize;
  showStats?: boolean;
  valueFormatter?: (value: number) => string;
  dateFormatter?: (date: string) => string;
  loading?: boolean;
  className?: string;
}

const DEFAULT_PERIODS: PeriodOption[] = [
  { label: 'Past 7 days', points: 4 },
  { label: 'Past 14 days', points: 7 },
  { label: 'Past 30 days' },
];

const REGION_W = 62;
const NEUTRAL_PCT = 0.5;

const SIZES: Record<
  CardSize,
  { minH: string; pad: string; title: string; headline: string }
> = {
  sm: {
    minH: 'min-h-[180px]',
    pad: 'px-4 pt-4 pb-4',
    title: 'text-[14px]',
    headline: 'text-[34px]',
  },
  md: {
    minH: 'min-h-[240px]',
    pad: 'px-5 pt-5 pb-5',
    title: 'text-[15px]',
    headline: 'text-[46px]',
  },
  lg: {
    minH: 'min-h-[300px]',
    pad: 'px-6 pt-6 pb-6',
    title: 'text-[17px]',
    headline: 'text-[58px]',
  },
};

const sliceWindow = (points: SeriesPoint[], count?: number) =>
  count && count < points.length ? points.slice(-count) : points;

export default function ProgressMetricCard({
  title,
  total,
  percent,
  trend,
  unit,
  period = 'Past 30 days',
  periodOptions,
  onPeriodChange,
  defaultView = 'curve',
  accent,
  data,
  series,
  defaultIndex,
  size = 'md',
  valueFormatter,
  dateFormatter,
  loading = false,
  className = '',
}: ProgressMetricCardProps) {
  const gridId = `grid-${useId().replace(/:/g, '')}`;
  const sz = SIZES[size];
  const shell = `relative flex ${sz.minH} w-full flex-col overflow-hidden rounded-[28px] border border-border bg-card shadow-[0_2px_10px_rgba(0,0,0,0.04)] ${className}`;

  const periods = periodOptions ?? DEFAULT_PERIODS;
  const [selectedLabel, setSelectedLabel] = useState(period);

  const baseSeries: MetricSeries[] = useMemo(
    () => (series?.length ? series : [{ name: title, data: data ?? [], accent }]),
    [series, data, title, accent],
  );

  const selectedOption =
    periods.find((option) => option.label === selectedLabel) ?? periods[periods.length - 1];

  const visibleSeries = useMemo(
    () =>
      baseSeries.map((entry) => ({
        ...entry,
        data: sliceWindow(entry.data, selectedOption?.points),
      })),
    [baseSeries, selectedOption],
  );

  const primary = visibleSeries[0];
  const isMulti = visibleSeries.length > 1;
  const hasData = (primary?.data.length ?? 0) >= 2;

  const stats = useMemo(() => {
    const values = primary?.data.map((point) => point.value) ?? [];
    const sum = values.reduce((accumulator, next) => accumulator + next, 0);
    const first = values[0] ?? 0;
    const last = values[values.length - 1] ?? 0;
    const previous = values[values.length - 2] ?? first;
    const net = last - first;

    return {
      sum,
      net,
      pct: first ? (net / first) * 100 : 0,
      step: last - previous,
      peak: values.length ? Math.max(...values) : 0,
      low: values.length ? Math.min(...values) : 0,
      avg: values.length ? sum / values.length : 0,
    };
  }, [primary]);

  const resolvedTrend: 'up' | 'down' | 'flat' =
    trend ?? (Math.abs(stats.pct) < NEUTRAL_PCT ? 'flat' : stats.net >= 0 ? 'up' : 'down');
  const resolvedAccent: MetricAccent =
    accent ?? (resolvedTrend === 'up' ? 'emerald' : resolvedTrend === 'down' ? 'rose' : 'neutral');
  const color = ACCENTS[resolvedAccent];
  const TrendIcon =
    resolvedTrend === 'flat' ? ArrowRight : resolvedTrend === 'down' ? ArrowDown : ArrowUp;

  const compactFormatter = valueFormatter ?? formatCompact;
  const fullFormatter =
    valueFormatter ?? ((value: number) => value.toLocaleString() + (unit ? ` ${unit}` : ''));
  const formatDate = dateFormatter ?? ((value: string) => value);

  const displayTotal = total ?? compactFormatter(stats.sum);
  const displayPercent = percent ?? `${Math.abs(stats.pct).toFixed(1)}%`;

  const chartSeries: ChartSeries[] = visibleSeries.map((entry, index) => ({
    name: entry.name,
    data: entry.data,
    color: entry.accent
      ? ACCENTS[entry.accent].stroke
      : isMulti
        ? SERIES_COLORS[index % SERIES_COLORS.length]
        : color.stroke,
  }));

  const lastIndex = (primary?.data.length ?? 1) - 1;
  const fallbackIndex = Math.min(defaultIndex ?? lastIndex, lastIndex);

  const handlePeriodChange = (option: PeriodOption) => {
    setSelectedLabel(option.label);
    onPeriodChange?.(option);
  };

  if (loading) {
    return (
      <div className={shell} aria-busy="true">
        <div className={`flex flex-1 flex-col ${sz.pad}`}>
          <div className="flex items-center justify-between gap-3">
            <div className="h-5 w-28 animate-pulse rounded bg-muted" />
            <div className="h-5 w-16 animate-pulse rounded bg-muted" />
          </div>
          <div className="mt-5 h-12 w-32 animate-pulse rounded-lg bg-muted" />
          <div className="mt-auto h-20 w-full animate-pulse rounded-lg bg-muted/50" />
        </div>
      </div>
    );
  }

  if (!hasData) {
    return (
      <div className={shell}>
        <div className={`flex flex-1 flex-col ${sz.pad}`}>
          <h3 className={`${sz.title} font-semibold tracking-tight text-foreground`}>{title}</h3>
          <div className="flex flex-1 flex-col items-center justify-center gap-1 py-6 text-center">
            <p className="text-sm font-medium text-foreground">No data yet</p>
            <p className="text-xs text-muted-foreground">
              Metrics will appear once data is available.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={shell}>
      <div className="absolute inset-y-0 right-0 z-0" style={{ width: `${REGION_W}%` }}>
        <div
          className="absolute inset-0"
          style={{ background: `linear-gradient(to left, ${color.stroke}1f, transparent 75%)` }}
        />
        <div
          className="absolute inset-0 text-foreground/[0.13]"
          style={{
            WebkitMaskImage: 'linear-gradient(to right, transparent, black 55%)',
            maskImage: 'linear-gradient(to right, transparent, black 55%)',
          }}
        >
          <svg className="h-full w-full" aria-hidden>
            <defs>
              <pattern id={gridId} width="14" height="14" patternUnits="userSpaceOnUse">
                <circle cx="1" cy="1" r="1" fill="currentColor" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill={`url(#${gridId})`} />
          </svg>
        </div>

        <MetricChart
          series={chartSeries}
          view={defaultView}
          defaultIndex={fallbackIndex}
          valueFormatter={fullFormatter}
          dateFormatter={formatDate}
        />
      </div>

      <div className={`pointer-events-none relative z-10 flex flex-1 flex-col ${sz.pad}`}>
        <div className="flex items-center justify-between gap-4">
          <h3 className={`${sz.title} font-semibold tracking-tight text-foreground`}>{title}</h3>
          <div className="flex items-center gap-3 text-[13px]">
            <span className="flex items-center gap-1 font-medium" style={{ color: color.text }}>
              <TrendIcon size={15} strokeWidth={2.5} />
              {displayPercent}
            </span>
            <PeriodSelect
              value={selectedLabel}
              options={periods}
              onChange={handlePeriodChange}
              accentText={color.text}
            />
          </div>
        </div>

        {isMulti && (
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
            {chartSeries.map((entry) => (
              <span
                key={entry.name}
                className="flex items-center gap-1.5 text-[11px] text-muted-foreground"
              >
                <span className="h-2 w-2 rounded-full" style={{ background: entry.color }} />
                {entry.name}
              </span>
            ))}
          </div>
        )}

        <div className={`mt-auto ${sz.headline} font-medium leading-none tracking-tight text-foreground`}>
          {displayTotal}
        </div>
      </div>
    </div>
  );
}
