import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {
  DollarSign,
  TrendingUp,
  Clock,
  Users,
  Calculator,
  Percent,
  Download,
} from 'lucide-react';
import Card from '../ui/Card';
import OverviewMetricCard from '../dashboard/OverviewMetricCard';
import type { RoiMetrics, RoiTrendPoint } from '../../lib/analyticsApi';
import { exportToCsv } from '../../lib/exportUtils';

interface RoiDashboardProps {
  metrics: RoiMetrics | null;
  trend: RoiTrendPoint[];
  loading?: boolean;
  onConfigChange?: (config: { avgDealValue: number; hourlyRate: number; subscriptionCost: number }) => void;
}

const RoiDashboard: React.FC<RoiDashboardProps> = ({
  metrics,
  trend,
  loading,
  onConfigChange,
}) => {
  const [showConfig, setShowConfig] = useState(false);
  const [avgDealValue, setAvgDealValue] = useState(metrics?.avgDealValue || 500);
  const [hourlyRate, setHourlyRate] = useState(metrics?.hourlyRate || 25);
  const [subscriptionCost, setSubscriptionCost] = useState(metrics?.subscriptionCost || 179);

  const handleSaveConfig = () => {
    onConfigChange?.({ avgDealValue, hourlyRate, subscriptionCost });
    setShowConfig(false);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card className="p-6">
          <div className="h-6 w-48 bg-gray-100 rounded animate-pulse mb-6" />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        </Card>
        <Card className="p-6">
          <div className="h-64 bg-gray-100 rounded-lg animate-pulse" />
        </Card>
      </div>
    );
  }

  if (!metrics) return null;

  const kpiCards = [
    {
      label: 'Total Leads',
      value: metrics.totalLeads.toLocaleString(),
      icon: Users,
      accentColor: '#2563eb',
      badge: 'Volume',
      badgeTone: 'neutral' as const,
      caption: 'Leads included in this ROI window',
    },
    {
      label: 'Cost per Lead',
      value: `$${metrics.costPerLead.toFixed(2)}`,
      icon: DollarSign,
      accentColor: '#d97706',
      badge: 'Efficiency',
      badgeTone: 'neutral' as const,
      caption: 'Average acquisition cost per lead',
    },
    {
      label: 'Est. Revenue',
      value: `$${metrics.estimatedRevenue.toLocaleString()}`,
      icon: TrendingUp,
      accentColor: '#059669',
      badge: 'Revenue',
      badgeTone: 'positive' as const,
      caption: 'Projected revenue captured with Boltcall',
    },
    {
      label: 'ROI',
      value: `${metrics.roiPercentage}%`,
      icon: Percent,
      accentColor: metrics.roiPercentage >= 0 ? '#059669' : '#dc2626',
      badge: metrics.roiPercentage >= 0 ? 'Positive' : 'Negative',
      badgeTone: metrics.roiPercentage >= 0 ? 'positive' as const : 'negative' as const,
      caption: 'Return after subscription cost',
    },
    {
      label: 'Time Saved',
      value: `${metrics.timeSavedHours}h`,
      icon: Clock,
      accentColor: '#7c3aed',
      badge: 'Ops',
      badgeTone: 'neutral' as const,
      caption: 'Staff hours saved each month',
    },
    {
      label: 'Money Saved',
      value: `$${metrics.moneySaved.toLocaleString()}`,
      icon: DollarSign,
      accentColor: '#10b981',
      badge: 'Savings',
      badgeTone: 'positive' as const,
      caption: 'Labor cost avoided each month',
    },
  ];

  return (
    <div className="space-y-6" id="roi-dashboard">
      {/* ROI KPI Cards */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-text-main">ROI Dashboard</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowConfig(!showConfig)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-muted hover:text-text-main border border-border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Calculator className="w-3.5 h-3.5" />
              Configure
            </button>
            <button
              onClick={() => exportToCsv(
                [{ ...metrics }],
                'roi-metrics',
                'ROI Dashboard'
              )}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-muted hover:text-text-main border border-border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Export
            </button>
          </div>
        </div>

        {/* Configuration panel */}
        {showConfig && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mb-6 p-4 bg-gray-50 rounded-lg border border-border"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">
                  Avg Deal Value ($)
                </label>
                <input
                  type="number"
                  value={avgDealValue}
                  onChange={(e) => setAvgDealValue(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">
                  Hourly Rate ($)
                </label>
                <input
                  type="number"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">
                  Monthly Subscription ($)
                </label>
                <input
                  type="number"
                  value={subscriptionCost}
                  onChange={(e) => setSubscriptionCost(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg"
                />
              </div>
            </div>
            <div className="flex justify-end mt-3">
              <button
                onClick={handleSaveConfig}
                className="px-4 py-2 text-sm font-medium bg-brand-blue text-white rounded-lg hover:bg-brand-blueDark transition-colors"
              >
                Recalculate
              </button>
            </div>
          </motion.div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {kpiCards.map((card, i) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <OverviewMetricCard
                compact
                label={card.label}
                period="ROI dashboard"
                value={card.value}
                badge={card.badge}
                badgeTone={card.badgeTone}
                icon={card.icon}
                accentColor={card.accentColor}
                chartData={[]}
                caption={card.caption}
              />
            </motion.div>
          ))}
        </div>

        {/* Before vs After comparison */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-red-50 rounded-xl border border-red-100">
            <h4 className="text-sm font-semibold text-red-800 mb-3">Without Boltcall</h4>
            <div className="space-y-2 text-sm text-red-700">
              <div className="flex justify-between">
                <span>Missed calls/month</span>
                <span className="font-semibold">~{Math.round(metrics.callsHandled * 0.4)}</span>
              </div>
              <div className="flex justify-between">
                <span>Lost revenue</span>
                <span className="font-semibold">${Math.round(metrics.callsHandled * 0.4 * metrics.avgDealValue * 0.15).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Staff time on calls</span>
                <span className="font-semibold">{metrics.timeSavedHours}h/mo</span>
              </div>
            </div>
          </div>
          <div className="p-4 bg-green-50 rounded-xl border border-green-100">
            <h4 className="text-sm font-semibold text-green-800 mb-3">With Boltcall</h4>
            <div className="space-y-2 text-sm text-green-700">
              <div className="flex justify-between">
                <span>Calls answered 24/7</span>
                <span className="font-semibold">{metrics.callsHandled}</span>
              </div>
              <div className="flex justify-between">
                <span>Extra revenue captured</span>
                <span className="font-semibold">${metrics.estimatedRevenue.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Monthly cost</span>
                <span className="font-semibold">${metrics.subscriptionCost}</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* ROI Trend Chart */}
      {trend.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-text-main">ROI Trend (6 Months)</h3>
            <button
              onClick={() => exportToCsv(
                trend.map(t => ({ Month: t.month, Leads: t.leads, Revenue: t.revenue, ROI: `${t.roi}%`, 'Cost/Lead': `$${t.costPerLead}` })),
                'roi-trend',
                'ROI Trend'
              )}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-muted hover:text-text-main border border-border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Export
            </button>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="month" stroke="#475569" tick={{ fontSize: 12 }} />
                <YAxis stroke="#475569" tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #E5E7EB',
                    borderRadius: '12px',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="leads"
                  stroke="#2563EB"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  name="Leads"
                />
                <Line
                  type="monotone"
                  dataKey="roi"
                  stroke="#059669"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  name="ROI %"
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#F59E0B"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  name="Revenue ($)"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}
    </div>
  );
};

export default RoiDashboard;
