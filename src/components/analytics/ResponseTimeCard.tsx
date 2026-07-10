import React from 'react';
import { motion } from 'framer-motion';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { Clock, Zap, AlertTriangle, Download } from 'lucide-react';
import Card from '../ui/Card';
import type { ResponseTimeStats } from '../../lib/analyticsApi';
import { exportToCsv } from '../../lib/exportUtils';

interface ResponseTimeCardProps {
  stats: ResponseTimeStats | null;
  loading?: boolean;
}

function fmtSeconds(sec: number): string {
  if (sec === 0) return '—';
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${s}s`;
}

const ResponseTimeCard: React.FC<ResponseTimeCardProps> = ({ stats, loading }) => {
  if (loading) {
    return (
      <Card className="p-6">
        <div className="h-6 w-48 bg-gray-100 rounded animate-pulse mb-4" />
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
        <div className="h-48 bg-gray-100 rounded-lg animate-pulse" />
      </Card>
    );
  }

  if (!stats) return null;

  const chartData = stats.byHour
    .filter(h => h.count > 0 || (h.hour >= 6 && h.hour <= 22))
    .map(h => ({
      hour: `${h.hour.toString().padStart(2, '0')}:00`,
      avg: h.avgSeconds,
      count: h.count,
    }));

  return (
    <Card className="p-6" id="response-time-chart">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-text-main">Response Time Analytics</h3>
        <button
          onClick={() => exportToCsv(
            stats.byHour.map(h => ({ Hour: `${h.hour}:00`, 'Avg Response (s)': h.avgSeconds, Volume: h.count })),
            'response-times',
            'Response Time'
          )}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-muted hover:text-text-main border border-border rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          Export
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-blue-50 rounded-xl p-3 text-center"
        >
          <Clock className="w-4 h-4 text-blue-600 mx-auto mb-1" />
          <p className="text-lg font-bold text-text-main">{fmtSeconds(stats.avgSeconds)}</p>
          <p className="text-[10px] text-text-muted">Average</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.05 }}
          className="bg-green-50 rounded-xl p-3 text-center"
        >
          <Zap className="w-4 h-4 text-green-600 mx-auto mb-1" />
          <p className="text-lg font-bold text-text-main">{fmtSeconds(stats.fastestSeconds)}</p>
          <p className="text-[10px] text-text-muted">Fastest</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-amber-50 rounded-xl p-3 text-center"
        >
          <Clock className="w-4 h-4 text-amber-600 mx-auto mb-1" />
          <p className="text-lg font-bold text-text-main">{fmtSeconds(stats.medianSeconds)}</p>
          <p className="text-[10px] text-text-muted">Median</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15 }}
          className="bg-red-50 rounded-xl p-3 text-center"
        >
          <AlertTriangle className="w-4 h-4 text-red-600 mx-auto mb-1" />
          <p className="text-lg font-bold text-text-main">{fmtSeconds(stats.slowestSeconds)}</p>
          <p className="text-[10px] text-text-muted">Slowest</p>
        </motion.div>
      </div>

      {chartData.length > 0 && (
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="hour" stroke="#475569" tick={{ fontSize: 10 }} />
              <YAxis stroke="#475569" tick={{ fontSize: 10 }} label={{ value: 'seconds', angle: -90, position: 'insideLeft', style: { fontSize: 10 } }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #E5E7EB', borderRadius: '12px' }}
                formatter={(value: any) => [`${value}s`, 'Avg Response']}
              />
              <Bar dataKey="avg" fill="#2563EB" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
};

export default ResponseTimeCard;
