import { describe, it, expect, beforeEach, vi } from 'vitest';

// Build a flexible mock for Supabase chaining
function createChainMock(resolvedData: any = { data: null, error: null }) {
  const chain: any = {};
  const methods = ['from', 'select', 'insert', 'update', 'delete', 'eq', 'neq', 'or', 'in', 'gte', 'lte', 'ilike', 'order', 'range', 'limit', 'single', 'maybeSingle', 'not'];
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  // Terminal methods
  chain.single = vi.fn().mockResolvedValue(resolvedData);
  chain.maybeSingle = vi.fn().mockResolvedValue(resolvedData);
  chain.then = vi.fn().mockImplementation((cb: any) => Promise.resolve(resolvedData).then(cb));
  // Make chain itself thenable for await
  chain[Symbol.for('nodejs.util.inspect.custom')] = undefined;
  // Override terminal to return promise
  Object.defineProperty(chain, 'then', {
    value: (onResolve: any) => Promise.resolve(resolvedData).then(onResolve),
    writable: true,
  });
  return chain;
}

const mockMembers = [
  { id: 'm1', email: 'alice@test.com', name: 'Alice', role: 'admin', status: 'active', invited_by: 'user-1', invited_at: '2025-01-01' },
  { id: 'm2', email: 'bob@test.com', name: 'Bob', role: 'agent', status: 'invited', invited_by: 'user-1', invited_at: '2025-01-02' },
];

let mockSupabaseChain: any;

vi.mock('../../lib/supabase', () => {
  const chain = createChainMock({ data: [], error: null });
  // Store reference for test manipulation
  (globalThis as any).__mockSupabaseChain = chain;
  return {
    supabase: {
      from: vi.fn().mockReturnValue(chain),
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: {
            session: {
              access_token: 'fake-jwt',
              user: { id: 'user-1', email: 'owner@test.com' },
            },
          },
        }),
      },
    },
  };
});

// inviteMember + removeMember now POST to /invite-member; stub fetch so the
// store doesn't try to hit a real Netlify function during tests.
beforeEach(() => {
  (global as any).fetch = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
  });
});

import { useTeamStore } from '../teamStore';
import { supabase } from '../../lib/supabase';

describe('teamStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useTeamStore.setState({
      members: [],
      membersLoading: false,
    });
    mockSupabaseChain = (globalThis as any).__mockSupabaseChain;
  });

  describe('fetchMembers', () => {
    it('should set membersLoading to true then false', async () => {
      // Setup the chain to resolve with data
      const resolveData = { data: mockMembers, error: null };
      mockSupabaseChain.order = vi.fn().mockResolvedValue(resolveData);

      await useTeamStore.getState().fetchMembers('user-1');
      expect(useTeamStore.getState().membersLoading).toBe(false);
    });

    it('should call supabase.from with workspace_members', async () => {
      mockSupabaseChain.order = vi.fn().mockResolvedValue({ data: [], error: null });
      await useTeamStore.getState().fetchMembers('user-1');
      expect(supabase.from).toHaveBeenCalledWith('workspace_members');
    });

    it('should set members on success', async () => {
      mockSupabaseChain.order = vi.fn().mockResolvedValue({ data: mockMembers, error: null });
      await useTeamStore.getState().fetchMembers('user-1');
      expect(useTeamStore.getState().members).toEqual(mockMembers);
    });

    it('should handle errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockSupabaseChain.order = vi.fn().mockResolvedValue({ data: null, error: new Error('DB error') });
      // The store catches errors internally
      await useTeamStore.getState().fetchMembers('user-1');
      expect(useTeamStore.getState().membersLoading).toBe(false);
      consoleSpy.mockRestore();
    });
  });

  describe('inviteMember', () => {
    it('should call supabase insert with correct data', async () => {
      mockSupabaseChain.order = vi.fn().mockResolvedValue({ data: [], error: null });
      // Make insert resolve with no error
      mockSupabaseChain.insert = vi.fn().mockResolvedValue({ data: null, error: null });

      await useTeamStore.getState().inviteMember('new@test.com', 'agent', 'New Person');
      expect(supabase.from).toHaveBeenCalledWith('workspace_members');
    });

    it('should throw when session is missing', async () => {
      const { supabase: mockSupa } = await import('../../lib/supabase');
      (mockSupa.auth.getSession as any).mockResolvedValueOnce({
        data: { session: null },
      });

      await expect(
        useTeamStore.getState().inviteMember('new@test.com', 'agent')
      ).rejects.toThrow('Not authenticated');
    });
  });

  describe('updateMemberRole', () => {
    it('should update the member role in state', async () => {
      useTeamStore.setState({ members: mockMembers as any });
      mockSupabaseChain.eq = vi.fn().mockResolvedValue({ error: null });

      await useTeamStore.getState().updateMemberRole('m1', 'viewer');
      const member = useTeamStore.getState().members.find((m) => m.id === 'm1');
      expect(member?.role).toBe('viewer');
    });

    it('should throw on error', async () => {
      mockSupabaseChain.eq = vi.fn().mockResolvedValue({ error: { message: 'update failed' } });
      await expect(
        useTeamStore.getState().updateMemberRole('m1', 'viewer')
      ).rejects.toBeDefined();
    });
  });

  describe('updateMemberStatus', () => {
    it('should update member status in state', async () => {
      useTeamStore.setState({ members: mockMembers as any });
      mockSupabaseChain.eq = vi.fn().mockResolvedValue({ error: null });

      await useTeamStore.getState().updateMemberStatus('m2', 'active');
      const member = useTeamStore.getState().members.find((m) => m.id === 'm2');
      expect((member as any)?.status).toBe('active');
    });

    it('should handle suspended status with reason and timestamp', async () => {
      useTeamStore.setState({ members: mockMembers as any });
      mockSupabaseChain.eq = vi.fn().mockResolvedValue({ error: null });

      await useTeamStore.getState().updateMemberStatus('m1', 'suspended', 'Policy violation');
      const member = useTeamStore.getState().members.find((m) => m.id === 'm1');
      expect((member as any)?.status).toBe('suspended');
      expect((member as any)?.suspended_reason).toBe('Policy violation');
      expect((member as any)?.suspended_at).toBeDefined();
    });
  });

  describe('removeMember', () => {
    it('should remove member from state', async () => {
      useTeamStore.setState({ members: mockMembers as any });
      mockSupabaseChain.eq = vi.fn().mockResolvedValue({ error: null });

      await useTeamStore.getState().removeMember('m1');
      const members = useTeamStore.getState().members;
      expect(members).toHaveLength(1);
      expect(members.find((m) => m.id === 'm1')).toBeUndefined();
    });

    it('should throw on supabase error', async () => {
      mockSupabaseChain.eq = vi.fn().mockResolvedValue({ error: { message: 'delete failed' } });
      await expect(useTeamStore.getState().removeMember('m1')).rejects.toBeDefined();
    });
  });
});
