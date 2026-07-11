import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import ServiceEmptyState from '../../components/dashboard/ServiceEmptyState';
import {
  Phone,
  PhoneCall,
  Clock,
  AlertCircle,
  Eye,
  Play,
  MessageSquare,
} from 'lucide-react';
import { CallHistorySkeleton } from '../../components/ui/loading-skeleton';
import CardTableWithPanel from '../../components/ui/CardTableWithPanel';
import { getRetellCallHistory, type RetellCall } from '../../lib/retell';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useTokens } from '../../contexts/TokenContext';
import { PopButton } from '../../components/ui/pop-button';
import { UnsavedChanges } from '../../components/ui/unsaved-changes';

// Threshold in ms — calls shorter than this are considered missed/abandoned
const MISSED_CALL_DURATION_THRESHOLD = 15000; // 15 seconds

const DEFAULT_TEMPLATE =
  "Hi! We noticed we missed your call at {{business_name}}. How can we help? Reply to this text or call us back. We're here for you!";

interface MissedCallConfig {
  enabled: boolean;
  template: string;
  delay_minutes: number;
  updated_at?: string;
}

interface MissedCallDisplay {
  id: string;
  callerPhone: string;
  missedAt: number; // timestamp ms
  duration: string;
  status: 'not_connected' | 'short_call' | 'error';
  statusLabel: string;
  agentName: string;
  disconnectionReason?: string;
  callSummary?: string;
  recordingUrl?: string;
  rawCall: RetellCall;
}

