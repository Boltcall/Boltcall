import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

const mockChain: any = {
  select: vi.fn(() => mockChain),
  eq: vi.fn(() => mockChain),
  update: vi.fn(() => mockChain),
  insert: vi.fn(() => mockChain),
  order: vi.fn(() => mockChain),
  maybeSingle: vi.fn(),
  single: vi.fn(),
};
const mockSupabase = { from: vi.fn(() => mockChain) };

vi.mock('../_shared/token-utils', () => ({
  getSupabase: () => mockSupabase,
  getServiceSupabase: () => mockSupabase,
}));
vi.mock('../_shared/user-auth', () => ({
  hasSharedSecret: vi.fn(() => true),
  requireMatchingUser: vi.fn(async (_event, userId, _headers) => ({
    ok: true,
    user: { id: userId || 'u1' },
    userId: userId || 'u1',
  })),
}));
vi.mock('../_shared/notify', () => ({ notifyError: vi.fn(), notifyInfo: vi.fn() }));

process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_KEY = 'test-key';

import { handler } from '../integration-sync';

function makeEvent(body: object) {
  return { httpMethod: 'POST', body: JSON.stringify(body), headers: {}, multiValueHeaders: {}, isBase64Encoded: false, path: '/', pathParameters: null, queryStringParameters: null, multiValueQueryStringParameters: null, stageVariables: null, requestContext: {} as any, resource: '' };
}
function mockToken(ok = true) {
  mockFetch.mockResolvedValueOnce({ ok, json: async () => ok ? { access_token: 'tok' } : {} } as any);
}
function mockApi(ok = true, body: object = {}) {
  mockFetch.mockResolvedValueOnce({ ok, json: async () => body, text: async () => JSON.stringify(body) } as any);
}
function setupIntegrations(list: object[]) {
  mockChain.eq.mockReturnValueOnce({ eq: vi.fn().mockResolvedValue({ data: list, error: null }) });
  mockChain.update.mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: null, error: null }) });
}

