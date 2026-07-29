import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Key, Plus, Trash2, Loader2, Copy, Check,
  Shield, AlertTriangle, Clock, BarChart3,
} from 'lucide-react';
import { PopButton } from '../../../components/ui/pop-button';
import ModalShell from '../../../components/ui/modal-shell';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import { useTeamStore } from '../../../stores/teamStore';
import type { ApiKey } from '../../../types/team';

const EXPIRY_OPTIONS = [
  { label: 'Never', value: '' },
  { label: '10 days', value: '10' },
  { label: '30 days', value: '30' },
  { label: '60 days', value: '60' },
  { label: '90 days', value: '90' },
];

// ─── Component ───────────────────────────────────────────────────────────

const ApiKeysPage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { apiKeys, apiKeysLoading, fetchApiKeys, createApiKey, revokeApiKey } = useTeamStore();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [selectedKey, setSelectedKey] = useState<ApiKey | null>(null);
  const [newKey, setNewKey] = useState('');
  const [creating, setCreating] = useState(false);
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);

  // Create form
  const [keyName, setKeyName] = useState('');
  const [keyExpiryDays, setKeyExpiryDays] = useState('');

  useEffect(() => {
    if (user?.id) fetchApiKeys(user.id);
  }, [user?.id, fetchApiKeys]);

  // ─── Helpers ───────────────────────────────────────────────────
  const resetForm = () => {
    setKeyName('');
    setKeyExpiryDays('');
  };

  const expiryToDateString = (days: string): string | undefined => {
    if (!days) return undefined;
    const d = new Date();
    d.setDate(d.getDate() + parseInt(days, 10));
    return d.toISOString().slice(0, 10);
  };

  const copyToClipboard = async (text: string, id?: string) => {
    try {
      await navigator.clipboard.writeText(text);
      if (id) { setCopiedKeyId(id); setTimeout(() => setCopiedKeyId(null), 2000); }
      showToast({ message: 'Copied to clipboard', variant: 'success' });
    } catch {
      showToast({ message: 'Failed to copy', variant: 'error' });
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '\u2014';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatLastUsed = (dateStr: string | null) => {
    if (!dateStr) return 'Never used';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return formatDate(dateStr);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 dark:text-green-300 bg-green-100 dark:bg-green-500/15';
      case 'revoked': return 'text-red-600 dark:text-red-300 bg-red-100 dark:bg-red-500/15';
      case 'expired': return 'text-yellow-600 dark:text-yellow-300 bg-yellow-100 dark:bg-yellow-500/15';
      default: return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-[#17171b]';
    }
  };

  // ─── Handlers ──────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!keyName.trim()) return;
    setCreating(true);
    try {
      const expiryDate = expiryToDateString(keyExpiryDays);
      const fullKey = await createApiKey(keyName, [], expiryDate);
      if (fullKey) {
        setNewKey(fullKey);
        setShowCreateModal(false);
        setShowKeyModal(true);
        resetForm();
        showToast({ message: 'API key created', variant: 'success' });
      }
    } catch (err: any) {
      showToast({ message: err?.message || 'Failed to create key', variant: 'error' });
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async () => {
    if (!selectedKey) return;
    try {
      await revokeApiKey(selectedKey.id);
      showToast({ message: `API key "${selectedKey.name}" revoked`, variant: 'success' });
      setShowRevokeModal(false);
      setSelectedKey(null);
    } catch {
      showToast({ message: 'Failed to revoke key', variant: 'error' });
    }
  };

  const activeKeys = apiKeys.filter((k) => k.status === 'active');
  const revokedKeys = apiKeys.filter((k) => k.status !== 'active');

  // ─── Render ────────────────────────────────────────────────────
  if (apiKeysLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">API Keys</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage programmatic access to your workspace</p>
        </div>
        <PopButton color="blue" onClick={() => { resetForm(); setShowCreateModal(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Create API Key
        </PopButton>
      </div>

      {/* Security notice */}
      <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-lg">
        <Shield className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-amber-800 dark:text-amber-200">
          <p className="font-medium">Keep your API keys secure</p>
          <p className="mt-0.5 text-amber-700 dark:text-amber-300">
            API keys grant programmatic access to your workspace. Never share them in public repositories or client-side code.
            Keys are shown only once at creation.
          </p>
        </div>
      </div>

      {/* ─── Active Keys ──────────────────────────────────────── */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Active Keys ({activeKeys.length})</h2>
        {activeKeys.length === 0 ? (
          <div className="bg-white dark:bg-[#111114] border border-gray-200 dark:border-[#1e1e24] rounded-lg p-8 text-center">
            <Key className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400">No active API keys. Create one to get started.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeKeys.map((key, i) => (
              <motion.div
                key={key.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-white dark:bg-[#111114] border border-gray-200 dark:border-[#1e1e24] rounded-lg p-4 hover:shadow-sm dark:hover:shadow-black/30 transition-shadow duration-200 ease-out"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <Key className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                      <span className="font-semibold text-gray-900 dark:text-white">{key.name}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(key.status)}`}>
                        {key.status}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 md:gap-4 text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <code className="bg-gray-100 dark:bg-[#17171b] dark:text-gray-300 px-2 py-0.5 rounded text-xs font-mono truncate max-w-[160px] sm:max-w-none inline-block align-middle">
                          {key.key_prefix}{'*'.repeat(24)}
                        </code>
                        <button
                          onClick={() => copyToClipboard(key.key_prefix + '...', key.id)}
                          className="p-1.5 hover:bg-gray-100 dark:hover:bg-[#17171b] rounded flex-shrink-0 transition-colors duration-200 ease-out"
                          title="Copy prefix"
                        >
                          {copiedKeyId === key.id ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        Created {formatDate(key.created_at)}
                      </span>
                      <span>Last used: {formatLastUsed(key.last_used_at)}</span>
                      {key.expires_at && (
                        <span className="text-amber-600 dark:text-amber-400">
                          Expires {formatDate(key.expires_at)}
                        </span>
                      )}
                    </div>
                    {/* Usage stats */}
                    <div className="mt-2 flex flex-wrap items-center gap-2 sm:gap-4">
                      <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                        <BarChart3 className="w-3.5 h-3.5" />
                        <span>24h: {key.usage_24h || 0}</span>
                        <span className="text-gray-300 dark:text-gray-600">|</span>
                        <span>7d: {key.usage_7d || 0}</span>
                        <span className="text-gray-300 dark:text-gray-600">|</span>
                        <span>30d: {key.usage_30d || 0}</span>
                      </div>
                      <span className="text-xs text-gray-400 dark:text-gray-500">Rate limit: {key.rate_limit || 60} req/min</span>
                    </div>
                    {/* Permissions */}
                    {(key.permissions || []).length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {(key.permissions || []).map((p, idx) => (
                          <span
                            key={idx}
                            className={`px-2 py-0.5 rounded text-xs font-medium ${
                              p.permission === 'write' ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300' : 'bg-gray-100 text-gray-600 dark:bg-[#17171b] dark:text-gray-400'
                            }`}
                          >
                            {p.resource}:{p.permission}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => { setSelectedKey(key); setShowRevokeModal(true); }}
                    className="p-2 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors duration-200 ease-out"
                    title="Revoke key"
                  >
                    <Trash2 className="w-4 h-4 text-red-400 dark:text-red-500" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* ─── Revoked/Expired Keys ─────────────────────────────── */}
      {revokedKeys.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3">Revoked / Expired ({revokedKeys.length})</h2>
          <div className="space-y-2">
            {revokedKeys.map((key) => (
              <div key={key.id} className="bg-gray-50 dark:bg-[#17171b] border border-gray-200 dark:border-[#1e1e24] rounded-lg p-3 opacity-60">
                <div className="flex items-center gap-3">
                  <Key className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400 line-through">{key.name}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(key.status)}`}>
                    {key.status}
                  </span>
                  <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto">
                    {key.revoked_at ? `Revoked ${formatDate(key.revoked_at)}` : `Expired ${formatDate(key.expires_at)}`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          MODALS
         ═══════════════════════════════════════════════════════════ */}

      {/* ─── Create API Key Modal ─────────────────────────────────── */}
      <ModalShell
        open={showCreateModal}
        onClose={() => { setShowCreateModal(false); resetForm(); }}
        title="Create API Key"
        description="Set a name and choose when this key expires"
        maxWidth="max-w-md"
        footer={
          <>
            <PopButton type="button" onClick={() => { setShowCreateModal(false); resetForm(); }}>Cancel</PopButton>
            <PopButton color="blue" onClick={handleCreate} disabled={creating || !keyName.trim()}>
              {creating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating...</> : 'Create Key'}
            </PopButton>
          </>
        }
      >
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Key Name *</label>
            <input
              type="text"
              value={keyName}
              onChange={(e) => setKeyName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-[#2a2a30] dark:bg-[#17171b] dark:text-white dark:placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              placeholder="e.g. Production Backend, CRM Integration"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Expiration</label>
            <select
              value={keyExpiryDays}
              onChange={(e) => setKeyExpiryDays(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-[#2a2a30] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white dark:bg-[#17171b] dark:text-white"
            >
              {EXPIRY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
      </ModalShell>

      {/* ─── New Key Display Modal ────────────────────────────────── */}
      <ModalShell
        open={showKeyModal}
        onClose={() => { setShowKeyModal(false); setNewKey(''); }}
        title="API Key Created"
        maxWidth="max-w-lg"
        footer={
          <PopButton color="blue" onClick={() => { setShowKeyModal(false); setNewKey(''); }}>
            Done
          </PopButton>
        }
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800 dark:text-amber-200">
              Copy this key now. It will <strong>only be shown once</strong> and cannot be retrieved later.
            </p>
          </div>
          <div className="relative">
            <code className="block w-full p-3 bg-gray-900 text-green-400 rounded-lg text-sm font-mono break-all">
              {newKey}
            </code>
            <button
              onClick={() => copyToClipboard(newKey, 'new-key')}
              className="absolute top-2 right-2 p-2 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors duration-200 ease-out"
            >
              {copiedKeyId === 'new-key' ? (
                <Check className="w-4 h-4 text-green-400" />
              ) : (
                <Copy className="w-4 h-4 text-gray-300" />
              )}
            </button>
          </div>
        </div>
      </ModalShell>

      {/* ─── Revoke Key Modal ─────────────────────────────────────── */}
      <ModalShell
        open={showRevokeModal}
        onClose={() => { setShowRevokeModal(false); setSelectedKey(null); }}
        title="Revoke API Key"
        footer={
          <>
            <PopButton type="button" onClick={() => setShowRevokeModal(false)}>Cancel</PopButton>
            <PopButton color="red" onClick={handleRevoke}>Revoke Key</PopButton>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Are you sure you want to revoke <span className="font-medium text-gray-900 dark:text-white">{selectedKey?.name}</span>?
          </p>
          <div className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800 dark:text-red-200">
              Any application using this key will immediately lose access. This action cannot be undone.
            </p>
          </div>
        </div>
      </ModalShell>
    </div>
  );
};

export default ApiKeysPage;
