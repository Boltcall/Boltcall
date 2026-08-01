/**
 * team-manage-roles — cross-tenant IDOR guard.
 *
 * Before the fix, PUT and DELETE trusted the caller-supplied `roleId` with no
 * workspace scope, letting any authed user edit/delete another workspace's
 * custom roles and rewrite its `role_permissions` set.
 *
 * Fix: pre-fetch the role, verify `role.workspace_id === user.id`, else 404.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_KEY = 'test-service-key';

type Row = Record<string, unknown>;

const state = {
  // caller
  callerUserId: 'user_A',
  // roles keyed by id
  roles: new Map<string, Row>(),
  // captured writes
  rolesUpdates: [] as Array<{ patch: Row; filters: Array<{ col: string; val: unknown }> }>,
  rolesDeletes: [] as Array<{ filters: Array<{ col: string; val: unknown }> }>,
  permissionsDeletes: [] as Array<{ filters: Array<{ col: string; val: unknown }> }>,
  permissionsInserts: [] as Array<Row[]>,
  activityInserts: [] as Row[],
};

function makeRolesChain() {
  const filters: Array<{ col: string; val: unknown }> = [];
  let mode: 'select' | 'update' | 'delete' | null = null;
  let updatePatch: Row | null = null;

  const matches = () => {
    const rows = Array.from(state.roles.values());
    return rows.filter((r) => filters.every((f) => r[f.col] === f.val));
  };

  const chain: any = {
    select: (_cols?: string) => {
      mode = 'select';
      return chain;
    },
    update: (patch: Row) => {
      mode = 'update';
      updatePatch = patch;
      return chain;
    },
    delete: () => {
      mode = 'delete';
      return chain;
    },
    insert: async (_payload: Row) => ({ data: null, error: null }),
    eq: (col: string, val: unknown) => {
      filters.push({ col, val });
      return chain;
    },
    single: async () => {
      const rows = matches();
      return {
        data: rows[0] || null,
        error: rows[0] ? null : { code: 'PGRST116' },
      };
    },
    maybeSingle: async () => ({ data: matches()[0] || null, error: null }),
    then: (cb: (r: { data: null; error: null }) => unknown) => {
      if (mode === 'update' && updatePatch) {
        state.rolesUpdates.push({ patch: { ...updatePatch }, filters: [...filters] });
        for (const r of matches()) Object.assign(r, updatePatch);
      }
      if (mode === 'delete') {
        state.rolesDeletes.push({ filters: [...filters] });
        for (const r of matches()) state.roles.delete(String(r.id));
      }
      return Promise.resolve(cb({ data: null, error: null }));
    },
  };
  return chain;
}

function makeRolePermissionsChain() {
  const filters: Array<{ col: string; val: unknown }> = [];
  let mode: 'delete' | 'insert' | null = null;

  const chain: any = {
    delete: () => {
      mode = 'delete';
      return chain;
    },
    insert: async (rows: Row[]) => {
      state.permissionsInserts.push(rows);
      return { data: null, error: null };
    },
    eq: (col: string, val: unknown) => {
      filters.push({ col, val });
      return chain;
    },
    then: (cb: (r: { data: null; error: null }) => unknown) => {
      if (mode === 'delete') state.permissionsDeletes.push({ filters: [...filters] });
      return Promise.resolve(cb({ data: null, error: null }));
    },
  };
  return chain;
}

function makeActivityChain() {
  return {
    insert: async (row: Row) => {
      state.activityInserts.push(row);
      return { data: null, error: null };
    },
  };
}

function makeSupabaseMock() {
  return {
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: { id: state.callerUserId, email: 'a@example.com' } },
        error: null,
      })),
    },
    from: vi.fn((table: string) => {
      if (table === 'roles') return makeRolesChain();
      if (table === 'role_permissions') return makeRolePermissionsChain();
      if (table === 'activity_logs') return makeActivityChain();
      return {
        insert: async () => ({ data: null, error: null }),
      };
    }),
  };
}

const supabaseMock = { current: makeSupabaseMock() };

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => supabaseMock.current,
}));

function makeEvent(method: string, body: Row) {
  return {
    httpMethod: method,
    headers: {
      authorization: 'Bearer fake-jwt',
      origin: 'https://boltcall.org',
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  } as unknown;
}

function reset() {
  state.callerUserId = 'user_A';
  state.roles = new Map();
  state.rolesUpdates.length = 0;
  state.rolesDeletes.length = 0;
  state.permissionsDeletes.length = 0;
  state.permissionsInserts.length = 0;
  state.activityInserts.length = 0;
  supabaseMock.current = makeSupabaseMock();
}

describe('team-manage-roles: cross-tenant IDOR guard', () => {
  let handler: any;

  beforeEach(async () => {
    reset();
    const mod = await import('../team-manage-roles');
    handler = mod.testHandler ?? mod.default;
  });

  it('PUT returns 404 when the target role belongs to another workspace', async () => {
    // Victim workspace owns role_X.
    state.roles.set('role_X', {
      id: 'role_X',
      workspace_id: 'victim_workspace',
      is_system: false,
    });

    const res = await handler(
      makeEvent('PUT', { roleId: 'role_X', updates: { name: 'pwned' } }),
      {} as any,
    );

    expect(res.statusCode).toBe(404);
    // Row was not touched.
    expect(state.rolesUpdates.length).toBe(0);
    // Nor did role_permissions get rewritten.
    expect(state.permissionsDeletes.length).toBe(0);
    expect(state.permissionsInserts.length).toBe(0);
  });

  it('DELETE returns 404 when the target role belongs to another workspace', async () => {
    state.roles.set('role_Y', {
      id: 'role_Y',
      workspace_id: 'victim_workspace',
      is_system: false,
    });

    const res = await handler(makeEvent('DELETE', { roleId: 'role_Y' }), {} as any);

    expect(res.statusCode).toBe(404);
    expect(state.roles.has('role_Y')).toBe(true);
    expect(state.permissionsDeletes.length).toBe(0);
    expect(state.rolesDeletes.length).toBe(0);
  });

  it('PUT succeeds when the caller owns the workspace', async () => {
    state.roles.set('role_M', {
      id: 'role_M',
      workspace_id: state.callerUserId, // caller-owned
      is_system: false,
      name: 'Old',
    });

    const res = await handler(
      makeEvent('PUT', {
        roleId: 'role_M',
        updates: { name: 'New' },
        permissionIds: ['perm_1'],
      }),
      {} as any,
    );

    expect(res.statusCode).toBe(200);
    // Update landed and was tenant-scoped.
    expect(state.rolesUpdates.length).toBe(1);
    expect(
      state.rolesUpdates[0].filters.some(
        (f) => f.col === 'workspace_id' && f.val === state.callerUserId,
      ),
    ).toBe(true);
    // Permissions rewritten.
    expect(state.permissionsDeletes.length).toBe(1);
    expect(state.permissionsInserts.length).toBe(1);
  });

  it('DELETE succeeds when the caller owns the workspace', async () => {
    state.roles.set('role_D', {
      id: 'role_D',
      workspace_id: state.callerUserId,
      is_system: false,
    });

    const res = await handler(makeEvent('DELETE', { roleId: 'role_D' }), {} as any);

    expect(res.statusCode).toBe(200);
    // Role gone.
    expect(state.roles.has('role_D')).toBe(false);
    // role_permissions cleaned up.
    expect(state.permissionsDeletes.length).toBe(1);
  });

  it('PUT rejects system roles even when caller owns the workspace', async () => {
    state.roles.set('role_S', {
      id: 'role_S',
      workspace_id: state.callerUserId,
      is_system: true,
    });

    const res = await handler(
      makeEvent('PUT', { roleId: 'role_S', updates: { name: 'boom' } }),
      {} as any,
    );

    expect(res.statusCode).toBe(403);
    expect(state.rolesUpdates.length).toBe(0);
  });
});
