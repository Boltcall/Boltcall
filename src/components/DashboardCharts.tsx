import React from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

interface DashboardChartsProps {
  type: 'leads' | 'responseTime';
}

const DashboardCharts: React.FC<DashboardChartsProps> = ({ type }) => {
  const leadsData = [
    { name: 'Mon', leads: 45, bookings: 23 },
    { name: 'Tue', leads: 52, bookings: 28 },
    { name: 'Wed', leads: 38, bookings: 19 },
    { name: 'Thu', leads: 61, bookings: 31 },
    { name: 'Fri', leads: 48, bookings: 25 },
    { name: 'Sat', leads: 35, bookings: 18 },
    { name: 'Sun', leads: 42, bookings: 22 }
  ];

  const responseTimeData = [
    { name: 'Mon', time: 32 },
    { name: 'Tue', time: 28 },
    { name: 'Wed', time: 35 },
    { name: 'Thu', time: 25 },
    { name: 'Fri', time: 30 },
    { name: 'Sat', time: 28 },
    { name: 'Sun', time: 26 }
  ];

  const data = type === 'leads' ? leadsData : responseTimeData;

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-border rounded-lg shadow-lg">
          <p className="font-medium text-text-main">{label}</p>
          {payload.map((entry: { name: string; value: number; color: string }, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {type === 'leads' ? entry.value : `${entry.value}s`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (type === 'leads') {
    return (
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data as any}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="name" 
            stroke="#6b7280"
            fontSize={12}
          />
          <YAxis 
            stroke="#6b7280"
            fontSize={12}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="leads"
            stackId="1"
            stroke="#2563EB"
            fill="#2563EB"
            fillOpacity={0.3}
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="bookings"
            stackId="2"
            stroke="#10B981"
            fill="#10B981"
            fillOpacity={0.3}
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data as any}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis 
          dataKey="name" 
          stroke="#6b7280"
          fontSize={12}
        />
        <YAxis 
          stroke="#6b7280"
          fontSize={12}
          label={{ value: 'Seconds', angle: -90, position: 'insideLeft' }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Line
          type="monotone"
          dataKey="time"
          stroke="#2563EB"
          strokeWidth={3}
          dot={{ fill: '#2563EB', strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6, stroke: '#2563EB', strokeWidth: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default DashboardCharts;
