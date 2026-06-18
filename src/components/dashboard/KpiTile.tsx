import React from 'react';
import { motion } from 'framer-motion';
import { Activity } from 'lucide-react';
import OverviewMetricCard from './OverviewMetricCard';

interface KpiTileProps {
  title: string;
  value: string | number;
  delta: number;
  sparkline: number[];
  format?: 'number' | 'percentage' | 'currency' | 'time';
  className?: string;
}

const formatValue = (value: string | number, format: string): string => {
  if (typeof value === 'string') return value;

  switch (format) {
    case 'percentage':
      return `${(value * 100).toFixed(1)}%`;
    case 'currency':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
    case 'time':
      return `${value}s`;
    default:
      return new Intl.NumberFormat('en-US').format(value);
  }
};

const KpiTile: React.FC<KpiTileProps> = ({
  title,
  value,
  delta,
  sparkline,
  format = 'number',
  className = '',
}) => {
  const isPositive = delta >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={className}
    >
      <OverviewMetricCard
        label={title}
        period="Dashboard overview"
        value={formatValue(value, format)}
        badge={`${Math.abs(delta).toFixed(1)}%`}
        badgeTone={isPositive ? 'positive' : 'negative'}
        chartData={sparkline}
        accentColor="#2563eb"
        icon={Activity}
        caption={delta >= 0 ? 'Up vs baseline' : 'Down vs baseline'}
      />
    </motion.div>
  );
};

export default KpiTile;
