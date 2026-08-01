import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  MessageSquare, Send, Bot, Check, X, RefreshCw, Phone,
  Settings, ChevronRight, AlertCircle, Zap, Calendar,
  UserCheck, Clock, Filter,
} from 'lucide-react';
import ServiceEmptyState from '../../components/dashboard/ServiceEmptyState';
import { PopButton } from '../../components/ui/pop-button';
import ModalShell from '../../components/ui/modal-shell';
import { PageSkeleton } from '../../components/ui/loading-skeleton';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { approveSmsAiDraft, rejectSmsAiDraft, generateSmsAiReply, sendSms } from '../../lib/twilio';

// ─── Types ──────────────────────────────────────────────────────────

interface SmsThread {
  threadId: string;
  contactPhone: string;
  lastMessage: string;
  lastMessageAt: string;
  direction: 'inbound' | 'outbound';
  messageCount: number;
  hasPendingDraft: boolean;
  latestQualification?: {
    intent: string;
    score: number;
    reason: string;
    suggested_action: string;
  };
}

interface SmsMessage {
  id: string;
  direction: 'inbound' | 'outbound';
  from_number: string;
  to_number: string;
  body: string;
  created_at: string;
  ai_draft: string | null;
  ai_draft_status: string | null;
  qualification: any;
  lead_id: string | null;
}

interface SmsSettings {
  is_enabled: boolean;
  auto_reply_enabled: boolean;
  response_tone: string;
  qualification_enabled: boolean;
  booking_enabled: boolean;
  calcom_event_slug: string;
  business_hours_only: boolean;
  business_hours_start: string;
  business_hours_end: string;
  business_timezone: string;
  max_ai_messages_per_conversation: number;
  greeting_template: string;
  out_of_hours_message: string;
}

const DEFAULT_SETTINGS: SmsSettings = {
  is_enabled: true,
  auto_reply_enabled: false,
  response_tone: 'professional',
  qualification_enabled: true,
  booking_enabled: true,
  calcom_event_slug: '',
  business_hours_only: false,
  business_hours_start: '09:00',
  business_hours_end: '17:00',
  business_timezone: 'UTC',
  max_ai_messages_per_conversation: 10,
  greeting_template: '',
  out_of_hours_message: '',
};

// ─── Component ──────────────────────────────────────────────────────

const SmsPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'conversations' | 'settings'>('conversations');
  const [threads, setThreads] = useState<SmsThread[]>([]);
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const [messages, setMessages] = useState<SmsMessage[]>([]);
  const [settings, setSettings] = useState<SmsSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [composePhone, setComposePhone] = useState('');
  const [composeMessage, setComposeMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'hot'>('all');
  const [stats, setStats] = useState({ total: 0, pending: 0, autoSent: 0, hotLeads: 0 });

  // ─── Load threads and settings ────────────────────────────────────

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      // Fetch all conversations grouped by thread
      const { data: convos, error: convoErr } = await supabase
        .from('sms_conversations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(200);

      if (convoErr) throw convoErr;

      // Group into threads
      const threadMap = new Map<string, SmsMessage[]>();
      for (const msg of convos || []) {
        const tid = msg.thread_id || `${msg.from_number}_${msg.to_number}`;
        if (!threadMap.has(tid)) threadMap.set(tid, []);
        threadMap.get(tid)!.push(msg);
      }

      const threadList: SmsThread[] = [];
      let totalCount = 0;
      let pendingCount = 0;
      let autoSentCount = 0;
      let hotCount = 0;

      for (const [tid, msgs] of threadMap) {
        const sorted = msgs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        const latest = sorted[0];
        const inboundMsgs = sorted.filter(m => m.direction === 'inbound');
        const latestInbound = inboundMsgs[0];
        const hasPendingDraft = sorted.some(m => m.ai_draft_status === 'pending');
        const contactPhone = latest.direction === 'inbound' ? latest.from_number : latest.to_number;

        totalCount += msgs.length;
        if (hasPendingDraft) pendingCount++;
        autoSentCount += sorted.filter(m => m.ai_draft_status === 'auto_sent').length;
        if (latestInbound?.qualification?.score >= 70) hotCount++;

        threadList.push({
          threadId: tid,
          contactPhone,
          lastMessage: latest.body,
          lastMessageAt: latest.created_at,
          direction: latest.direction,
          messageCount: msgs.length,
          hasPendingDraft,
          latestQualification: latestInbound?.qualification || undefined,
        });
      }

      // Sort: pending drafts first, then by recency
      threadList.sort((a, b) => {
        if (a.hasPendingDraft && !b.hasPendingDraft) return -1;
        if (!a.hasPendingDraft && b.hasPendingDraft) return 1;
        return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
      });

      setThreads(threadList);
      setStats({ total: totalCount, pending: pendingCount, autoSent: autoSentCount, hotLeads: hotCount });

      // Load settings
      const { data: settingsData } = await supabase
        .from('sms_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (settingsData) {
        setSettings({ ...DEFAULT_SETTINGS, ...settingsData });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load SMS data');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  // ─── Load thread messages ─────────────────────────────────────────

  const loadThread = async (threadId: string) => {
    setSelectedThread(threadId);
    setMessagesLoading(true);

    const { data } = await supabase
      .from('sms_conversations')
      .select('*')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true })
      .limit(100);

    setMessages(data || []);
    setMessagesLoading(false);
  };

  // ─── Actions ──────────────────────────────────────────────────────

  const handleApprove = async (messageId: string) => {
    if (!user) return;
    try {
      await approveSmsAiDraft(messageId, user.id);
      await loadThread(selectedThread!);
      await loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleReject = async (messageId: string) => {
    if (!user) return;
    try {
      await rejectSmsAiDraft(messageId, user.id);
      await loadThread(selectedThread!);
      await loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleRegenerate = async (messageId: string) => {
    if (!user) return;
    try {
      await generateSmsAiReply(messageId, user.id, 'regenerate');
      await loadThread(selectedThread!);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSendManual = async () => {
    if (!composePhone || !composeMessage) return;
    setSending(true);
    try {
      await sendSms(composePhone, composeMessage);
      setShowComposeModal(false);
      setComposePhone('');
      setComposeMessage('');
      await loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!user) return;
    try {
      const { error: upsertErr } = await supabase
        .from('sms_settings')
        .upsert({ user_id: user.id, ...settings, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });

      if (upsertErr) throw upsertErr;
      setShowSettingsModal(false);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // ─── Filter threads ───────────────────────────────────────────────

  const filteredThreads = threads.filter(t => {
    if (filter === 'pending') return t.hasPendingDraft;
    if (filter === 'hot') return (t.latestQualification?.score || 0) >= 70;
    return true;
  });

  // ─── Render ───────────────────────────────────────────────────────

  if (loading) return <PageSkeleton />;

  if (!settings.is_enabled) {
    return (
      <ServiceEmptyState
        icon={<MessageSquare className="w-7 h-7 text-blue-600" />}
        iconBg="bg-blue-50"
        title="SMS Agent not set up"
        description="Automatically reply to inbound texts, qualify leads, and book appointments — all without lifting a finger."
        setupLabel="Set Up SMS"
        setupTo="/dashboard/phone"
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-3">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700 flex-1">{error}</p>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">SMS Agent</h1>
        </div>
        <div className="flex items-center gap-2">
          <PopButton color="gray" size="sm" onClick={loadData} className="gap-1.5">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </PopButton>
          <PopButton color="gray" size="sm" onClick={() => setShowSettingsModal(true)} className="gap-1.5">
            <Settings className="w-4 h-4" />
            Settings
          </PopButton>
          <PopButton color="blue" size="sm" onClick={() => setShowComposeModal(true)} className="gap-1.5">
            <Send className="w-4 h-4" />
            New SMS
          </PopButton>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Messages', value: stats.total, icon: MessageSquare, color: 'blue' },
          { label: 'Pending Drafts', value: stats.pending, icon: Clock, color: 'yellow' },
          { label: 'Auto-Sent', value: stats.autoSent, icon: Zap, color: 'green' },
          { label: 'Hot Leads', value: stats.hotLeads, icon: UserCheck, color: 'red' },
        ].map((stat) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-[#111114] rounded-xl border border-gray-200 dark:border-[#1e1e24] p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <stat.icon className={`w-5 h-5 text-${stat.color}-500`} />
              <span className="text-2xl font-bold text-gray-900">{stat.value}</span>
            </div>
            <p className="text-xs text-gray-500">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Auto-reply Status Banner */}
      <div className={`rounded-lg p-3 flex items-center gap-3 ${settings.auto_reply_enabled ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'}`}>
        <Bot className={`w-5 h-5 ${settings.auto_reply_enabled ? 'text-green-600' : 'text-gray-400'}`} />
        <div className="flex-1">
          <span className={`text-sm font-medium ${settings.auto_reply_enabled ? 'text-green-800' : 'text-gray-600'}`}>
            AI Auto-Reply: {settings.auto_reply_enabled ? 'ON' : 'OFF (Draft Mode)'}
          </span>
          <span className="text-xs text-gray-500 ml-2">
            {settings.auto_reply_enabled
              ? 'AI sends replies automatically'
              : 'AI generates drafts for your approval'}
          </span>
        </div>
        <PopButton
          color={settings.auto_reply_enabled ? 'green' : 'gray'}
          size="sm"
          onClick={() => setShowSettingsModal(true)}
        >
          Configure
        </PopButton>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-gray-200 dark:border-[#1e1e24]">
        {(['conversations', 'settings'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'conversations' ? 'Conversations' : 'Settings'}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'conversations' ? (
        <div className="flex gap-4 min-h-[500px]">
          {/* Thread List */}
          <div className="w-full md:w-1/3 space-y-2">
            {/* Filter */}
            <div className="flex items-center gap-1 mb-3">
              {(['all', 'pending', 'hot'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    filter === f
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <Filter className="w-3 h-3 inline mr-1" />
                  {f === 'all' ? 'All' : f === 'pending' ? 'Pending' : 'Hot Leads'}
                </button>
              ))}
            </div>

            {filteredThreads.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">No SMS conversations yet</p>
                <p className="text-xs text-gray-400 mt-1">Incoming texts will appear here</p>
              </div>
            ) : (
              filteredThreads.map(thread => (
                <button
                  key={thread.threadId}
                  onClick={() => loadThread(thread.threadId)}
                  className={`w-full text-left p-3 rounded-lg border transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md ${
                    selectedThread === thread.threadId
                      ? 'border-blue-300 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30'
                      : 'border-gray-200 dark:border-[#1e1e24] bg-white dark:bg-[#111114] hover:bg-gray-50 dark:hover:bg-[#17171b]'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        thread.hasPendingDraft ? 'bg-yellow-100' : 'bg-gray-100'
                      }`}>
                        <Phone className={`w-4 h-4 ${thread.hasPendingDraft ? 'text-yellow-600' : 'text-gray-500'}`} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{thread.contactPhone}</p>
                        <p className="text-xs text-gray-500 truncate">{thread.lastMessage}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0 ml-2">
                      <span className="text-xs text-gray-400">
                        {new Date(thread.lastMessageAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                      {thread.hasPendingDraft && (
                        <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded-full font-medium">Draft</span>
                      )}
                      {thread.latestQualification && (
                        <span className={`px-1.5 py-0.5 text-xs rounded-full font-medium ${
                          thread.latestQualification.score >= 70
                            ? 'bg-red-100 text-red-700'
                            : thread.latestQualification.score >= 40
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {thread.latestQualification.intent} {thread.latestQualification.score}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 pl-10">
                    <span className="text-xs text-gray-400">{thread.messageCount} messages</span>
                    <ChevronRight className="w-3 h-3 text-gray-300" />
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Message Thread View */}
          <div className="hidden md:flex flex-col flex-1 bg-white dark:bg-[#111114] rounded-xl border border-gray-200 dark:border-[#1e1e24]">
            {!selectedThread ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <MessageSquare className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                  <p className="text-sm text-gray-400">Select a conversation</p>
                </div>
              </div>
            ) : messagesLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <RefreshCw className="w-6 h-6 text-gray-400 animate-spin" />
              </div>
            ) : (
              <>
                {/* Thread Header */}
                <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <Phone className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {messages[0]?.direction === 'inbound' ? messages[0]?.from_number : messages[0]?.to_number}
                      </p>
                      <p className="text-xs text-gray-500">{messages.length} messages</p>
                    </div>
                  </div>
                  {messages.some(m => m.qualification?.intent === 'booking') && (
                    <span className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full">
                      <Calendar className="w-3 h-3" />
                      Booking Intent
                    </span>
                  )}
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messages.map(msg => (
                    <div key={msg.id} className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] space-y-1`}>
                        <div className={`rounded-2xl px-4 py-2.5 ${
                          msg.direction === 'outbound'
                            ? 'bg-blue-600 text-white rounded-br-md'
                            : 'bg-gray-100 text-gray-900 rounded-bl-md'
                        }`}>
                          <p className="text-sm">{msg.body}</p>
                        </div>

                        {/* AI Draft below inbound messages */}
                        {msg.direction === 'inbound' && msg.ai_draft && (
                          <div className="ml-2 mt-1">
                            <div className={`rounded-xl px-3 py-2 border ${
                              msg.ai_draft_status === 'pending'
                                ? 'bg-yellow-50 border-yellow-200'
                                : msg.ai_draft_status === 'auto_sent'
                                ? 'bg-green-50 border-green-200'
                                : msg.ai_draft_status === 'approved'
                                ? 'bg-blue-50 border-blue-200'
                                : 'bg-gray-50 border-gray-200'
                            }`}>
                              <div className="flex items-center gap-1.5 mb-1">
                                <Bot className="w-3 h-3 text-gray-400" />
                                <span className="text-xs font-medium text-gray-500">
                                  AI {msg.ai_draft_status === 'pending' ? 'Draft' : msg.ai_draft_status === 'auto_sent' ? 'Auto-sent' : msg.ai_draft_status === 'approved' ? 'Sent' : 'Rejected'}
                                </span>
                              </div>
                              <p className="text-sm text-gray-700">{msg.ai_draft}</p>

                              {msg.ai_draft_status === 'pending' && (
                                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-yellow-200">
                                  <button
                                    onClick={() => handleApprove(msg.id)}
                                    className="flex items-center gap-1 px-2 py-1 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 transition-colors"
                                  >
                                    <Check className="w-3 h-3" /> Send
                                  </button>
                                  <button
                                    onClick={() => handleReject(msg.id)}
                                    className="flex items-center gap-1 px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded-lg hover:bg-gray-300 transition-colors"
                                  >
                                    <X className="w-3 h-3" /> Reject
                                  </button>
                                  <button
                                    onClick={() => handleRegenerate(msg.id)}
                                    className="flex items-center gap-1 px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded-lg hover:bg-gray-300 transition-colors"
                                  >
                                    <RefreshCw className="w-3 h-3" /> Regen
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* Qualification Badge */}
                            {msg.qualification && (
                              <div className="flex items-center gap-2 mt-1">
                                <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                                  msg.qualification.score >= 70
                                    ? 'bg-red-100 text-red-700'
                                    : msg.qualification.score >= 40
                                    ? 'bg-yellow-100 text-yellow-700'
                                    : 'bg-gray-100 text-gray-500'
                                }`}>
                                  {msg.qualification.intent} — {msg.qualification.score}/100
                                </span>
                                {msg.qualification.suggested_action === 'book' && (
                                  <span className="flex items-center gap-0.5 text-xs text-blue-600">
                                    <Calendar className="w-3 h-3" /> Wants to book
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        <p className={`text-xs ${msg.direction === 'outbound' ? 'text-right text-gray-400' : 'text-gray-400'}`}>
                          {new Date(msg.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        /* Settings Tab */
        <div className="bg-white dark:bg-[#111114] rounded-xl border border-gray-200 dark:border-[#1e1e24] p-6 space-y-6 max-w-2xl">
          <h3 className="text-lg font-semibold text-gray-900">SMS AI Configuration</h3>

          {/* Enable/Disable */}
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <p className="text-sm font-medium text-gray-900">SMS AI Assistant</p>
              <p className="text-xs text-gray-500">Enable AI-powered responses to inbound SMS</p>
            </div>
            <button
              onClick={() => setSettings(s => ({ ...s, is_enabled: !s.is_enabled }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.is_enabled ? 'bg-blue-600' : 'bg-gray-300'}`}
            >
              <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${settings.is_enabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          {/* Auto-reply */}
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <p className="text-sm font-medium text-gray-900">Auto-Reply</p>
              <p className="text-xs text-gray-500">OFF = drafts for approval, ON = send automatically</p>
            </div>
            <button
              onClick={() => setSettings(s => ({ ...s, auto_reply_enabled: !s.auto_reply_enabled }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.auto_reply_enabled ? 'bg-green-600' : 'bg-gray-300'}`}
            >
              <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${settings.auto_reply_enabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          {/* Tone */}
          <div className="py-3 border-b border-gray-100">
            <label className="block text-sm font-medium text-gray-900 mb-2">Response Tone</label>
            <select
              value={settings.response_tone}
              onChange={e => setSettings(s => ({ ...s, response_tone: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="professional">Professional</option>
              <option value="friendly">Friendly</option>
              <option value="casual">Casual</option>
            </select>
          </div>

          {/* Lead Qualification */}
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <p className="text-sm font-medium text-gray-900">Lead Qualification</p>
              <p className="text-xs text-gray-500">Score and categorize leads from SMS conversations</p>
            </div>
            <button
              onClick={() => setSettings(s => ({ ...s, qualification_enabled: !s.qualification_enabled }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.qualification_enabled ? 'bg-blue-600' : 'bg-gray-300'}`}
            >
              <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${settings.qualification_enabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          {/* Booking */}
          <div className="py-3 border-b border-gray-100 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">Appointment Booking</p>
                <p className="text-xs text-gray-500">AI can offer available Cal.com slots via SMS</p>
              </div>
              <button
                onClick={() => setSettings(s => ({ ...s, booking_enabled: !s.booking_enabled }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.booking_enabled ? 'bg-blue-600' : 'bg-gray-300'}`}
              >
                <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${settings.booking_enabled ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
            {settings.booking_enabled && (
              <div>
                <label className="block text-xs text-gray-500 mb-1">Cal.com Event Slug</label>
                <input
                  type="text"
                  value={settings.calcom_event_slug}
                  onChange={e => setSettings(s => ({ ...s, calcom_event_slug: e.target.value }))}
                  placeholder="e.g. consultation"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            )}
          </div>

          {/* Max messages */}
          <div className="py-3 border-b border-gray-100">
            <label className="block text-sm font-medium text-gray-900 mb-2">Max AI Messages Per Conversation</label>
            <input
              type="number"
              min={1}
              max={50}
              value={settings.max_ai_messages_per_conversation}
              onChange={e => setSettings(s => ({ ...s, max_ai_messages_per_conversation: parseInt(e.target.value) || 10 }))}
              className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Greeting Template */}
          <div className="py-3 border-b border-gray-100">
            <label className="block text-sm font-medium text-gray-900 mb-1">Custom Greeting (optional)</label>
            <p className="text-xs text-gray-500 mb-2">First reply template. Leave empty to let AI decide.</p>
            <textarea
              value={settings.greeting_template}
              onChange={e => setSettings(s => ({ ...s, greeting_template: e.target.value }))}
              placeholder="Hi! Thanks for reaching out to {{business_name}}. How can we help?"
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Save */}
          <div className="flex justify-end pt-2">
            <PopButton color="blue" size="sm" onClick={handleSaveSettings} className="gap-1.5">
              <Check className="w-4 h-4" />
              Save Settings
            </PopButton>
          </div>
        </div>
      )}

      {/* ─── Compose Modal ─────────────────────────────────────────── */}
      <ModalShell
        open={showComposeModal}
        onClose={() => setShowComposeModal(false)}
        title="Send SMS"
        footer={
          <>
            <PopButton onClick={() => setShowComposeModal(false)} size="sm">Cancel</PopButton>
            <PopButton color="blue" size="sm" onClick={handleSendManual} disabled={!composePhone || !composeMessage || sending}>
              {sending ? 'Sending...' : 'Send'}
            </PopButton>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
            <input
              type="tel"
              value={composePhone}
              onChange={e => setComposePhone(e.target.value)}
              placeholder="+1234567890"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
            <textarea
              value={composeMessage}
              onChange={e => setComposeMessage(e.target.value)}
              placeholder="Type your message..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-400 mt-1">{composeMessage.length}/160 characters</p>
          </div>
        </div>
      </ModalShell>

      {/* ─── Settings Modal (quick toggle from banner) ─────────────── */}
      <ModalShell
        open={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        title="Quick Settings"
        footer={
          <>
            <PopButton onClick={() => setShowSettingsModal(false)} size="sm">Cancel</PopButton>
            <PopButton color="blue" size="sm" onClick={async () => { await handleSaveSettings(); setShowSettingsModal(false); }}>
              Save
            </PopButton>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700">AI Auto-Reply</span>
            <button
              onClick={() => setSettings(s => ({ ...s, auto_reply_enabled: !s.auto_reply_enabled }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.auto_reply_enabled ? 'bg-green-600' : 'bg-gray-300'}`}
            >
              <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${settings.auto_reply_enabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700">Lead Qualification</span>
            <button
              onClick={() => setSettings(s => ({ ...s, qualification_enabled: !s.qualification_enabled }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.qualification_enabled ? 'bg-blue-600' : 'bg-gray-300'}`}
            >
              <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${settings.qualification_enabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700">Appointment Booking</span>
            <button
              onClick={() => setSettings(s => ({ ...s, booking_enabled: !s.booking_enabled }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.booking_enabled ? 'bg-blue-600' : 'bg-gray-300'}`}
            >
              <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${settings.booking_enabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Response Tone</label>
            <select
              value={settings.response_tone}
              onChange={e => setSettings(s => ({ ...s, response_tone: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
            >
              <option value="professional">Professional</option>
              <option value="friendly">Friendly</option>
              <option value="casual">Casual</option>
            </select>
          </div>
        </div>
      </ModalShell>
    </div>
  );
};

export default SmsPage;
