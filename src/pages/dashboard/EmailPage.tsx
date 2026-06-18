import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Mail, FileEdit, MessageSquare, Settings, RefreshCw, Inbox, Send, AlertCircle } from 'lucide-react';
import ServiceEmptyState from '../../components/dashboard/ServiceEmptyState';
import { useAuth } from '../../contexts/AuthContext';
import { useSearchParams } from 'react-router-dom';
import {
  getEmailAccounts,
  getEmailThreads,
  getPendingDrafts,
  getEmailStats,
  type EmailAccount,
  type EmailThread,
  type EmailMessage,
  type EmailStats,
} from '../../lib/emailService';

import EmailAccountConnect from '../../components/email/EmailAccountConnect';
import EmailThreadList from '../../components/email/EmailThreadList';
import EmailThreadView from '../../components/email/EmailThreadView';
import EmailDraftCard from '../../components/email/EmailDraftCard';
import EmailSettingsPanel from '../../components/email/EmailSettingsPanel';
import OverviewMetricCard from '../../components/dashboard/OverviewMetricCard';

type Tab = 'inbox' | 'drafts' | 'threads' | 'settings';

const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'inbox', label: 'Inbox', icon: <Inbox className="w-4 h-4" /> },
  { id: 'drafts', label: 'AI Drafts', icon: <FileEdit className="w-4 h-4" /> },
  { id: 'threads', label: 'Threads', icon: <MessageSquare className="w-4 h-4" /> },
  { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
];

function buildMiniSeries(value: number, direction: 'up' | 'down' = 'up') {
  const step = Math.max(1, Math.ceil(Math.max(value, 1) * 0.2));
  return direction === 'up'
    ? [Math.max(value - step, 0), Math.max(value - Math.ceil(step / 2), 0), value]
    : [value + step, Math.max(value + Math.ceil(step / 2), 0), value];
}

