import { beforeEach, describe, expect, it, vi } from 'vitest';

const getPayPalAccessTokenMock = vi.hoisted(() => vi.fn());

vi.mock('../_shared/paypal-client', () => ({
  getPayPalAccessToken: getPayPalAccessTokenMock,
  PAYPAL_API_BASE: 'https://api-m.paypal.com',
  PAYPAL_WEBHOOK_ID: 'WH-live',
}));

function event(headers: Record<string, string> = {}) {
  return {
    httpMethod: 'POST',
    headers,
    body: '{}',
    queryStringParameters: null,
  } as any;
}

describe('paypal-readiness', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubEnv('INTERNAL_API_SECRET', 'test-internal-secret');
    vi.stubEnv('PAYPAL_MODE', 'live');
    getPayPalAccessTokenMock.mockResolvedValue('paypal-token-secret');
  });

  it('requires the internal secret before touching PayPal', async () => {
    const { handler } = await import('../paypal-readiness');

    const res = await handler(event(), {} as any);

    expect(res.statusCode).toBe(403);
    expect(getPayPalAccessTokenMock).not.toHaveBeenCalled();
  });

  it('reports PayPal runtime readiness without exposing the token', async () => {
    const { handler } = await import('../paypal-readiness');

    const res = await handler(event({ 'x-internal-secret': 'test-internal-secret' }), {} as any);
    const body = JSON.parse(res.body);

    expect(res.statusCode).toBe(200);
    expect(body).toEqual({
      status: 'passed',
      check: 'paypal_api_readiness',
      mode: 'live',
      apiBase: 'https://api-m.paypal.com',
      hasAccessToken: true,
      hasWebhookId: true,
    });
    expect(JSON.stringify(body)).not.toContain('paypal-token-secret');
  });

  it('returns a sanitized failure when PayPal auth fails', async () => {
    getPayPalAccessTokenMock.mockRejectedValue(new Error('PayPal auth failed: 401 invalid_client'));
    const { handler } = await import('../paypal-readiness');

    const res = await handler(event({ 'x-internal-secret': 'test-internal-secret' }), {} as any);
    const body = JSON.parse(res.body);

    expect(res.statusCode).toBe(502);
    expect(body).toMatchObject({
      status: 'failed',
      check: 'paypal_api_readiness',
      error: 'PayPal auth failed: 401 invalid_client',
    });
  });
});
