import React from 'react';
import ProgressMetricCard from '../ui/progress-metric-card';

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

const OverviewMetricCard: React.FC<OverviewMetricCardProps> = ({
  label,
  value,
  period,
  badge,
  badgeTone = 'neutral',
  chartData = [],
  className,
  compact = false,
  caption,
}) => {
  const points = chartData.map((point, index) => ({
    value: point,
    date: `Point ${index + 1}`,
  }));
  const metricAccent =
    badgeTone === 'positive' ? 'emerald' : badgeTone === 'negative' ? 'rose' : 'blue';
  const displayPercent = badge?.trim().endsWith('%') ? badge.trim() : undefined;
  const displayDelta = caption ?? (displayPercent ? undefined : badge);
  const displayPeriod = period?.trim() || 'Past 30 days';

  return (
    <ProgressMetricCard
      title={label}
      total={value}
      data={points}
      size={compact ? 'sm' : 'md'}
      showStats={!compact}
      accent={metricAccent}
      percent={displayPercent}
      delta={displayDelta}
      deltaLabel={displayDelta ? '' : displayPeriod}
      period={displayPeriod}
      periodOptions={[{ label: displayPeriod }]}
      className={className}
    />
  );
};

export default OverviewMetricCard;
