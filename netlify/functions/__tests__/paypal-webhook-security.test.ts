import { beforeEach, describe, expect, it, vi } from 'vitest';

const getPayPalAccessTokenMock = vi.hoisted(() => vi.fn());
const getServiceSupabaseMock = vi.hoisted(() => vi.fn());

vi.mock('../_shared/paypal-client', () => ({
  PAYPAL_API_BASE: 'https://api-m.sandbox.paypal.com',
  PAYPAL_WEBHOOK_ID: '',
  getPayPalAccessToken: getPayPalAccessTokenMock,
}));

vi.mock('../_shared/token-utils', () => ({
  getServiceSupabase: getServiceSupabaseMock,
}));

function makePayPalWebhook() {
  return {
    httpMethod: 'POST',
    headers: {
      'content-type': 'application/json',
      'paypal-auth-algo': 'SHA256withRSA',
      'paypal-cert-url': 'https://api-m.sandbox.paypal.com/certs/test',
      'paypal-transmission-id': 'transmission-id',
      'paypal-transmission-sig': 'signature',
      'paypal-transmission-time': '2026-06-06T00:00:00Z',
    },
    body: JSON.stringify({
      event_type: 'BILLING.SUBSCRIPTION.ACTIVATED',
      resource: {
        id: 'I-TEST',
        custom_id: 'user-id',
        subscriber: { email_address: 'buyer@example.com' },
      },
    }),
    queryStringParameters: null,
  } as any;
}

describe('paypal-webhook security', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn());
  });

  it('fails closed when the PayPal webhook id is not configured', async () => {
    const { handler } = await import('../paypal-webhook');

    const res = await handler(makePayPalWebhook(), {} as any);

    expect(res.statusCode).toBe(401);
    expect(res.body).toMatch(/Invalid signature/i);
    expect(getPayPalAccessTokenMock).not.toHaveBeenCalled();
    expect(getServiceSupabaseMock).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });
});
