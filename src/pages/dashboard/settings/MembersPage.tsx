import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UserPlus, Edit, User, Crown, Shield, Trash2, Loader2, Mail,
  Briefcase, Headphones, Eye, X, Search,
  Clock, Ban, CheckCircle2, AlertTriangle, Users,
} from 'lucide-react';
import { PopButton } from '../../../components/ui/pop-button';
import ModalShell from '../../../components/ui/modal-shell';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import { usePermission, PermissionGate } from '../../../hooks/usePermission';
import { useTeamStore } from '../../../stores/teamStore';
import { useUsageGate } from '../../../hooks/useUsageTracking';
import { PREDEFINED_ROLES, ROLE_COLOR_MAP } from '../../../types/team';

// ─── Role config ────────────────────────────────────────────────────────

const ROLE_ICONS: Record<string, React.ReactNode> = {
  owner: <Crown className="w-4 h-4" />,
  admin: <Shield className="w-4 h-4" />,
  manager: <Briefcase className="w-4 h-4" />,
  agent: <Headphones className="w-4 h-4" />,
  viewer: <Eye className="w-4 h-4" />,
};

const STATUS_CONFIG: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  active: { color: 'text-green-600 bg-green-100', icon: <CheckCircle2 className="w-3.5 h-3.5" />, label: 'Active' },
  invited: { color: 'text-amber-600 bg-amber-100', icon: <Mail className="w-3.5 h-3.5" />, label: 'Invited' },
  pending: { color: 'text-amber-600 bg-amber-100', icon: <Clock className="w-3.5 h-3.5" />, label: 'Pending' },
  suspended: { color: 'text-red-600 bg-red-100', icon: <Ban className="w-3.5 h-3.5" />, label: 'Suspended' },
};

const ASSIGNABLE_ROLES = PREDEFINED_ROLES.filter((r) => r.slug !== 'owner');

// ─── Component ──────────────────────────────────────────────────────────

