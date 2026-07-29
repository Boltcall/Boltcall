import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Building2, Globe, Clock, Trash2, AlertTriangle, Loader2,
  ArrowRightLeft, Shield,
} from 'lucide-react';
import { PopButton } from '../../../components/ui/pop-button';
import ModalShell from '../../../components/ui/modal-shell';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import { useTeamStore } from '../../../stores/teamStore';
import { usePermission } from '../../../hooks/usePermission';
import { UnsavedChanges } from '../../../components/ui/unsaved-changes';

const TIMEZONES = [
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Toronto', 'Europe/London', 'Europe/Berlin', 'Europe/Paris',
  'Asia/Tokyo', 'Asia/Shanghai', 'Asia/Dubai', 'Australia/Sydney',
  'Pacific/Auckland',
];

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ar', name: 'Arabic' },
  { code: 'he', name: 'Hebrew' },
];

const WorkspacePage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { isOwner, isAdmin } = usePermission();
  const {
    workspace, workspaceLoading,
    fetchWorkspace, updateWorkspace, transferOwnership, deleteWorkspace,
    members, fetchMembers, logActivity,
  } = useTeamStore();

  const [name, setName] = useState('');
  const [timezone, setTimezone] = useState('America/New_York');
  const [language, setLanguage] = useState('en');
  const [retentionDays, setRetentionDays] = useState(90);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState(false);

  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferTarget, setTransferTarget] = useState('');
  const [transferConfirm, setTransferConfirm] = useState('');

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Load workspace data
  useEffect(() => {
    if (user?.id) {
      fetchWorkspace(user.id);
      fetchMembers(user.id);
    }
  }, [user?.id, fetchWorkspace, fetchMembers]);

  // Populate form from workspace
  useEffect(() => {
    if (workspace) {
      setName(workspace.name || '');
      setTimezone(workspace.default_timezone || 'America/New_York');
      setLanguage(workspace.default_language || 'en');
      setRetentionDays(workspace.data_retention_days || 90);
    }
  }, [workspace]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateWorkspace({
        name,
        default_timezone: timezone,
        default_language: language,
        data_retention_days: retentionDays,
      });
      await logActivity('workspace_updated', 'Updated workspace settings');
      showToast({ message: 'Workspace settings saved', variant: 'success' });
      setSaveSuccess(true);
      setTimeout(() => { setSaveSuccess(false); setIsDirty(false); }, 2000);
    } catch {
      showToast({ message: 'Failed to save settings', variant: 'error' });
      setSaveError(true);
      setTimeout(() => setSaveError(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTransfer = async () => {
    if (transferConfirm !== 'TRANSFER') {
      showToast({ message: 'Please type TRANSFER to confirm', variant: 'error' });
      return;
    }
    try {
      await transferOwnership(transferTarget);
      await logActivity('workspace_updated', `Transferred ownership to ${transferTarget}`);
      showToast({ message: 'Ownership transferred successfully', variant: 'success' });
      setShowTransferModal(false);
      setTransferTarget('');
      setTransferConfirm('');
    } catch {
      showToast({ message: 'Failed to transfer ownership', variant: 'error' });
    }
  };

  const handleDelete = async () => {
    if (deleteConfirm !== 'DELETE') {
      showToast({ message: 'Please type DELETE to confirm', variant: 'error' });
      return;
    }
    setIsDeleting(true);
    try {
      await deleteWorkspace();
      await logActivity('workspace_updated', 'Deleted workspace');
      showToast({ message: 'Workspace deleted', variant: 'success' });
      window.location.href = '/';
    } catch {
      showToast({ message: 'Failed to delete workspace', variant: 'error' });
    } finally {
      setIsDeleting(false);
    }
  };

  const nonOwnerMembers = members.filter((m) => m.role !== 'owner' && m.status === 'active');

  if (workspaceLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Workspace Settings</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Configure your workspace identity and defaults</p>
      </div>

      {/* Workspace Identity */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="bg-white dark:bg-[#111114] rounded-lg border border-gray-200 dark:border-[#1e1e24] p-4 md:p-6"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-500/15 rounded-lg flex items-center justify-center">
            <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <h2 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-white">Workspace Identity</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Workspace Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setIsDirty(true); }}
              disabled={!isAdmin}
              className="w-full px-3 py-2 border border-gray-300 dark:border-[#2a2a30] dark:bg-[#17171b] dark:text-white dark:placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 dark:disabled:bg-[#0e0e11] disabled:cursor-not-allowed"
              placeholder="My Workspace"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <div className="flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                Default Language
              </div>
            </label>
            <select
              value={language}
              onChange={(e) => { setLanguage(e.target.value); setIsDirty(true); }}
              disabled={!isAdmin}
              className="w-full px-3 py-2 border border-gray-300 dark:border-[#2a2a30] dark:bg-[#17171b] dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 dark:disabled:bg-[#0e0e11]"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>{lang.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                Default Timezone
              </div>
            </label>
            <select
              value={timezone}
              onChange={(e) => { setTimezone(e.target.value); setIsDirty(true); }}
              disabled={!isAdmin}
              className="w-full px-3 py-2 border border-gray-300 dark:border-[#2a2a30] dark:bg-[#17171b] dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 dark:disabled:bg-[#0e0e11]"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>{tz.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <div className="flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                Data Retention (days)
              </div>
            </label>
            <select
              value={retentionDays}
              onChange={(e) => { setRetentionDays(Number(e.target.value)); setIsDirty(true); }}
              disabled={!isAdmin}
              className="w-full px-3 py-2 border border-gray-300 dark:border-[#2a2a30] dark:bg-[#17171b] dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 dark:disabled:bg-[#0e0e11]"
            >
              <option value={30}>30 days</option>
              <option value={60}>60 days</option>
              <option value={90}>90 days</option>
              <option value={180}>180 days</option>
              <option value={365}>1 year</option>
              <option value={0}>Unlimited</option>
            </select>
          </div>
        </div>
      </motion.div>

      {/* ─── Danger Zone ──────────────────────────────────────── */}
      {isOwner && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="bg-white dark:bg-[#111114] rounded-lg border border-red-200 dark:border-red-500/30 p-4 md:p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-red-100 dark:bg-red-500/15 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h2 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-white">Danger Zone</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Irreversible and destructive actions</p>
            </div>
          </div>

          <div className="space-y-4 divide-y divide-red-100 dark:divide-red-500/20">
            {/* Transfer Ownership */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 first:pt-0">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Transfer Ownership</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Transfer workspace ownership to another admin</p>
              </div>
              <PopButton onClick={() => setShowTransferModal(true)}>
                <ArrowRightLeft className="w-4 h-4 mr-2" />
                Transfer
              </PopButton>
            </div>

            {/* Delete Workspace */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Delete Workspace</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Permanently delete this workspace and all its data</p>
              </div>
              <PopButton color="red" onClick={() => setShowDeleteModal(true)}>
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Workspace
              </PopButton>
            </div>
          </div>
        </motion.div>
      )}

      {/* ─── Transfer Modal ──────────────────────────────────── */}
      <ModalShell
        open={showTransferModal}
        onClose={() => { setShowTransferModal(false); setTransferTarget(''); setTransferConfirm(''); }}
        title="Transfer Ownership"
        footer={
          <>
            <PopButton type="button" onClick={() => setShowTransferModal(false)}>Cancel</PopButton>
            <PopButton
              color="red"
              onClick={handleTransfer}
              disabled={transferConfirm !== 'TRANSFER' || !transferTarget}
            >
              Transfer Ownership
            </PopButton>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800 dark:text-amber-200">
              This will make the selected member the new owner. You will be downgraded to Admin.
              This action cannot be undone.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">New Owner</label>
            <select
              value={transferTarget}
              onChange={(e) => setTransferTarget(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-[#2a2a30] dark:bg-[#17171b] dark:text-white dark:placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select a member...</option>
              {nonOwnerMembers.map((m) => (
                <option key={m.id} value={m.user_id || m.id}>
                  {m.name || m.email} ({m.role})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Type <span className="font-semibold">TRANSFER</span> to confirm
            </label>
            <input
              type="text"
              value={transferConfirm}
              onChange={(e) => setTransferConfirm(e.target.value)}
              className="w-full px-3 py-2 border border-red-300 dark:border-red-500/40 dark:bg-[#17171b] dark:text-white dark:placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              placeholder="TRANSFER"
            />
          </div>
        </div>
      </ModalShell>

      {/* ─── Delete Modal ────────────────────────────────────── */}
      <ModalShell
        open={showDeleteModal}
        onClose={() => { setShowDeleteModal(false); setDeleteConfirm(''); }}
        title="Delete Workspace"
        description="This action cannot be undone. All data, members, agents, and settings will be permanently deleted."
        footer={
          <>
            <PopButton type="button" onClick={() => setShowDeleteModal(false)}>Cancel</PopButton>
            <PopButton
              color="red"
              onClick={handleDelete}
              disabled={isDeleting || deleteConfirm !== 'DELETE'}
            >
              {isDeleting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Deleting...</> : 'Delete Workspace'}
            </PopButton>
          </>
        }
      >
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Type <span className="font-semibold">DELETE</span> to confirm
          </label>
          <input
            type="text"
            value={deleteConfirm}
            onChange={(e) => setDeleteConfirm(e.target.value)}
            className="w-full px-3 py-2 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            placeholder="DELETE"
          />
        </div>
      </ModalShell>

      <UnsavedChanges
        open={isDirty}
        isSaving={isSaving}
        success={saveSuccess}
        error={saveError}
        onReset={() => { setIsDirty(false); window.location.reload(); }}
        onSave={handleSave}
      />
    </div>
  );
};

export default WorkspacePage;
