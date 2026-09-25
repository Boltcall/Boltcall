import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as crypto from 'crypto';

// F112: instantly-webhook must reject a bad signature and never throw on a
// length mismatch (crypto.timingSafeEqual throws on unequal buffer lengths
// if not guarded).

vi.mock('../_shared/token-utils', () => ({
  getServiceSupabase: () => ({
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }),
      insert: async () => ({ error: null }),
      update: () => ({ eq: async () => ({ error: null }) }),
    }),
  }),
}));

function makeEvent(body: string, sig?: string) {
  return {
    httpMethod: 'POST',
    headers: sig ? { 'x-instantly-signature': sig } : {},
    body,
  } as any;
}

describe('instantly-webhook signature check', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.INSTANTLY_WEBHOOK_SECRET = 'test-instantly-secret';
  });

  it('rejects a same-length wrong signature', async () => {
    const { testHandler: handler } = await import('../instantly-webhook');
    const body = JSON.stringify({ event: 'lead_created', lead: {} });
    const wrongSig = crypto.createHmac('sha256', 'other-secret').update(body).digest('hex');

    const res = await handler(makeEvent(body, wrongSig), {} as any);
    expect(res.statusCode).toBe(401);
  });

  it('rejects a wrong-length signature without throwing', async () => {
    const { testHandler: handler } = await import('../instantly-webhook');
    const body = JSON.stringify({ event: 'lead_created', lead: {} });

    const res = await handler(makeEvent(body, 'short'), {} as any);
    expect(res.statusCode).toBe(401);
  });

  it('accepts a correctly signed payload', async () => {
    const { testHandler: handler } = await import('../instantly-webhook');
    const body = JSON.stringify({ event: 'lead_created', lead: { custom_variables: { lead_uid: 'x' } } });
    const sig = crypto.createHmac('sha256', 'test-instantly-secret').update(body).digest('hex');

    const res = await handler(makeEvent(body, sig), {} as any);
    expect(res.statusCode).toBe(200);
  });
});
