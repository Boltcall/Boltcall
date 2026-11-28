import { beforeEach, describe, expect, it, vi } from 'vitest';

const limitMock = vi.hoisted(() => vi.fn(async () => ({ allowed: true, statusCode: 200 })));
const handleInboundLeadMock = vi.hoisted(() => vi.fn(async () => ({ status: 'created', lead: { id: 'lead-1' }, warnings: [] })));
const supabase = vi.hoisted(() => ({
  from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { user_id: 'u' }, error: null }) }) }) }),
}));

vi.mock('../_shared/token-utils', () => ({ getSupabase: () => supabase, getServiceSupabase: () => supabase }));
vi.mock('../_shared/validate-api-key', () => ({ authenticateApiKey: async () => ({ hasKey: false }) }));
vi.mock('../_shared/lead-response-service', () => ({ handleInboundLead: handleInboundLeadMock }));
vi.mock('../_shared/notify', () => ({ notifyError: vi.fn() }));
vi.mock('../_shared/public-rate-limit', async (orig) => ({ ...(await orig<object>()), consumePublicRateLimit: limitMock }));

const USER = '5485345c-7241-45f6-a7ce-dfc72a684a0c';
const post = (body: Record<string, unknown>) => ({
  httpMethod: 'POST',
  headers: { 'content-type': 'application/json', 'x-nf-client-connection-ip': '1.2.3.4' },
  body: JSON.stringify(body),
  path: `/.netlify/functions/lead-webhook/${USER}`,
  queryStringParameters: null,
}) as any;

describe('lead-webhook public embed (form.js)', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubEnv('WEBHOOK_SECRET', 'server-secret');
  });

  it('accepts an embed post without a secret, rate limited per IP and per business', async () => {
    const { testHandler } = await import('../lead-webhook');
    const res = await testHandler(post({ email: 'a@example.com' }), {} as any);
    expect(res.statusCode).toBe(201);
    expect(limitMock.mock.calls.map(([, o]: any) => o.bucket)).toEqual(['lead_embed_ip', 'lead_embed_business']);
    expect(handleInboundLeadMock).toHaveBeenCalledOnce();
  });

  it('rejects when the rate limit is hit, before any lead work', async () => {
    limitMock.mockResolvedValueOnce({ allowed: false, statusCode: 429, retryAfterSeconds: 60 } as any);
    const { testHandler } = await import('../lead-webhook');
    const res = await testHandler(post({ email: 'a@example.com' }), {} as any);
    expect(res.statusCode).toBe(429);
    expect(handleInboundLeadMock).not.toHaveBeenCalled();
  });

  it('drops honeypot submissions silently', async () => {
    const { testHandler } = await import('../lead-webhook');
    const res = await testHandler(post({ email: 'a@example.com', bc_hp: 'spam' }), {} as any);
    expect(res.statusCode).toBe(201);
    expect(handleInboundLeadMock).not.toHaveBeenCalled();
  });

  it('still rejects a wrong secret and skips limits for the right one', async () => {
    const { testHandler } = await import('../lead-webhook');
    expect((await testHandler(post({ email: 'a@example.com', webhookSecret: 'nope' }), {} as any)).statusCode).toBe(401);
    expect((await testHandler(post({ email: 'a@example.com', webhookSecret: 'server-secret' }), {} as any)).statusCode).toBe(201);
    expect(limitMock).not.toHaveBeenCalled();
  });
});
