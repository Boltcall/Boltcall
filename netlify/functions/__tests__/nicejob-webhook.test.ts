import { createHmac } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';

function sign(payload: Record<string, any>, timestamp: number, secret: string) {
  return createHmac('sha256', secret)
    .update(`${JSON.stringify(payload)}${timestamp}`)
    .digest('hex');
}

function makeEvent(body: Record<string, any>) {
  return {
    httpMethod: 'POST',
    headers: { 'content-type': 'application/json' },
    queryStringParameters: null,
    body: JSON.stringify(body),
  } as any;
}

describe('nicejob-webhook', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it('accepts a signed NiceJob review webhook event', async () => {
    const secret = 'nicejob_test_secret';
    vi.stubEnv('NICEJOB_WEBHOOK_SECRET', secret);

    const payload = {
      company_id: 'company-123',
      entity_id: 'review-456',
      event_code: 'Review.created',
    };
    const timestamp = Math.floor(Date.now() / 1000);
    const { testHandler: handler } = await import('../nicejob-webhook');

    const res = await handler(makeEvent({
      payload,
      signature: {
        timestamp,
        signed_payload: sign(payload, timestamp, secret),
      },
    }), {} as any);

    expect(res.statusCode).toBe(202);
    expect(JSON.parse(res.body)).toEqual({
      success: true,
      source: 'nicejob',
      event_code: 'Review.created',
      entity_id: 'review-456',
    });
  });

  it('rejects unsigned NiceJob webhook events when the secret is configured', async () => {
    vi.stubEnv('NICEJOB_WEBHOOK_SECRET', 'nicejob_test_secret');
    const { testHandler: handler } = await import('../nicejob-webhook');

    const res = await handler(makeEvent({
      payload: {
        company_id: 'company-123',
        entity_id: 'review-456',
        event_code: 'Review.created',
      },
    }), {} as any);

    expect(res.statusCode).toBe(401);
    expect(JSON.parse(res.body).error).toMatch(/signature/i);
  });
});
