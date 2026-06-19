import React, { useState, useEffect, useCallback } from 'react';
import {
  MessageCircle, Send, Check, X, RefreshCw, Copy,
  Loader2, Phone, ExternalLink, Eye, EyeOff,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { InfiniteRibbon } from '@/components/ui/infinite-ribbon';

// ─── Types ──────────────────────────────────────────────────────────

interface WhatsAppSettings {
  id?: string;
  user_id?: string;
  is_enabled: boolean;
  wa_phone_number_id: string | null;
  wa_access_token: string | null;
  wa_business_account_id: string | null;
  webhook_verify_token: string | null;
  auto_reply_enabled: boolean;
  response_tone: string;
  qualification_enabled: boolean;
  booking_enabled: boolean;
  business_hours_only: boolean;
  business_hours_start: string;
  business_hours_end: string;
  business_timezone: string;
  max_ai_messages_per_conversation: number;
  greeting_template: string | null;
  out_of_hours_message: string | null;
}

interface WaQualification {
  intent?: string;
  score?: number;
  reason?: string;
  suggested_action?: string;
}

interface WaThread {
  threadId: string;
  contactPhone: string;
  lastMessage: string;
  lastMessageAt: string;
  direction: 'inbound' | 'outbound';
  messageCount: number;
  hasPendingDraft: boolean;
  hasApprovedDraft: boolean;
  latestQualification?: WaQualification;
}

interface WaMessage {
  id: string;
  direction: 'inbound' | 'outbound';
  from_number: string;
  to_number: string;
  body: string;
  created_at: string;
  ai_draft: string | null;
  ai_draft_status: string | null;
  qualification?: WaQualification | null;
  thread_id?: string;
}

const DEFAULT_SETTINGS: WhatsAppSettings = {
  is_enabled: false,
  wa_phone_number_id: null,
  wa_access_token: null,
  wa_business_account_id: null,
  webhook_verify_token: null,
  auto_reply_enabled: false,
  response_tone: 'professional',
  qualification_enabled: true,
  booking_enabled: true,
  business_hours_only: false,
  business_hours_start: '09:00',
  business_hours_end: '17:00',
  business_timezone: 'UTC',
  max_ai_messages_per_conversation: 10,
  greeting_template: '',
  out_of_hours_message: '',
};

type TabKey = 'settings' | 'conversations' | 'connection';
type FilterKey = 'all' | 'pending' | 'qualified' | 'booked';

// ─── Helpers ────────────────────────────────────────────────────────

const formatTime = (iso: string): string => {
  try {
    const d = new Date(iso);
    const now = new Date();
    const sameDay =
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate();
    if (sameDay) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
};

const callWhatsAppFn = async (
  path: 'whatsapp-settings' | 'whatsapp-send' | 'whatsapp-ai-responder',
  body: Record<string, unknown>
): Promise<any> => {
  const { data: { session } } = await supabase.auth.getSession();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }
  const res = await fetch(`/.netlify/functions/${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || `Request failed (${res.status})`);
  return json;
};

// ─── Component ──────────────────────────────────────────────────────

const WhatsappPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>('connection');
  const [settings, setSettings] = useState<WhatsAppSettings | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Conversations state
  const [threads, setThreads] = useState<WaThread[]>([]);
  const [threadsLoading, setThreadsLoading] = useState(false);
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const [messages, setMessages] = useState<WaMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [msgPage, setMsgPage] = useState(0);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [composeText, setComposeText] = useState('');
  const [sending, setSending] = useState(false);

  // Connection tab state
  const [testPhone, setTestPhone] = useState('');
  const [testing, setTesting] = useState(false);
  const [connectForm, setConnectForm] = useState({
    phoneNumberId: '',
    accessToken: '',
    businessAccountId: '',
  });
  const [showToken, setShowToken] = useState(false);

  const isConnected = !!settings?.wa_phone_number_id;

  // ─── Load settings ────────────────────────────────────────────────

  const loadSettings = useCallback(async () => {
    if (!user?.id) return;
    setSettingsLoading(true);
    try {
      const res = await callWhatsAppFn('whatsapp-settings', {
        action: 'get',
        userId: user.id,
      });
      const s: WhatsAppSettings = res?.settings
        ? { ...DEFAULT_SETTINGS, ...res.settings }
        : { ...DEFAULT_SETTINGS };
      setSettings(s);
      setActiveTab(s.wa_phone_number_id ? 'settings' : 'connection');
    } catch {
      setSettings({ ...DEFAULT_SETTINGS });
      setActiveTab('connection');
    } finally {
      setSettingsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // ─── Load threads ─────────────────────────────────────────────────

  const loadThreads = useCallback(async () => {
    if (!user?.id) return;
    setThreadsLoading(true);
    try {
      const { data, error } = await supabase
        .from('whatsapp_conversations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;

      const map = new Map<string, WaMessage[]>();
      for (const m of (data || []) as WaMessage[]) {
        const tid = m.thread_id || `${m.from_number}_${m.to_number}`;
        if (!map.has(tid)) map.set(tid, []);
        map.get(tid)!.push(m);
      }

      const out: WaThread[] = [];
      for (const [tid, msgs] of map.entries()) {
        const sorted = msgs.sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        const latest = sorted[0];
        const inbound = sorted.find((m) => m.direction === 'inbound');
        const contactPhone = inbound?.from_number || latest.to_number || '';
        const latestInbound = sorted.find((m) => m.direction === 'inbound' && m.qualification);
        out.push({
          threadId: tid,
          contactPhone,
          lastMessage: latest.body || '',
          lastMessageAt: latest.created_at,
          direction: latest.direction,
          messageCount: sorted.length,
          hasPendingDraft: sorted.some((m) => m.ai_draft_status === 'pending'),
          hasApprovedDraft: sorted.some((m) => m.ai_draft_status === 'approved'),
          latestQualification: (latestInbound?.qualification as WaQualification | undefined) || undefined,
        });
      }

      out.sort(
        (a, b) =>
          new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
      );
      setThreads(out);
    } catch {
      setThreads([]);
    } finally {
      setThreadsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (activeTab === 'conversations' && isConnected) loadThreads();
  }, [activeTab, isConnected, loadThreads]);

  // ─── Realtime subscription ────────────────────────────────────────

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`whatsapp-conversations-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'whatsapp_conversations',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const record = payload.new as WaMessage & { user_id?: string };
          loadThreads();
          const tid = record.thread_id || `${record.from_number}_${record.to_number}`;
          if (selectedThread && tid === selectedThread) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === record.id)) return prev;
              return [...prev, record];
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, selectedThread, loadThreads]);

  // ─── Load messages for selected thread ────────────────────────────

  const MESSAGE_PAGE_SIZE = 30;

  const loadMessages = useCallback(
    async (threadId: string) => {
      if (!user?.id) return;
      setMessagesLoading(true);
      setMsgPage(0);
      try {
        const { data, error } = await supabase
          .from('whatsapp_conversations')
          .select('*')
          .eq('user_id', user.id)
          .eq('thread_id', threadId)
          .order('created_at', { ascending: false })
          .limit(MESSAGE_PAGE_SIZE);
        if (error) throw error;
        const rows = (data || []) as WaMessage[];
        setHasMoreMessages(rows.length === MESSAGE_PAGE_SIZE);
        setMessages(rows.slice().reverse());
      } catch {
        setMessages([]);
        setHasMoreMessages(false);
      } finally {
        setMessagesLoading(false);
      }
    },
    [user?.id]
  );

  const loadMoreMessages = useCallback(async () => {
    if (!user?.id || !selectedThread || loadingMore || !hasMoreMessages) return;
    setLoadingMore(true);
    try {
      const nextPage = msgPage + 1;
      const offset = nextPage * MESSAGE_PAGE_SIZE;
      const { data, error } = await supabase
        .from('whatsapp_conversations')
        .select('*')
        .eq('user_id', user.id)
        .eq('thread_id', selectedThread)
        .order('created_at', { ascending: false })
        .range(offset, offset + MESSAGE_PAGE_SIZE - 1);
      if (error) throw error;
      const rows = (data || []) as WaMessage[];
      setHasMoreMessages(rows.length === MESSAGE_PAGE_SIZE);
      setMsgPage(nextPage);
      setMessages((prev) => [...rows.slice().reverse(), ...prev]);
    } catch {
      // ignore
    } finally {
      setLoadingMore(false);
    }
  }, [user?.id, selectedThread, msgPage, loadingMore, hasMoreMessages]);

  useEffect(() => {
    if (selectedThread) loadMessages(selectedThread);
    else {
      setMessages([]);
      setHasMoreMessages(false);
      setMsgPage(0);
    }
  }, [selectedThread, loadMessages]);

  // ─── Filters ──────────────────────────────────────────────────────

  const filteredThreads = threads.filter((t) => {
    if (filter === 'all') return true;
    if (filter === 'pending') return t.hasPendingDraft;
    if (filter === 'qualified') {
      const q = t.latestQualification;
      return !!q && (!!q.intent || (typeof q.score === 'number' && q.score >= 60));
    }
    if (filter === 'booked') {
      return (
        t.latestQualification?.intent === 'booking' ||
        t.hasApprovedDraft
      );
    }
    return true;
  });

  // ─── Actions ──────────────────────────────────────────────────────

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  const updateSetting = <K extends keyof WhatsAppSettings>(
    key: K,
    value: WhatsAppSettings[K]
  ) => {
    setSettings((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const handleSaveSettings = async () => {
    if (!user?.id || !settings) return;
    setSaving(true);
    try {
      await callWhatsAppFn('whatsapp-settings', {
        action: 'save',
        userId: user.id,
        ...settings,
      });
      showToast('success', 'Settings saved');
      await loadSettings();
    } catch (e: any) {
      showToast('error', e?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = async () => {
    if (!user?.id || !settings) return;
    setSaving(true);
    try {
      await callWhatsAppFn('whatsapp-settings', {
        action: 'disconnect',
        userId: user.id,
      });
      showToast('success', 'Disconnected');
      await loadSettings();
    } catch (e: any) {
      showToast('error', e?.message || 'Failed to disconnect');
    } finally {
      setSaving(false);
    }
  };

  const handleConnectWhatsApp = async () => {
    if (!user?.id) return;
    if (!connectForm.phoneNumberId.trim() || !connectForm.accessToken.trim()) {
      showToast('error', 'Phone Number ID and Access Token are required');
      return;
    }
    setSaving(true);
    try {
      await callWhatsAppFn('whatsapp-settings', {
        action: 'save',
        userId: user.id,
        wa_phone_number_id: connectForm.phoneNumberId.trim(),
        wa_access_token: connectForm.accessToken.trim(),
        wa_business_account_id: connectForm.businessAccountId.trim() || null,
        is_enabled: true,
      });
      showToast('success', 'WhatsApp connected');
      await loadSettings();
    } catch (e: any) {
      showToast('error', e?.message || 'Failed to connect');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!user?.id || !testPhone) return;
    setTesting(true);
    try {
      await callWhatsAppFn('whatsapp-settings', {
        action: 'test',
        userId: user.id,
        testPhone,
      });
      showToast('success', 'Test message sent');
    } catch (e: any) {
      showToast('error', e?.message || 'Test failed');
    } finally {
      setTesting(false);
    }
  };

  const handleDraftAction = async (
    messageId: string,
    action: 'approve' | 'reject' | 'regenerate'
  ) => {
    if (!user?.id) return;
    try {
      await callWhatsAppFn('whatsapp-ai-responder', {
        action,
        userId: user.id,
        messageId,
      });
      if (selectedThread) await loadMessages(selectedThread);
      await loadThreads();
    } catch (e: any) {
      showToast('error', e?.message || `Failed to ${action}`);
    }
  };

  const handleSend = async () => {
    if (!user?.id || !selectedThread) return;
    const trimmed = composeText.trim();
    if (!trimmed) return;
    if (trimmed.length > 4096) {
      showToast('error', 'Message too long (max 4096 characters)');
      return;
    }
    const thread = threads.find((t) => t.threadId === selectedThread);
    if (!thread) return;
    const contactPhone = thread.contactPhone || '';
    if (!/^\+?[1-9]\d{6,14}$/.test(contactPhone.replace(/\D/g, ''))) {
      showToast('error', 'Invalid contact phone number');
      return;
    }
    setSending(true);
    try {
      await callWhatsAppFn('whatsapp-send', {
        userId: user.id,
        to: contactPhone,
        body: trimmed,
        threadId: selectedThread,
      });
      setComposeText('');
      await loadMessages(selectedThread);
      await loadThreads();
    } catch (e: any) {
      showToast('error', e?.message || 'Failed to send');
    } finally {
      setSending(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(
      () => showToast('success', 'Copied'),
      () => showToast('error', 'Copy failed')
    );
  };

  const webhookUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/.netlify/functions/whatsapp-webhook`
      : '/.netlify/functions/whatsapp-webhook';

  if (settingsLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gray-100" />
          <div className="space-y-1.5">
            <div className="h-6 w-28 bg-gray-100 rounded" />
            <div className="h-3.5 w-52 bg-gray-100 rounded" />
          </div>
        </div>
        <div className="flex gap-6 border-b border-gray-200">
          {[80, 96, 88].map((w, i) => (
            <div key={i} className="pb-2">
              <div className="h-3.5 bg-gray-100 rounded" style={{ width: w }} />
            </div>
          ))}
        </div>
        <div className="space-y-4 max-w-2xl">
          {[0, 1, 2].map((i) => (
            <div key={i} className="bg-gray-50 border border-gray-200 rounded-xl p-5 flex items-center justify-between">
              <div className="space-y-1.5">
                <div className="h-3.5 w-36 bg-gray-100 rounded" />
                <div className="h-3 w-52 bg-gray-100 rounded" />
              </div>
              <div className="h-5 w-9 bg-gray-100 rounded-full" />
            </div>
          ))}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 space-y-3">
            <div className="h-3.5 w-32 bg-gray-100 rounded" />
            <div className="h-3 w-64 bg-gray-100 rounded" />
            <div className="h-9 w-full bg-gray-100 rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="min-h-[60vh] px-4 py-8">
        <div className="mx-auto flex max-w-4xl flex-col items-center justify-center text-center">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-amber-900">
            <MessageCircle className="h-4 w-4" />
            Coming Soon
          </div>

          <div className="w-full overflow-hidden rounded-[2rem] border border-gray-200 bg-white shadow-[0_24px_80px_-40px_rgba(15,23,42,0.45)]">
            <div className="hidden lg:block">
              <InfiniteRibbon
                className="border-b border-yellow-500/30 bg-yellow-300/95 py-2 text-sm font-semibold uppercase tracking-[0.18em]"
                duration={42}
                repeat={6}
                rotation={4}
              >
                WhatsApp AI follow-up is coming soon
              </InfiniteRibbon>
            </div>

            <div className="p-6 sm:p-10">
              <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                WhatsApp is coming soon
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-gray-600 sm:text-base">
                We&apos;re polishing the WhatsApp experience for V1 so you can capture leads, respond
                instantly, and keep conversations moving without manual follow-up.
              </p>

              <div className="mt-8 grid gap-3 text-left sm:grid-cols-3">
                {[
                  'Instant lead capture from inbound WhatsApp messages',
                  'AI replies that keep speed-to-lead working after hours',
                  'A cleaner launch flow instead of manual credential setup',
                ].map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4 text-sm font-medium text-gray-700"
                  >
                    {item}
                  </div>
                ))}
              </div>

              <div className="mt-8 overflow-hidden rounded-2xl border border-gray-200 bg-slate-950 lg:hidden">
                <InfiniteRibbon
                  className="border-b border-white/10 bg-yellow-300/95 py-2 text-sm font-semibold uppercase tracking-[0.16em]"
                  duration={42}
                  repeat={4}
                  rotation={2}
                >
                  WhatsApp AI follow-up is coming soon
                </InfiniteRibbon>
                <InfiniteRibbon
                  className="bg-slate-950 py-2 text-sm font-semibold uppercase tracking-[0.16em] text-white dark:bg-slate-950 dark:text-white"
                  duration={42}
                  repeat={4}
                  reverse
                  rotation={-2}
                >
                  Instant response for every lead
                </InfiniteRibbon>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
          <MessageCircle className="w-5 h-5 text-green-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            WhatsApp
            {isConnected && <span className="w-2 h-2 rounded-full bg-green-500" title="Connected" />}
          </h1>
          {!isConnected && (
            <p className="text-sm text-gray-500">Connect your WhatsApp Business account to get started.</p>
          )}
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-gray-200">
        {([
          { key: 'settings', label: 'Settings' },
          { key: 'conversations', label: 'Conversations' },
          { key: 'connection', label: 'Connection' },
        ] as const).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === tab.key
                ? 'border-green-600 text-green-700'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${
            toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* ─── Settings Tab ─────────────────────────────────────────── */}
      {activeTab === 'settings' && (
        <div className="space-y-4 max-w-2xl">
          {!isConnected && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 text-sm text-yellow-800">
              WhatsApp is not connected yet.{' '}
              <button
                onClick={() => setActiveTab('connection')}
                className="font-semibold underline underline-offset-2 hover:text-yellow-900"
              >
                Go to Connection tab
              </button>{' '}
              to set it up first.
            </div>
          )}

          {/* Enable / Disable */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-gray-900">Enable WhatsApp</p>
              <p className="text-xs text-gray-500 mt-0.5">Turn WhatsApp on or off for your workspace.</p>
            </div>
            <Toggle
              value={settings?.is_enabled ?? false}
              onChange={(v) => updateSetting('is_enabled', v)}
            />
          </div>

          {/* AI Auto-Reply */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-gray-900">AI Auto-Reply</p>
              <p className="text-xs text-gray-500 mt-0.5">
                AI responds to every inbound message instantly — no human approval needed.
              </p>
            </div>
            <Toggle
              value={settings?.auto_reply_enabled ?? false}
              onChange={(v) => updateSetting('auto_reply_enabled', v)}
            />
          </div>

          {/* Qualify Leads */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-gray-900">Qualify Leads</p>
              <p className="text-xs text-gray-500 mt-0.5">
                AI scores each conversation and identifies buyer intent automatically.
              </p>
            </div>
            <Toggle
              value={settings?.qualification_enabled ?? true}
              onChange={(v) => updateSetting('qualification_enabled', v)}
            />
          </div>

          {/* Booking */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-gray-900">Booking</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Allow the AI to offer and confirm appointments via WhatsApp.
              </p>
            </div>
            <Toggle
              value={settings?.booking_enabled ?? true}
              onChange={(v) => updateSetting('booking_enabled', v)}
            />
          </div>

          {/* Response Tone */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
            <div>
              <p className="text-sm font-medium text-gray-900">Response Tone</p>
              <p className="text-xs text-gray-500 mt-0.5">How the AI sounds when replying to leads.</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(['professional', 'friendly', 'formal'] as const).map((tone) => (
                <button
                  key={tone}
                  onClick={() => updateSetting('response_tone', tone)}
                  className={`py-2 text-sm rounded-lg border transition-colors font-medium capitalize ${
                    (settings?.response_tone ?? 'professional') === tone
                      ? 'bg-green-600 text-white border-green-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                  }`}
                >
                  {tone}
                </button>
              ))}
            </div>
          </div>

          {/* Business Hours */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-gray-900">Business Hours Only</p>
                <p className="text-xs text-gray-500 mt-0.5">Limit AI replies to your working hours.</p>
              </div>
              <Toggle
                value={settings?.business_hours_only ?? false}
                onChange={(v) => updateSetting('business_hours_only', v)}
              />
            </div>
            {settings?.business_hours_only && (
              <div className="grid grid-cols-3 gap-3 pt-1">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Start</label>
                  <input
                    type="time"
                    value={settings.business_hours_start}
                    onChange={(e) => updateSetting('business_hours_start', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">End</label>
                  <input
                    type="time"
                    value={settings.business_hours_end}
                    onChange={(e) => updateSetting('business_hours_end', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Timezone</label>
                  <select
                    value={settings.business_timezone}
                    onChange={(e) => updateSetting('business_timezone', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">Eastern</option>
                    <option value="America/Chicago">Central</option>
                    <option value="America/Denver">Mountain</option>
                    <option value="America/Los_Angeles">Pacific</option>
                    <option value="Europe/London">London</option>
                    <option value="Asia/Jerusalem">Jerusalem</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Max AI messages */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-2">
            <p className="text-sm font-medium text-gray-900">Max AI Messages per Conversation</p>
            <p className="text-xs text-gray-500">
              After this many AI replies, new messages won't be auto-answered. Set between 1–20.
            </p>
            <input
              type="number"
              min={1}
              max={20}
              value={settings?.max_ai_messages_per_conversation ?? 10}
              onChange={(e) =>
                updateSetting(
                  'max_ai_messages_per_conversation',
                  Math.max(1, Math.min(20, Number(e.target.value) || 1))
                )
              }
              className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>

          {/* Greeting Template */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-2">
            <p className="text-sm font-medium text-gray-900">
              Greeting Message{' '}
              <span className="text-gray-400 font-normal text-xs">(optional)</span>
            </p>
            <p className="text-xs text-gray-500">
              First message sent to every new lead. Leave blank to let the AI decide.
            </p>
            <textarea
              value={settings?.greeting_template || ''}
              onChange={(e) => updateSetting('greeting_template', e.target.value)}
              rows={3}
              placeholder="Hi! Thanks for reaching out. How can we help you today?"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          {/* Out-of-Hours Message */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-2">
            <p className="text-sm font-medium text-gray-900">
              Out-of-Hours Message{' '}
              <span className="text-gray-400 font-normal text-xs">(optional)</span>
            </p>
            <p className="text-xs text-gray-500">
              Sent when a lead messages outside business hours. Only used when Business Hours is enabled.
            </p>
            <textarea
              value={settings?.out_of_hours_message || ''}
              onChange={(e) => updateSetting('out_of_hours_message', e.target.value)}
              rows={3}
              placeholder="Thanks — we're offline right now. We'll reply first thing tomorrow morning."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div className="pb-2">
            <button
              onClick={handleSaveSettings}
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 text-sm font-semibold"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Save Settings
            </button>
          </div>
        </div>
      )}

      {/* ─── Conversations Tab ───────────────────────────────────── */}
      {activeTab === 'conversations' && (
        !isConnected ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <MessageCircle className="w-12 h-12 text-gray-300 mb-4" />
            <p className="text-sm font-medium text-gray-700">WhatsApp is not connected yet</p>
            <p className="text-xs text-gray-500 mt-1 mb-4">Connect your WhatsApp Business account to see conversations here.</p>
            <button
              onClick={() => setActiveTab('connection')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
            >
              Go to Connection
            </button>
          </div>
        ) : (
          <div className="flex bg-white border border-gray-200 rounded-xl overflow-hidden min-h-[70vh]">
            {/* Left: thread list */}
            <div className="w-80 border-r border-gray-200 flex flex-col">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  WhatsApp
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                </h2>
                <div className="mt-3 flex gap-1 flex-wrap">
                  {(['all', 'pending', 'qualified', 'booked'] as FilterKey[]).map((f) => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={`px-2.5 py-1 text-xs rounded-full transition-colors ${
                        filter === f
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {f[0].toUpperCase() + f.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                {threadsLoading ? (
                  <div className="p-6 flex justify-center">
                    <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                  </div>
                ) : filteredThreads.length === 0 ? (
                  <div className="p-6 text-center text-sm text-gray-500">
                    No conversations yet
                  </div>
                ) : (
                  filteredThreads.map((t) => (
                    <button
                      key={t.threadId}
                      onClick={() => setSelectedThread(t.threadId)}
                      className={`w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                        selectedThread === t.threadId ? 'bg-green-50' : ''
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center shrink-0">
                          <MessageCircle className="w-4 h-4 text-green-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-medium text-gray-900 truncate">
                              {t.contactPhone || 'Unknown'}
                            </span>
                            <span className="text-xs text-gray-400 shrink-0">
                              {formatTime(t.lastMessageAt)}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 truncate mt-0.5">
                            {t.lastMessage}
                          </p>
                          {(t.latestQualification?.score != null || t.latestQualification?.intent) && (
                            <div className="flex items-center gap-1 mt-1 flex-wrap">
                              {typeof t.latestQualification?.score === 'number' && (
                                <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-[10px] rounded font-medium">
                                  Score: {t.latestQualification.score}
                                </span>
                              )}
                              {t.latestQualification?.intent && (
                                <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] rounded font-medium">
                                  {t.latestQualification.intent}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        {t.hasPendingDraft && (
                          <span
                            className="w-2 h-2 rounded-full bg-yellow-400 shrink-0 mt-1.5"
                            title="Pending AI draft"
                          />
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Right: conversation */}
            <div className="flex-1 flex flex-col">
              {!selectedThread ? (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                  <MessageCircle className="w-10 h-10 mb-3" />
                  <p className="text-sm">Select a conversation</p>
                </div>
              ) : (
                <>
                  <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-900">
                        {threads.find((t) => t.threadId === selectedThread)?.contactPhone || 'Unknown'}
                      </span>
                      <span className="text-xs px-2 py-0.5 bg-green-50 text-green-700 rounded-full">
                        via WhatsApp
                      </span>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
                    {hasMoreMessages && !messagesLoading && (
                      <div className="flex justify-center pb-2">
                        <button
                          onClick={loadMoreMessages}
                          disabled={loadingMore}
                          className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                        >
                          {loadingMore ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <RefreshCw className="w-3.5 h-3.5" />
                          )}
                          Load more
                        </button>
                      </div>
                    )}
                    {messagesLoading ? (
                      <div className="flex justify-center py-6">
                        <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                      </div>
                    ) : (
                      messages.map((m) => {
                        const inbound = m.direction === 'inbound';
                        const isAi = !inbound && (m.ai_draft_status === 'auto_sent' || m.ai_draft_status === 'approved');
                        return (
                          <div key={m.id}>
                            <div className={`flex ${inbound ? 'justify-start' : 'justify-end'}`}>
                              <div
                                className={`max-w-[70%] px-3 py-2 rounded-lg text-sm shadow-sm ${
                                  inbound
                                    ? 'bg-white text-gray-900 border border-gray-200'
                                    : 'bg-green-600 text-white'
                                }`}
                              >
                                <p className="whitespace-pre-wrap">{m.body}</p>
                                <div className={`flex items-center gap-2 mt-1 ${inbound ? 'justify-start' : 'justify-end'}`}>
                                  {isAi && (
                                    <span className="text-[10px] font-semibold text-indigo-200 bg-indigo-700/40 px-1.5 py-0.5 rounded">
                                      AI
                                    </span>
                                  )}
                                  <p className={`text-[10px] ${inbound ? 'text-gray-400' : 'text-green-100'}`}>
                                    {formatTime(m.created_at)}
                                  </p>
                                </div>
                              </div>
                            </div>
                            {m.ai_draft_status === 'pending' && m.ai_draft && (
                              <div className="mt-2 ml-auto max-w-[70%] border-2 border-yellow-400 bg-yellow-50 rounded-lg p-3">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-xs font-semibold text-yellow-800 uppercase tracking-wide">
                                    AI Draft — Pending
                                  </span>
                                </div>
                                <p className="text-sm text-gray-800 whitespace-pre-wrap">{m.ai_draft}</p>
                                <div className="flex gap-2 mt-3">
                                  <button
                                    onClick={() => handleDraftAction(m.id, 'approve')}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-md text-xs font-medium hover:bg-green-700"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => handleDraftAction(m.id, 'reject')}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-md text-xs font-medium hover:bg-gray-50"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                    Reject
                                  </button>
                                  <button
                                    onClick={() => handleDraftAction(m.id, 'regenerate')}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-md text-xs font-medium hover:bg-gray-50"
                                  >
                                    <RefreshCw className="w-3.5 h-3.5" />
                                    Regenerate
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div className="p-3 border-t border-gray-200 bg-white">
                    <div className="flex gap-2 items-end">
                      <textarea
                        value={composeText}
                        onChange={(e) => setComposeText(e.target.value)}
                        placeholder="Type a message…"
                        rows={2}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                      />
                      <button
                        onClick={handleSend}
                        disabled={sending || !composeText.trim()}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium"
                      >
                        {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        Send
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )
      )}

      {/* ─── Connection Tab ───────────────────────────────────────── */}
      {activeTab === 'connection' && (
        <div className="space-y-6 max-w-2xl">
          {!isConnected ? (
            <>
              {/* Credentials form */}
              <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
                <div>
                  <h2 className="text-base font-semibold text-gray-900">Connect WhatsApp Business API</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Enter your Meta WhatsApp Business credentials below.{' '}
                    <a
                      href="https://developers.facebook.com/apps"
                      target="_blank"
                      rel="noreferrer"
                      className="text-green-600 hover:underline inline-flex items-center gap-0.5"
                    >
                      Get them from Meta Developers <ExternalLink className="w-3 h-3" />
                    </a>
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number ID <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={connectForm.phoneNumberId}
                      onChange={(e) => setConnectForm((f) => ({ ...f, phoneNumberId: e.target.value }))}
                      placeholder="e.g. 123456789012345"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                    <p className="text-xs text-gray-400 mt-1">Found in Meta App → WhatsApp → API Setup</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Permanent Access Token <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showToken ? 'text' : 'password'}
                        value={connectForm.accessToken}
                        onChange={(e) => setConnectForm((f) => ({ ...f, accessToken: e.target.value }))}
                        placeholder="EAAxxxxxxxxxxxxxxx..."
                        className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowToken((v) => !v)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                      >
                        {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Use a system user token, not a temporary one</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      WhatsApp Business Account ID{' '}
                      <span className="text-gray-400 font-normal">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={connectForm.businessAccountId}
                      onChange={(e) => setConnectForm((f) => ({ ...f, businessAccountId: e.target.value }))}
                      placeholder="e.g. 987654321098765"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                </div>

                <button
                  onClick={handleConnectWhatsApp}
                  disabled={saving || !connectForm.phoneNumberId.trim() || !connectForm.accessToken.trim()}
                  className="inline-flex items-center justify-center gap-2 w-full px-5 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 text-sm font-semibold"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Connect WhatsApp
                </button>
              </div>

              {/* Webhook setup */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 space-y-4">
                <h3 className="text-sm font-semibold text-gray-900">Configure Webhook in Meta</h3>
                <p className="text-xs text-gray-500">
                  In your Meta App → WhatsApp → Configuration, set the Callback URL and Verify Token below.
                </p>

                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Callback URL</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-xs bg-white border border-gray-200 rounded px-2 py-1.5 font-mono break-all">
                        {webhookUrl}
                      </code>
                      <button
                        onClick={() => copyToClipboard(webhookUrl)}
                        className="p-1.5 hover:bg-gray-200 rounded flex-shrink-0"
                        title="Copy"
                      >
                        <Copy className="w-4 h-4 text-gray-600" />
                      </button>
                    </div>
                  </div>

                  {settings?.webhook_verify_token && (
                    <div>
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Verify Token</p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 text-xs bg-white border border-gray-200 rounded px-2 py-1.5 font-mono break-all">
                          {settings.webhook_verify_token}
                        </code>
                        <button
                          onClick={() => copyToClipboard(settings.webhook_verify_token || '')}
                          className="p-1.5 hover:bg-gray-200 rounded flex-shrink-0"
                          title="Copy"
                        >
                          <Copy className="w-4 h-4 text-gray-600" />
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="bg-white border border-gray-200 rounded-lg p-3">
                    <p className="text-xs font-semibold text-gray-700 mb-1">Subscribed fields</p>
                    <p className="text-xs text-gray-500">
                      Subscribe to: <span className="font-mono text-gray-700">messages</span>
                    </p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Connected status */}
              <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                    <Check className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Connected</p>
                    <p className="text-xs text-gray-500">
                      Phone Number ID:{' '}
                      <span className="font-mono">{settings?.wa_phone_number_id}</span>
                    </p>
                    {settings?.wa_business_account_id && (
                      <p className="text-xs text-gray-500">
                        WABA ID:{' '}
                        <span className="font-mono">{settings.wa_business_account_id}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Webhook info */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
                  <div>
                    <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">Webhook URL</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-xs bg-white border border-gray-200 rounded px-2 py-1.5 font-mono break-all">
                        {webhookUrl}
                      </code>
                      <button
                        onClick={() => copyToClipboard(webhookUrl)}
                        className="p-1.5 hover:bg-gray-200 rounded"
                        title="Copy"
                      >
                        <Copy className="w-4 h-4 text-gray-600" />
                      </button>
                    </div>
                  </div>
                  {settings?.webhook_verify_token && (
                    <div>
                      <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">Verify Token</p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 text-xs bg-white border border-gray-200 rounded px-2 py-1.5 font-mono break-all">
                          {settings.webhook_verify_token}
                        </code>
                        <button
                          onClick={() => copyToClipboard(settings.webhook_verify_token || '')}
                          className="p-1.5 hover:bg-gray-200 rounded"
                          title="Copy"
                        >
                          <Copy className="w-4 h-4 text-gray-600" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <button
                  onClick={handleDisconnect}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm font-medium"
                >
                  <X className="w-4 h-4" />
                  Disconnect
                </button>
              </div>

              {/* Test connection */}
              <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-3">
                <h3 className="text-sm font-semibold text-gray-900">Test Connection</h3>
                <p className="text-xs text-gray-500">Send a test WhatsApp message to verify your setup.</p>
                <div className="flex gap-2">
                  <input
                    type="tel"
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                    placeholder="+1 555 123 4567"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <button
                    onClick={handleTestConnection}
                    disabled={testing || !testPhone}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 text-sm font-medium"
                  >
                    {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Send Test
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Toggle ─────────────────────────────────────────────────────────

const Toggle: React.FC<{ value: boolean; onChange: (v: boolean) => void }> = ({
  value,
  onChange,
}) => (
  <button
    type="button"
    onClick={() => onChange(!value)}
    className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${
      value ? 'bg-green-600' : 'bg-gray-300'
    }`}
    aria-pressed={value}
  >
    <span
      className={`inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform mt-0.5 ${
        value ? 'translate-x-5' : 'translate-x-0.5'
      }`}
    />
  </button>
);

export default WhatsappPage;
