import { describe, expect, it, vi } from 'vitest';

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
  verifyRetellSignature: vi.fn(() => 'ok'),
}));

describe('retell-webhook', () => {
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
});
