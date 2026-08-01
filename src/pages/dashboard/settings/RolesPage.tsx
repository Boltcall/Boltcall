import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Shield, Plus, Edit, Trash2, Loader2, Crown, Briefcase, Headphones, Eye,
  ChevronDown, ChevronRight, Lock,
} from 'lucide-react';
import { PopButton } from '../../../components/ui/pop-button';
import ModalShell from '../../../components/ui/modal-shell';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import { useTeamStore } from '../../../stores/teamStore';
import {
  ALL_PERMISSIONS,
  PERMISSION_GROUPS,
  DEFAULT_ROLE_PERMISSIONS,
  PREDEFINED_ROLES,
  ROLE_COLOR_MAP,
  type Permission,
  type PermissionGroup,
  type PredefinedRole,
  type Role,
} from '../../../types/team';

// ─── Icon map ────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, React.ReactNode> = {
  Crown: <Crown className="w-4 h-4" />,
  Shield: <Shield className="w-4 h-4" />,
  Briefcase: <Briefcase className="w-4 h-4" />,
  Headphones: <Headphones className="w-4 h-4" />,
  Eye: <Eye className="w-4 h-4" />,
};

const ROLE_COLORS = [
  'yellow', 'purple', 'blue', 'green', 'gray', 'red', 'pink', 'indigo', 'teal', 'orange',
];

// ─── Component ───────────────────────────────────────────────────────────

