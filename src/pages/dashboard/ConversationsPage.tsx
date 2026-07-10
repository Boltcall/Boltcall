import React from 'react';
import { Outlet } from 'react-router-dom';
import { Phone, MessageSquare, PhoneMissed } from 'lucide-react';
import DashboardTabBar, { type DashboardTab } from '../../components/dashboard/DashboardTabBar';

const TABS: DashboardTab[] = [
  { to: 'calls', label: 'Calls', icon: <Phone className="w-4 h-4" /> },
  { to: 'messages', label: 'Messages', icon: <MessageSquare className="w-4 h-4" /> },
  { to: 'missed', label: 'Missed', icon: <PhoneMissed className="w-4 h-4" /> },
];

const ConversationsPage: React.FC = () => (
  <div className="flex flex-col h-full">
    <DashboardTabBar tabs={TABS} />
    <div className="flex-1 min-h-0">
      <Outlet />
    </div>
  </div>
);

export default ConversationsPage;
