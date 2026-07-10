import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sparkles, User, BookOpen, Volume2, Phone, PhoneCall } from 'lucide-react';
import DashboardTabBar, { type DashboardTab } from '../../components/dashboard/DashboardTabBar';

const TABS: DashboardTab[] = [
  { to: 'overview', label: 'Overview', icon: <Sparkles className="w-4 h-4" /> },
  { to: 'personality', label: 'Personality', icon: <User className="w-4 h-4" /> },
  { to: 'knowledge', label: 'Knowledge', icon: <BookOpen className="w-4 h-4" /> },
  { to: 'voice', label: 'Voice', icon: <Volume2 className="w-4 h-4" /> },
  { to: 'phone', label: 'Phone', icon: <Phone className="w-4 h-4" /> },
  { to: 'test', label: 'Test', icon: <PhoneCall className="w-4 h-4" /> },
];

const YourAiPage: React.FC = () => (
  <div className="flex flex-col h-full">
    <DashboardTabBar tabs={TABS} />
    <div className="flex-1 min-h-0">
      <Outlet />
    </div>
  </div>
);

export default YourAiPage;
