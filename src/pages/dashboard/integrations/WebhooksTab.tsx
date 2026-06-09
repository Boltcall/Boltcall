import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Webhook,
  Plus,
  Trash2,
  Copy,
  Check,
  X,
  Loader2,
  Play,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronDown,
  ChevronRight,
  Code,
  Zap,
  PhoneMissed,
  Calendar,
  Phone,
  Star,
  ToggleLeft,
  ToggleRight,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import { PageSkeleton } from '../../../components/ui/loading-skeleton';
import { FUNCTIONS_BASE } from '../../../lib/api';
import { authedFetch } from '../../../lib/authedFetch';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WebhookItem {
  id: string;
  user_id: string;
  name: string;
  trigger_event: string;
  url: string;
  secret: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface WebhookEvent {
  id: string;
  webhook_id: string;
  trigger_event: string;
  payload: any;
  status_code: number;
  response_body: string;
  success: boolean;
  duration_ms: number;
  created_at: string;
}

const TRIGGER_OPTIONS = [
  { value: 'new_lead', label: 'New Lead', icon: <Zap className="w-4 h-4" />, color: 'text-blue-600 bg-blue-50' },
  { value: 'missed_call', label: 'Missed Call', icon: <PhoneMissed className="w-4 h-4" />, color: 'text-red-600 bg-red-50' },
  { value: 'appointment_booked', label: 'Appointment Booked', icon: <Calendar className="w-4 h-4" />, color: 'text-green-600 bg-green-50' },
  { value: 'call_completed', label: 'Call Completed', icon: <Phone className="w-4 h-4" />, color: 'text-purple-600 bg-purple-50' },
  { value: 'review_received', label: 'Review Received', icon: <Star className="w-4 h-4" />, color: 'text-amber-600 bg-amber-50' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const WebhooksTab: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [webhooks, setWebhooks] = useState<WebhookItem[]>([]);
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [expandedWebhook, setExpandedWebhook] = useState<string | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [previewTrigger, setPreviewTrigger] = useState<string | null>(null);
  const [previewPayload, setPreviewPayload] = useState<any>(null);

  // Create form state
  const [newName, setNewName] = useState('');
  const [newTrigger, setNewTrigger] = useState('new_lead');
  const [newUrl, setNewUrl] = useState('');

  // Load webhooks
  const loadWebhooks = useCallback(async () => {
    if (!user) return;
    try {
      const res = await authedFetch(`${FUNCTIONS_BASE}/webhook-manager`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'list', userId: user.id }),
      });
      const data = await res.json();
      if (data.webhooks) setWebhooks(data.webhooks);
    } catch (err) {
      console.error('Failed to load webhooks:', err);
    }
  }, [user]);

  // Load events for a webhook
  const loadEvents = useCallback(async (webhookId?: string) => {
    if (!user) return;
    try {
      const res = await authedFetch(`${FUNCTIONS_BASE}/webhook-manager`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'events', userId: user.id, webhookId, limit: 100 }),
      });
      const data = await res.json();
      if (data.events) setEvents(data.events);
    } catch (err) {
      console.error('Failed to load events:', err);
    }
  }, [user]);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadWebhooks(), loadEvents()])
      .finally(() => setLoading(false));
  }, [loadWebhooks, loadEvents]);

  // Create webhook
  const handleCreate = async () => {
    if (!user || !newUrl || !newTrigger) return;
    setCreating(true);
    try {
      const res = await authedFetch(`${FUNCTIONS_BASE}/webhook-manager`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          userId: user.id,
          name: newName || undefined,
          triggerEvent: newTrigger,
          url: newUrl,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast({ message: 'Webhook created', variant: 'success' });
        setNewName('');
        setNewUrl('');
        setNewTrigger('new_lead');
        setShowCreateForm(false);
        await loadWebhooks();
      } else {
        showToast({ message: data.error || 'Failed to create webhook', variant: 'error' });
      }
    } catch {
      showToast({ message: 'Failed to create webhook', variant: 'error' });
    } finally {
      setCreating(false);
    }
  };

  // Delete webhook
  const handleDelete = async (webhookId: string) => {
    if (!user) return;
    setDeleting(webhookId);
    try {
      const res = await authedFetch(`${FUNCTIONS_BASE}/webhook-manager`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', userId: user.id, webhookId }),
      });
      const data = await res.json();
      if (data.success) {
        showToast({ message: 'Webhook deleted', variant: 'default' });
        await loadWebhooks();
      }
    } catch {
      showToast({ message: 'Failed to delete webhook', variant: 'error' });
    } finally {
      setDeleting(null);
    }
  };

  // Toggle webhook active/inactive
  const handleToggle = async (webhook: WebhookItem) => {
    if (!user) return;
    try {
      await authedFetch(`${FUNCTIONS_BASE}/webhook-manager`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          userId: user.id,
          webhookId: webhook.id,
          isActive: !webhook.is_active,
        }),
      });
      setWebhooks(prev => prev.map(w => w.id === webhook.id ? { ...w, is_active: !w.is_active } : w));
      showToast({ message: webhook.is_active ? 'Webhook paused' : 'Webhook activated', variant: 'default' });
    } catch {
      showToast({ message: 'Failed to update webhook', variant: 'error' });
    }
  };

  // Test webhook
  const handleTest = async (webhookId: string) => {
    if (!user) return;
    setTesting(webhookId);
    try {
      const res = await authedFetch(`${FUNCTIONS_BASE}/webhook-manager`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test', userId: user.id, webhookId }),
      });
      const data = await res.json();
      if (data.success) {
        showToast({ message: `Test sent (${data.statusCode}, ${data.durationMs}ms)`, variant: 'success' });
      } else {
        showToast({ message: `Test failed: ${data.response || 'No response'}`, variant: 'error' });
      }
      await loadEvents(webhookId);
    } catch {
      showToast({ message: 'Test failed', variant: 'error' });
    } finally {
      setTesting(null);
    }
  };

  // Copy to clipboard
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Preview payload
  const handlePreviewPayload = async (triggerEvent: string) => {
    if (previewTrigger === triggerEvent) {
      setPreviewTrigger(null);
      setPreviewPayload(null);
      return;
    }
    try {
      const res = await authedFetch(`${FUNCTIONS_BASE}/webhook-manager`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sample_payload', triggerEvent }),
      });
      const data = await res.json();
      setPreviewPayload(data.payload);
      setPreviewTrigger(triggerEvent);
    } catch {
      showToast({ message: 'Failed to load payload preview', variant: 'error' });
    }
  };

  const getTriggerMeta = (trigger: string) =>
    TRIGGER_OPTIONS.find(t => t.value === trigger) || TRIGGER_OPTIONS[0];

  if (loading) return <div className="px-6 pb-6"><PageSkeleton /></div>;

  return (
    <div className="space-y-6 px-6 pb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Create webhooks to send real-time event data to Zapier, Make.com, or any external system.
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex-shrink-0"
        >
          {showCreateForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showCreateForm ? 'Cancel' : 'Create Webhook'}
        </button>
      </div>

      {/* Create Form */}
      <AnimatePresence>
        {showCreateForm && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white dark:bg-[#111114] rounded-xl border border-gray-200 dark:border-[#2a2a30] p-5 space-y-4">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">New Webhook</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Name (optional)</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    placeholder="e.g. Zapier Lead Notification"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-[#2a2a30] rounded-lg text-sm bg-white dark:bg-[#0a0a0c] focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Trigger Event</label>
                  <select
                    value={newTrigger}
                    onChange={e => setNewTrigger(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-[#2a2a30] rounded-lg text-sm bg-white dark:bg-[#0a0a0c] focus:ring-2 focus:ring-blue-500"
                  >
                    {TRIGGER_OPTIONS.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Webhook URL</label>
                <input
                  type="url"
                  value={newUrl}
                  onChange={e => setNewUrl(e.target.value)}
                  placeholder="https://hooks.zapier.com/hooks/catch/..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-[#2a2a30] rounded-lg text-sm bg-white dark:bg-[#0a0a0c] focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Payload preview */}
              <div>
                <button
                  onClick={() => handlePreviewPayload(newTrigger)}
                  className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700"
                >
                  <Eye className="w-3.5 h-3.5" />
                  {previewTrigger === newTrigger ? 'Hide' : 'Preview'} payload for {getTriggerMeta(newTrigger).label}
                </button>
                <AnimatePresence>
                  {previewTrigger === newTrigger && previewPayload && (
                    <motion.pre
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="mt-2 p-3 bg-gray-900 text-green-400 rounded-lg text-xs overflow-x-auto max-h-48"
                    >
                      {JSON.stringify(previewPayload, null, 2)}
                    </motion.pre>
                  )}
                </AnimatePresence>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleCreate}
                  disabled={creating || !newUrl}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Webhook className="w-4 h-4" />}
                  Create Webhook
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Webhook list */}
      {webhooks.length === 0 && !showCreateForm ? (
        <div className="text-center py-16 bg-white dark:bg-[#111114] rounded-xl border border-gray-200 dark:border-[#2a2a30]">
          <Webhook className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">No webhooks yet</h3>
          <p className="text-sm text-gray-500 mb-4">Create a webhook to send real-time events to external systems</p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" /> Create Your First Webhook
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {webhooks.map((webhook) => {
            const trigger = getTriggerMeta(webhook.trigger_event);
            const isExpanded = expandedWebhook === webhook.id;
            const webhookEvents = events.filter(e => e.webhook_id === webhook.id);

            return (
              <div key={webhook.id} className="bg-white dark:bg-[#111114] rounded-xl border border-gray-200 dark:border-[#2a2a30] overflow-hidden">
                {/* Webhook header */}
                <div className="flex items-center justify-between p-3 sm:p-4 gap-2">
                  <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                    <button
                      onClick={() => {
                        setExpandedWebhook(isExpanded ? null : webhook.id);
                        if (!isExpanded) loadEvents(webhook.id);
                      }}
                      className="p-1"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      )}
                    </button>

                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${trigger.color}`}>
                      {trigger.icon} {trigger.label}
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{webhook.name}</p>
                      <p className="text-xs text-gray-400 truncate">{webhook.url}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 sm:gap-2 ml-2 sm:ml-4 flex-shrink-0">
                    {/* Active toggle */}
                    <button
                      onClick={() => handleToggle(webhook)}
                      className="p-1"
                      title={webhook.is_active ? 'Pause webhook' : 'Activate webhook'}
                    >
                      {webhook.is_active ? (
                        <ToggleRight className="w-6 h-6 text-blue-600" />
                      ) : (
                        <ToggleLeft className="w-6 h-6 text-gray-400" />
                      )}
                    </button>

                    {/* Copy secret */}
                    <button
                      onClick={() => handleCopy(webhook.secret, `secret-${webhook.id}`)}
                      className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-[#1a1a1f]"
                      title="Copy signing secret"
                    >
                      {copiedId === `secret-${webhook.id}` ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Code className="w-4 h-4" />
                      )}
                    </button>

                    {/* Copy URL */}
                    <button
                      onClick={() => handleCopy(webhook.url, `url-${webhook.id}`)}
                      className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-[#1a1a1f]"
                      title="Copy webhook URL"
                    >
                      {copiedId === `url-${webhook.id}` ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>

                    {/* Test */}
                    <button
                      onClick={() => handleTest(webhook.id)}
                      disabled={testing === webhook.id}
                      className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20"
                      title="Send test payload"
                    >
                      {testing === webhook.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => handleDelete(webhook.id)}
                      disabled={deleting === webhook.id}
                      className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                      title="Delete webhook"
                    >
                      {deleting === webhook.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Expanded: Event log */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-gray-200 dark:border-[#2a2a30]">
                        {/* Webhook details */}
                        <div className="px-3 sm:px-4 py-3 bg-gray-50 dark:bg-[#0a0a0c] grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 text-xs">
                          <div>
                            <span className="text-gray-500">Status</span>
                            <p className={`font-medium ${webhook.is_active ? 'text-green-600' : 'text-gray-400'}`}>
                              {webhook.is_active ? 'Active' : 'Paused'}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-500">Created</span>
                            <p className="text-gray-900 dark:text-white">{new Date(webhook.created_at).toLocaleDateString()}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Signing Secret</span>
                            <div className="flex items-center gap-1">
                              <p className="text-gray-900 dark:text-white font-mono truncate">{webhook.secret.substring(0, 12)}...</p>
                              <button onClick={() => handleCopy(webhook.secret, `secret2-${webhook.id}`)} className="text-gray-400 hover:text-gray-600">
                                {copiedId === `secret2-${webhook.id}` ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                              </button>
                            </div>
                          </div>
                          <div>
                            <span className="text-gray-500">Events Fired</span>
                            <p className="text-gray-900 dark:text-white">{webhookEvents.length}</p>
                          </div>
                        </div>

                        {/* Event log */}
                        <div className="p-4">
                          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Event Log (Last 100)</h4>
                          {webhookEvents.length === 0 ? (
                            <div className="text-center py-6">
                              <AlertCircle className="w-6 h-6 text-gray-300 mx-auto mb-2" />
                              <p className="text-sm text-gray-500">No events yet. Click the play button to send a test.</p>
                            </div>
                          ) : (
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                              {webhookEvents.map((evt) => (
                                <div key={evt.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-gray-50 dark:bg-[#0a0a0c]">
                                  {evt.success ? (
                                    <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                                  ) : (
                                    <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-medium text-gray-900 dark:text-white">
                                        {getTriggerMeta(evt.trigger_event).label}
                                      </span>
                                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                                        evt.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                      }`}>
                                        {evt.status_code || 'ERR'}
                                      </span>
                                    </div>
                                    {!evt.success && evt.response_body && (
                                      <p className="text-xs text-red-500 truncate mt-0.5">{evt.response_body}</p>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    <span className="text-xs text-gray-400 flex items-center gap-1">
                                      <Clock className="w-3 h-3" /> {evt.duration_ms}ms
                                    </span>
                                    <span className="text-xs text-gray-400">
                                      {new Date(evt.created_at).toLocaleTimeString()}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}

      {/* Payload Preview Reference */}
      <div className="bg-white dark:bg-[#111114] rounded-xl border border-gray-200 dark:border-[#2a2a30] p-5">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">Payload Reference</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Click any trigger to preview the JSON payload your webhook endpoint will receive.
        </p>
        <div className="flex flex-wrap gap-2">
          {TRIGGER_OPTIONS.map((t) => (
            <button
              key={t.value}
              onClick={() => handlePreviewPayload(t.value)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                previewTrigger === t.value ? 'bg-blue-600 text-white' : `${t.color} hover:opacity-80`
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
        <AnimatePresence>
          {previewTrigger && previewPayload && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-4 relative">
                <button
                  onClick={() => handleCopy(JSON.stringify(previewPayload, null, 2), 'payload-preview')}
                  className="absolute top-3 right-3 p-1.5 bg-gray-700 rounded-lg text-gray-300 hover:text-white"
                >
                  {copiedId === 'payload-preview' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                <pre className="p-4 bg-gray-900 text-green-400 rounded-lg text-xs overflow-x-auto max-h-64">
                  {JSON.stringify(previewPayload, null, 2)}
                </pre>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default WebhooksTab;
