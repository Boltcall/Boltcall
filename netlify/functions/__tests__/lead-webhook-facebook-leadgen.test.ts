import { beforeEach, describe, expect, it, vi } from 'vitest';

const getSupabaseMock = vi.hoisted(() => vi.fn());
const handleInboundLeadMock = vi.hoisted(() => vi.fn());
const verifyFacebookSignatureMock = vi.hoisted(() => vi.fn(() => 'valid'));

vi.mock('../_shared/token-utils', () => ({
  getSupabase: getSupabaseMock,
}));

vi.mock('../_shared/lead-response-service', () => ({
  handleInboundLead: handleInboundLeadMock,
}));

vi.mock('../_shared/verify-signatures', () => ({
  verifyFacebookSignature: verifyFacebookSignatureMock,
}));

vi.mock('../_shared/fire-webhooks', () => ({
  fireWebhooks: vi.fn(),
}));

vi.mock('../_shared/notify', () => ({
  notifyError: vi.fn(),
}));

vi.mock('../_shared/validate-api-key', () => ({
  authenticateApiKey: vi.fn(async () => ({ hasKey: false, userId: null })),
}));

vi.mock('retell-sdk', () => ({
  default: class MockRetell {},
}));

function makeFacebookLeadgenEvent() {
  return {
    httpMethod: 'POST',
    headers: { 'x-hub-signature-256': 'sha256=test-signature' },
    body: JSON.stringify({
      object: 'page',
      entry: [
        {
          changes: [
            {
              field: 'leadgen',
              value: { leadgen_id: 'leadgen-1', page_id: 'page-1' },
            },
          ],
        },
      ],
    }),
    queryStringParameters: null,
    path: '/.netlify/functions/lead-webhook',
  } as any;
}

describe('lead-webhook Facebook leadgen', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    const connectionChain: any = {
      select: vi.fn(() => connectionChain),
      eq: vi.fn(() => connectionChain),
      limit: vi.fn(() => connectionChain),
      maybeSingle: vi.fn(async () => ({
        data: {
          access_token: 'page-token',
          user_id: 'founder-user-id',
          workspace_id: 'workspace-id-1',
        },
        error: null,
      })),
    };
    getSupabaseMock.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'facebook_page_connections') return connectionChain;
        throw new Error(`Unexpected table: ${table}`);
      }),
    });

    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({
        field_data: [
          { name: 'full_name', values: ['Maya Fields'] },
          { name: 'email', values: ['maya@example.com'] },
          { name: 'phone_number', values: ['+15551112222'] },
        ],
      }),
    })));

    handleInboundLeadMock.mockResolvedValue({
      status: 'captured',
      lead: { id: 'lead-1', source: 'facebook_lead_ad' },
      warnings: [],
    });
  });

  it('captures signed Meta Lead Ads webhooks with the canonical facebook_lead_ad source', async () => {
    const { handler } = await import('../lead-webhook');

    const res = await handler(makeFacebookLeadgenEvent(), {} as any);

    expect(res.statusCode).toBe(200);
    expect(handleInboundLeadMock).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'facebook_lead_ad',
        body: expect.objectContaining({
          user_id: 'founder-user-id',
          source: 'facebook_lead_ad',
          email: 'maya@example.com',
          phone: '+15551112222',
          raw_data: expect.objectContaining({
            leadgen_id: 'leadgen-1',
            page_id: 'page-1',
          }),
        }),
      }),
      expect.any(Object),
    );
  });
});
