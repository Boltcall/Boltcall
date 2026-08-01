import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Check,
  ChevronRight,
  X,
  Loader2,
  AlertCircle,
  Unplug,
  ExternalLink,
  Plus,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { PageSkeleton } from '../ui/loading-skeleton';
import { authedFetch } from '../../lib/authedFetch';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Integration {
  id: string;
  name: string;
  logo: string;
  subtitle: string;
  description: string;
  fallbackColor: string;
  type: 'api_key' | 'webhook' | 'oauth';
  category: 'crm' | 'calendar' | 'automation' | 'communication' | 'local';
  apiLabel?: string;
  webhookLabel?: string;
  extraFields?: Array<{ key: string; label: string; placeholder: string; secret?: boolean }>;
  steps: string[];
  url?: string;
}

interface SavedIntegration {
  id: string;
  provider: string;
  is_connected: boolean;
  config: any;
  last_sync_at: string | null;
  sync_count: number;
}

// ---------------------------------------------------------------------------
// Integration definitions
// ---------------------------------------------------------------------------

import { FUNCTIONS_BASE } from '../../lib/api';

const integrations: Integration[] = [
  {
    id: 'hubspot',
    name: 'HubSpot',
    logo: 'https://www.hubspot.com/hubfs/HubSpot_Logos/HubSpot-Inversed-Favicon.png',
    subtitle: 'CRM & Lead Management',
    description: 'Automatically push new leads and call data into HubSpot CRM.',
    fallbackColor: '#FF7A59',
    type: 'oauth',
    category: 'crm',
    steps: [
      'Click "Connect Account" below',
      'Sign in with HubSpot and approve CRM contact access',
      'Boltcall will sync new leads and first-touch outcomes into HubSpot',
    ],
    url: 'https://app.hubspot.com',
  },
  {
    id: 'pipedrive',
    name: 'Pipedrive',
    logo: '/pipedrive_logo.png',
    subtitle: 'Sales CRM & Pipeline',
    description: 'Sync leads and deals to Pipedrive. Track your sales pipeline automatically.',
    fallbackColor: '#017737',
    type: 'oauth',
    category: 'crm',
    steps: [
      'Click "Connect Account" below',
      'Sign in with Pipedrive and approve the requested CRM access',
      'Boltcall will sync new leads and first-touch outcomes into Pipedrive',
    ],
    url: 'https://app.pipedrive.com',
  },
  {
    id: 'gohighlevel',
    name: 'GoHighLevel',
    logo: '/gohighlevel_logo.png',
    subtitle: 'All-in-One Local Business CRM',
    description: 'Push leads into GoHighLevel CRM, trigger automations, and manage your pipeline.',
    fallbackColor: '#FF6B35',
    type: 'api_key',
    category: 'crm',
    apiLabel: 'GoHighLevel API Key',
    extraFields: [
      { key: 'location_id', label: 'Location ID', placeholder: 'e.g. abc123XYZ (from Settings → Business Profile)' },
    ],
    steps: [
      'Go to GoHighLevel → Settings → Business Profile and copy your Location ID',
      'Go to Settings → API Keys (or Marketplace → API Keys)',
      'Create a new API key with Contacts read/write permissions',
      'Paste both values below to connect',
    ],
    url: 'https://app.gohighlevel.com/settings',
  },
  {
    id: 'zapier',
    name: 'Zapier',
    logo: 'https://cdn.zapier.com/zapier/images/favicon.ico',
    subtitle: 'Connect 6,000+ Apps',
    description: 'Send lead data to any app via Zapier webhooks — Slack, Mailchimp, Airtable, and more.',
    fallbackColor: '#FF4F00',
    type: 'webhook',
    category: 'automation',
    webhookLabel: 'Zapier Webhook URL',
    steps: [
      'Create a new Zap in Zapier',
      'Choose "Webhooks by Zapier" as the trigger',
      'Select "Catch Hook" and copy the webhook URL',
      "Paste it below — we'll send lead data to this URL",
    ],
    url: 'https://zapier.com/app/zaps',
  },
  {
    id: 'make',
    name: 'Make.com',
    logo: 'https://www.make.com/favicon.ico',
    subtitle: 'Visual Automation',
    description: 'Build powerful automations with Make.com scenarios triggered by Boltcall events.',
    fallbackColor: '#6D00CC',
    type: 'webhook',
    category: 'automation',
    webhookLabel: 'Make.com Webhook URL',
    steps: [
      'Create a new scenario in Make.com',
      'Add a "Webhooks" module as the trigger',
      'Choose "Custom webhook" and copy the URL',
      'Paste it below to connect',
    ],
    url: 'https://www.make.com/en/scenarios',
  },
  {
    id: 'google_sheets',
    name: 'Google Sheets',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/3/30/Google_Sheets_logo_%282014-2020%29.svg',
    subtitle: 'Simple Lead Tracking',
    description: 'Log every call, lead, and appointment into a Google Sheet automatically.',
    fallbackColor: '#0F9D58',
    type: 'api_key',
    category: 'automation',
    apiLabel: 'Google API Key',
    extraFields: [
      { key: 'spreadsheet_id', label: 'Spreadsheet ID', placeholder: 'e.g. 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms' },
      { key: 'sheet_name', label: 'Sheet Name', placeholder: 'Leads' },
    ],
    steps: [
      'Create a Google Sheet with columns: Date, Name, Email, Phone, Source, Status, Notes',
      'Make the sheet publicly editable (or use a service account)',
      'Get a Google API key from console.cloud.google.com',
      'Copy the Spreadsheet ID from the sheet URL',
    ],
    url: 'https://sheets.google.com',
  },
  {
    id: 'calcom',
    name: 'Cal.com',
    logo: '/cal.com_logo.png',
    subtitle: 'Calendar & Scheduling',
    description: 'Connect Cal.com so your AI receptionist can check availability and book appointments automatically.',
    fallbackColor: '#292929',
    type: 'api_key',
    category: 'calendar',
    apiLabel: 'Cal.com API Key',
    steps: [
      'Go to Cal.com → Settings → Developer → API Keys',
      'Create a new API key',
      'Paste it below',
    ],
    url: 'https://app.cal.com/settings/developer/api-keys',
  },
  {
    id: 'google_calendar',
    name: 'Google Calendar',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/a/a5/Google_Calendar_icon_%282020%29.svg',
    subtitle: 'Calendar & Booking',
    description: 'Two-way sync with Google Calendar. Your AI receptionist checks availability and books appointments.',
    fallbackColor: '#4285F4',
    type: 'oauth',
    category: 'calendar',
    steps: [
      'Click "Connect with Google" below',
      'Sign in with your Google account and grant calendar access',
      'Your AI receptionist will now check availability and create appointments automatically',
    ],
    url: 'https://calendar.google.com',
  },
  {
    id: 'email',
    name: 'Email (Gmail)',
    logo: 'https://ssl.gstatic.com/ui/v1/icons/mail/rfr/gmail.ico',
    subtitle: 'Email Notifications',
    description: 'Get email notifications for new leads, missed calls, and bookings.',
    fallbackColor: '#EA4335',
    type: 'api_key',
    category: 'communication',
    apiLabel: 'Notification Email Address',
    extraFields: [
      { key: 'notify_new_leads', label: 'Notify on new leads?', placeholder: 'yes' },
      { key: 'notify_missed_calls', label: 'Notify on missed calls?', placeholder: 'yes' },
      { key: 'notify_bookings', label: 'Notify on new bookings?', placeholder: 'yes' },
    ],
    steps: [
      'Enter the email address where you want to receive notifications',
      'Choose which events trigger an email (leads, missed calls, bookings)',
      "Click Connect — you'll start receiving notifications immediately",
    ],
    url: 'https://mail.google.com',
  },
  {
    id: 'google_business',
    name: 'Google Business Profile',
    logo: '/google_business_logo.svg',
    subtitle: 'Reviews & Local SEO',
    description: 'Auto-request Google reviews after appointments, monitor new reviews, and reply instantly with AI.',
    fallbackColor: '#4285F4',
    type: 'api_key',
    category: 'local',
    apiLabel: 'Google Business Profile API Key',
    extraFields: [
      { key: 'location_id', label: 'Business Location ID', placeholder: 'e.g. accounts/123/locations/456' },
      { key: 'auto_review_request', label: 'Auto-request reviews after calls?', placeholder: 'yes' },
    ],
    steps: [
      'Go to Google Cloud Console and enable the Business Profile API',
      'Create an API key or OAuth credentials',
      'Find your Location ID in Google Business Profile Manager',
      'Paste both values below — Boltcall will request reviews and monitor responses automatically',
    ],
    url: 'https://business.google.com',
  },
  {
    id: 'servicetitan',
    name: 'ServiceTitan',
    logo: '/servicetitan-logo.png',
    subtitle: 'Field Service Management',
    description: 'Automatically create customers and booking requests in ServiceTitan when leads call your AI receptionist.',
    fallbackColor: '#E8461A',
    type: 'api_key',
    category: 'crm',
    apiLabel: 'Client ID',
    extraFields: [
      { key: 'client_secret', label: 'Client Secret', placeholder: 'Your ServiceTitan app client secret', secret: true },
      { key: 'tenant_id', label: 'Tenant ID', placeholder: 'e.g. 123456789 (from your ServiceTitan URL)' },
    ],
    steps: [
      'In ServiceTitan, go to Settings → Integrations → API Application Access',
      'Create a new application — copy the Client ID and Client Secret',
      'Find your Tenant ID in the URL when logged in (e.g. go.servicetitan.com/tenant/12345)',
      'Paste all three values below to connect',
    ],
    url: 'https://go.servicetitan.com',
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp Business',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg',
    subtitle: 'Messaging & Lead Engagement',
    description: 'Respond to WhatsApp leads instantly with AI-drafted replies. Qualify, book, and follow up — all from WhatsApp.',
    fallbackColor: '#25D366',
    type: 'api_key',
    category: 'communication',
    steps: [
      'Go to Meta for Developers → Your App → WhatsApp → API Setup',
      'Copy your Phone Number ID and generate a permanent system user access token',
      'In Meta → WhatsApp → Configuration, set the Callback URL and Verify Token shown on the WhatsApp page',
      'Subscribe to the "messages" webhook field',
      'Enter your credentials on the WhatsApp page to complete the connection',
    ],
    url: 'https://developers.facebook.com/apps',
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const IntegrationHubTab: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [activePanel, setActivePanel] = useState<string | null>(null);
  const [savedIntegrations, setSavedIntegrations] = useState<SavedIntegration[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [testing, setTesting] = useState(false);
  const [imgErrors, setImgErrors] = useState<Set<string>>(new Set());

  // Form state
  const [formApiKey, setFormApiKey] = useState('');
  const [formWebhookUrl, setFormWebhookUrl] = useState('');
  const [formExtra, setFormExtra] = useState<Record<string, string>>({});

  // Load saved integrations
  useEffect(() => {
    if (!user) return;
    setLoading(true);
    authedFetch(`${FUNCTIONS_BASE}/integration-sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'list', userId: user.id }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.integrations) setSavedIntegrations(data.integrations);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user]);

  // Handle OAuth callback params on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const gcalStatus = params.get('gcal');
    const hubspotStatus = params.get('hubspot');
    const pipedriveStatus = params.get('pipedrive');
    if (gcalStatus === 'success') {
      const calendarName = params.get('calendar') || 'Google Calendar';
      showToast({ message: `${calendarName} connected!`, variant: 'success' });
      window.history.replaceState({}, '', window.location.pathname);
      if (user) {
        authedFetch(`${FUNCTIONS_BASE}/integration-sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'list', userId: user.id }),
        })
          .then(r => r.json())
          .then(data => {
            if (data.integrations) setSavedIntegrations(data.integrations);
          })
          .catch(console.error);
      }
    } else if (gcalStatus && gcalStatus !== 'success') {
      const messages: Record<string, string> = {
        error: 'Google Calendar connection failed',
        token_fail: 'Failed to get Google tokens',
        config_error: 'Google Calendar not configured on server',
        missing_code: 'Authorization was incomplete',
      };
      showToast({ message: messages[gcalStatus] || 'Google Calendar connection failed', variant: 'error' });
      window.history.replaceState({}, '', window.location.pathname);
    }

    const crmCallback = [
      { provider: 'hubspot', status: hubspotStatus, label: 'HubSpot' },
      { provider: 'pipedrive', status: pipedriveStatus, label: 'Pipedrive' },
    ].find(item => item.status);

    if (crmCallback?.status === 'success') {
      showToast({ message: `${crmCallback.label} connected!`, variant: 'success' });
      window.history.replaceState({}, '', window.location.pathname);
      if (user) {
        authedFetch(`${FUNCTIONS_BASE}/integration-sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'list', userId: user.id }),
        })
          .then(r => r.json())
          .then(data => {
            if (data.integrations) setSavedIntegrations(data.integrations);
          })
          .catch(console.error);
      }
    } else if (crmCallback?.status) {
      const messages: Record<string, string> = {
        error: `${crmCallback.label} connection failed`,
        token_fail: `Failed to get ${crmCallback.label} tokens`,
        config_error: `${crmCallback.label} is not configured on server`,
        missing_code: 'Authorization was incomplete',
        missing_user: 'Could not match this connection to your Boltcall user',
      };
      showToast({ message: messages[crmCallback.status] || `${crmCallback.label} connection failed`, variant: 'error' });
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const isConnected = (provider: string) =>
    savedIntegrations.some(i => i.provider === provider && i.is_connected);

  const getSyncInfo = (provider: string) =>
    savedIntegrations.find(i => i.provider === provider);

  const openPanel = (id: string) => {
    setActivePanel(id);
    setFormApiKey('');
    setFormWebhookUrl('');
    setFormExtra({});
  };

  const closePanel = () => setActivePanel(null);

  const handleTest = async (integration: Integration) => {
    setTesting(true);
    try {
      const res = await authedFetch(`${FUNCTIONS_BASE}/integration-sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test',
          userId: user?.id,
          provider: integration.id,
          apiKey: formApiKey,
          webhookUrl: formWebhookUrl,
          config: formExtra,
        }),
      });
      const data = await res.json();
      showToast({
        message: data.success ? data.message || 'Connection verified!' : data.error || 'Connection failed',
        variant: data.success ? 'success' : 'error',
      });
    } catch {
      showToast({ message: 'Test failed', variant: 'error' });
    } finally {
      setTesting(false);
    }
  };

  const handleConnect = async (integration: Integration) => {
    if (!user) return;

    if (integration.type === 'api_key' && integration.apiLabel && !formApiKey.trim()) {
      showToast({ message: `${integration.apiLabel} is required`, variant: 'error' });
      return;
    }
    if (integration.type === 'webhook' && !formWebhookUrl.trim()) {
      showToast({ message: 'Webhook URL is required', variant: 'error' });
      return;
    }
    const missingExtra = integration.extraFields?.find(f => !formExtra[f.key]?.trim());
    if (missingExtra) {
      showToast({ message: `${missingExtra.label} is required`, variant: 'error' });
      return;
    }

    setConnecting(true);
    try {
      const res = await authedFetch(`${FUNCTIONS_BASE}/integration-sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'connect',
          userId: user.id,
          provider: integration.id,
          apiKey: formApiKey || undefined,
          webhookUrl: formWebhookUrl || undefined,
          config: Object.keys(formExtra).length > 0 ? formExtra : undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSavedIntegrations(prev => {
          const existing = prev.findIndex(i => i.provider === integration.id);
          const newItem: SavedIntegration = {
            id: data.integration?.id || '',
            provider: integration.id,
            is_connected: true,
            config: formExtra,
            last_sync_at: null,
            sync_count: 0,
          };
          if (existing >= 0) {
            const updated = [...prev];
            updated[existing] = { ...updated[existing], is_connected: true };
            return updated;
          }
          return [...prev, newItem];
        });
        showToast({ message: `${integration.name} connected!`, variant: 'success' });
        closePanel();
      } else {
        showToast({ message: data.error || 'Connection failed', variant: 'error' });
      }
    } catch {
      showToast({ message: 'Connection failed', variant: 'error' });
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async (integration: Integration) => {
    if (!user) return;
    try {
      await authedFetch(`${FUNCTIONS_BASE}/integration-sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'disconnect', userId: user.id, provider: integration.id }),
      });
      setSavedIntegrations(prev =>
        prev.map(i => i.provider === integration.id ? { ...i, is_connected: false } : i)
      );
      showToast({ message: `${integration.name} disconnected`, variant: 'default' });
      closePanel();
    } catch {
      showToast({ message: 'Failed to disconnect', variant: 'error' });
    }
  };

  const handleOAuthConnect = async (integration: Integration) => {
    if (!user) return;
    setConnecting(true);
    try {
      const res = await authedFetch(`${FUNCTIONS_BASE}/${integration.id.replace('_', '-')}-auth-start?user_id=${user.id}`);
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

  // Sort: connected first
  const sorted = [...integrations].sort((a, b) => {
    const aConn = isConnected(a.id) ? 0 : 1;
    const bConn = isConnected(b.id) ? 0 : 1;
    return aConn - bConn;
  });

  return (
    <div className="space-y-6 px-6 pb-6">
      {/* Grid */}
      {loading ? (
        <PageSkeleton />
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {sorted.map((integration) => {
            const connected = isConnected(integration.id);
            const syncInfo = getSyncInfo(integration.id);

            return (
              <div
                key={integration.id}
                className={`bg-white dark:bg-[#111114] rounded-xl border p-6 transition-all duration-200 flex flex-col ${
                  connected
                  ? 'border-green-200 dark:border-green-900/50 hover:shadow-lg cursor-pointer'
                  : 'border-gray-200 dark:border-[#2a2a30] hover:shadow-lg hover:border-blue-200 cursor-pointer'
                }`}
                onClick={() => openPanel(integration.id)}
              >
                {/* Logo + status */}
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {imgErrors.has(integration.id) ? (
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: integration.fallbackColor }}
                      >
                        <span className="text-white font-bold text-lg">{integration.name[0]}</span>
                      </div>
                    ) : (
                      <img
                        src={integration.logo}
                        alt={integration.name}
                        className="w-10 h-10 rounded-lg object-contain"
                        onError={() => setImgErrors(prev => new Set(prev).add(integration.id))}
                        width={40}
                        height={40}
                        loading="lazy"
                        decoding="async"
                      />
                    )}
                  </div>
                  {connected && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                      <Check className="w-3 h-3" /> Connected
                    </span>
                  )}
                </div>

                <h3 className="text-base font-semibold text-gray-900 dark:text-white">{integration.name}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{integration.subtitle}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 flex-1">{integration.description}</p>

                {connected && syncInfo && (
                  <p className="text-xs text-gray-400 mt-2">
                    {syncInfo.sync_count > 0
                      ? `${syncInfo.sync_count} leads synced`
                      : 'No syncs yet'}
                    {syncInfo.last_sync_at && (
                      <> &middot; Last sync {new Date(syncInfo.last_sync_at).toLocaleDateString()}</>
                    )}
                  </p>
                )}

                <div className="mt-5 pt-4 border-t border-dashed border-gray-200 dark:border-[#2a2a30]">
                  <button
                    className={`inline-flex items-center gap-1 text-sm font-medium px-4 py-2 rounded-lg transition-colors ${
                      connected
                        ? 'text-green-700 bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400'
                        : 'text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/30'
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      openPanel(integration.id);
                    }}
                  >
                    {connected ? 'View setup' : 'Connect'}
                    <ChevronRight className="w-3.5 h-3.5 opacity-70" />
                  </button>
                </div>
              </div>
            );
          })}

          {/* Request Integration */}
          <a
            href="mailto:support@boltcall.org?subject=Integration%20Request"
            className="bg-white dark:bg-[#111114] rounded-xl border border-dashed border-gray-200 dark:border-[#2a2a30] p-6 flex flex-col items-center justify-center gap-3 text-center hover:border-blue-300 hover:bg-blue-50/30 dark:hover:border-blue-700 dark:hover:bg-blue-900/10 transition-all duration-200 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-full bg-gray-50 dark:bg-[#1a1a1f] group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 flex items-center justify-center transition-colors">
              <Plus className="w-5 h-5 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">Request an integration</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Don't see your tool? Let us know.</p>
            </div>
          </a>
        </motion.div>
      )}

      {/* Side Panel */}
      <AnimatePresence>
        {activePanel && (() => {
          const integration = integrations.find(i => i.id === activePanel);
          if (!integration) return null;
          const connected = isConnected(integration.id);
          const isWhatsApp = integration.id === 'whatsapp';

          return (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed -inset-[200px] bg-black bg-opacity-50 z-40"
                onClick={closePanel}
              />
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'tween', ease: [0.25, 0.46, 0.45, 0.94], duration: 0.4 }}
                className="fixed right-0 top-0 h-screen w-full sm:w-96 bg-white dark:bg-[#111114] shadow-xl z-50 overflow-y-auto rounded-l-none sm:rounded-l-3xl"
              >
                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      {imgErrors.has(integration.id) ? (
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: integration.fallbackColor }}>
                          <span className="text-white font-bold text-sm">{integration.name[0]}</span>
                        </div>
                      ) : (
                        <img src={integration.logo} alt={integration.name} className="w-8 h-8 rounded-lg object-contain" onError={() => setImgErrors(prev => new Set(prev).add(integration.id))} width={32} height={32} loading="lazy" decoding="async" />
                      )}
                      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{integration.name}</h2>
                    </div>
                    <button onClick={closePanel} className="p-2 hover:bg-gray-100 dark:hover:bg-[#1a1a1f] rounded-lg transition-colors">
                      <X className="w-5 h-5 text-gray-500" />
                    </button>
                  </div>

                  {/* Connected status (non-WA only — WA shows this in its own section) */}
                  {!isWhatsApp && connected && (
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 mb-6 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-medium text-green-800 dark:text-green-400">Connected</span>
                      </div>
                      <button
                        onClick={() => handleDisconnect(integration)}
                        className="flex items-center gap-1 text-xs text-red-600 hover:text-red-700"
                      >
                        <Unplug className="w-3 h-3" />
                        Disconnect
                      </button>
                    </div>
                  )}

                  {/* WhatsApp: setup guide + manage button */}
                  {isWhatsApp ? (
                    <div className="space-y-5">
                      {connected && (
                        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 flex items-center gap-2">
                          <Check className="w-4 h-4 text-green-600 shrink-0" />
                          <span className="text-sm font-medium text-green-800 dark:text-green-400">Connected</span>
                        </div>
                      )}

                      <h3 className="text-base font-semibold text-gray-900 dark:text-white">How to connect</h3>
                      <ol className="space-y-3">
                        {integration.steps.map((step, i) => (
                          <li key={i} className="flex gap-3">
                            <span
                              className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                              style={{ backgroundColor: integration.fallbackColor }}
                            >
                              {i + 1}
                            </span>
                            <span className="text-sm text-gray-600 dark:text-gray-400">{step}</span>
                          </li>
                        ))}
                      </ol>

                      <div className="pt-2 space-y-2">
                        <button
                          onClick={() => { closePanel(); navigate('/dashboard/whatsapp'); }}
                          className="w-full flex items-center justify-center gap-2 text-white py-2.5 px-4 rounded-lg hover:opacity-90 transition-opacity text-sm font-semibold"
                          style={{ backgroundColor: '#25D366' }}
                        >
                          {connected ? 'Manage WhatsApp →' : 'Connect WhatsApp →'}
                        </button>
                        <a
                          href="https://developers.facebook.com/apps"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-gray-700 py-2"
                        >
                          <ExternalLink className="w-4 h-4" />
                          Open Meta for Developers
                        </a>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Steps */}
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">How to connect</h3>
                      <ol className="space-y-3 mb-6">
                        {integration.steps.map((step, i) => (
                          <li key={i} className="flex gap-3">
                            <span
                              className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                              style={{ backgroundColor: integration.fallbackColor }}
                            >
                              {i + 1}
                            </span>
                            <span className="text-sm text-gray-600 dark:text-gray-400">{step}</span>
                          </li>
                        ))}
                      </ol>

                      <div className="border-t border-gray-200 dark:border-[#2a2a30] mb-6" />

                      {/* API Key field */}
                      {integration.type === 'api_key' && integration.apiLabel && (
                        <div className="space-y-4 mb-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{integration.apiLabel}</label>
                            <input
                              type="password"
                              value={formApiKey}
                              onChange={(e) => setFormApiKey(e.target.value)}
                              placeholder={`Enter your ${integration.name} API key`}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-[#2a2a30] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white dark:bg-[#0a0a0c]"
                            />
                          </div>
                          {integration.extraFields?.map((field) => (
                            <div key={field.key}>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{field.label}</label>
                              <input
                                type={field.secret ? 'password' : 'text'}
                                value={formExtra[field.key] || ''}
                                onChange={(e) => setFormExtra(prev => ({ ...prev, [field.key]: e.target.value }))}
                                placeholder={field.placeholder}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-[#2a2a30] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white dark:bg-[#0a0a0c]"
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Webhook URL field */}
                      {integration.type === 'webhook' && (
                        <div className="space-y-4 mb-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{integration.webhookLabel || 'Webhook URL'}</label>
                            <input
                              type="url"
                              value={formWebhookUrl}
                              onChange={(e) => setFormWebhookUrl(e.target.value)}
                              placeholder="https://hooks.zapier.com/hooks/catch/..."
                              className="w-full px-3 py-2 border border-gray-300 dark:border-[#2a2a30] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white dark:bg-[#0a0a0c]"
                            />
                          </div>
                        </div>
                      )}

                      {/* OAuth connect info */}
                      {integration.type === 'oauth' && connected && (() => {
                        const info = getSyncInfo(integration.id);
                        const calName = info?.config?.calendar_name;
                        const email = info?.config?.user_email;
                        return (
                          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4">
                            <p className="text-sm font-medium text-blue-900 dark:text-blue-300">{calName || `${integration.name} connected`}</p>
                            {email && <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">{email}</p>}
                          </div>
                        );
                      })()}

                      {/* Action buttons */}
                      <div className="space-y-3">
                        {integration.type !== 'oauth' && (formApiKey || formWebhookUrl) && (
                          <button
                            onClick={() => handleTest(integration)}
                            disabled={testing}
                            className="w-full flex items-center justify-center gap-2 border-2 border-gray-300 dark:border-[#2a2a30] text-gray-700 dark:text-gray-300 py-2.5 px-4 rounded-lg hover:bg-gray-50 dark:hover:bg-[#1a1a1f] transition-colors text-sm font-medium"
                          >
                            {testing ? (
                              <><Loader2 className="w-4 h-4 animate-spin" /> Testing...</>
                            ) : (
                              <><AlertCircle className="w-4 h-4" /> Test Connection</>
                            )}
                          </button>
                        )}

                        {integration.type === 'oauth' && !connected && (
                          <button
                            onClick={() => handleOAuthConnect(integration)}
                            disabled={connecting}
                            className="w-full flex items-center justify-center gap-2.5 text-gray-700 dark:text-gray-300 py-2.5 px-4 rounded-lg border-2 border-gray-300 dark:border-[#2a2a30] hover:bg-gray-50 dark:hover:bg-[#1a1a1f] transition-colors text-sm font-medium"
                          >
                            {connecting ? (
                              <><Loader2 className="w-4 h-4 animate-spin" /> Redirecting...</>
                            ) : (
                              <>
                                <ExternalLink className="w-4 h-4" />
                                Connect Account
                              </>
                            )}
                          </button>
                        )}

                        {integration.type === 'oauth' && connected && (
                          <button
                            onClick={() => handleOAuthConnect(integration)}
                            disabled={connecting}
                            className="w-full text-white py-2.5 px-4 rounded-lg hover:opacity-90 transition-opacity text-sm font-medium"
                            style={{ backgroundColor: integration.fallbackColor }}
                          >
                            {connecting ? (
                              <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Redirecting...</span>
                            ) : (
                              'Reconnect Account'
                            )}
                          </button>
                        )}

                        {integration.type !== 'oauth' && (
                          <button
                            onClick={() => handleConnect(integration)}
                            disabled={connecting || (!formApiKey && !formWebhookUrl && !connected)}
                            className="w-full text-white py-2.5 px-4 rounded-lg hover:opacity-90 transition-opacity text-sm font-medium disabled:opacity-50"
                            style={{ backgroundColor: integration.fallbackColor }}
                          >
                            {connecting ? (
                              <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Connecting...</span>
                            ) : connected ? (
                              'Update Connection'
                            ) : (
                              `Connect ${integration.name}`
                            )}
                          </button>
                        )}
                      </div>

                      {integration.url && (
                        <a href={integration.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mt-4">
                          <ExternalLink className="w-4 h-4" />
                          Visit {integration.name}
                        </a>
                      )}
                    </>
                  )}
                </div>
              </motion.div>
            </>
          );
        })()}
      </AnimatePresence>
    </div>
  );
};

export default IntegrationHubTab;
