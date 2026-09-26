import { beforeEach, describe, expect, it, vi } from 'vitest';

const requireUserMock = vi.hoisted(() => vi.fn());
const getServiceSupabaseMock = vi.hoisted(() => vi.fn());
const paypalFetchMock = vi.hoisted(() => vi.fn());

vi.mock('../_shared/user-auth', () => ({
  requireUser: requireUserMock,
}));

vi.mock('../_shared/token-utils', () => ({
  getServiceSupabase: getServiceSupabaseMock,
}));

vi.mock('../_shared/paypal-client', () => ({
  paypalFetch: paypalFetchMock,
}));

interface CallLog {
  table: string;
  calls: Array<{ method: string; args: unknown[] }>;
}

function makeSupabase(responses: Record<string, { data?: unknown; error?: unknown }>) {
  const log: CallLog[] = [];
  const from = vi.fn((table: string) => {
    const record: CallLog = { table, calls: [] };
    log.push(record);
    const chain: any = {};
    for (const method of ['select', 'eq', 'in', 'delete']) {
      chain[method] = vi.fn((...args: unknown[]) => {
        record.calls.push({ method, args });
        return chain;
      });
    }
    chain.then = (resolve: any, reject: any) =>
      Promise.resolve(responses[table] ?? { data: [], error: null }).then(resolve, reject);
    return chain;
  });
  const storage = {
    from: vi.fn(() => ({
      list: vi.fn(async () => ({ data: [] })),
      remove: vi.fn(async () => ({})),
    })),
  };
  return { sb: { from, storage }, log };
}

function makeEvent() {
  return {
    httpMethod: 'POST',
    headers: { authorization: 'Bearer valid-token' },
    body: JSON.stringify({ confirm: 'DELETE' }),
  } as any;
}

describe('delete-workspace F93 — retell_calls and leads erasure', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    requireUserMock.mockResolvedValue({ ok: true, userId: 'user-1' });
  });

  it('deletes retell_calls and leads scoped to the caller\'s own workspace_id, not just user_id', async () => {
    const { sb, log } = makeSupabase({
      subscriptions: { data: [], error: null },
      workspaces: { data: [{ id: 'ws-1' }], error: null },
    });
    getServiceSupabaseMock.mockReturnValue(sb);

    const { testHandler: handler } = await import('../delete-workspace');
    const res = await handler(makeEvent(), {} as any);

    expect(res.statusCode).toBe(200);

    const retellCallsCall = log.find((l) => l.table === 'retell_calls');
    expect(retellCallsCall).toBeDefined();
    expect(retellCallsCall!.calls).toContainEqual({ method: 'delete', args: [] });
    expect(retellCallsCall!.calls).toContainEqual({ method: 'in', args: ['workspace_id', ['ws-1']] });

    const leadsCalls = log.filter((l) => l.table === 'leads');
    expect(leadsCalls.length).toBeGreaterThanOrEqual(2); // one keyed by workspace_id, one by user_id
    const leadsByWorkspace = leadsCalls.find((l) => l.calls.some((c) => c.method === 'in'));
    expect(leadsByWorkspace).toBeDefined();
    expect(leadsByWorkspace!.calls).toContainEqual({ method: 'in', args: ['workspace_id', ['ws-1']] });
    const leadsByUser = leadsCalls.find((l) => l.calls.some((c) => c.method === 'eq' && c.args[0] === 'user_id'));
    expect(leadsByUser).toBeDefined();
  });

  it('skips the workspace_id-scoped deletes when the caller owns no workspace rows', async () => {
    const { sb, log } = makeSupabase({
      subscriptions: { data: [], error: null },
      workspaces: { data: [], error: null },
    });
    getServiceSupabaseMock.mockReturnValue(sb);

    const { testHandler: handler } = await import('../delete-workspace');
    const res = await handler(makeEvent(), {} as any);

    expect(res.statusCode).toBe(200);
    const retellCallsCall = log.find((l) => l.table === 'retell_calls');
    expect(retellCallsCall).toBeUndefined();
    // leads by user_id still runs even with zero owned workspaces.
    const leadsByUser = log.find((l) => l.table === 'leads');
    expect(leadsByUser).toBeDefined();
  });
});
