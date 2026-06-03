import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { FUNCTIONS_BASE } from '../lib/api';
import type {
  TeamMember,
  Role,
  ActivityLog,
  ActivityLogFilter,
  ApiKey,
  WorkspaceSettings,
  MemberStatus,
  ApiKeyResourcePermission,
} from '../types/team';

/**
 * Resolve the current Supabase access token; throw if no session is active.
 * Used by every Netlify-function call so the server can verify the caller.
 */
async function authedHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Not authenticated');
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session.access_token}`,
  };
}

interface TeamState {
  // ─── Members ───
  members: TeamMember[];
  membersLoading: boolean;
  fetchMembers: (userId: string) => Promise<void>;
  inviteMember: (email: string, role: string, name?: string, message?: string) => Promise<void>;
  inviteBulk: (emails: string[], role: string) => Promise<{ success: string[]; failed: string[] }>;
  updateMemberRole: (memberId: string, role: string) => Promise<void>;
  updateMemberStatus: (memberId: string, status: MemberStatus, reason?: string) => Promise<void>;
  removeMember: (memberId: string) => Promise<void>;
  resendInvite: (memberId: string) => Promise<void>;

  // ─── Roles ───
  roles: Role[];
  rolesLoading: boolean;
  fetchRoles: (userId: string) => Promise<void>;
  createRole: (name: string, slug: string, description: string, color: string, permissionIds: string[]) => Promise<void>;
  updateRole: (roleId: string, updates: Partial<Role>, permissionIds?: string[]) => Promise<void>;
  deleteRole: (roleId: string) => Promise<void>;
  rolePermissions: Record<string, string[]>; // roleId -> permissionId[]
  fetchRolePermissions: (userId: string) => Promise<void>;

  // ─── Activity Log ───
  activityLogs: ActivityLog[];
  activityLogsLoading: boolean;
  activityLogsTotalCount: number;
  fetchActivityLogs: (userId: string, filter?: ActivityLogFilter, page?: number, limit?: number) => Promise<void>;
  logActivity: (action: string, details: string, metadata?: Record<string, unknown>) => Promise<void>;

  // ─── API Keys ───
  apiKeys: ApiKey[];
  apiKeysLoading: boolean;
  fetchApiKeys: (userId: string) => Promise<void>;
  createApiKey: (name: string, permissions: ApiKeyResourcePermission[], expiresAt?: string) => Promise<string | null>;
  revokeApiKey: (keyId: string) => Promise<void>;

  // ─── Workspace Settings ───
  workspace: WorkspaceSettings | null;
  workspaceLoading: boolean;
  fetchWorkspace: (userId: string) => Promise<void>;
  updateWorkspace: (updates: Partial<WorkspaceSettings>) => Promise<void>;
  transferOwnership: (newOwnerId: string) => Promise<void>;
  deleteWorkspace: () => Promise<void>;
}

export const useTeamStore = create<TeamState>((set, get) => ({
  // ─── Members State ─────────────────────────────────────────────────────
  members: [],
  membersLoading: true,

  fetchMembers: async (userId: string) => {
    set({ membersLoading: true });
    try {
      const { data, error } = await supabase
        .from('workspace_members')
        .select('*')
        .eq('invited_by', userId)
        .neq('status', 'removed')
        .order('invited_at', { ascending: true });

      if (error) throw error;
      set({ members: (data || []) as TeamMember[] });
    } catch (err) {
      console.error('[teamStore] fetchMembers failed:', err);
    } finally {
      set({ membersLoading: false });
    }
  },

  inviteMember: async (email: string, role: string, name?: string, _message?: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const trimmedEmail = email.toLowerCase().trim();

    // Owner self-seed: when the workspace owner adds themselves on first load,
    // skip the invite-email round-trip and write directly with status='active'.
    if (trimmedEmail === session.user.email?.toLowerCase()) {
      const { error } = await supabase.from('workspace_members').insert({
        workspace_id: session.user.id,
        user_id: session.user.id,
        invited_by: session.user.id,
        email: trimmedEmail,
        name: name?.trim() || null,
        role,
        status: 'active' as MemberStatus,
        invited_at: new Date().toISOString(),
        accepted_at: new Date().toISOString(),
      });
      if (error) throw error;
      await get().fetchMembers(session.user.id);
      return;
    }

    // Real invite: go through the Netlify function so a Brevo email is sent
    // and authorization is verified server-side.
    const headers = await authedHeaders();
    const res = await fetch(`${FUNCTIONS_BASE}/invite-member`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        action: 'invite',
        email: trimmedEmail,
        role,
        workspaceId: session.user.id,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Invite failed (${res.status})`);
    }
    await get().fetchMembers(session.user.id);
  },

  inviteBulk: async (emails: string[], role: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const headers = await authedHeaders();
    const existingEmails = get().members.map((m) => m.email.toLowerCase());
    const success: string[] = [];
    const failed: string[] = [];

    for (const rawEmail of emails) {
      const email = rawEmail.toLowerCase().trim();
      if (!email || !email.includes('@')) { failed.push(rawEmail); continue; }
      if (existingEmails.includes(email)) { failed.push(email); continue; }

      try {
        const res = await fetch(`${FUNCTIONS_BASE}/invite-member`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            action: 'invite',
            email,
            role,
            workspaceId: session.user.id,
          }),
        });
        if (!res.ok) { failed.push(email); } else { success.push(email); }
      } catch {
        failed.push(email);
      }
    }

    await get().fetchMembers(session.user.id);
    return { success, failed };
  },

  updateMemberRole: async (memberId: string, role: string) => {
    const { error } = await supabase
      .from('workspace_members')
      .update({ role })
      .eq('id', memberId);
    if (error) throw error;

    set((s) => ({
      members: s.members.map((m) => (m.id === memberId ? { ...m, role } : m)),
    }));
  },

  updateMemberStatus: async (memberId: string, status: MemberStatus, reason?: string) => {
    const updates: Record<string, unknown> = { status };
    if (status === 'suspended') {
      updates.suspended_at = new Date().toISOString();
      updates.suspended_reason = reason || null;
    }

    const { error } = await supabase
      .from('workspace_members')
      .update(updates)
      .eq('id', memberId);
    if (error) throw error;

    set((s) => ({
      members: s.members.map((m) => (m.id === memberId ? { ...m, ...updates } as TeamMember : m)),
    }));
  },

  removeMember: async (memberId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    // Soft-delete via the Netlify function so the role-check + activity log
    // run server-side and stay consistent with how invite/accept work.
    const headers = await authedHeaders();
    const res = await fetch(`${FUNCTIONS_BASE}/invite-member`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        action: 'remove',
        memberId,
        workspaceId: session.user.id,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Remove failed (${res.status})`);
    }
    set((s) => ({
      members: s.members.filter((m) => m.id !== memberId),
    }));
  },

  resendInvite: async (memberId: string) => {
    // Look up the row, then re-trigger the invite (which generates a new
    // token and sends a fresh Brevo email). Touching `invited_at` alone never
    // sent an email — that was the silent-failure mode this fix addresses.
    const member = get().members.find((m) => m.id === memberId);
    if (!member) throw new Error('Member not found');
    await get().inviteMember(member.email, member.role, member.name || undefined);
  },

  // ─── Roles State ───────────────────────────────────────────────────────
  roles: [],
  rolesLoading: true,
  rolePermissions: {},

  fetchRoles: async (userId: string) => {
    set({ rolesLoading: true });
    try {
      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .or(`is_system.eq.true,workspace_id.eq.${userId}`)
        .order('is_system', { ascending: false });

      if (error) throw error;
      set({ roles: (data || []) as Role[] });
    } catch (err) {
      console.error('[teamStore] fetchRoles failed:', err);
    } finally {
      set({ rolesLoading: false });
    }
  },

  fetchRolePermissions: async (_userId: string) => {
    try {
      const { data, error } = await supabase
        .from('role_permissions')
        .select('role_id, permission_id');

      if (error) throw error;

      const map: Record<string, string[]> = {};
      (data || []).forEach((rp: { role_id: string; permission_id: string }) => {
        if (!map[rp.role_id]) map[rp.role_id] = [];
        map[rp.role_id].push(rp.permission_id);
      });
      set({ rolePermissions: map });
    } catch (err) {
      console.error('[teamStore] fetchRolePermissions failed:', err);
    }
  },

  createRole: async (name: string, slug: string, description: string, color: string, permissionIds: string[]) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const { data: role, error } = await supabase
      .from('roles')
      .insert({
        workspace_id: session.user.id,
        name,
        slug,
        description,
        color,
        icon: 'Shield',
        is_system: false,
      })
      .select()
      .single();

    if (error) throw error;

    // Insert permission associations
    if (role && permissionIds.length > 0) {
      const rows = permissionIds.map((pid) => ({ role_id: role.id, permission_id: pid }));
      await supabase.from('role_permissions').insert(rows);
    }

    await get().fetchRoles(session.user.id);
    await get().fetchRolePermissions(session.user.id);
  },

  updateRole: async (roleId: string, updates: Partial<Role>, permissionIds?: string[]) => {
    const { error } = await supabase
      .from('roles')
      .update(updates)
      .eq('id', roleId);
    if (error) throw error;

    if (permissionIds !== undefined) {
      await supabase.from('role_permissions').delete().eq('role_id', roleId);
      if (permissionIds.length > 0) {
        const rows = permissionIds.map((pid) => ({ role_id: roleId, permission_id: pid }));
        await supabase.from('role_permissions').insert(rows);
      }
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await get().fetchRoles(session.user.id);
      await get().fetchRolePermissions(session.user.id);
    }
  },

  deleteRole: async (roleId: string) => {
    await supabase.from('role_permissions').delete().eq('role_id', roleId);
    const { error } = await supabase.from('roles').delete().eq('id', roleId);
    if (error) throw error;

    set((s) => ({ roles: s.roles.filter((r) => r.id !== roleId) }));
  },

  // ─── Activity Log State ────────────────────────────────────────────────
  activityLogs: [],
  activityLogsLoading: true,
  activityLogsTotalCount: 0,

  fetchActivityLogs: async (userId: string, filter?: ActivityLogFilter, page = 0, limit = 50) => {
    set({ activityLogsLoading: true });
    try {
      let query = supabase
        .from('activity_logs')
        .select('*', { count: 'exact' })
        .eq('workspace_id', userId)
        .order('created_at', { ascending: false })
        .range(page * limit, (page + 1) * limit - 1);

      if (filter?.userId) query = query.eq('user_id', filter.userId);
      if (filter?.action) query = query.eq('action', filter.action);
      if (filter?.dateFrom) query = query.gte('created_at', filter.dateFrom);
      if (filter?.dateTo) query = query.lte('created_at', filter.dateTo);
      if (filter?.search) query = query.ilike('details', `%${filter.search}%`);

      const { data, error, count } = await query;
      if (error) throw error;

      set({
        activityLogs: (data || []) as ActivityLog[],
        activityLogsTotalCount: count || 0,
      });
    } catch (err) {
      console.error('[teamStore] fetchActivityLogs failed:', err);
    } finally {
      set({ activityLogsLoading: false });
    }
  },

  logActivity: async (action: string, details: string, metadata?: Record<string, unknown>) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    await supabase.from('activity_logs').insert({
      workspace_id: session.user.id,
      user_id: session.user.id,
      user_email: session.user.email,
      user_name: session.user.user_metadata?.name || null,
      action,
      details,
      metadata: metadata || null,
    });
  },

  // ─── API Keys State ────────────────────────────────────────────────────
  apiKeys: [],
  apiKeysLoading: true,

  fetchApiKeys: async (userId: string) => {
    set({ apiKeysLoading: true });
    try {
      const { data, error } = await supabase
        .from('api_keys')
        .select('*')
        .eq('workspace_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      set({ apiKeys: (data || []) as ApiKey[] });
    } catch (err) {
      console.error('[teamStore] fetchApiKeys failed:', err);
    } finally {
      set({ apiKeysLoading: false });
    }
  },

  createApiKey: async (name: string, permissions: ApiKeyResourcePermission[], expiresAt?: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    // Route through team-api-keys function so the raw key is hashed server-side
    // before persistence. Storing the raw key in the DB defeats the purpose of
    // the hash check in validate-api-key.ts and is a credential-disclosure risk.
    const res = await fetch(`${FUNCTIONS_BASE}/team-api-keys`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ name, permissions, expiresAt }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to create key' }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }

    const { key: rawKey } = await res.json();
    await get().fetchApiKeys(session.user.id);
    return rawKey; // Return full key only on creation — never persisted client-side
  },

  revokeApiKey: async (keyId: string) => {
    const { error } = await supabase
      .from('api_keys')
      .update({ status: 'revoked', revoked_at: new Date().toISOString() })
      .eq('id', keyId);
    if (error) throw error;

    set((s) => ({
      apiKeys: s.apiKeys.map((k) =>
        k.id === keyId ? { ...k, status: 'revoked' as const, revoked_at: new Date().toISOString() } : k
      ),
    }));
  },

  // ─── Workspace State ──────────────────────────────────────────────────
  workspace: null,
  workspaceLoading: true,

  fetchWorkspace: async (userId: string) => {
    set({ workspaceLoading: true });
    try {
      const { data, error } = await supabase
        .from('workspaces')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      set({ workspace: data as WorkspaceSettings | null });
    } catch (err) {
      console.error('[teamStore] fetchWorkspace failed:', err);
    } finally {
      set({ workspaceLoading: false });
    }
  },

  updateWorkspace: async (updates: Partial<WorkspaceSettings>) => {
    const ws = get().workspace;

    if (!ws) {
      // No workspace record yet — create one on first save
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { data: newWs, error } = await supabase
        .from('workspaces')
        .insert({
          owner_id: session.user.id,
          ...updates,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (error) throw error;
      set({ workspace: newWs as WorkspaceSettings });
      return;
    }

    const { error } = await supabase
      .from('workspaces')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', ws.id);
    if (error) throw error;

    set({ workspace: { ...ws, ...updates, updated_at: new Date().toISOString() } as WorkspaceSettings });
  },

  transferOwnership: async (newOwnerId: string) => {
    const ws = get().workspace;
    if (!ws) return;

    const { error } = await supabase
      .from('workspaces')
      .update({ owner_id: newOwnerId })
      .eq('id', ws.id);
    if (error) throw error;
  },

  deleteWorkspace: async () => {
    const ws = get().workspace;
    if (!ws) return;

    const { error } = await supabase
      .from('workspaces')
      .delete()
      .eq('id', ws.id);
    if (error) throw error;

    set({ workspace: null });
  },
}));
