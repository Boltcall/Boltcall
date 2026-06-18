import React, { useId } from 'react';
import { Area, AreaChart, ResponsiveContainer, Tooltip } from 'recharts';
import Card from '../ui/Card';
import { cn } from '../../lib/utils';

type Tone = 'positive' | 'negative' | 'neutral';

interface OverviewMetricCardProps {
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

const BADGE_STYLES: Record<Tone, string> = {
  positive: 'bg-emerald-50 text-green-600 ring-1 ring-emerald-200/80',
  negative: 'bg-rose-50 text-red-600 ring-1 ring-rose-200/80',
  neutral: 'bg-slate-100 text-slate-500 ring-1 ring-slate-200/80',
};

function formatChartValue(value: unknown) {
  if (typeof value !== 'number') return '';
  return Number.isInteger(value) ? value.toLocaleString() : value.toFixed(1);
}

const OverviewMetricCard: React.FC<OverviewMetricCardProps> = ({
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
  const gradientId = useId().replace(/:/g, '');
  const normalizedChartData = chartData.map((point, index) => ({
    index,
    value: point,
  }));
  const iconWrapperStyle = {
    backgroundColor: `${accentColor}12`,
    color: accentColor,
  } as const;

  return (
    <Card
      className={cn(
        'overflow-hidden rounded-[24px] border-slate-200/80 bg-white shadow-[0_22px_45px_-28px_rgba(15,23,42,0.45)]',
        compact ? 'p-4' : 'p-5',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {Icon ? (
              <span
                className={cn(
                  'inline-flex shrink-0 items-center justify-center rounded-2xl',
                  compact ? 'size-9' : 'size-10',
                )}
                style={iconWrapperStyle}
              >
                <Icon className={compact ? 'size-4' : 'size-5'} />
              </span>
            ) : null}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">{label}</p>
              {period ? <p className="mt-0.5 text-xs text-slate-500">{period}</p> : null}
            </div>
          </div>
        </div>
        {badge ? (
          <span
            className={cn(
              'shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]',
              BADGE_STYLES[badgeTone],
            )}
          >
            {badge}
          </span>
        ) : null}
      </div>

      <div className={cn('flex items-end justify-between gap-3', compact ? 'mt-4' : 'mt-5')}>
        <div className="min-w-0">
          <p className={cn('font-bold tracking-tight text-slate-950', compact ? 'text-3xl' : 'text-4xl')}>
            {value}
          </p>
          {caption ? <p className="mt-1 text-xs text-slate-500">{caption}</p> : null}
        </div>

        {normalizedChartData.length >= 2 ? (
          <div className={cn('shrink-0', compact ? 'h-16 w-24' : 'h-20 w-28')}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={normalizedChartData} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={accentColor} stopOpacity={0.28} />
                    <stop offset="100%" stopColor={accentColor} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <Tooltip
                  cursor={{ stroke: accentColor, strokeDasharray: '3 3', strokeWidth: 1 }}
                  contentStyle={{
                    borderRadius: 12,
                    border: '1px solid rgba(148, 163, 184, 0.24)',
                    boxShadow: '0 12px 32px rgba(15, 23, 42, 0.12)',
                    padding: '0.35rem 0.55rem',
                  }}
                  formatter={(tooltipValue: unknown) => [formatChartValue(tooltipValue), label]}
                  labelFormatter={() => ''}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={accentColor}
                  strokeWidth={2}
                  fill={`url(#${gradientId})`}
                  dot={false}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : null}
      </div>
    </Card>
  );
};

export default OverviewMetricCard;
