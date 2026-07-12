/**
 * MetricCardV2 — V2's own metric-card wrapper over the shared UI primitive.
 *
 * Copied from components/dashboard/OverviewMetricCard so the V2 surface has
 * zero imports from the V1 dashboard component tree (surface separation).
 */
import React from 'react';
import ProgressMetricCard from '../ui/progress-metric-card';
import { cn } from '../../lib/utils';

type Tone = 'positive' | 'negative' | 'neutral';

interface MetricCardV2Props {
  label: string;
  value: string | number;
  period?: string;
  badge?: string;
  badgeTone?: Tone;
  chartData?: number[];
  icon?: React.ComponentType<{ className?: string }>;
  accentColor?: string;
  className?: string;
  compact?: boolean;
  caption?: string;
}

const MetricCardV2: React.FC<MetricCardV2Props> = ({
  label,
  value,
  period,
  badge,
  badgeTone = 'neutral',
  chartData = [],
  icon: Icon,
  accentColor = '#2563eb',
  className,
  compact = false,
  caption,
}) => {
  const points = chartData.map((point, index) => ({
    value: point,
    date: `Point ${index + 1}`,
  }));

  const badgeClassName =
    badgeTone === 'positive'
      ? 'bg-emerald-50 text-green-600 ring-1 ring-emerald-200/80'
      : badgeTone === 'negative'
        ? 'bg-rose-50 text-red-600 ring-1 ring-rose-200/80'
        : 'bg-slate-100 text-slate-500 ring-1 ring-slate-200/80';

  return (
    <ProgressMetricCard
      title={label}
      total={value}
      data={points}
      size={compact ? 'sm' : 'md'}
      showControls={false}
      showStats={false}
      accent={
        badgeTone === 'positive'
          ? 'emerald'
          : badgeTone === 'negative'
            ? 'rose'
            : 'blue'
      }
      delta={caption}
      deltaLabel={caption ? '' : period}
      className={className}
      headerBadge={
        <div className="flex items-center gap-2">
          {Icon ? (
            <span
              className={cn(
                'inline-flex shrink-0 items-center justify-center rounded-2xl',
                compact ? 'size-9' : 'size-10',
              )}
              style={{ backgroundColor: `${accentColor}12`, color: accentColor }}
            >
              <Icon className={compact ? 'size-4' : 'size-5'} />
            </span>
          ) : null}
          {badge ? (
            <span
              className={cn(
                'shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]',
                badgeClassName,
              )}
            >
              {badge}
            </span>
          ) : null}
        </div>
      }
    />
  );
};

export default MetricCardV2;
