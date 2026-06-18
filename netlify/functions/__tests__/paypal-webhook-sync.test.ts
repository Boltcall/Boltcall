import { beforeEach, describe, expect, it, vi } from 'vitest';

const getPayPalAccessTokenMock = vi.hoisted(() => vi.fn());

vi.mock('../_shared/paypal-client', () => ({
  getPayPalAccessToken: getPayPalAccessTokenMock,
  PAYPAL_API_BASE: 'https://api-m.paypal.com',
}));

function event(headers: Record<string, string> = {}) {
  return {
    httpMethod: 'POST',
    headers,
    body: '{}',
    queryStringParameters: null,
  } as any;
}

function paypalResponse(body: Record<string, unknown>, ok = true, status = 200) {
  return {
    ok,
    status,
    json: vi.fn(async () => body),
    text: vi.fn(async () => JSON.stringify(body)),
  } as any;
}

describe('paypal-webhook-sync', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubEnv('INTERNAL_API_SECRET', 'test-internal-secret');
    vi.stubEnv('PAYPAL_MODE', 'live');
    getPayPalAccessTokenMock.mockResolvedValue('paypal-token-secret');
    vi.stubGlobal('fetch', vi.fn());
  });

  it('requires the internal secret before touching PayPal', async () => {
    const { testHandler: handler } = await import('../paypal-webhook-sync');

    const res = await handler(event(), {} as any);

    expect(res.statusCode).toBe(403);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('returns an existing webhook id for the canonical production webhook URL', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(paypalResponse({
      webhooks: [
        {
          id: 'WH-existing',
          url: 'https://boltcall.org/.netlify/functions/paypal-webhook',
        },
      ],
    }));
    const { testHandler: handler } = await import('../paypal-webhook-sync');

    const res = await handler(event({ 'x-internal-secret': 'test-internal-secret' }), {} as any);

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toMatchObject({
      status: 'passed',
      action: 'found_existing',
      webhookId: 'WH-existing',
    });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('creates the canonical webhook when none exists', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(paypalResponse({ webhooks: [] }))
      .mockResolvedValueOnce(paypalResponse({
        id: 'WH-created',
        url: 'https://boltcall.org/.netlify/functions/paypal-webhook',
      }));
    const { testHandler: handler } = await import('../paypal-webhook-sync');

    const res = await handler(event({ 'x-internal-secret': 'test-internal-secret' }), {} as any);
    const createBody = JSON.parse(vi.mocked(fetch).mock.calls[1]?.[1]?.body as string);

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toMatchObject({
      status: 'passed',
      action: 'created',
      webhookId: 'WH-created',
    });
    expect(createBody).toMatchObject({
      url: 'https://boltcall.org/.netlify/functions/paypal-webhook',
    });
    expect(createBody.event_types.map((item: { name: string }) => item.name))
      .toContain('BILLING.SUBSCRIPTION.ACTIVATED');
  });
});
