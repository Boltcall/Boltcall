import React from 'react';
import { Outlet } from 'react-router-dom';
import { BarChart3, Star, Bell, Reply } from 'lucide-react';
import DashboardTabBar, { type DashboardTab } from '../../components/dashboard/DashboardTabBar';

const TABS: DashboardTab[] = [
  { to: 'analytics', label: 'Analytics', icon: <BarChart3 className="w-4 h-4" /> },
  { to: 'reputation', label: 'Reputation', icon: <Star className="w-4 h-4" /> },
  { to: 'reminders', label: 'Reminders', icon: <Bell className="w-4 h-4" /> },
  { to: 'follow-ups', label: 'Follow-ups', icon: <Reply className="w-4 h-4" /> },
];

const GrowthPage: React.FC = () => (
  <div className="flex flex-col h-full">
    <DashboardTabBar tabs={TABS} />
    <div className="flex-1 min-h-0">
      <Outlet />
    </div>
  </div>
);

export default GrowthPage;