const stInt = { id: 'i1', provider: 'servicetitan', is_connected: true, api_key: 'CLIENT-ID', config: { client_secret: 'SECRET', tenant_id: '999' }, sync_count: 0 };
describe('ServiceTitan - test action', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects missing Client ID', async () => {
    const res = await handler(makeEvent({ action: 'test', provider: 'servicetitan' }), {} as any, vi.fn());
    expect(res?.statusCode).toBe(400);
    expect(JSON.parse(res!.body).error).toContain('Client ID');
  });

  it('rejects missing Client Secret', async () => {
    const res = await handler(makeEvent({ action: 'test', provider: 'servicetitan', apiKey: 'cid' }), {} as any, vi.fn());
    expect(res?.statusCode).toBe(400);
    expect(JSON.parse(res!.body).error).toContain('Client Secret');
  });

  it('rejects missing Tenant ID', async () => {
    const res = await handler(makeEvent({ action: 'test', provider: 'servicetitan', apiKey: 'cid', config: { client_secret: 'sec' } }), {} as any, vi.fn());
    expect(res?.statusCode).toBe(400);
    expect(JSON.parse(res!.body).error).toContain('Tenant ID');
  });

  it('returns auth error when token fails', async () => {
    mockToken(false);
    const res = await handler(makeEvent({ action: 'test', provider: 'servicetitan', apiKey: 'c', config: { client_secret: 's', tenant_id: '9' } }), {} as any, vi.fn());
    const body = JSON.parse(res!.body);
    expect(body.success).toBe(false);
    expect(body.error).toMatch(/authentication failed/i);
    expect(mockFetch).toHaveBeenCalledWith('https://auth.servicetitan.io/connect/token', expect.objectContaining({ method: 'POST' }));
  });

  it('succeeds and reports customer count', async () => {
    mockToken();
    mockApi(true, { totalCount: 42, data: [] });
    const res = await handler(makeEvent({ action: 'test', provider: 'servicetitan', apiKey: 'cid', config: { client_secret: 'sec', tenant_id: '999' } }), {} as any, vi.fn());
    const body = JSON.parse(res!.body);
    expect(body.success).toBe(true);
    expect(body.message).toContain('42');
  });
});
describe('ServiceTitan - sync_lead', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates new customer with correct payload', async () => {
    setupIntegrations([stInt]);
    mockToken(); mockApi(true, { data: [] }); mockApi(true, { id: 7890 });
    const res = await handler(makeEvent({ action: 'sync_lead', userId: 'u1', lead: { name: 'John Smith', phone: '+14155550100', email: 'j@e.com' } }), {} as any, vi.fn());
    const body = JSON.parse(res!.body);
    expect(body.synced).toBe(1);
    expect(body.results[0]).toMatchObject({ provider: 'servicetitan', success: true });
    const post = mockFetch.mock.calls.find((c: any[]) => typeof c[0] === 'string' && c[0].includes('/customers') && c[1]?.method === 'POST');
    const pl = JSON.parse(post![1].body);
    expect(pl.name).toBe('John Smith');
    expect(pl.contacts).toContainEqual({ type: 'Phone', value: '+14155550100' });
    expect(pl.contacts).toContainEqual({ type: 'Email', value: 'j@e.com' });
    expect(pl.type).toBe('Residential');
  });

  it('patches existing customer when phone matches', async () => {
    setupIntegrations([stInt]);
    mockToken(); mockApi(true, { data: [{ id: 111 }] }); mockApi(true, { id: 111 });
    const res = await handler(makeEvent({ action: 'sync_lead', userId: 'u1', lead: { name: 'Jane', phone: '+1555' } }), {} as any, vi.fn());
    expect(JSON.parse(res!.body).results[0].success).toBe(true);
    const patch = mockFetch.mock.calls.find((c: any[]) => typeof c[0] === 'string' && c[0].includes('/customers/111') && c[1]?.method === 'PATCH');
    expect(patch).toBeTruthy();
  });

  it('fails when token request fails', async () => {
    setupIntegrations([stInt]); mockToken(false);
    const body = JSON.parse((await handler(makeEvent({ action: 'sync_lead', userId: 'u1', lead: { name: 'X', phone: '+1' } }), {} as any, vi.fn()))!.body);
    expect(body.results[0]).toMatchObject({ provider: 'servicetitan', success: false });
    expect(body.results[0].error).toMatch(/authentication failed/i);
  });

  it('fails when client_secret missing', async () => {
    setupIntegrations([{ ...stInt, config: { tenant_id: '999' } }]);
    const body = JSON.parse((await handler(makeEvent({ action: 'sync_lead', userId: 'u1', lead: { name: 'X', phone: '+1' } }), {} as any, vi.fn()))!.body);
    expect(body.results[0].error).toContain('Client Secret');
  });

  it('fails when tenant_id missing', async () => {
    setupIntegrations([{ ...stInt, config: { client_secret: 'sec' } }]);
    const body = JSON.parse((await handler(makeEvent({ action: 'sync_lead', userId: 'u1', lead: { name: 'X', phone: '+1' } }), {} as any, vi.fn()))!.body);
    expect(body.results[0].error).toContain('Tenant ID');
  });

  it('attaches ST-App-Key to api.servicetitan.io calls', async () => {
    setupIntegrations([stInt]); mockToken(); mockApi(true, { data: [] }); mockApi(true, { id: 1 });
    await handler(makeEvent({ action: 'sync_lead', userId: 'u1', lead: { name: 'H', phone: '+1111' } }), {} as any, vi.fn());
    const calls = mockFetch.mock.calls.filter((c: any[]) => typeof c[0] === 'string' && c[0].includes('api.servicetitan.io'));
    expect(calls.length).toBeGreaterThan(0);
    for (const c of calls) expect(c[1]?.headers?.['ST-App-Key']).toBe('CLIENT-ID');
  });

  it('builds name from first_name + last_name', async () => {
    setupIntegrations([stInt]); mockToken(); mockApi(true, { data: [] }); mockApi(true, { id: 2 });
    await handler(makeEvent({ action: 'sync_lead', userId: 'u1', lead: { first_name: 'Alice', last_name: 'Brown', phone: '+1' } }), {} as any, vi.fn());
    const post = mockFetch.mock.calls.find((c: any[]) => typeof c[0] === 'string' && c[0].includes('/customers') && c[1]?.method === 'POST');
    expect(JSON.parse(post![1].body).name).toBe('Alice Brown');
  });
});
