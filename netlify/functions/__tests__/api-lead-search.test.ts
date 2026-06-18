import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  extractApiKey: vi.fn(),
  validateApiKey: vi.fn(),
  rows: [] as any[],
  queryLog: [] as any[],
}));

function makeQuery(table: string) {
  const state: any = { table, userId: null, eq: {}, filters: {} };
  const query: any = {
    select: () => query,
    eq: (field: string, value: string) => {
      if (field === 'user_id') state.userId = value;
      state.eq[field] = value;
      return query;
    },
    filter: (field: string, _op: string, value: string) => {
      state.filters[field] = value;
      return query;
    },
    order: () => query,
    limit: () => {
      mocks.queryLog.push(state);
      const rows = mocks.rows.filter((row) => {
        if (state.userId && row.user_id !== state.userId) return false;
        for (const [field, value] of Object.entries(state.eq)) {
          if (field === 'user_id') continue;
          if (row[field] !== value) return false;
        }
        for (const [field, value] of Object.entries(state.filters)) {
          const match = String(field).match(/^raw_data->>(.+)$/);
          if (!match) return false;
          if (row.raw_data?.[match[1]] !== value) return false;
        }
        return true;
      });
      return Promise.resolve({ data: rows, error: null });
    },
  };
  return query;
}

const mockSupabase = {
  from: vi.fn((table: string) => makeQuery(table)),
};

vi.mock('../_shared/validate-api-key', () => ({
  extractApiKey: mocks.extractApiKey,
  validateApiKey: mocks.validateApiKey,
}));

vi.mock('../_shared/token-utils', () => ({
  getSupabase: () => mockSupabase,
}));

import { testHandler as handler } from '../api-lead-search';

function makeEvent(queryStringParameters: Record<string, string | undefined> | null = {}) {
  return {
    httpMethod: 'GET',
    headers: { authorization: 'Bearer bc_test' },
    queryStringParameters,
  } as any;
}

describe('api-lead-search', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.rows.length = 0;
    mocks.queryLog.length = 0;
    mocks.extractApiKey.mockReturnValue('bc_test');
    mocks.validateApiKey.mockResolvedValue({
      valid: true,
      userId: 'user-1',
      keyName: 'Zapier',
      permissions: [],
    });
  });

  it('rejects requests without an API key', async () => {
    mocks.extractApiKey.mockReturnValue(null);

    const res = await handler(makeEvent({ email: 'jane@example.com' }), {} as any);

    expect(res.statusCode).toBe(401);
  });

  it('searches leads by email within the authenticated workspace only', async () => {
    mocks.rows.push(
      {
        id: 'lead-1',
        user_id: 'user-1',
        first_name: 'Jane',
        last_name: 'Doe',
        email: 'jane@example.com',
        phone: '+15551112222',
        source: 'zapier',
        status: 'pending',
        created_at: '2026-06-06T10:00:00.000Z',
        raw_data: { external_id: 'zap-1' },
      },
      {
        id: 'lead-2',
        user_id: 'user-2',
        first_name: 'Jane',
        email: 'jane@example.com',
        phone: '+15553334444',
        source: 'make',
        status: 'pending',
        created_at: '2026-06-06T10:01:00.000Z',
        raw_data: { external_id: 'zap-2' },
      },
    );

    const res = await handler(makeEvent({ email: 'jane@example.com' }), {} as any);
    const body = JSON.parse(res.body || '[]');

    expect(res.statusCode).toBe(200);
    expect(body).toHaveLength(1);
    expect(body[0]).toMatchObject({
      id: 'lead-1',
      name: 'Jane Doe',
      email: 'jane@example.com',
      phone: '+15551112222',
    });
    expect(mocks.queryLog.every((q) => q.userId === 'user-1')).toBe(true);
  });

  it('searches leads by external id', async () => {
    mocks.rows.push({
      id: 'lead-3',
      user_id: 'user-1',
      first_name: 'Sam',
      last_name: 'Speed',
      email: 'sam@example.com',
      phone: '+15550001111',
      source: 'make',
      status: 'pending',
      created_at: '2026-06-06T10:02:00.000Z',
      raw_data: { external_id: 'mk-778' },
    });

    const res = await handler(makeEvent({ external_id: 'mk-778' }), {} as any);
    const body = JSON.parse(res.body || '[]');

    expect(res.statusCode).toBe(200);
    expect(body).toHaveLength(1);
    expect(body[0].id).toBe('lead-3');
  });
});
