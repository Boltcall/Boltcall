import { beforeEach, describe, expect, it, vi } from 'vitest';

process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_KEY = 'test-service-key';
process.env.URL = 'https://boltcall.org';

const tickets = [
  {
    id: 'ticket-1',
    workspace_id: 'workspace-1',
    workspace_name: 'Acme HVAC',
    user_id: 'user-1',
    user_email: 'owner@acme.test',
    status: 'open',
    priority: 'urgent',
    source: 'v2_help',
    current_page: '/v2/help',
    recent_action: 'asked for help',
    question: 'Calls are down and I need help.',
    answer_preview: 'Your phone number is configured.',
    diagnostics_snapshot: 'Phone numbers: 1',
    created_at: '2026-06-14T08:00:00.000Z',
    updated_at: '2026-06-14T08:00:00.000Z',
    resolved_at: null,
    assigned_to: null,
    metadata: { source_count: 2 },
  },
];

let role: 'founder' | 'user' = 'founder';
let lastUpdate: Record<string, unknown> | null = null;

function ticketChain() {
  const chain: any = {
    select: vi.fn(() => chain),
    in: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    order: vi.fn(() => chain),
    limit: vi.fn(async () => ({ data: tickets, error: null })),
    update: vi.fn((patch: Record<string, unknown>) => {
      lastUpdate = patch;
      return chain;
    }),
    single: vi.fn(async () => ({
      data: { ...tickets[0], ...lastUpdate },
      error: null,
    })),
  };
  return chain;
}

const supabaseMock = {
  auth: {
    getUser: vi.fn(async () => ({
      data: {
        user: {
          id: role === 'founder' ? 'founder-1' : 'user-1',
          email: role === 'founder' ? 'founder@boltcall.org' : 'user@test.test',
          app_metadata: { role },
        },
      },
      error: null,
    })),
  },
  from: vi.fn(() => ticketChain()),
};

vi.mock('../_shared/token-utils', () => ({
  getServiceSupabase: () => supabaseMock,
}));

function event(overrides: Record<string, unknown> = {}) {
  return {
    httpMethod: overrides.httpMethod || 'GET',
    headers: overrides.headers || {
      authorization: 'Bearer founder-jwt',
      origin: 'https://boltcall.org',
    },
    body: overrides.body,
    queryStringParameters: overrides.queryStringParameters || null,
  } as any;
}

describe('saas-v2-support-tickets', () => {
  beforeEach(() => {
    role = 'founder';
    lastUpdate = null;
    vi.clearAllMocks();
  });

  it('lists open tickets for founders', async () => {
    const { testHandler: handler } = await import('../saas-v2-support-tickets');

    const res = await handler(event(), {} as any);
    const body = JSON.parse(res.body);

    expect(res.statusCode).toBe(200);
    expect(body.tickets).toHaveLength(1);
    expect(body.tickets[0]).toEqual(expect.objectContaining({
      id: 'ticket-1',
      workspace_name: 'Acme HVAC',
      priority: 'urgent',
    }));
    expect(body.counts).toEqual({ total: 1, urgent: 1, high: 0, normal: 0 });
  });

  it('rejects non-founder users', async () => {
    role = 'user';
    const { testHandler: handler } = await import('../saas-v2-support-tickets');

    const res = await handler(event(), {} as any);

    expect(res.statusCode).toBe(403);
    expect(JSON.parse(res.body).error).toMatch(/Founder/);
  });

  it('updates ticket status for founders', async () => {
    const { testHandler: handler } = await import('../saas-v2-support-tickets');

    const res = await handler(
      event({
        httpMethod: 'PATCH',
        body: JSON.stringify({ ticket_id: 'ticket-1', status: 'resolved', assigned_to: 'Noam' }),
      }),
      {} as any,
    );
    const body = JSON.parse(res.body);

    expect(res.statusCode).toBe(200);
    expect(lastUpdate).toEqual(expect.objectContaining({
      status: 'resolved',
      assigned_to: 'Noam',
    }));
    expect(lastUpdate?.resolved_at).toEqual(expect.any(String));
    expect(body.ticket.status).toBe('resolved');
  });
});