const MembersPage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { can } = usePermission();
  const {
    members, membersLoading, fetchMembers,
    inviteMember, inviteBulk,
    updateMemberRole, updateMemberStatus, removeMember, resendInvite,
    logActivity,
  } = useTeamStore();

  // ─── State ──────────────────────────────────────────────────
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showBulkInviteModal, setShowBulkInviteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [showDetailPanel, setShowDetailPanel] = useState(false);

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState('agent');
  const [inviteMessage, setInviteMessage] = useState('');
  const [inviting, setInviting] = useState(false);

  const [bulkEmails, setBulkEmails] = useState('');
  const [bulkRole, setBulkRole] = useState('agent');
  const [bulkInviting, setBulkInviting] = useState(false);

  const [selectedMember, setSelectedMember] = useState<typeof members[0] | null>(null);
  const [editRole, setEditRole] = useState('');
  const [suspendReason, setSuspendReason] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // ─── Data loading ───────────────────────────────────────────
  useEffect(() => {
    if (user?.id) fetchMembers(user.id);
  }, [user?.id, fetchMembers]);

  // Seed owner on first load
  useEffect(() => {
    if (!user || membersLoading || members.length > 0) return;
    const seedOwner = async () => {
      try {
        await inviteMember(user.email, 'owner', user.name || user.email.split('@')[0]);
        await updateMemberStatus(
          members.find((m) => m.email === user.email)?.id || '',
          'active'
        );
      } catch { /* ignore if already exists */ }
    };
    seedOwner();
  }, [user, membersLoading, members.length, inviteMember, updateMemberStatus]);

  // ─── Filtering ──────────────────────────────────────────────
  const filteredMembers = members.filter((m) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!m.email.toLowerCase().includes(q) && !(m.name || '').toLowerCase().includes(q)) return false;
    }
    if (filterRole && m.role !== filterRole) return false;
    if (filterStatus && m.status !== filterStatus) return false;
    return true;
  });

  const activeMembers = filteredMembers.filter((m) => m.status === 'active');
  const pendingMembers = filteredMembers.filter((m) => m.status === 'invited' || m.status === 'pending');
  const suspendedMembers = filteredMembers.filter((m) => m.status === 'suspended');

  // ─── Stats ──────────────────────────────────────────────────
  const totalCount = members.length;
  const activeCount = members.filter((m) => m.status === 'active').length;
  const pendingCount = members.filter((m) => m.status === 'invited' || m.status === 'pending').length;
  const adminCount = members.filter((m) => m.role === 'admin' || m.role === 'owner').length;

  const teamGate = useUsageGate('team_members');

  // ─── Handlers ───────────────────────────────────────────────
  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Check team member limit before inviting
    if (!teamGate.allowed) {
      teamGate.showUpgrade();
      return;
    }

    const emailLower = inviteEmail.trim().toLowerCase();
    if (!emailLower) return;

    if (members.some((m) => m.email.toLowerCase() === emailLower)) {
      showToast({ message: 'This email is already on your team', variant: 'warning' });
      return;
    }

    setInviting(true);
    try {
      await inviteMember(emailLower, inviteRole, inviteName.trim() || undefined, inviteMessage.trim() || undefined);
      await logActivity('member_invited', `Invited ${emailLower} as ${inviteRole}`);
      showToast({ message: `Invitation sent to ${emailLower}`, variant: 'success' });
      setShowInviteModal(false);
      setInviteEmail('');
      setInviteName('');
      setInviteRole('agent');
      setInviteMessage('');
    } catch (err: any) {
      showToast({
        message: err?.message?.includes('unique') ? 'This email is already invited' : 'Failed to send invitation',
        variant: 'error',
      });
    } finally {
      setInviting(false);
    }
  };

  const handleBulkInvite = async () => {
    if (!user) return;
    const emails = bulkEmails
      .split(/[\n,;]+/)
      .map((e) => e.trim())
      .filter(Boolean);

    if (emails.length === 0) {
      showToast({ message: 'Enter at least one email address', variant: 'warning' });
      return;
    }

    setBulkInviting(true);
    try {
      const result = await inviteBulk(emails, bulkRole);
      await logActivity('member_invited', `Bulk invited ${result.success.length} members as ${bulkRole}`);
      showToast({
        message: `${result.success.length} invited, ${result.failed.length} failed`,
        variant: result.failed.length > 0 ? 'warning' : 'success',
      });
      if (result.success.length > 0) {
        setShowBulkInviteModal(false);
        setBulkEmails('');
        setBulkRole('agent');
      }
    } catch {
      showToast({ message: 'Bulk invite failed', variant: 'error' });
    } finally {
      setBulkInviting(false);
    }
  };

  const handleUpdateRole = async () => {
    if (!selectedMember) return;
    try {
      await updateMemberRole(selectedMember.id, editRole);
      await logActivity('member_role_changed', `Changed ${selectedMember.email} role from ${selectedMember.role} to ${editRole}`);
      showToast({ message: `Updated ${selectedMember.name || selectedMember.email} to ${editRole}`, variant: 'success' });
      setShowEditModal(false);
      setSelectedMember(null);
    } catch {
      showToast({ message: 'Failed to update role', variant: 'error' });
    }
  };

  const handleSuspend = async () => {
    if (!selectedMember) return;
    try {
      await updateMemberStatus(selectedMember.id, 'suspended', suspendReason);
      await logActivity('member_suspended', `Suspended ${selectedMember.email}: ${suspendReason}`);
      showToast({ message: `${selectedMember.name || selectedMember.email} suspended`, variant: 'success' });
      setShowSuspendModal(false);
      setSelectedMember(null);
      setSuspendReason('');
    } catch {
      showToast({ message: 'Failed to suspend member', variant: 'error' });
    }
  };

  const handleReactivate = async (member: typeof members[0]) => {
    try {
      await updateMemberStatus(member.id, 'active');
      await logActivity('member_role_changed', `Reactivated ${member.email}`);
      showToast({ message: `${member.name || member.email} reactivated`, variant: 'success' });
    } catch {
      showToast({ message: 'Failed to reactivate member', variant: 'error' });
    }
  };

  const handleRemove = async () => {
    if (!selectedMember) return;
    try {
      await removeMember(selectedMember.id);
      await logActivity('member_removed', `Removed ${selectedMember.email} from workspace`);
      showToast({ message: `Removed ${selectedMember.name || selectedMember.email}`, variant: 'success' });
      setShowDeleteModal(false);
      setSelectedMember(null);
      setShowDetailPanel(false);
    } catch {
      showToast({ message: 'Failed to remove member', variant: 'error' });
    }
  };

  const handleResendInvite = async (member: typeof members[0]) => {
    try {
      await resendInvite(member.id);
      showToast({ message: `Invitation resent to ${member.email}`, variant: 'success' });
    } catch {
      showToast({ message: 'Failed to resend invitation', variant: 'error' });
    }
  };

  // ─── Formatters ─────────────────────────────────────────────
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatLastActive = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return formatDate(dateStr);
  };

  const getRoleInfo = (role: string) => {
    const found = PREDEFINED_ROLES.find((r) => r.slug === role);
    return {
      name: found?.name || role,
      color: ROLE_COLOR_MAP[found?.color || 'gray'] || ROLE_COLOR_MAP.gray,
      icon: ROLE_ICONS[role] || <User className="w-4 h-4" />,
    };
  };

  const getStatusInfo = (status: string) => STATUS_CONFIG[status] || STATUS_CONFIG.active;

  const canManageMembers = can('settings.members');

  // ─── Render ─────────────────────────────────────────────────
  if (membersLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Team Members</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your workspace team</p>
        </div>
        <PermissionGate permission="settings.members">
          <div className="flex items-center gap-2">
            <PopButton onClick={() => setShowBulkInviteModal(true)}>
              <Users className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Bulk Invite</span>
              <span className="sm:hidden">Bulk</span>
            </PopButton>
            <PopButton color="blue" onClick={() => setShowInviteModal(true)}>
              <UserPlus className="w-4 h-4 mr-2" />
              Invite
            </PopButton>
          </div>
        </PermissionGate>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {[
          { label: 'Total Members', value: totalCount, color: 'bg-blue-50 text-blue-700' },
          { label: 'Active', value: activeCount, color: 'bg-green-50 text-green-700' },
          { label: 'Pending Invites', value: pendingCount, color: 'bg-amber-50 text-amber-700' },
          { label: 'Admins & Owners', value: adminCount, color: 'bg-purple-50 text-purple-700' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-xs text-gray-500">{stat.label}</p>
            <p className={`text-2xl font-bold mt-1 ${stat.color.split(' ')[1]}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="flex items-center gap-3">
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="flex-1 sm:flex-none px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Roles</option>
            {PREDEFINED_ROLES.map((r) => (
              <option key={r.slug} value={r.slug}>{r.name}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="flex-1 sm:flex-none px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="invited">Invited</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
      </div>

      {/* ─── Pending Invitations ──────────────────────────────── */}
      {pendingMembers.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-amber-700 mb-3 flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Pending Invitations ({pendingMembers.length})
          </h2>
          <div className="bg-amber-50 border border-amber-200 rounded-lg divide-y divide-amber-200">
            {pendingMembers.map((member) => {
              const roleInfo = getRoleInfo(member.role);
              return (
                <div key={member.id} className="flex flex-col sm:flex-row sm:items-center justify-between px-3 sm:px-5 py-3 gap-2 sm:gap-0">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Mail className="w-4 h-4 text-amber-600" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-sm font-medium text-gray-900 truncate block">
                        {member.name || member.email}
                      </span>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0 text-xs text-gray-500">
                        <span className="truncate">{member.email}</span>
                        <span className="hidden sm:inline text-gray-300">|</span>
                        <span>Invited {formatDate(member.invited_at)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 ml-12 sm:ml-0">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${roleInfo.color}`}>
                      {roleInfo.name}
                    </span>
                    {canManageMembers && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleResendInvite(member)}
                          className="px-2.5 py-1.5 text-xs font-medium text-amber-700 bg-amber-100 hover:bg-amber-200 rounded-md transition-colors"
                        >
                          Resend
                        </button>
                        <button
                          onClick={() => {
                            setSelectedMember(member);
                            setShowDeleteModal(true);
                          }}
                          className="px-2.5 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors"
                        >
                          Revoke
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── Active Members Table ─────────────────────────────── */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Member</th>
                <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th className="hidden sm:table-cell px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="hidden lg:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
                <th className="hidden lg:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Active</th>
                <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {[...activeMembers, ...suspendedMembers].map((member, i) => {
                const roleInfo = getRoleInfo(member.role);
                const statusInfo = getStatusInfo(member.status);
                const isMemberOwner = member.role === 'owner';

                return (
                  <motion.tr
                    key={member.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: i * 0.03 }}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => {
                      setSelectedMember(member);
                      setShowDetailPanel(true);
                    }}
                  >
                    <td className="px-3 md:px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                          member.avatar_url ? '' : 'bg-gray-200'
                        }`}>
                          {member.avatar_url ? (
                            <img src={member.avatar_url} alt="" className="w-8 h-8 md:w-10 md:h-10 rounded-full object-cover" width={40} height={40} loading="lazy" decoding="async" />
                          ) : (
                            <User className="w-4 h-4 md:w-5 md:h-5 text-gray-600" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {member.name || member.email.split('@')[0]}
                          </div>
                          <div className="text-xs sm:text-sm text-gray-500 truncate">{member.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 md:px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${roleInfo.color}`}>
                          {roleInfo.icon}
                        </div>
                        <span className="text-sm text-gray-900 hidden sm:inline">{roleInfo.name}</span>
                      </div>
                    </td>
                    <td className="hidden sm:table-cell px-3 md:px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                        {statusInfo.icon}
                        {statusInfo.label}
                      </span>
                    </td>
                    <td className="hidden lg:table-cell px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(member.accepted_at || member.invited_at)}
                    </td>
                    <td className="hidden lg:table-cell px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatLastActive(member.last_active)}
                    </td>
                    <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm" onClick={(e) => e.stopPropagation()}>
                      {isMemberOwner ? (
                        <span className="text-xs text-gray-400">—</span>
                      ) : canManageMembers ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setSelectedMember(member);
                              setEditRole(member.role);
                              setShowEditModal(true);
                            }}
                            className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                            title="Edit role"
                          >
                            <Edit className="w-4 h-4 text-gray-600" />
                          </button>
                          {member.status === 'suspended' ? (
                            <button
                              onClick={() => handleReactivate(member)}
                              className="p-1.5 hover:bg-green-50 rounded transition-colors"
                              title="Reactivate"
                            >
                              <CheckCircle2 className="w-4 h-4 text-green-500" />
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setSelectedMember(member);
                                setShowSuspendModal(true);
                              }}
                              className="p-1.5 hover:bg-yellow-50 rounded transition-colors"
                              title="Suspend"
                            >
                              <Ban className="w-4 h-4 text-yellow-500" />
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setSelectedMember(member);
                              setShowDeleteModal(true);
                            }}
                            className="p-1.5 hover:bg-red-50 rounded transition-colors"
                            title="Remove member"
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                  </motion.tr>
                );
              })}

              {filteredMembers.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    {searchQuery || filterRole || filterStatus
                      ? 'No members match your filters.'
                      : 'No team members yet. Invite someone to get started.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          MEMBER DETAIL PANEL (Slide-over)
         ═══════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showDetailPanel && selectedMember && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.3 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black z-40"
              onClick={() => { setShowDetailPanel(false); setSelectedMember(null); }}
            />
            {/* Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed right-0 top-0 bottom-0 w-[420px] bg-white shadow-2xl z-50 overflow-y-auto"
            >
              <div className="p-6">
                {/* Close */}
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-gray-900">Member Details</h2>
                  <button
                    onClick={() => { setShowDetailPanel(false); setSelectedMember(null); }}
                    className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>

                {/* Avatar & Name */}
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
                    {selectedMember.avatar_url ? (
                      <img src={selectedMember.avatar_url} alt="" className="w-16 h-16 rounded-full object-cover" width={64} height={64} loading="lazy" decoding="async" />
                    ) : (
                      <User className="w-8 h-8 text-gray-500" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {selectedMember.name || selectedMember.email.split('@')[0]}
                    </h3>
                    <p className="text-sm text-gray-500">{selectedMember.email}</p>
                  </div>
                </div>

                {/* Info Grid */}
                <div className="space-y-4 border-t border-gray-200 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Role</label>
                      <div className="flex items-center gap-2">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center ${getRoleInfo(selectedMember.role).color}`}>
                          {getRoleInfo(selectedMember.role).icon}
                        </span>
                        <span className="text-sm font-medium">{getRoleInfo(selectedMember.role).name}</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Status</label>
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusInfo(selectedMember.status).color}`}>
                        {getStatusInfo(selectedMember.status).icon}
                        {getStatusInfo(selectedMember.status).label}
                      </span>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Invited</label>
                      <span className="text-sm text-gray-700">{formatDate(selectedMember.invited_at)}</span>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Joined</label>
                      <span className="text-sm text-gray-700">{formatDate(selectedMember.accepted_at)}</span>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Last Active</label>
                      <span className="text-sm text-gray-700">{formatLastActive(selectedMember.last_active)}</span>
                    </div>
                    {selectedMember.suspended_at && (
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Suspended</label>
                        <span className="text-sm text-red-600">{formatDate(selectedMember.suspended_at)}</span>
                      </div>
                    )}
                  </div>

                  {selectedMember.suspended_reason && (
                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <label className="block text-xs text-red-600 font-medium mb-1">Suspension Reason</label>
                      <p className="text-sm text-red-700">{selectedMember.suspended_reason}</p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                {canManageMembers && selectedMember.role !== 'owner' && (
                  <div className="border-t border-gray-200 pt-4 mt-6 space-y-2">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">Actions</h4>
                    <button
                      onClick={() => {
                        setEditRole(selectedMember.role);
                        setShowEditModal(true);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <Edit className="w-4 h-4 text-gray-400" />
                      Change Role
                    </button>
                    {selectedMember.status === 'suspended' ? (
                      <button
                        onClick={() => handleReactivate(selectedMember)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-green-700 hover:bg-green-50 rounded-lg transition-colors"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Reactivate Member
                      </button>
                    ) : (
                      <button
                        onClick={() => setShowSuspendModal(true)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-yellow-700 hover:bg-yellow-50 rounded-lg transition-colors"
                      >
                        <Ban className="w-4 h-4" />
                        Suspend Member
                      </button>
                    )}
                    <button
                      onClick={() => setShowDeleteModal(true)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      Remove from Team
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════════════
          MODALS
         ═══════════════════════════════════════════════════════════ */}

      {/* ─── Invite Modal ─────────────────────────────────────── */}
      <ModalShell
        open={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        title="Invite Team Member"
        footer={
          <>
            <PopButton type="button" onClick={() => setShowInviteModal(false)}>Cancel</PopButton>
            <PopButton color="blue" type="submit" form="invite-form" disabled={inviting}>
              {inviting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending...</> : 'Send Invitation'}
            </PopButton>
          </>
        }
      >
        <form id="invite-form" onSubmit={handleInvite} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email Address *</label>
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="member@company.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Name (optional)</label>
            <input
              type="text"
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="John Smith"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Role *</label>
            <div className="space-y-2">
              {ASSIGNABLE_ROLES.map((role) => {
                const icon = ROLE_ICONS[role.slug] || <Shield className="w-4 h-4" />;
                const colorCls = ROLE_COLOR_MAP[role.color] || ROLE_COLOR_MAP.gray;
                return (
                  <label
                    key={role.slug}
                    className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                      inviteRole === role.slug ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="inviteRole"
                      value={role.slug}
                      checked={inviteRole === role.slug}
                      onChange={(e) => setInviteRole(e.target.value)}
                      className="sr-only"
                    />
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${colorCls}`}>
                      {icon}
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-900">{role.name}</span>
                      <p className="text-xs text-gray-500">{role.description}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Personal Message (optional)</label>
            <textarea
              value={inviteMessage}
              onChange={(e) => setInviteMessage(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              placeholder="Hey, join our team on Boltcall..."
            />
          </div>
        </form>
      </ModalShell>

      {/* ─── Bulk Invite Modal ────────────────────────────────── */}
      <ModalShell
        open={showBulkInviteModal}
        onClose={() => setShowBulkInviteModal(false)}
        title="Bulk Invite"
        description="Enter multiple email addresses, separated by commas or new lines"
        footer={
          <>
            <PopButton type="button" onClick={() => setShowBulkInviteModal(false)}>Cancel</PopButton>
            <PopButton color="blue" onClick={handleBulkInvite} disabled={bulkInviting}>
              {bulkInviting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Inviting...</> : 'Send Invitations'}
            </PopButton>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email Addresses</label>
            <textarea
              value={bulkEmails}
              onChange={(e) => setBulkEmails(e.target.value)}
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-mono"
              placeholder="alice@example.com&#10;bob@example.com&#10;charlie@example.com"
            />
            <p className="text-xs text-gray-400 mt-1">
              {bulkEmails.split(/[\n,;]+/).filter((e) => e.trim()).length} email(s) detected
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Role for all invitees</label>
            <select
              value={bulkRole}
              onChange={(e) => setBulkRole(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {ASSIGNABLE_ROLES.map((r) => (
                <option key={r.slug} value={r.slug}>{r.name} — {r.description}</option>
              ))}
            </select>
          </div>
        </div>
      </ModalShell>

      {/* ─── Edit Role Modal ──────────────────────────────────── */}
      <ModalShell
        open={showEditModal}
        onClose={() => { setShowEditModal(false); setSelectedMember(null); }}
        title="Change Role"
        footer={
          <>
            <PopButton type="button" onClick={() => setShowEditModal(false)}>Cancel</PopButton>
            <PopButton color="blue" onClick={handleUpdateRole}>Save</PopButton>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Change role for <span className="font-medium text-gray-900">{selectedMember?.name || selectedMember?.email}</span>
          </p>
          <div className="space-y-2">
            {ASSIGNABLE_ROLES.map((role) => {
              const icon = ROLE_ICONS[role.slug] || <Shield className="w-4 h-4" />;
              const colorCls = ROLE_COLOR_MAP[role.color] || ROLE_COLOR_MAP.gray;
              return (
                <label
                  key={role.slug}
                  className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                    editRole === role.slug ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="editRole"
                    value={role.slug}
                    checked={editRole === role.slug}
                    onChange={(e) => setEditRole(e.target.value)}
                    className="sr-only"
                  />
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${colorCls}`}>
                    {icon}
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-900">{role.name}</span>
                    <p className="text-xs text-gray-500">{role.description}</p>
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      </ModalShell>

      {/* ─── Suspend Modal ────────────────────────────────────── */}
      <ModalShell
        open={showSuspendModal}
        onClose={() => { setShowSuspendModal(false); setSuspendReason(''); }}
        title="Suspend Member"
        footer={
          <>
            <PopButton type="button" onClick={() => setShowSuspendModal(false)}>Cancel</PopButton>
            <PopButton color="red" onClick={handleSuspend}>Suspend</PopButton>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-yellow-800">
              Suspending <strong>{selectedMember?.name || selectedMember?.email}</strong> will immediately revoke their access.
              You can reactivate them later.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Reason (optional)</label>
            <textarea
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              placeholder="Reason for suspension..."
            />
          </div>
        </div>
      </ModalShell>

      {/* ─── Delete Confirmation Modal ────────────────────────── */}
      <ModalShell
        open={showDeleteModal}
        onClose={() => { setShowDeleteModal(false); setSelectedMember(null); }}
        title="Remove Member"
        footer={
          <>
            <PopButton type="button" onClick={() => setShowDeleteModal(false)}>Cancel</PopButton>
            <PopButton color="red" onClick={handleRemove}>Remove</PopButton>
          </>
        }
      >
        <p className="text-sm text-gray-600">
          Are you sure you want to remove{' '}
          <span className="font-medium text-gray-900">{selectedMember?.name || selectedMember?.email}</span> from your
          team? This action cannot be undone.
        </p>
      </ModalShell>
    </div>
  );
};

export default MembersPage;