const MissedCallsPage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { claimReward } = useTokens();
  // Config state
  const [configLoading, setConfigLoading] = useState(true);
  const [config, setConfig] = useState<MissedCallConfig>({
    enabled: false,
    template: DEFAULT_TEMPLATE,
    delay_minutes: 0,
  });
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);

  const [hasPhoneNumber, setHasPhoneNumber] = useState(false);

  // Missed calls state
  const [missedCalls, setMissedCalls] = useState<MissedCallDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCall, setSelectedCall] = useState<MissedCallDisplay | null>(null);
  const [showEditPanel, setShowEditPanel] = useState(false);
  // Text-back delivery badge per call id — the "we texted them back" proof
  const [textbackBadges, setTextbackBadges] = useState<Record<string, { label: string; className: string }>>({});

  // Stats
  const [textbacksSent, setTextbacksSent] = useState(0);

  // Format duration from ms
  const formatDuration = (ms?: number): string => {
    if (!ms || ms <= 0) return '0:00';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Determine the status bucket for a call
  const classifyMissedCall = (call: RetellCall): 'not_connected' | 'short_call' | 'error' | null => {
    if (call.call_status === 'not_connected') return 'not_connected';
    if (call.call_status === 'error') return 'error';
    if (call.call_status === 'ended' && call.duration_ms != null && call.duration_ms < MISSED_CALL_DURATION_THRESHOLD) {
      return 'short_call';
    }
    return null;
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'not_connected': return 'Not Connected';
      case 'short_call': return 'Abandoned';
      case 'error': return 'Error';
      default: return 'Unknown';
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'not_connected': return 'bg-red-100 text-red-800';
      case 'short_call': return 'bg-yellow-100 text-yellow-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Extract phone number from the raw Retell call object
  const extractCallerPhone = (call: RetellCall): string => {
    const raw = call as Record<string, any>;
    if (call.direction === 'inbound') {
      return raw.from_number || raw.caller_number || 'Unknown';
    }
    return raw.to_number || raw.from_number || 'Unknown';
  };

  // Fetch user's agent IDs from Supabase
  const fetchUserAgentIds = async (): Promise<string[]> => {
    if (!user?.id) return [];
    try {
      const { data: agents, error } = await supabase
        .from('agents')
        .select('retell_agent_id')
        .eq('user_id', user.id)
        .not('retell_agent_id', 'is', null);

      if (error) throw error;
      return agents?.map(a => a.retell_agent_id).filter(Boolean) || [];
    } catch (err) {
      console.error('Error fetching user agents:', err);
      return [];
    }
  };

  // Load config + phone number + text-back count
  useEffect(() => {
    if (!user?.id) return;

    (async () => {
      try {
        // Load missed call config
        const { data: featureRow } = await supabase
          .from('business_features')
          .select('missed_call_config')
          .eq('user_id', user.id)
          .single();

        if (featureRow?.missed_call_config) {
          const cfg = featureRow.missed_call_config as Record<string, any>;
          setConfig({
            enabled: cfg.enabled ?? false,
            template: cfg.template || DEFAULT_TEMPLATE,
            delay_minutes: cfg.delay_minutes ?? 0,
          });
        }

        // Load user's phone number
        const { data: phones } = await supabase
          .from('phone_numbers')
          .select('phone_number')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .limit(1);

        if (phones && phones.length > 0) {
          setHasPhoneNumber(true);
        }

        // Count text-backs sent (last 7 days)
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const { count } = await supabase
          .from('scheduled_messages')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('type', 'missed_call_textback')
          .in('status', ['sent', 'scheduled'])
          .gte('created_at', weekAgo);

        setTextbacksSent(count || 0);
      } catch (err) {
        console.error('Error loading config:', err);
      }
      setConfigLoading(false);
    })();
  }, [user?.id]);

  // Fetch calls and filter for missed ones
  const fetchMissedCalls = async () => {
    setLoading(true);
    setError(null);

    try {
      const agentIds = await fetchUserAgentIds();
      if (!agentIds.length) {
        setMissedCalls([]);
        setLoading(false);
        return;
      }

      const response = await getRetellCallHistory({ agentIds, limit: 100 });

      const missed: MissedCallDisplay[] = [];

      for (const call of response.calls) {
        const bucket = classifyMissedCall(call);
        if (!bucket) continue;

        missed.push({
          id: call.call_id,
          callerPhone: extractCallerPhone(call),
          missedAt: call.start_timestamp,
          duration: formatDuration(call.duration_ms),
          status: bucket,
          statusLabel: getStatusLabel(bucket),
          agentName: call.agent_name || 'Unknown Agent',
          disconnectionReason: call.disconnection_reason,
          callSummary: call.call_analysis?.call_summary,
          recordingUrl: call.recording_url,
          rawCall: call,
        });
      }

      missed.sort((a, b) => b.missedAt - a.missedAt);
      setMissedCalls(missed);
      await fetchTextbackBadges(missed);
    } catch (err) {
      console.error('Error fetching missed calls:', err);
      setError('Failed to fetch missed calls. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Match each missed call to its follow-up SMS (scheduled_messages) and any
  // inbound reply (sms_conversations) by phone + time window, and build a badge.
  const fetchTextbackBadges = async (missed: MissedCallDisplay[]) => {
    if (!user?.id) return;
    const phones = [...new Set(missed.map((c) => c.callerPhone).filter((p) => p !== 'Unknown'))];
    if (!phones.length) return;

    try {
      const oldest = new Date(Math.min(...missed.map((c) => c.missedAt)) - 60 * 1000).toISOString();
      const [{ data: msgs }, { data: replies }] = await Promise.all([
        supabase
          .from('scheduled_messages')
          .select('recipient_phone, status, sent_at, created_at')
          .eq('user_id', user.id)
          .eq('channel', 'sms')
          .in('recipient_phone', phones)
          .gte('created_at', oldest),
        supabase
          .from('sms_conversations')
          .select('from_number, created_at')
          .eq('user_id', user.id)
          .eq('direction', 'inbound')
          .in('from_number', phones)
          .gte('created_at', oldest),
      ]);

      const DAY_MS = 24 * 60 * 60 * 1000;
      const badges: Record<string, { label: string; className: string }> = {};

      for (const call of missed) {
        if (call.callerPhone === 'Unknown') continue;

        const replied = (replies || []).some(
          (r) => r.from_number === call.callerPhone && new Date(r.created_at).getTime() > call.missedAt
        );
        if (replied) {
          badges[call.id] = { label: 'Replied', className: 'bg-green-100 text-green-800' };
          continue;
        }

        // Follow-up SMS created within 24h after the missed call
        const msg = (msgs || []).find((m) => {
          if (m.recipient_phone !== call.callerPhone) return false;
          const created = new Date(m.created_at).getTime();
          return created >= call.missedAt - 60 * 1000 && created <= call.missedAt + DAY_MS;
        });
        if (!msg) continue;

        if (msg.status === 'sent') {
          const mins = Math.max(0, Math.round((new Date(msg.sent_at || msg.created_at).getTime() - call.missedAt) / 60000));
          badges[call.id] = {
            label: mins < 1 ? 'Text sent · <1m after' : `Text sent · ${mins}m after`,
            className: 'bg-blue-100 text-blue-800',
          };
        } else if (msg.status === 'scheduled') {
          badges[call.id] = { label: 'Text scheduled', className: 'bg-gray-100 text-gray-700' };
        } else if (msg.status === 'failed') {
          badges[call.id] = { label: 'Text failed', className: 'bg-red-100 text-red-800' };
        }
      }

      setTextbackBadges(badges);
    } catch (err) {
      console.error('Error fetching text-back statuses:', err);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchMissedCalls();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Save config
  const handleSaveConfig = async () => {
    if (!user?.id) return;
    setSaving(true);

    try {
      const { data: existing } = await supabase
        .from('business_features')
        .select('missed_call_config')
        .eq('user_id', user.id)
        .single();

      const existingConfig = (existing?.missed_call_config || {}) as Record<string, any>;

      const { error: updateError } = await supabase
        .from('business_features')
        .update({
          missed_call_config: {
            ...existingConfig,
            enabled: config.enabled,
            template: config.template,
            delay_minutes: config.delay_minutes,
            updated_at: new Date().toISOString(),
          },
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Failed to save missed call config:', updateError);
        showToast({ title: 'Error', message: 'Failed to save settings', variant: 'error', duration: 4000 });
        setSaveFailed(true);
        setTimeout(() => setSaveFailed(false), 3000);
        setSaving(false);
        return;
      }

      setSaving(false);
      setSaveSuccess(true);
      setTimeout(() => { setSaveSuccess(false); setIsDirty(false); }, 2000);

      showToast({ title: 'Saved', message: 'Missed call text-back settings saved', variant: 'success', duration: 3000 });

      // Claim reward
      const rewardResult = await claimReward('configure_reminders');
      if (rewardResult?.success && !rewardResult?.alreadyClaimed) {
        showToast({ title: 'Bonus Tokens!', message: '+25 tokens earned for configuring text-back', variant: 'success', duration: 4000 });
      }
    } catch (err) {
      console.error('Save error:', err);
      showToast({ title: 'Error', message: 'Something went wrong', variant: 'error', duration: 4000 });
      setSaveFailed(true);
      setTimeout(() => setSaveFailed(false), 3000);
      setSaving(false);
    }
  };

  const handleViewDetails = (call: MissedCallDisplay) => {
    setSelectedCall(call);
    setShowEditPanel(true);
  };

  const buildTelHref = (phone: string): string => {
    const digits = phone.replace(/[^+\d]/g, '');
    return `tel:${digits}`;
  };

  if (configLoading && loading) {
    return (
      <div className="space-y-6">
        <CallHistorySkeleton />
      </div>
    );
  }

  if (!hasPhoneNumber) {
    return (
      <ServiceEmptyState
        icon={<Phone className="w-7 h-7 text-blue-600" />}
        iconBg="bg-blue-50"
        title="No Phone Number Yet"
        description="Get a Boltcall number (or forward your existing line) so missed calls trigger an automatic text-back to every caller."
        setupLabel="Set Up Phone Number"
        setupTo="/dashboard/phone-numbers"
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Section B: Text-Back Configuration */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="bg-white rounded-xl border border-gray-200 shadow-sm p-6"
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <MessageSquare className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Missed Call Text-Back</h2>
              <p className="text-sm text-gray-500">Automatically text callers when their call is missed</p>
            </div>
          </div>
          {/* Enable toggle */}
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={config.enabled}
              onChange={(e) => { setConfig({ ...config, enabled: e.target.checked }); setIsDirty(true); }}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-100 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
          </label>
        </div>

        {config.enabled && (
          <div className="space-y-4">
            {/* Template editor */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                SMS Template
              </label>
              <textarea
                value={config.template}
                onChange={(e) => { setConfig({ ...config, template: e.target.value }); setIsDirty(true); }}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none"
                placeholder="Enter your text-back message..."
              />
              <p className="text-xs text-gray-400 mt-1">
                Available variables: <code className="bg-gray-100 px-1 rounded">{'{{business_name}}'}</code>, <code className="bg-gray-100 px-1 rounded">{'{{business_phone}}'}</code>
              </p>
            </div>

            {/* Delay selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Send text-back
              </label>
              <select
                value={config.delay_minutes}
                onChange={(e) => { setConfig({ ...config, delay_minutes: parseInt(e.target.value) }); setIsDirty(true); }}
                className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value={0}>Immediately</option>
                <option value={1}>After 1 minute</option>
                <option value={5}>After 5 minutes</option>
              </select>
            </div>

            {/* Reset to default link */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => { setConfig({ ...config, template: DEFAULT_TEMPLATE, delay_minutes: 0 }); setIsDirty(true); }}
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Reset to default
              </button>
            </div>
          </div>
        )}

        {!config.enabled && (
          <p className="text-sm text-gray-500">
            Enable this feature to automatically send a text message when a call is missed.
          </p>
        )}
      </motion.div>

      {/* Section C: Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <Phone className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Missed (7 days)</p>
              <p className="text-2xl font-bold text-gray-900">{missedCalls.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <MessageSquare className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Text-Backs Sent</p>
              <p className="text-2xl font-bold text-gray-900">{textbacksSent}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <PhoneCall className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Response Rate</p>
              <p className="text-2xl font-bold text-gray-900">
                {missedCalls.length > 0 && textbacksSent > 0
                  ? `${Math.round((textbacksSent / missedCalls.length) * 100)}%`
                  : '--'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-white rounded-lg shadow-sm border p-12 flex flex-col items-center justify-center">
          <AlertCircle className="w-10 h-10 text-red-500 mb-3" />
          <p className="text-red-600 font-medium">{error}</p>
          <PopButton
            color="blue"
            size="sm"
            onClick={fetchMissedCalls}
            className="mt-4"
          >
            Try Again
          </PopButton>
        </div>
      )}

      {/* Section D: Recent Missed Calls Table */}
      {!error && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {loading ? (
            <CallHistorySkeleton />
          ) : (
            <CardTableWithPanel
              data={missedCalls}
              columns={[
                { key: 'caller', label: 'Caller', width: '25%' },
                { key: 'missedAt', label: 'Missed At', width: '20%' },
                { key: 'duration', label: 'Duration', width: '10%' },
                { key: 'status', label: 'Status', width: '15%' },
                { key: 'agent', label: 'Agent', width: '15%' },
                { key: 'actions', label: 'Actions', width: '15%' },
              ]}
              renderRow={(call) => (
                <div className="flex items-center gap-6">
                  {/* Caller */}
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Phone className="w-4 h-4 text-red-600" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{call.callerPhone}</div>
                      {call.disconnectionReason && (
                        <div className="text-xs text-gray-500">
                          {call.disconnectionReason.replace(/_/g, ' ')}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Missed At */}
                  <div className="text-sm text-gray-900 flex-1">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4 text-gray-400" />
                      {new Date(call.missedAt).toLocaleDateString()}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(call.missedAt).toLocaleTimeString()}
                    </div>
                  </div>

                  {/* Duration */}
                  <div className="text-sm text-gray-900 flex-1">{call.duration}</div>

                  {/* Status */}
                  <div className="flex-1">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(call.status)}`}
                    >
                      {call.statusLabel}
                    </span>
                    {textbackBadges[call.id] && (
                      <span
                        className={`mt-1 block w-fit px-2.5 py-0.5 rounded-full text-xs font-medium ${textbackBadges[call.id].className}`}
                      >
                        {textbackBadges[call.id].label}
                      </span>
                    )}
                  </div>

                  {/* Agent */}
                  <div className="text-sm text-gray-900 flex-1">{call.agentName}</div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleViewDetails(call)}
                      className="text-blue-600 hover:text-blue-900 transition-colors"
                      title="View details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    {call.recordingUrl && (
                      <a
                        href={call.recordingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-purple-600 hover:text-purple-900 transition-colors"
                        title="Play recording"
                      >
                        <Play className="w-4 h-4" />
                      </a>
                    )}
                    {call.callerPhone !== 'Unknown' && (
                      <a
                        href={buildTelHref(call.callerPhone)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition-colors"
                        title="Call back"
                      >
                        <PhoneCall className="w-3.5 h-3.5" />
                        Call Back
                      </a>
                    )}
                  </div>
                </div>
              )}
              emptyStateText="No missed calls found"
              emptyStateAnimation="/No_Data_Preview.lottie"
              showEditPanel={showEditPanel}
              onCloseEditPanel={() => {
                setShowEditPanel(false);
                setSelectedCall(null);
              }}
              editPanelTitle="Missed Call Details"
              editPanelContent={
                selectedCall ? (
                  <div className="space-y-5">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                        Caller Phone
                      </label>
                      <p className="text-sm font-medium text-gray-900">{selectedCall.callerPhone}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                        Time
                      </label>
                      <p className="text-sm text-gray-900">
                        {new Date(selectedCall.missedAt).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                        Duration
                      </label>
                      <p className="text-sm text-gray-900">{selectedCall.duration}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                        Status
                      </label>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedCall.status)}`}
                      >
                        {selectedCall.statusLabel}
                      </span>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                        Agent
                      </label>
                      <p className="text-sm text-gray-900">{selectedCall.agentName}</p>
                    </div>
                    {selectedCall.disconnectionReason && (
                      <div>
                        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                          Disconnection Reason
                        </label>
                        <p className="text-sm text-gray-900">
                          {selectedCall.disconnectionReason.replace(/_/g, ' ')}
                        </p>
                      </div>
                    )}
                    {selectedCall.callSummary && (
                      <div>
                        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                          AI Summary
                        </label>
                        <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">
                          {selectedCall.callSummary}
                        </p>
                      </div>
                    )}
                    {selectedCall.recordingUrl && (
                      <div>
                        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                          Recording
                        </label>
                        <audio controls className="w-full mt-1">
                          <source src={selectedCall.recordingUrl} type="audio/wav" />
                          Your browser does not support the audio element.
                        </audio>
                      </div>
                    )}
                    {selectedCall.callerPhone !== 'Unknown' && (
                      <a
                        href={buildTelHref(selectedCall.callerPhone)}
                        className="inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
                      >
                        <PhoneCall className="w-4 h-4" />
                        Call Back {selectedCall.callerPhone}
                      </a>
                    )}
                  </div>
                ) : null
              }
            />
          )}
        </motion.div>
      )}

      <UnsavedChanges
        open={isDirty}
        isSaving={saving}
        success={saveSuccess}
        error={saveFailed}
        onReset={() => { setIsDirty(false); window.location.reload(); }}
        onSave={handleSaveConfig}
      />
    </div>
  );
};

export default MissedCallsPage;
