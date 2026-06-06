import { beforeEach, describe, expect, it, vi } from 'vitest';

const verifyRetellSignatureMock = vi.hoisted(() => vi.fn(() => 'ok'));

vi.mock('../_shared/notify', () => ({
  notifyError: vi.fn(),
}));

vi.mock('../_shared/token-utils', () => ({
  getSupabase: vi.fn(),
}));

vi.mock('../_shared/fire-webhooks', () => ({
  fireWebhooks: vi.fn(),
}));

vi.mock('../_shared/verify-signatures', () => ({
  verifyRetellSignature: verifyRetellSignatureMock,
}));

describe('retell-webhook', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    verifyRetellSignatureMock.mockReturnValue('ok');
  });

  it('returns 400 for malformed JSON instead of the generic 500 handler', async () => {
    const { handler } = await import('../retell-webhook');

    const res = await handler(
      {
        httpMethod: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{',
      } as any,
      {} as any,
      vi.fn(),
    );

    expect(res?.statusCode).toBe(400);
    expect(JSON.parse(res?.body || '{}')).toEqual({ error: 'Invalid JSON body' });
  });

  it('rejects missing Retell signatures whenever the Retell secret is configured', async () => {
    vi.stubEnv('RETELL_API_KEY', 'test-retell-secret');
    verifyRetellSignatureMock.mockReturnValue('missing');

    const { handler } = await import('../retell-webhook');

    const res = await handler(
      {
        httpMethod: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ call: { call_id: 'call-123', agent_id: 'agent-123' } }),
      } as any,
      {} as any,
      vi.fn(),
    );

    expect(res?.statusCode).toBe(401);
    expect(JSON.parse(res?.body || '{}').error).toMatch(/signature required/i);
  });
});
