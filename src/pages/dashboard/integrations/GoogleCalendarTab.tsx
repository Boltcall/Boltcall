import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar,
  Check,
  Loader2,
  ArrowLeftRight,
  ArrowRight,
  RefreshCw,
  Settings,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Unplug,
  Shield,
  Zap,
  History,
  CalendarDays,
  Timer,
} from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import { PageSkeleton } from '../../../components/ui/loading-skeleton';
import { FUNCTIONS_BASE } from '../../../lib/api';
import { authedFetch } from '../../../lib/authedFetch';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CalendarIntegration {
  id: string;
  provider: string;
  is_connected: boolean;
  config: {
    calendar_id?: string;
    calendar_name?: string;
    user_email?: string;
    access_token?: string;
    token_expires_at?: string;
    sync_direction?: string;
    sync_frequency?: string;
    conflict_resolution?: string;
    auto_create_events?: boolean;
    event_duration_minutes?: number;
    buffer_time_minutes?: number;
  };
  last_sync_at: string | null;
  sync_count: number;
  sync_direction: string;
  sync_data: any;
}

interface SyncHistoryEntry {
  id: string;
  provider: string;
  action: string;
  status: string;
  details: any;
  error_message: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const GoogleCalendarTab: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [integration, setIntegration] = useState<CalendarIntegration | null>(null);
  const [syncHistory, setSyncHistory] = useState<SyncHistoryEntry[]>([]);
  const [connecting, setConnecting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [activeSection, setActiveSection] = useState<'overview' | 'settings' | 'history'>('overview');

  // Editable settings
  const [syncDirection, setSyncDirection] = useState<string>('one_way');
  const [syncFrequency, setSyncFrequency] = useState<string>('realtime');
  const [conflictResolution, setConflictResolution] = useState<string>('boltcall_wins');
  const [autoCreateEvents, setAutoCreateEvents] = useState(true);
  const [eventDuration, setEventDuration] = useState(30);
  const [bufferTime, setBufferTime] = useState(0);

  // Load integration data
  const loadIntegration = useCallback(async () => {
    if (!user) return;
    try {
      const res = await authedFetch(`${FUNCTIONS_BASE}/integration-sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'list', userId: user.id }),
      });
      const data = await res.json();
      if (data.integrations) {
        const gcal = data.integrations.find((i: any) => i.provider === 'google_calendar');
        if (gcal) {
          setIntegration(gcal);
          const config = gcal.config || {};
          setSyncDirection(config.sync_direction || gcal.sync_direction || 'one_way');
          setSyncFrequency(config.sync_frequency || 'realtime');
          setConflictResolution(config.conflict_resolution || 'boltcall_wins');
          setAutoCreateEvents(config.auto_create_events !== false);
          setEventDuration(config.event_duration_minutes || 30);
          setBufferTime(config.buffer_time_minutes || 0);
        }
      }
    } catch (err) {
      console.error('Failed to load calendar integration:', err);
    }
  }, [user]);

  const loadHistory = useCallback(async () => {
    if (!user) return;
    try {
      const res = await authedFetch(`${FUNCTIONS_BASE}/webhook-manager`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync_history', userId: user.id, provider: 'google_calendar', limit: 50 }),
      });
      const data = await res.json();
      if (data.history) setSyncHistory(data.history);
    } catch (err) {
      console.error('Failed to load history:', err);
    }
  }, [user]);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadIntegration(), loadHistory()])
      .finally(() => setLoading(false));
  }, [loadIntegration, loadHistory]);

  // Handle OAuth callback params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const gcalStatus = params.get('gcal');
    if (gcalStatus === 'success') {
      const calendarName = params.get('calendar') || 'Google Calendar';
      showToast({ message: `${calendarName} connected!`, variant: 'success' });
      window.history.replaceState({}, '', window.location.pathname);
      loadIntegration();
    } else if (gcalStatus && gcalStatus !== 'success') {
      showToast({ message: 'Google Calendar connection failed', variant: 'error' });
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const isConnected = integration?.is_connected === true;

  // Start OAuth flow
  const handleConnect = async () => {
    if (!user) return;
    setConnecting(true);
    try {
      const res = await authedFetch(`${FUNCTIONS_BASE}/google-calendar-auth-start?user_id=${user.id}`);
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        showToast({ message: data.error || 'Failed to start OAuth flow', variant: 'error' });
      }
    } catch {
      showToast({ message: 'Failed to start OAuth flow', variant: 'error' });
    } finally {
      setConnecting(false);
    }
  };

  // Disconnect
  const handleDisconnect = async () => {
    if (!user) return;
    try {
      await authedFetch(`${FUNCTIONS_BASE}/integration-sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'disconnect', userId: user.id, provider: 'google_calendar' }),
      });
      setIntegration(null);
      showToast({ message: 'Google Calendar disconnected', variant: 'default' });
    } catch {
      showToast({ message: 'Failed to disconnect', variant: 'error' });
    }
  };

  // Save settings
  const handleSaveSettings = async () => {
    if (!user) return;
    setSaving(true);
    try {
      // Update both the integration-sync and webhook-manager
      const configUpdate = {
        ...(integration?.config || {}),
        sync_direction: syncDirection,
        sync_frequency: syncFrequency,
        conflict_resolution: conflictResolution,
        auto_create_events: autoCreateEvents,
        event_duration_minutes: eventDuration,
        buffer_time_minutes: bufferTime,
      };

      await authedFetch(`${FUNCTIONS_BASE}/integration-sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'connect',
          userId: user.id,
          provider: 'google_calendar',
          apiKey: integration?.config?.access_token ? undefined : null,
          config: configUpdate,
        }),
      });

      await authedFetch(`${FUNCTIONS_BASE}/webhook-manager`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_sync_settings',
          userId: user.id,
          provider: 'google_calendar',
          syncDirection: syncDirection,
          syncData: { appointments: true, leads: false, calls: false },
        }),
      });

      showToast({ message: 'Calendar settings saved', variant: 'success' });
      await loadIntegration();
    } catch {
      showToast({ message: 'Failed to save settings', variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  // Manual sync test
  const handleSyncNow = async () => {
    if (!user) return;
    setSyncing(true);
    try {
      const res = await authedFetch(`${FUNCTIONS_BASE}/integration-sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'calendar_availability',
          userId: user.id,
          date: new Date().toISOString().split('T')[0],
        }),
      });
      const data = await res.json();
      if (data.success) {
        const slotCount = Array.isArray(data.slots) ? data.slots.length : 0;
        showToast({ message: `Sync verified. ${slotCount} events found today.`, variant: 'success' });
      } else {
        showToast({ message: data.error || 'Sync failed', variant: 'error' });
      }
      await loadHistory();
    } catch {
      showToast({ message: 'Sync failed', variant: 'error' });
    } finally {
      setSyncing(false);
    }
  };

  if (loading) return <div className="px-6 pb-6"><PageSkeleton /></div>;

  // Not connected state
  if (!isConnected) {
    return (
      <div className="px-6 pb-6">
        <div className="max-w-xl mx-auto text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mx-auto mb-6">
            <Calendar className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Connect Google Calendar</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 max-w-md mx-auto">
            Enable two-way calendar sync so your AI receptionist can check availability and book appointments directly in your Google Calendar.
          </p>

          {/* Benefits */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            {[
              { icon: <CalendarDays className="w-5 h-5" />, label: 'Auto-book appointments', desc: 'AI checks availability and creates events' },
              { icon: <ArrowLeftRight className="w-5 h-5" />, label: 'Two-way sync', desc: 'Changes reflect in both systems' },
              { icon: <Shield className="w-5 h-5" />, label: 'No double bookings', desc: 'Real-time availability checking' },
            ].map((benefit, i) => (
              <div key={i} className="p-4 rounded-xl border border-gray-200 dark:border-[#2a2a30] bg-white dark:bg-[#111114]">
                <div className="text-blue-600 mb-2">{benefit.icon}</div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{benefit.label}</p>
                <p className="text-xs text-gray-500 mt-1">{benefit.desc}</p>
              </div>
            ))}
          </div>

          <button
            onClick={handleConnect}
            disabled={connecting}
            className="inline-flex items-center gap-2.5 px-6 py-3 text-gray-700 dark:text-gray-300 rounded-xl border-2 border-gray-300 dark:border-[#2a2a30] hover:bg-gray-50 dark:hover:bg-[#1a1a1f] transition-colors text-sm font-medium"
          >
            {connecting ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Redirecting...</>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Connect with Google
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // Connected state
  const config = integration?.config || {};

  return (
    <div className="space-y-6 px-6 pb-6">
      {/* Connection status card */}
      <div className="bg-white dark:bg-[#111114] rounded-xl border border-green-200 dark:border-green-900/50 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">{config.calendar_name || 'Google Calendar'}</h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  <Check className="w-3 h-3" /> Connected
                </span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{config.user_email || 'primary'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <button
              onClick={handleSyncNow}
              disabled={syncing}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 transition-colors"
            >
              <RefreshCw className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} />
              Sync Now
            </button>
            {integration?.last_sync_at && (
              <span className="text-xs text-gray-400 flex items-center gap-1 hidden sm:flex">
                <Clock className="w-3 h-3" />
                Last sync {new Date(integration.last_sync_at).toLocaleString()}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Section tabs */}
      <div className="flex border-b border-gray-200 dark:border-[#2a2a30] overflow-x-auto">
        {[
          { id: 'overview' as const, label: 'Overview', icon: <CalendarDays className="w-3.5 h-3.5" /> },
          { id: 'settings' as const, label: 'Sync Settings', icon: <Settings className="w-3.5 h-3.5" /> },
          { id: 'history' as const, label: 'Sync History', icon: <History className="w-3.5 h-3.5" /> },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveSection(tab.id); if (tab.id === 'history') loadHistory(); }}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeSection === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {activeSection === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-[#111114] rounded-xl border border-gray-200 dark:border-[#2a2a30] p-4">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <ArrowLeftRight className="w-4 h-4" /> Sync Direction
            </div>
            <p className="text-lg font-semibold text-gray-900 dark:text-white capitalize">{syncDirection.replace('_', '-')}</p>
          </div>
          <div className="bg-white dark:bg-[#111114] rounded-xl border border-gray-200 dark:border-[#2a2a30] p-4">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <Zap className="w-4 h-4" /> Sync Frequency
            </div>
            <p className="text-lg font-semibold text-gray-900 dark:text-white capitalize">{syncFrequency}</p>
          </div>
          <div className="bg-white dark:bg-[#111114] rounded-xl border border-gray-200 dark:border-[#2a2a30] p-4">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <Timer className="w-4 h-4" /> Event Duration
            </div>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">{eventDuration} min</p>
          </div>
          <div className="bg-white dark:bg-[#111114] rounded-xl border border-gray-200 dark:border-[#2a2a30] p-4">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <CheckCircle2 className="w-4 h-4" /> Total Syncs
            </div>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">{integration?.sync_count || 0}</p>
          </div>
        </div>
      )}

      {/* Settings */}
      {activeSection === 'settings' && (
        <div className="bg-white dark:bg-[#111114] rounded-xl border border-gray-200 dark:border-[#2a2a30] p-6 space-y-6">
          {/* Sync direction */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Sync Direction</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setSyncDirection('one_way')}
                className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-colors ${
                  syncDirection === 'one_way'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-[#2a2a30] hover:border-gray-300'
                }`}
              >
                <ArrowRight className="w-5 h-5 text-blue-600" />
                <div className="text-left">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">One-way</p>
                  <p className="text-xs text-gray-500">Boltcall → Google Calendar</p>
                  <p className="text-xs text-gray-400 mt-1">Events created by Boltcall only</p>
                </div>
              </button>
              <button
                onClick={() => setSyncDirection('two_way')}
                className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-colors ${
                  syncDirection === 'two_way'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-[#2a2a30] hover:border-gray-300'
                }`}
              >
                <ArrowLeftRight className="w-5 h-5 text-blue-600" />
                <div className="text-left">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Two-way</p>
                  <p className="text-xs text-gray-500">Boltcall ↔ Google Calendar</p>
                  <p className="text-xs text-gray-400 mt-1">Changes sync both directions</p>
                </div>
              </button>
            </div>
          </div>

          {/* Sync frequency */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Sync Frequency</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { value: 'realtime', label: 'Real-time', desc: 'Instant sync on every event' },
                { value: '5min', label: 'Every 5 min', desc: 'Batch sync every 5 minutes' },
                { value: '15min', label: 'Every 15 min', desc: 'Batch sync every 15 minutes' },
              ].map(freq => (
                <button
                  key={freq.value}
                  onClick={() => setSyncFrequency(freq.value)}
                  className={`p-3 rounded-lg border-2 text-left transition-colors ${
                    syncFrequency === freq.value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-[#2a2a30] hover:border-gray-300'
                  }`}
                >
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{freq.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{freq.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Conflict resolution */}
          {syncDirection === 'two_way' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Conflict Resolution</label>
              <p className="text-xs text-gray-400 mb-3">When the same event is modified in both systems, which version wins?</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { value: 'boltcall_wins', label: 'Boltcall wins', desc: 'Boltcall changes take priority' },
                  { value: 'google_wins', label: 'Google wins', desc: 'Google Calendar changes take priority' },
                  { value: 'latest_wins', label: 'Latest wins', desc: 'Most recent change takes priority' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setConflictResolution(opt.value)}
                    className={`p-3 rounded-lg border-2 text-left transition-colors ${
                      conflictResolution === opt.value
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-[#2a2a30] hover:border-gray-300'
                    }`}
                  >
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{opt.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Event settings */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Event Settings</label>
            <div className="space-y-4">
              {/* Auto-create events toggle */}
              <label className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-[#2a2a30] hover:bg-gray-50 dark:hover:bg-[#0a0a0c] cursor-pointer">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Auto-create calendar events</p>
                  <p className="text-xs text-gray-500">Automatically create events when appointments are booked</p>
                </div>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={autoCreateEvents}
                    onChange={() => setAutoCreateEvents(!autoCreateEvents)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:bg-blue-600 transition-colors" />
                  <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow peer-checked:translate-x-4 transition-transform" />
                </div>
              </label>

              {/* Duration */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Default Event Duration</label>
                  <select
                    value={eventDuration}
                    onChange={e => setEventDuration(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-[#2a2a30] rounded-lg text-sm bg-white dark:bg-[#0a0a0c] focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes</option>
                    <option value={45}>45 minutes</option>
                    <option value={60}>60 minutes</option>
                    <option value={90}>90 minutes</option>
                    <option value={120}>2 hours</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Buffer Between Events</label>
                  <select
                    value={bufferTime}
                    onChange={e => setBufferTime(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-[#2a2a30] rounded-lg text-sm bg-white dark:bg-[#0a0a0c] focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={0}>No buffer</option>
                    <option value={5}>5 minutes</option>
                    <option value={10}>10 minutes</option>
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Save + Disconnect */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-4 border-t border-gray-200 dark:border-[#2a2a30]">
            <div className="flex items-center gap-4">
              <button
                onClick={handleDisconnect}
                className="flex items-center gap-1.5 text-xs text-red-600 hover:text-red-700"
              >
                <Unplug className="w-3.5 h-3.5" /> Disconnect
              </button>
              <button
                onClick={handleConnect}
                disabled={connecting}
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Reconnect
              </button>
            </div>
            <button
              onClick={handleSaveSettings}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 w-full sm:w-auto justify-center"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Save Settings
            </button>
          </div>
        </div>
      )}

      {/* Sync History */}
      {activeSection === 'history' && (
        <div className="bg-white dark:bg-[#111114] rounded-xl border border-gray-200 dark:border-[#2a2a30] p-5">
          {syncHistory.length === 0 ? (
            <div className="text-center py-12">
              <History className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No sync history yet</p>
              <p className="text-xs text-gray-400 mt-1">Calendar sync events will appear here</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {syncHistory.map((entry) => (
                <div key={entry.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-[#0a0a0c]">
                  {entry.status === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                  ) : entry.status === 'error' ? (
                    <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 dark:text-white truncate">{entry.action}</p>
                    {entry.error_message && (
                      <p className="text-xs text-red-500 truncate">{entry.error_message}</p>
                    )}
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0">
                    {new Date(entry.created_at).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GoogleCalendarTab;
