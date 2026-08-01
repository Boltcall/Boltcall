import React from 'react';
import ProgressMetricCard from '../ui/progress-metric-card';
import type { SeriesPoint } from '../ui/progress-metric-card';

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
  comparisonValue?: number;
}

function toNumber(value: string | number): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  const normalized = value.replace(/[^0-9.-]/g, '');
  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildFallbackPoints(
  chartData: number[],
  value: string | number,
  comparisonValue?: number,
): SeriesPoint[] {
  if (chartData.length >= 2) {
    return chartData.map((point, index) => ({
      value: point,
      date: `Point ${index + 1}`,
    }));
  }

  if (chartData.length === 1) {
    return [
      { value: chartData[0], date: 'Point 1' },
      { value: chartData[0], date: 'Point 2' },
    ];
  }

  const currentValue = toNumber(value);
  if (currentValue === null) {
    return [];
  }

  const baseline =
    typeof comparisonValue === 'number' && Number.isFinite(comparisonValue)
      ? comparisonValue
      : currentValue;

  return [
    { value: baseline, date: 'Previous' },
    { value: currentValue, date: 'Current' },
  ];
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
  comparisonValue,
}) => {
  const points = buildFallbackPoints(chartData, value, comparisonValue);
  const metricAccent =
    badgeTone === 'negative' ? 'rose' : 'blue';
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
