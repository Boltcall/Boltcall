import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check,
  Loader2,
  RefreshCw,
  ArrowLeftRight,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Unplug,
  ExternalLink,
  Settings,
  History,
  Map,
} from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import { PageSkeleton } from '../../../components/ui/loading-skeleton';
import { FUNCTIONS_BASE } from '../../../lib/api';
import { authedFetch } from '../../../lib/authedFetch';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CrmProvider {
  id: string;
  name: string;
  logo: string;
  fallbackColor: string;
  apiLabel: string;
  steps: string[];
  url: string;
  fields: CrmField[];
}

interface CrmField {
  boltcall: string;
  label: string;
  defaultMap: string;
  options: string[];
}

interface SavedIntegration {
  id: string;
  provider: string;
  is_connected: boolean;
  config: any;
  last_sync_at: string | null;
  sync_count: number;
  sync_direction: string;
  sync_data: { leads: boolean; calls: boolean; appointments: boolean };
  field_mapping: Record<string, string>;
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
// CRM Definitions
// ---------------------------------------------------------------------------

const HUBSPOT_FIELDS: CrmField[] = [
  { boltcall: 'name', label: 'Full Name', defaultMap: 'firstname + lastname', options: ['firstname', 'lastname', 'company'] },
  { boltcall: 'email', label: 'Email', defaultMap: 'email', options: ['email', 'hs_additional_emails'] },
  { boltcall: 'phone', label: 'Phone', defaultMap: 'phone', options: ['phone', 'mobilephone', 'hs_calculated_phone_number'] },
  { boltcall: 'source', label: 'Lead Source', defaultMap: 'leadsource', options: ['leadsource', 'hs_analytics_source', 'hs_latest_source'] },
  { boltcall: 'notes', label: 'Notes', defaultMap: 'notes_last_updated', options: ['notes_last_updated', 'description', 'message'] },
  { boltcall: 'status', label: 'Status', defaultMap: 'hs_lead_status', options: ['hs_lead_status', 'lifecyclestage'] },
];

const PIPEDRIVE_FIELDS: CrmField[] = [
  { boltcall: 'name', label: 'Full Name', defaultMap: 'name', options: ['name', 'first_name', 'last_name'] },
  { boltcall: 'email', label: 'Email', defaultMap: 'email', options: ['email'] },
  { boltcall: 'phone', label: 'Phone', defaultMap: 'phone', options: ['phone'] },
  { boltcall: 'source', label: 'Lead Source', defaultMap: 'source_name', options: ['source_name', 'origin'] },
  { boltcall: 'notes', label: 'Notes', defaultMap: 'notes', options: ['notes', 'add_note'] },
  { boltcall: 'status', label: 'Status', defaultMap: 'status', options: ['status', 'label'] },
];

const CRM_PROVIDERS: CrmProvider[] = [
  {
    id: 'hubspot',
    name: 'HubSpot',
    logo: 'https://www.hubspot.com/hubfs/HubSpot_Logos/HubSpot-Inversed-Favicon.png',
    fallbackColor: '#FF7A59',
    apiLabel: 'HubSpot Private App Token',
    steps: [
      'Go to HubSpot Settings → Integrations → Private Apps',
      'Create a private app with "contacts" and "crm.objects.contacts" scopes',
      'Copy the access token',
    ],
    url: 'https://app.hubspot.com/settings',
    fields: HUBSPOT_FIELDS,
  },
  {
    id: 'pipedrive',
    name: 'Pipedrive',
    logo: '/pipedrive_logo.png',
    fallbackColor: '#017737',
    apiLabel: 'Pipedrive API Token',
    steps: [
      'Go to Pipedrive Settings → Personal preferences → API',
      'Copy your personal API token',
    ],
    url: 'https://app.pipedrive.com/settings/api',
    fields: PIPEDRIVE_FIELDS,
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const CrmSyncTab: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [savedIntegrations, setSavedIntegrations] = useState<SavedIntegration[]>([]);
  const [syncHistory, setSyncHistory] = useState<SyncHistoryEntry[]>([]);
  const [expandedCrm, setExpandedCrm] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<'settings' | 'mapping' | 'history'>('settings');
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [imgErrors, setImgErrors] = useState<Set<string>>(new Set());

  // Form state for connecting
  const [formApiKey, setFormApiKey] = useState('');

  // Local edit state for sync settings
  const [editSyncDirection, setEditSyncDirection] = useState<string>('one_way');
  const [editSyncData, setEditSyncData] = useState<{ leads: boolean; calls: boolean; appointments: boolean }>({
    leads: true, calls: false, appointments: false,
  });
  const [editFieldMapping, setEditFieldMapping] = useState<Record<string, string>>({});

  // Load integrations
  const loadIntegrations = useCallback(async () => {
    if (!user) return;
    try {
      const res = await authedFetch(`${FUNCTIONS_BASE}/integration-sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'list', userId: user.id }),
      });
      const data = await res.json();
      if (data.integrations) {
        setSavedIntegrations(data.integrations);
      }
    } catch (err) {
      console.error('Failed to load integrations:', err);
    }
  }, [user]);

  // Load sync history
  const loadHistory = useCallback(async (provider?: string) => {
    if (!user) return;
    try {
      const res = await authedFetch(`${FUNCTIONS_BASE}/webhook-manager`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync_history', userId: user.id, provider, limit: 50 }),
      });
      const data = await res.json();
      if (data.history) setSyncHistory(data.history);
    } catch (err) {
      console.error('Failed to load sync history:', err);
    }
  }, [user]);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadIntegrations(), loadHistory()])
      .finally(() => setLoading(false));
  }, [loadIntegrations, loadHistory]);

  const getIntegration = (provider: string) => savedIntegrations.find(i => i.provider === provider);
  const isConnected = (provider: string) => savedIntegrations.some(i => i.provider === provider && i.is_connected);

  // Expand a CRM and load its current settings
  const handleExpand = (crmId: string) => {
    if (expandedCrm === crmId) {
      setExpandedCrm(null);
      return;
    }
    setExpandedCrm(crmId);
    setActiveSection('settings');

    const saved = getIntegration(crmId);
    const provider = CRM_PROVIDERS.find(p => p.id === crmId);
    if (saved) {
      setEditSyncDirection(saved.sync_direction || 'one_way');
      setEditSyncData(saved.sync_data || { leads: true, calls: false, appointments: false });
      setEditFieldMapping(saved.field_mapping || {});
    } else if (provider) {
      setEditSyncDirection('one_way');
      setEditSyncData({ leads: true, calls: false, appointments: false });
      const defaultMapping: Record<string, string> = {};
      provider.fields.forEach(f => { defaultMapping[f.boltcall] = f.defaultMap; });
      setEditFieldMapping(defaultMapping);
    }

    loadHistory(crmId);
  };

  // Connect CRM
  const handleConnect = async (crm: CrmProvider) => {
    if (!user || !formApiKey) return;
    setConnecting(true);
    try {
      const res = await authedFetch(`${FUNCTIONS_BASE}/integration-sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'connect',
          userId: user.id,
          provider: crm.id,
          apiKey: formApiKey,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast({ message: `${crm.name} connected!`, variant: 'success' });
        setFormApiKey('');
        await loadIntegrations();
      } else {
        showToast({ message: data.error || 'Connection failed', variant: 'error' });
      }
    } catch {
      showToast({ message: 'Connection failed', variant: 'error' });
    } finally {
      setConnecting(false);
    }
  };

  // Disconnect CRM
  const handleDisconnect = async (crm: CrmProvider) => {
    if (!user) return;
    try {
      await authedFetch(`${FUNCTIONS_BASE}/integration-sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'disconnect', userId: user.id, provider: crm.id }),
      });
      showToast({ message: `${crm.name} disconnected`, variant: 'default' });
      await loadIntegrations();
    } catch {
      showToast({ message: 'Failed to disconnect', variant: 'error' });
    }
  };

  // Save sync settings
  const handleSaveSettings = async (crmId: string) => {
    if (!user) return;
    setSavingSettings(true);
    try {
      const res = await authedFetch(`${FUNCTIONS_BASE}/webhook-manager`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_sync_settings',
          userId: user.id,
          provider: crmId,
          syncDirection: editSyncDirection,
          syncData: editSyncData,
          fieldMapping: editFieldMapping,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast({ message: 'Sync settings saved', variant: 'success' });
        await loadIntegrations();
      } else {
        showToast({ message: data.error || 'Failed to save settings', variant: 'error' });
      }
    } catch {
      showToast({ message: 'Failed to save settings', variant: 'error' });
    } finally {
      setSavingSettings(false);
    }
  };

  // Trigger manual sync
  const handleSyncNow = async (crmId: string) => {
    if (!user) return;
    setSyncing(true);
    try {
      const res = await authedFetch(`${FUNCTIONS_BASE}/integration-sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sync_lead',
          userId: user.id,
          lead: {
            name: 'Manual Sync Test',
            email: 'test@boltcall.org',
            phone: '+447700000000',
            source: 'manual_sync',
            notes: 'Triggered from Boltcall dashboard',
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        const result = data.results?.find((r: any) => r.provider === crmId);
        if (result?.success) {
          showToast({ message: `Sync test successful`, variant: 'success' });
        } else {
          showToast({ message: result?.error || 'Sync test failed', variant: 'error' });
        }
        await loadIntegrations();
        await loadHistory(crmId);
      }
    } catch {
      showToast({ message: 'Sync failed', variant: 'error' });
    } finally {
      setSyncing(false);
    }
  };

  if (loading) return <div className="px-6 pb-6"><PageSkeleton /></div>;

  return (
    <div className="space-y-6 px-6 pb-6">
      {/* Header */}
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Connect your CRM to automatically sync leads, calls, and appointments. Configure sync direction and field mapping.
        </p>
      </div>

      {/* CRM Cards */}
      <div className="space-y-4">
        {CRM_PROVIDERS.map((crm) => {
          const connected = isConnected(crm.id);
          const saved = getIntegration(crm.id);
          const isExpanded = expandedCrm === crm.id;

          return (
            <div key={crm.id} className="bg-white dark:bg-[#111114] rounded-xl border border-gray-200 dark:border-[#2a2a30] overflow-hidden">
              {/* Card header */}
              <div
                className="flex items-center justify-between p-5 cursor-pointer hover:bg-gray-50 dark:hover:bg-[#0a0a0c] transition-colors"
                onClick={() => handleExpand(crm.id)}
              >
                <div className="flex items-center gap-4">
                  {imgErrors.has(crm.id) ? (
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: crm.fallbackColor }}>
                      <span className="text-white font-bold text-lg">{crm.name[0]}</span>
                    </div>
                  ) : (
                    <img
                      src={crm.logo}
                      alt={crm.name}
                      className="w-10 h-10 rounded-lg object-contain"
                      onError={() => setImgErrors(prev => new Set(prev).add(crm.id))}
                      width={40}
                      height={40}
                      loading="lazy"
                      decoding="async"
                    />
                  )}
                  <div>
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white">{crm.name}</h3>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-1">
                      {connected ? (
                        <>
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 dark:text-green-400">
                            <Check className="w-3 h-3" /> Connected
                          </span>
                          {saved?.last_sync_at && (
                            <span className="text-xs text-gray-400 flex items-center gap-1 hidden sm:flex">
                              <Clock className="w-3 h-3" /> Last sync {new Date(saved.last_sync_at).toLocaleString()}
                            </span>
                          )}
                          {saved?.sync_count ? (
                            <span className="text-xs text-gray-400">{saved.sync_count} synced</span>
                          ) : null}
                        </>
                      ) : (
                        <span className="text-xs text-gray-400">Not connected</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {connected && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleSyncNow(crm.id); }}
                      disabled={syncing}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 transition-colors"
                    >
                      <RefreshCw className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} />
                      Sync Now
                    </button>
                  )}
                  {isExpanded ? (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </div>

              {/* Expanded content */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-gray-200 dark:border-[#2a2a30]">
                      {/* Not connected — show connect form */}
                      {!connected && (
                        <div className="p-5 space-y-4">
                          <ol className="space-y-2">
                            {crm.steps.map((step, i) => (
                              <li key={i} className="flex gap-2 text-sm text-gray-600 dark:text-gray-400">
                                <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ backgroundColor: crm.fallbackColor }}>{i + 1}</span>
                                {step}
                              </li>
                            ))}
                          </ol>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{crm.apiLabel}</label>
                            <input
                              type="password"
                              value={formApiKey}
                              onChange={e => setFormApiKey(e.target.value)}
                              placeholder={`Enter your ${crm.name} API key`}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-[#2a2a30] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white dark:bg-[#0a0a0c]"
                            />
                          </div>
                          <div className="flex gap-3">
                            <button
                              onClick={() => handleConnect(crm)}
                              disabled={connecting || !formApiKey}
                              className="flex items-center gap-2 px-4 py-2 text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
                              style={{ backgroundColor: crm.fallbackColor }}
                            >
                              {connecting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                              Connect {crm.name}
                            </button>
                            <a href={crm.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
                              <ExternalLink className="w-3.5 h-3.5" /> Get API Key
                            </a>
                          </div>
                        </div>
                      )}

                      {/* Connected — show config tabs */}
                      {connected && (
                        <div>
                          {/* Sub-tabs */}
                          <div className="flex border-b border-gray-200 dark:border-[#2a2a30] px-3 sm:px-5 overflow-x-auto">
                            {[
                              { id: 'settings' as const, label: 'Sync Settings', icon: <Settings className="w-3.5 h-3.5" /> },
                              { id: 'mapping' as const, label: 'Field Mapping', icon: <Map className="w-3.5 h-3.5" /> },
                              { id: 'history' as const, label: 'Sync History', icon: <History className="w-3.5 h-3.5" /> },
                            ].map(tab => (
                              <button
                                key={tab.id}
                                onClick={() => { setActiveSection(tab.id); if (tab.id === 'history') loadHistory(crm.id); }}
                                className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors ${
                                  activeSection === tab.id
                                    ? 'border-blue-600 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                              >
                                {tab.icon} {tab.label}
                              </button>
                            ))}
                          </div>

                          {/* Settings section */}
                          {activeSection === 'settings' && (
                            <div className="p-5 space-y-6">
                              {/* Sync direction */}
                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Sync Direction</label>
                                <div className="grid grid-cols-2 gap-3">
                                  <button
                                    onClick={() => setEditSyncDirection('one_way')}
                                    className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-colors ${
                                      editSyncDirection === 'one_way'
                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                        : 'border-gray-200 dark:border-[#2a2a30] hover:border-gray-300'
                                    }`}
                                  >
                                    <ArrowRight className="w-5 h-5 text-blue-600" />
                                    <div className="text-left">
                                      <p className="text-sm font-medium text-gray-900 dark:text-white">One-way</p>
                                      <p className="text-xs text-gray-500">Boltcall → {crm.name}</p>
                                    </div>
                                  </button>
                                  <button
                                    onClick={() => setEditSyncDirection('two_way')}
                                    className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-colors ${
                                      editSyncDirection === 'two_way'
                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                        : 'border-gray-200 dark:border-[#2a2a30] hover:border-gray-300'
                                    }`}
                                  >
                                    <ArrowLeftRight className="w-5 h-5 text-blue-600" />
                                    <div className="text-left">
                                      <p className="text-sm font-medium text-gray-900 dark:text-white">Two-way</p>
                                      <p className="text-xs text-gray-500">Boltcall ↔ {crm.name}</p>
                                    </div>
                                  </button>
                                </div>
                              </div>

                              {/* What to sync */}
                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">What to Sync</label>
                                <div className="space-y-3">
                                  {[
                                    { key: 'leads' as const, label: 'Leads', desc: 'New leads captured by AI receptionist' },
                                    { key: 'calls' as const, label: 'Calls', desc: 'Call logs and transcripts' },
                                    { key: 'appointments' as const, label: 'Appointments', desc: 'Booked appointments and calendar events' },
                                  ].map(item => (
                                    <label key={item.key} className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-[#2a2a30] hover:bg-gray-50 dark:hover:bg-[#0a0a0c] cursor-pointer">
                                      <div>
                                        <p className="text-sm font-medium text-gray-900 dark:text-white">{item.label}</p>
                                        <p className="text-xs text-gray-500">{item.desc}</p>
                                      </div>
                                      <div className="relative">
                                        <input
                                          type="checkbox"
                                          checked={editSyncData[item.key]}
                                          onChange={() => setEditSyncData(prev => ({ ...prev, [item.key]: !prev[item.key] }))}
                                          className="sr-only peer"
                                        />
                                        <div className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:bg-blue-600 transition-colors" />
                                        <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow peer-checked:translate-x-4 transition-transform" />
                                      </div>
                                    </label>
                                  ))}
                                </div>
                              </div>

                              {/* Save + Disconnect */}
                              <div className="flex items-center justify-between pt-2">
                                <button
                                  onClick={() => handleDisconnect(crm)}
                                  className="flex items-center gap-1.5 text-xs text-red-600 hover:text-red-700"
                                >
                                  <Unplug className="w-3.5 h-3.5" /> Disconnect
                                </button>
                                <button
                                  onClick={() => handleSaveSettings(crm.id)}
                                  disabled={savingSettings}
                                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                                >
                                  {savingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                  Save Settings
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Field Mapping section */}
                          {activeSection === 'mapping' && (
                            <div className="p-5 space-y-4">
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                Map Boltcall fields to {crm.name} fields. This controls how data flows between systems.
                              </p>
                              <div className="space-y-3">
                                {crm.fields.map((field) => (
                                  <div key={field.boltcall} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                                    <div className="sm:w-1/3">
                                      <span className="text-sm font-medium text-gray-900 dark:text-white">{field.label}</span>
                                      <span className="text-xs text-gray-400 block">{field.boltcall}</span>
                                    </div>
                                    <ArrowRight className="w-4 h-4 text-gray-300 flex-shrink-0 hidden sm:block" />
                                    <select
                                      value={editFieldMapping[field.boltcall] || field.defaultMap}
                                      onChange={(e) => setEditFieldMapping(prev => ({ ...prev, [field.boltcall]: e.target.value }))}
                                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-[#2a2a30] rounded-lg text-sm bg-white dark:bg-[#0a0a0c] focus:ring-2 focus:ring-blue-500"
                                    >
                                      {field.options.map(opt => (
                                        <option key={opt} value={opt}>{opt}</option>
                                      ))}
                                    </select>
                                  </div>
                                ))}
                              </div>
                              <div className="flex justify-end pt-2">
                                <button
                                  onClick={() => handleSaveSettings(crm.id)}
                                  disabled={savingSettings}
                                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                                >
                                  {savingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                  Save Mapping
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Sync History section */}
                          {activeSection === 'history' && (
                            <div className="p-5">
                              {syncHistory.length === 0 ? (
                                <div className="text-center py-8">
                                  <History className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                  <p className="text-sm text-gray-500">No sync history yet</p>
                                  <p className="text-xs text-gray-400 mt-1">Syncs will appear here once data is exchanged</p>
                                </div>
                              ) : (
                                <div className="space-y-2 max-h-80 overflow-y-auto">
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
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CrmSyncTab;