const RolesPage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const {
    roles, rolesLoading, rolePermissions,
    fetchRoles, fetchRolePermissions,
    createRole, updateRole, deleteRole,
  } = useTeamStore();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formName, setFormName] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formColor, setFormColor] = useState('blue');
  const [formPermissions, setFormPermissions] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<PermissionGroup>>(new Set());

  useEffect(() => {
    if (user?.id) {
      fetchRoles(user.id);
      fetchRolePermissions(user.id);
    }
  }, [user?.id, fetchRoles, fetchRolePermissions]);

  // ─── Helpers ───────────────────────────────────────────────────
  const toggleGroup = (group: PermissionGroup) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  };

  const togglePermission = (permId: string) => {
    setFormPermissions((prev) => {
      const next = new Set(prev);
      if (next.has(permId)) next.delete(permId);
      else next.add(permId);
      return next;
    });
  };

  const toggleGroupAll = (group: PermissionGroup) => {
    const groupPerms = ALL_PERMISSIONS.filter((p) => p.group === group);
    const allSelected = groupPerms.every((p) => formPermissions.has(p.id));
    setFormPermissions((prev) => {
      const next = new Set(prev);
      groupPerms.forEach((p) => {
        if (allSelected) next.delete(p.id);
        else next.add(p.id);
      });
      return next;
    });
  };

  const getPermissionsForRole = (role: Role): string[] => {
    // For predefined roles, use defaults
    const predefined = DEFAULT_ROLE_PERMISSIONS[role.slug as PredefinedRole];
    if (predefined) return predefined;
    // For custom roles, use the store
    return rolePermissions[role.id] || [];
  };

  const resetForm = () => {
    setFormName('');
    setFormSlug('');
    setFormDescription('');
    setFormColor('blue');
    setFormPermissions(new Set());
    setExpandedGroups(new Set());
  };

  const openEditModal = (role: Role) => {
    setSelectedRole(role);
    setFormName(role.name);
    setFormSlug(role.slug);
    setFormDescription(role.description);
    setFormColor(role.color);
    setFormPermissions(new Set(getPermissionsForRole(role)));
    setExpandedGroups(new Set(Object.keys(PERMISSION_GROUPS) as PermissionGroup[]));
    setShowEditModal(true);
  };

  // ─── CRUD Handlers ─────────────────────────────────────────────
  const handleCreate = async () => {
    if (!formName.trim()) return;
    setSaving(true);
    try {
      const slug = formSlug.trim() || formName.toLowerCase().replace(/\s+/g, '_');
      await createRole(formName, slug, formDescription, formColor, Array.from(formPermissions));
      showToast({ message: `Role "${formName}" created`, variant: 'success' });
      setShowCreateModal(false);
      resetForm();
    } catch (err: any) {
      showToast({ message: err?.message || 'Failed to create role', variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedRole) return;
    setSaving(true);
    try {
      await updateRole(
        selectedRole.id,
        { name: formName, description: formDescription, color: formColor },
        Array.from(formPermissions)
      );
      showToast({ message: `Role "${formName}" updated`, variant: 'success' });
      setShowEditModal(false);
      resetForm();
    } catch (err: any) {
      showToast({ message: err?.message || 'Failed to update role', variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedRole) return;
    try {
      await deleteRole(selectedRole.id);
      showToast({ message: `Role "${selectedRole.name}" deleted`, variant: 'success' });
      setShowDeleteModal(false);
      setSelectedRole(null);
    } catch {
      showToast({ message: 'Failed to delete role', variant: 'error' });
    }
  };

  // ─── Permission groups for the matrix ──────────────────────────
  const groupedPermissions: Record<PermissionGroup, Permission[]> = {} as any;
  (Object.keys(PERMISSION_GROUPS) as PermissionGroup[]).forEach((g) => {
    groupedPermissions[g] = ALL_PERMISSIONS.filter((p) => p.group === g);
  });

  // Combine predefined + custom roles for display
  const displayRoles: (Role | (typeof PREDEFINED_ROLES)[0] & { id: string })[] =
    roles.length > 0
      ? roles
      : PREDEFINED_ROLES.map((r, i) => ({ ...r, id: `predefined-${i}`, workspace_id: null, created_at: '' }));

  // ─── Render ────────────────────────────────────────────────────
  if (rolesLoading) {
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
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Roles & Permissions</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Define what each team role can access</p>
        </div>
        <div className="flex items-center gap-2">
          <PopButton
            color="blue"
            onClick={() => {
              resetForm();
              setExpandedGroups(new Set(Object.keys(PERMISSION_GROUPS) as PermissionGroup[]));
              setShowCreateModal(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Custom Role
          </PopButton>
        </div>
      </div>

      {/* ─── Card View ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayRoles.map((role, i) => {
            const colorCls = ROLE_COLOR_MAP[role.color] || ROLE_COLOR_MAP.blue;
            const icon = ICON_MAP[role.icon] || <Shield className="w-4 h-4" />;
            const perms = 'slug' in role ? getPermissionsForRole(role as Role) : DEFAULT_ROLE_PERMISSIONS[(role as any).slug as PredefinedRole] || [];

            return (
              <motion.div
                key={role.id || i}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-white dark:bg-[#111114] border border-gray-200 dark:border-[#1e1e24] rounded-lg p-5 hover:shadow-md dark:hover:shadow-black/30 transition-shadow duration-200 ease-out"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${colorCls}`}>
                      {icon}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{role.name}</h3>
                      {role.is_system && (
                        <span className="inline-flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                          <Lock className="w-3 h-3" /> System
                        </span>
                      )}
                    </div>
                  </div>
                  {!role.is_system && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(role as Role)}
                        className="p-1.5 hover:bg-gray-100 dark:hover:bg-[#17171b] rounded transition-colors duration-200 ease-out"
                      >
                        <Edit className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedRole(role as Role);
                          setShowDeleteModal(true);
                        }}
                        className="p-1.5 hover:bg-red-50 dark:hover:bg-red-500/10 rounded transition-colors duration-200 ease-out"
                      >
                        <Trash2 className="w-4 h-4 text-red-400 dark:text-red-500" />
                      </button>
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{role.description}</p>
                <div className="text-xs text-gray-400 dark:text-gray-500">
                  {perms.length} of {ALL_PERMISSIONS.length} permissions
                </div>
                <div className="mt-2 w-full bg-gray-100 dark:bg-[#17171b] rounded-full h-1.5">
                  <div
                    className="bg-blue-500 h-1.5 rounded-full transition-all duration-200 ease-out"
                    style={{ width: `${(perms.length / ALL_PERMISSIONS.length) * 100}%` }}
                  />
                </div>
              </motion.div>
            );
          })}
        </div>

      {/* ═══════════════════════════════════════════════════════════
          CREATE / EDIT MODAL
         ═══════════════════════════════════════════════════════════ */}
      {(showCreateModal || showEditModal) && (
        <ModalShell
          open={showCreateModal || showEditModal}
          onClose={() => { setShowCreateModal(false); setShowEditModal(false); resetForm(); }}
          title={showCreateModal ? 'Create Custom Role' : `Edit Role: ${selectedRole?.name}`}
          maxWidth="max-w-2xl"
          footer={
            <>
              <PopButton type="button" onClick={() => { setShowCreateModal(false); setShowEditModal(false); resetForm(); }}>
                Cancel
              </PopButton>
              <PopButton
                color="blue"
                onClick={showCreateModal ? handleCreate : handleUpdate}
                disabled={saving || !formName.trim()}
              >
                {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : showCreateModal ? 'Create Role' : 'Save Changes'}
              </PopButton>
            </>
          }
        >
          <div className="space-y-5 max-h-[60vh] overflow-y-auto pr-1">
            {/* Basic Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role Name *</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => {
                    setFormName(e.target.value);
                    if (showCreateModal) setFormSlug(e.target.value.toLowerCase().replace(/\s+/g, '_'));
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-[#2a2a30] dark:bg-[#17171b] dark:text-white dark:placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  placeholder="e.g. Support Lead"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Color</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {ROLE_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setFormColor(c)}
                      className={`w-7 h-7 rounded-full border-2 transition-all duration-200 ease-out ${
                        formColor === c ? 'border-gray-900 dark:border-white scale-110' : 'border-transparent'
                      } ${ROLE_COLOR_MAP[c]?.split(' ')[1] || 'bg-gray-100 dark:bg-[#17171b]'}`}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
              <input
                type="text"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-[#2a2a30] dark:bg-[#17171b] dark:text-white dark:placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder="What can this role do?"
              />
            </div>

            {/* Permissions */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Permissions</h3>
                <span className="text-xs text-gray-400 dark:text-gray-500">{formPermissions.size} / {ALL_PERMISSIONS.length} selected</span>
              </div>
              <div className="space-y-1 border border-gray-200 dark:border-[#1e1e24] rounded-lg overflow-hidden">
                {(Object.keys(PERMISSION_GROUPS) as PermissionGroup[]).map((group) => {
                  const groupPerms = groupedPermissions[group];
                  const isExpanded = expandedGroups.has(group);
                  const selectedCount = groupPerms.filter((p) => formPermissions.has(p.id)).length;
                  const allSelected = selectedCount === groupPerms.length;

                  return (
                    <div key={group}>
                      <button
                        onClick={() => toggleGroup(group)}
                        className="flex items-center justify-between w-full px-4 py-2.5 bg-gray-50 dark:bg-[#17171b] hover:bg-gray-100 dark:hover:bg-[#1e1e24] transition-colors duration-200 ease-out"
                      >
                        <div className="flex items-center gap-2">
                          {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400 dark:text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500" />}
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{PERMISSION_GROUPS[group]}</span>
                          <span className="text-xs text-gray-400 dark:text-gray-500">({selectedCount}/{groupPerms.length})</span>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleGroupAll(group); }}
                          className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium transition-colors duration-200 ease-out"
                        >
                          {allSelected ? 'Deselect all' : 'Select all'}
                        </button>
                      </button>
                      {isExpanded && (
                        <div className="px-4 py-2 space-y-1 bg-white dark:bg-[#111114]">
                          {groupPerms.map((perm) => (
                            <label
                              key={perm.id}
                              className="flex items-center gap-3 py-1.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-[#17171b] rounded px-2 -mx-2 transition-colors duration-200 ease-out"
                            >
                              <input
                                type="checkbox"
                                checked={formPermissions.has(perm.id)}
                                onChange={() => togglePermission(perm.id)}
                                className="w-4 h-4 text-blue-600 border-gray-300 dark:border-[#2a2a30] dark:bg-[#17171b] rounded focus:ring-blue-500"
                              />
                              <div>
                                <span className="text-sm text-gray-700 dark:text-gray-300">{perm.label}</span>
                                <p className="text-xs text-gray-400 dark:text-gray-500">{perm.description}</p>
                              </div>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </ModalShell>
      )}

      {/* ─── Delete Role Modal ────────────────────────────────────── */}
      <ModalShell
        open={showDeleteModal}
        onClose={() => { setShowDeleteModal(false); setSelectedRole(null); }}
        title="Delete Role"
        footer={
          <>
            <PopButton type="button" onClick={() => setShowDeleteModal(false)}>Cancel</PopButton>
            <PopButton color="red" onClick={handleDelete}>Delete</PopButton>
          </>
        }
      >
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Are you sure you want to delete the role{' '}
          <span className="font-medium text-gray-900 dark:text-white">{selectedRole?.name}</span>?
          Members with this role will lose their permissions.
        </p>
      </ModalShell>
    </div>
  );
};

export default RolesPage;
