import { beforeEach, describe, expect, it, vi } from 'vitest';

process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_KEY = 'test-service-key';
process.env.INTERNAL_API_SECRET = 'test-internal-secret';
process.env.URL = 'https://boltcall.org';

const mockHandleInboundLead = vi.fn();
const mockNotifyError = vi.fn();

type SupabaseState = {
  rpcResult: any;
  rpcError: any;
  updates: Array<{ table: string; payload: any; filters: Array<{ column: string; value: any }> }>;
  existingLead: any;
};

const state: SupabaseState = {
  rpcResult: [{ allowed: true, user_id: 'user-1', retry_after_seconds: 0, reason: 'allowed' }],
  rpcError: null,
  updates: [],
  existingLead: null,
};

function makeChain(table: string) {
  const filters: Array<{ column: string; value: any }> = [];
  let updatePayload: any = null;

  const chain: any = {
    select: () => chain,
    eq: (column: string, value: any) => {
      filters.push({ column, value });
      return chain;
    },
    filter: () => chain,
    limit: () => chain,
    update: (payload: any) => {
      updatePayload = payload;
      return chain;
    },
    maybeSingle: async () => ({ data: state.existingLead, error: null }),
    then: (resolve: any, reject?: any) => {
      if (updatePayload) {
        state.updates.push({ table, payload: updatePayload, filters });
      }
      return Promise.resolve({ data: null, error: null }).then(resolve, reject);
    },
  };
  return chain;
}

const mockSupabase = {
  rpc: vi.fn(async () => ({ data: state.rpcResult, error: state.rpcError })),
  from: vi.fn((table: string) => makeChain(table)),
};

vi.mock('../_shared/token-utils', () => ({
  getSupabase: () => mockSupabase,
}));

vi.mock('../_shared/lead-response-service', () => ({
  handleInboundLead: (...args: any[]) => mockHandleInboundLead(...args),
}));

vi.mock('../_shared/fire-webhooks', () => ({
  fireWebhooks: vi.fn(),
}));

vi.mock('../_shared/notify', () => ({
  notifyError: (...args: any[]) => mockNotifyError(...args),
}));

vi.mock('retell-sdk', () => ({
  default: class MockRetell {},
}));

function makeEvent(body: Record<string, any>) {
  return {
    httpMethod: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  } as any;
}

beforeEach(() => {
  state.rpcResult = [{ allowed: true, user_id: 'user-1', retry_after_seconds: 0, reason: 'allowed' }];
  state.rpcError = null;
  state.updates = [];
  state.existingLead = null;
  mockSupabase.rpc.mockClear();
  mockSupabase.from.mockClear();
  mockHandleInboundLead.mockReset();
  mockHandleInboundLead.mockResolvedValue({
    status: 'captured',
    lead_id: 'lead-1',
    first_touch_status: 'started',
    retell_call_started: true,
    events_emitted: [],
    warnings: [],
  });
  mockNotifyError.mockReset();
});

describe('google-leads-webhook', () => {
  it('rate-limits a valid leaked key before lead capture can spend Retell money', async () => {
    state.rpcResult = [{
      allowed: false,
      user_id: 'user-1',
      retry_after_seconds: 57,
      reason: 'rate_limit_exceeded',
    }];
    const { testHandler: handler } = await import('../google-leads-webhook');

    const res = await handler(makeEvent({
      google_key: 'valid-key',
      lead_id: 'lead-1',
      user_column_data: [{ column_id: 'PHONE_NUMBER', string_value: '+15551112222' }],
    }), {} as any);

    expect(res.statusCode).toBe(429);
    expect(res.headers?.['Retry-After']).toBe('57');
    expect(mockHandleInboundLead).not.toHaveBeenCalled();
  });

  it('records Google test pings for the dashboard without requiring lead_id', async () => {
    const { testHandler: handler } = await import('../google-leads-webhook');

    const res = await handler(makeEvent({
      google_key: 'valid-key',
      is_test: true,
    }), {} as any);

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ ok: true, test: true });
    expect(state.updates).toContainEqual(expect.objectContaining({
      table: 'business_features',
      payload: expect.objectContaining({ last_google_test_ping_at: expect.any(String) }),
    }));
    expect(mockHandleInboundLead).not.toHaveBeenCalled();
  });

  it('starts Google lead first touch in non-blocking mode', async () => {
    const { testHandler: handler } = await import('../google-leads-webhook');

    const res = await handler(makeEvent({
      google_key: 'valid-key',
      lead_id: 'lead-1',
      user_column_data: [{ column_id: 'PHONE_NUMBER', string_value: '+15551112222' }],
    }), {} as any);

    expect(res.statusCode).toBe(200);
    expect(mockHandleInboundLead).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'google_lead_form' }),
      expect.objectContaining({ awaitFirstTouch: false }),
    );
  });
});
