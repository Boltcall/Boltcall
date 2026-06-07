import { beforeEach, describe, expect, it, vi } from 'vitest';

process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_KEY = 'test-service-key';
process.env.ANTHROPIC_API_KEY = '';

type TableName = 'workspaces' | 'chats' | 'leads';

const calls: Array<{ table: string; columns: string }> = [];

const rows: Record<TableName, Record<string, unknown>[]> = {
  workspaces: [
    {
      id: 'workspace-A',
      user_id: 'jwt-user-A',
      brand_voice: { tone: 'friendly', style: 'Short and helpful.' },
    },
  ],
  chats: [
    {
      id: 'thread-1',
      user_id: 'jwt-user-A',
      customer_name: 'Sam',
      primary_phone: '+15555550123',
      customer_email: 'sam@example.com',
      status: 'open',
      source: 'sms',
      chat_history: [{ sender: 'customer', content: 'Can you help?', timestamp: '2026-06-06T12:00:00Z' }],
      last_message_at: '2026-06-06T12:00:00Z',
      last_activity_at: '2026-06-06T12:00:00Z',
      message_count: 1,
      agent_id: 'agent-1',
      lead_id: 'lead-1',
      created_at: '2026-06-06T12:00:00Z',
    },
  ],
  leads: [{ id: 'lead-1', name: 'Sam', phone: '+15555550123', email: 'sam@example.com' }],
};

function makeChain(table: TableName) {
  let selectedColumns = '*';
  let result = [...rows[table]];

  const chain = {
    select(columns = '*') {
      selectedColumns = columns;
      calls.push({ table, columns });
      return chain;
    },
    eq(column: string, value: unknown) {
      result = result.filter((row) => row[column] === value);
      return chain;
    },
    neq(column: string, value: unknown) {
      result = result.filter((row) => row[column] !== value);
      return chain;
    },
    order() {
      return chain;
    },
    limit() {
      return chain;
    },
    maybeSingle: async () => {
      if (table === 'workspaces' && /\bowner_id\b/.test(selectedColumns)) {
        return {
          data: null,
          error: { message: 'column workspaces.owner_id does not exist' },
        };
      }
      return { data: result[0] ?? null, error: null };
    },
    single: async () => ({ data: result[0] ?? null, error: result[0] ? null : { message: 'not found' } }),
    then(resolve: (value: { data: Record<string, unknown>[]; error: null; count: number }) => unknown) {
      return Promise.resolve(resolve({ data: result, error: null, count: result.length }));
    },
  };

  return chain;
}

function makeSupabase() {
  return {
    auth: {
      getUser: vi.fn(async () => ({ data: { user: { id: 'jwt-user-A' } }, error: null })),
    },
    from(table: TableName) {
      return makeChain(table);
    },
  };
}

vi.mock('../_shared/token-utils', () => ({
  getServiceSupabase: () => makeSupabase(),
}));

vi.mock('../_shared/emit-agency-event', () => ({
  emitSaasV2Event: vi.fn(async () => undefined),
}));

vi.mock('../_shared/agency-agents/run-agent', () => ({
  callClaude: vi.fn(),
}));

function authHeaders() {
  return {
    authorization: 'Bearer test-token',
    origin: 'https://boltcall.org',
  };
}

describe('saas-v2 workspace schema compatibility', () => {
  beforeEach(() => {
    calls.length = 0;
    vi.resetModules();
  });

  it('opens a V2 message thread without selecting the removed workspaces.owner_id column', async () => {
    const { handler } = await import('../saas-v2-message-thread');

    const res = await handler(
      {
        httpMethod: 'GET',
        headers: authHeaders(),
        queryStringParameters: { thread_id: 'thread-1' },
      } as never,
      {} as never,
      vi.fn(),
    );

    expect(res?.statusCode).toBe(200);
    expect(calls).not.toContainEqual(expect.objectContaining({ table: 'workspaces', columns: expect.stringContaining('owner_id') }));
  });

  it('drafts a V2 message reply without selecting the removed workspaces.owner_id column', async () => {
    const { handler } = await import('../saas-v2-message-draft-reply');

    const res = await handler(
      {
        httpMethod: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ thread_id: 'thread-1' }),
      } as never,
      {} as never,
      vi.fn(),
    );

    expect(res?.statusCode).toBe(200);
    expect(calls).not.toContainEqual(expect.objectContaining({ table: 'workspaces', columns: expect.stringContaining('owner_id') }));
  });
});
