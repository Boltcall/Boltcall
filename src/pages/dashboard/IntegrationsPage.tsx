import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Grid3x3, Calendar, Webhook, ArrowLeftRight } from 'lucide-react';
import IntegrationHubTab from '../../components/integrations/IntegrationHubTab';
import GoogleCalendarTab from './integrations/GoogleCalendarTab';
import WebhooksTab from './integrations/WebhooksTab';
import CrmSyncTab from './integrations/CrmSyncTab';

type TabId = 'hub' | 'google_calendar' | 'webhooks' | 'crm_sync';

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'hub', label: 'All Integrations', icon: <Grid3x3 className="w-4 h-4" /> },
  { id: 'google_calendar', label: 'Google Calendar', icon: <Calendar className="w-4 h-4" /> },
  { id: 'webhooks', label: 'Webhooks', icon: <Webhook className="w-4 h-4" /> },
  { id: 'crm_sync', label: 'CRM Sync', icon: <ArrowLeftRight className="w-4 h-4" /> },
];

const IntegrationsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('hub');

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-1 border-b border-zinc-200 dark:border-[#1e1e24] px-6">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors duration-200 relative ${
              activeTab === tab.id
                ? 'text-blue-600'
                : 'text-zinc-500 dark:text-gray-400 hover:text-zinc-700 dark:hover:text-gray-200'
            }`}
          >
            <span className="flex items-center gap-2">
              {tab.icon}
              {tab.label}
            </span>
            {activeTab === tab.id && (
              <motion.div
                layoutId="integrations-tab-indicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto pt-4">
        {activeTab === 'hub' && <IntegrationHubTab />}
        {activeTab === 'google_calendar' && <GoogleCalendarTab />}
        {activeTab === 'webhooks' && <WebhooksTab />}
        {activeTab === 'crm_sync' && <CrmSyncTab />}
      </div>
    </div>
  );
};

export default IntegrationsPage;
