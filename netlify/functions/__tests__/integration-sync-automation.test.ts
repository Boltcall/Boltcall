import { beforeEach, describe, expect, it, vi } from 'vitest';

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
  requireMatchingUser: vi.fn(async (_event, userId) => ({
    ok: true,
    user: { id: userId || 'user-1' },
    userId: userId || 'user-1',
  })),
}));

vi.mock('../_shared/outbound-url', () => ({
  validateOutboundHttpsUrl: vi.fn(async () => ({ ok: true })),
}));

vi.mock('../_shared/notify', () => ({ notifyError: vi.fn(), notifyInfo: vi.fn() }));

import { handler } from '../integration-sync';

function makeEvent(body: object) {
  return {
    httpMethod: 'POST',
    body: JSON.stringify({ userId: 'user-1', ...body }),
    headers: {},
  } as any;
}

describe('integration-sync automation providers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ results: [{ id: 'contact-1' }], contact: { id: 'ghl-1' } }),
      text: async () => '{}',
    } as any);
  });

  it('tests HubSpot private app contact access', async () => {
    const res = await handler(makeEvent({ action: 'test', provider: 'hubspot', apiKey: 'hub-token' }), {} as any);
    const body = JSON.parse(res!.body);

    expect(body.success).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.hubapi.com/crm/v3/objects/contacts?limit=1',
      expect.objectContaining({ headers: { Authorization: 'Bearer hub-token' } }),
    );
  });

  it('tests HubSpot OAuth contact access', async () => {
    const res = await handler(makeEvent({
      action: 'test',
      provider: 'hubspot',
      config: { access_token: 'hub-oauth-token' },
    }), {} as any);
    const body = JSON.parse(res!.body);

    expect(body.success).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.hubapi.com/crm/v3/objects/contacts?limit=1',
      expect.objectContaining({ headers: { Authorization: 'Bearer hub-oauth-token' } }),
    );
  });

  it('tests GoHighLevel with location id and API version header', async () => {
    const res = await handler(makeEvent({
      action: 'test',
      provider: 'gohighlevel',
      apiKey: 'ghl-token',
      config: { location_id: 'loc-1' },
    }), {} as any);
    const body = JSON.parse(res!.body);

    expect(body.success).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://services.leadconnectorhq.com/contacts/?locationId=loc-1&limit=1',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer ghl-token',
          Version: '2021-07-28',
        }),
      }),
    );
  });

  it('tests Zapier and Make webhook delivery paths', async () => {
    const zapier = await handler(makeEvent({
      action: 'test',
      provider: 'zapier',
      webhookUrl: 'https://hooks.zapier.com/hooks/catch/123/abc',
    }), {} as any);
    const make = await handler(makeEvent({
      action: 'test',
      provider: 'make',
      webhookUrl: 'https://hook.eu1.make.com/abc',
    }), {} as any);

    expect(JSON.parse(zapier!.body).success).toBe(true);
    expect(JSON.parse(make!.body).success).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://hooks.zapier.com/hooks/catch/123/abc',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(mockFetch).toHaveBeenCalledWith(
      'https://hook.eu1.make.com/abc',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('tests Pipedrive OAuth user access', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { name: 'Noam' } }),
      text: async () => '{}',
    } as any);

    const res = await handler(makeEvent({
      action: 'test',
      provider: 'pipedrive',
      config: { access_token: 'pd-oauth-token' },
    }), {} as any);
    const body = JSON.parse(res!.body);

    expect(body.success).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.pipedrive.com/v1/users/me',
      expect.objectContaining({ headers: { Authorization: 'Bearer pd-oauth-token' } }),
    );
  });
});
