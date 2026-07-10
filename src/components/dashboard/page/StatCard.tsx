import React from 'react';
import type { LucideIcon } from 'lucide-react';

// Outcome-framed stat (P22 positive framing): label is a benefit
// ("Jobs booked", "Hours saved"), never a raw metric name.
type Props = {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  caption?: string;
  tone?: 'positive' | 'neutral' | 'negative';
};

const TONE_VALUE: Record<NonNullable<Props['tone']>, string> = {
  positive: 'text-green-600 dark:text-green-400',
  neutral: 'text-gray-900 dark:text-gray-100',
  negative: 'text-red-600 dark:text-red-400',
};

const StatCard: React.FC<Props> = ({ label, value, icon: Icon, caption, tone = 'neutral' }) => (
  <div className="rounded-xl border border-gray-200 dark:border-[#1e1e24] bg-white dark:bg-[#111114] p-6">
    <div className="flex items-center gap-2 mb-2">
      {Icon && <Icon className="w-4 h-4 text-gray-400" />}
      <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</span>
    </div>
    <div className={`text-[28px] leading-none font-bold ${TONE_VALUE[tone]}`}>{value}</div>
    {caption && <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">{caption}</p>}
  </div>
);

export default StatCard;