const EmailPage: React.FC = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<Tab>('inbox');
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [threads, setThreads] = useState<EmailThread[]>([]);
  const [drafts, setDrafts] = useState<EmailMessage[]>([]);
  const [stats, setStats] = useState<EmailStats | null>(null);
  const [selectedThread, setSelectedThread] = useState<EmailThread | null>(null);
  const [loading, setLoading] = useState(true);
  const [threadFilter, setThreadFilter] = useState<string>('');
  const [connectMessage, setConnectMessage] = useState<string | null>(null);

  // Check for OAuth redirect params
  useEffect(() => {
    const connect = searchParams.get('connect');
    const email = searchParams.get('email');
    if (connect === 'success' && email) {
      setConnectMessage(`Successfully connected ${decodeURIComponent(email)}`);
      setTimeout(() => setConnectMessage(null), 5000);
    } else if (connect === 'error') {
      setConnectMessage('Failed to connect email account. Please try again.');
      setTimeout(() => setConnectMessage(null), 5000);
    }
  }, [searchParams]);

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [accountsData, threadsData, draftsData, statsData] = await Promise.all([
        getEmailAccounts(user.id),
        getEmailThreads(user.id, { status: threadFilter || undefined }),
        getPendingDrafts(user.id),
        getEmailStats(user.id),
      ]);
      setAccounts(accountsData);
      setThreads(threadsData.threads);
      setDrafts(draftsData);
      setStats(statsData);
    } catch (err) {
      console.error('Failed to load email data:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, threadFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const hasAccounts = accounts.length > 0;

  if (!loading && !hasAccounts) {
    return (
      <ServiceEmptyState
        icon={<Mail className="w-7 h-7 text-indigo-600" />}
        iconBg="bg-indigo-50"
        title="AI Email not set up"
        description="Connect your inbox so the AI can draft replies, qualify leads from email, and book appointments automatically."
        setupLabel="Connect Email Account"
        setupTo="/dashboard/integrations"
      />
    );
  }

  // If viewing a thread detail
  if (selectedThread) {
    return (
      <EmailThreadView
        thread={selectedThread}
        onBack={() => { setSelectedThread(null); loadData(); }}
        onRefresh={loadData}
      />
    );
  }

  return (
    <div className="flex flex-col">
      {/* Connect Message Banner */}
      {connectMessage && (
        <div className={`px-4 py-2.5 text-sm font-medium flex items-center gap-2 ${
          connectMessage.includes('Failed') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
        }`}>
          {connectMessage.includes('Failed') ? <AlertCircle className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
          {connectMessage}
        </div>
      )}

      {/* Tab Bar */}
      <div className="bg-white border-b border-gray-200 flex-shrink-0 px-3 md:px-6 pt-4 pb-0 overflow-x-auto">
        <div className="flex flex-col gap-1 mb-0 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3 sm:mr-6">
            <h1 className="text-lg md:text-xl font-semibold text-gray-900">Email</h1>
            {stats && (
              <div className="flex items-center gap-2">
                {stats.pendingDrafts > 0 && (
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-700 rounded-full">
                    {stats.pendingDrafts} drafts
                  </span>
                )}
                {stats.openThreads > 0 && (
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-700 rounded-full">
                    {stats.openThreads} open
                  </span>
                )}
              </div>
            )}
          </div>
          <nav className="flex gap-3 md:gap-4 -mb-px flex-1">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex items-center gap-2 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
                    isActive ? 'text-blue-600' : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                  {tab.id === 'drafts' && stats && stats.pendingDrafts > 0 && (
                    <span className="w-5 h-5 text-[10px] font-bold bg-amber-500 text-white rounded-full flex items-center justify-center">
                      {stats.pendingDrafts}
                    </span>
                  )}
                  {isActive && (
                    <motion.span
                      layoutId="email-tab-indicator"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t"
                    />
                  )}
                </button>
              );
            })}
          </nav>
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div>
        {!hasAccounts && activeTab !== 'settings' ? (
          // No accounts — show connect prompt
          <div className="max-w-lg mx-auto py-16 px-4">
            <div className="text-center mb-8">
              <div className="mx-auto w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
                <Mail className="w-8 h-8 text-blue-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Connect Your Email</h2>
              <p className="text-sm text-gray-500 mt-2">
                Connect your Gmail or Outlook inbox to start receiving AI-powered email responses for your leads.
              </p>
            </div>
            <EmailAccountConnect accounts={accounts} onRefresh={loadData} />
          </div>
        ) : (
          <>
            {activeTab === 'inbox' && (
              <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-4">
                {/* Stats Cards */}
                {stats && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <StatCard label="Connected" value={stats.connectedAccounts} icon={Mail} color="#2563eb" />
                    <StatCard label="Open" value={stats.openThreads} icon={Inbox} color="#f59e0b" />
                    <StatCard label="Pending Drafts" value={stats.pendingDrafts} icon={FileEdit} color="#8b5cf6" />
                    <StatCard label="Sent Today" value={stats.sentToday} icon={Send} color="#10b981" />
                  </div>
                )}

                {/* Filter Bar */}
                <div className="flex items-center gap-2">
                  {['', 'open', 'replied', 'closed'].map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setThreadFilter(filter)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                        threadFilter === filter
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {filter || 'All'}
                    </button>
                  ))}
                </div>

                {/* Thread List */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <EmailThreadList
                    threads={threads}
                    selectedThreadId={null}
                    onSelect={setSelectedThread}
                    loading={loading}
                  />
                </div>
              </div>
            )}

            {activeTab === 'drafts' && (
              <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-4">
                <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                  Pending AI Drafts ({drafts.length})
                </h2>
                {drafts.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
                      <FileEdit className="w-6 h-6 text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-500">No pending drafts. All caught up!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {drafts.map((draft) => (
                      <EmailDraftCard key={draft.id} draft={draft as any} onAction={loadData} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'threads' && (
              <div className="max-w-4xl mx-auto p-4 md:p-6">
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <EmailThreadList
                    threads={threads}
                    selectedThreadId={null}
                    onSelect={setSelectedThread}
                    loading={loading}
                  />
                </div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-6">
                <EmailAccountConnect accounts={accounts} onRefresh={loadData} />
                {accounts.filter(a => a.is_active).map((account) => (
                  <div key={account.id}>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">
                      Settings for {account.email_address}
                    </h3>
                    <EmailSettingsPanel account={account} onSaved={loadData} />
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// ─── Helper Components ──────────────────────────────────────────────────

const StatCard: React.FC<{
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}> = ({ label, value, icon, color }) => (
  <OverviewMetricCard
    compact
    label={label}
    period="Email overview"
    value={value}
    badge={value > 0 ? 'Active' : 'Idle'}
    badgeTone={value > 0 ? 'positive' : 'neutral'}
    chartData={buildMiniSeries(value)}
    icon={icon}
    accentColor={color}
    caption="Live inbox metric"
  />
);

export default EmailPage;
