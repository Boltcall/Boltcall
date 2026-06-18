import { beforeEach, describe, expect, it, vi } from 'vitest';

const paypalFetchMock = vi.hoisted(() => vi.fn());
const getServiceSupabaseMock = vi.hoisted(() => vi.fn());

vi.mock('../_shared/paypal-client', () => ({
  paypalFetch: paypalFetchMock,
}));

vi.mock('../_shared/token-utils', () => ({
  getServiceSupabase: getServiceSupabaseMock,
}));

let role: 'founder' | 'user' = 'founder';
const upsertMock = vi.fn(async () => ({ error: null }));
const supabaseMock = {
  auth: {
    getUser: vi.fn(async () => ({
      data: {
        user: {
          id: 'founder-1',
          email: 'founder@boltcall.org',
          app_metadata: { role },
        },
      },
      error: null,
    })),
  },
  from: vi.fn(() => ({
    upsert: upsertMock,
  })),
};

function response(body: Record<string, unknown>, ok = true, status = 200) {
  return {
    ok,
    status,
    json: vi.fn(async () => body),
  };
}

function event(body: Record<string, unknown> = {}) {
  return {
    httpMethod: 'POST',
    headers: {
      authorization: 'Bearer founder-jwt',
      origin: 'https://boltcall.org',
    },
    body: JSON.stringify(body),
    queryStringParameters: null,
  } as any;
}

describe('PayPal live test order endpoints', () => {
  beforeEach(() => {
    role = 'founder';
    vi.resetModules();
    vi.clearAllMocks();
    getServiceSupabaseMock.mockReturnValue(supabaseMock);
  });

  it('creates a founder-only $2 PayPal order with a Boltcall approval URL', async () => {
    paypalFetchMock.mockResolvedValueOnce(
      response({
        id: 'ORDER-1',
        links: [{ rel: 'payer-action', href: 'https://www.paypal.com/checkoutnow?token=ORDER-1' }],
      }),
    );
    const { testHandler: handler } = await import('../create-paypal-test-order');

    const res = await handler(event(), {} as any);
    const body = JSON.parse(res.body);
    const request = JSON.parse(paypalFetchMock.mock.calls[0][1].body);

    expect(res.statusCode).toBe(200);
    expect(body).toEqual(expect.objectContaining({
      orderId: 'ORDER-1',
      approvalUrl: 'https://www.paypal.com/checkoutnow?token=ORDER-1',
      amount: '2.00',
      currency: 'USD',
    }));
    expect(request.purchase_units[0]).toEqual(expect.objectContaining({
      custom_id: 'founder-1',
      amount: { currency_code: 'USD', value: '2.00' },
    }));
    expect(request.payment_source.paypal.experience_context.brand_name).toBe('Boltcall');
  });

  it('rejects non-founder users before creating a PayPal order', async () => {
    role = 'user';
    const { testHandler: handler } = await import('../create-paypal-test-order');

    const res = await handler(event(), {} as any);

    expect(res.statusCode).toBe(403);
    expect(paypalFetchMock).not.toHaveBeenCalled();
  });

  it('captures a founder-owned $2 PayPal order and logs it', async () => {
    paypalFetchMock
      .mockResolvedValueOnce(
        response({
          id: 'ORDER-1',
          status: 'APPROVED',
          purchase_units: [
            {
              custom_id: 'founder-1',
              amount: { currency_code: 'USD', value: '2.00' },
            },
          ],
        }),
      )
      .mockResolvedValueOnce(
        response({
          id: 'ORDER-1',
          status: 'COMPLETED',
          payer: { email_address: 'buyer@example.com', payer_id: 'PAYER-1' },
          purchase_units: [
            {
              custom_id: 'founder-1',
              payments: {
                captures: [
                  {
                    id: 'CAPTURE-1',
                    status: 'COMPLETED',
                    amount: { currency_code: 'USD', value: '2.00' },
                  },
                ],
              },
            },
          ],
        }),
      );
    const { testHandler: handler } = await import('../capture-paypal-test-order');

    const res = await handler(event({ orderId: 'ORDER-1' }), {} as any);
    const body = JSON.parse(res.body);

    expect(res.statusCode).toBe(200);
    expect(body).toEqual(expect.objectContaining({
      orderId: 'ORDER-1',
      captureId: 'CAPTURE-1',
      amount: '2.00',
      currency: 'USD',
    }));
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        order_id: 'ORDER-1',
        user_id: 'founder-1',
        amount: 2,
        currency: 'USD',
        status: 'completed',
      }),
      { onConflict: 'order_id' },
    );
  });

  it('does not capture an order owned by a different user', async () => {
    paypalFetchMock.mockResolvedValueOnce(
      response({
        id: 'ORDER-OTHER',
        status: 'APPROVED',
        purchase_units: [
          {
            custom_id: 'someone-else',
            amount: { currency_code: 'USD', value: '2.00' },
          },
        ],
      }),
    );
    const { testHandler: handler } = await import('../capture-paypal-test-order');

    const res = await handler(event({ orderId: 'ORDER-OTHER' }), {} as any);

    expect(res.statusCode).toBe(403);
    expect(paypalFetchMock).toHaveBeenCalledTimes(1);
    expect(upsertMock).not.toHaveBeenCalled();
  });

  it('captures a signed PayPal return without requiring a browser session', async () => {
    vi.stubEnv('INTERNAL_API_SECRET', 'return-secret');
    paypalFetchMock
      .mockResolvedValueOnce(
        response({
          id: 'ORDER-RETURN',
          status: 'APPROVED',
          purchase_units: [
            {
              custom_id: 'founder-1',
              amount: { currency_code: 'USD', value: '2.00' },
            },
          ],
        }),
      )
      .mockResolvedValueOnce(
        response({
          id: 'ORDER-RETURN',
          status: 'COMPLETED',
          payer: { email_address: 'buyer@example.com', payer_id: 'PAYER-RETURN' },
          purchase_units: [
            {
              custom_id: 'founder-1',
              payments: {
                captures: [
                  {
                    id: 'CAPTURE-RETURN',
                    status: 'COMPLETED',
                    amount: { currency_code: 'USD', value: '2.00' },
                  },
                ],
              },
            },
          ],
        }),
      );
    const { testHandler: handler, signPayPalTestState } = await import('../capture-paypal-test-return');
    const state = signPayPalTestState({
      founderUserId: 'founder-1',
      issuedAt: Date.now(),
      nonce: 'nonce-1',
    });

    const res = await handler({
      httpMethod: 'GET',
      headers: {},
      body: null,
      queryStringParameters: {
        token: 'ORDER-RETURN',
        state,
      },
    } as any, {} as any);

    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('PayPal test payment captured');
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        order_id: 'ORDER-RETURN',
        user_id: 'founder-1',
        amount: 2,
        currency: 'USD',
        status: 'completed',
      }),
      { onConflict: 'order_id' },
    );
  });

  it('rejects expired signed PayPal returns before touching PayPal', async () => {
    vi.stubEnv('INTERNAL_API_SECRET', 'return-secret');
    const { testHandler: handler, signPayPalTestState } = await import('../capture-paypal-test-return');
    const state = signPayPalTestState({
      founderUserId: 'founder-1',
      issuedAt: Date.now() - 25 * 60 * 60 * 1000,
      nonce: 'nonce-1',
    });

    const res = await handler({
      httpMethod: 'GET',
      headers: {},
      body: null,
      queryStringParameters: {
        token: 'ORDER-RETURN',
        state,
      },
    } as any, {} as any);

    expect(res.statusCode).toBe(403);
    expect(res.body).toContain('expired_state');
    expect(paypalFetchMock).not.toHaveBeenCalled();
  });

  it('does not capture a signed return for a PayPal order with the wrong custom id', async () => {
    vi.stubEnv('INTERNAL_API_SECRET', 'return-secret');
    paypalFetchMock.mockResolvedValueOnce(
      response({
        id: 'ORDER-OTHER',
        status: 'APPROVED',
        purchase_units: [
          {
            custom_id: 'someone-else',
            amount: { currency_code: 'USD', value: '2.00' },
          },
        ],
      }),
    );
    const { testHandler: handler, signPayPalTestState } = await import('../capture-paypal-test-return');
    const state = signPayPalTestState({
      founderUserId: 'founder-1',
      issuedAt: Date.now(),
      nonce: 'nonce-1',
    });

    const res = await handler({
      httpMethod: 'GET',
      headers: {},
      body: null,
      queryStringParameters: {
        token: 'ORDER-OTHER',
        state,
      },
    } as any, {} as any);

    expect(res.statusCode).toBe(403);
    expect(paypalFetchMock).toHaveBeenCalledTimes(1);
    expect(upsertMock).not.toHaveBeenCalled();
  });

  it('creates a signed internal approval link using Netlify runtime PayPal credentials', async () => {
    vi.stubEnv('INTERNAL_API_SECRET', 'return-secret');
    vi.stubEnv('FOUNDER_UUID', 'founder-1');
    paypalFetchMock.mockResolvedValueOnce(
      response({
        id: 'ORDER-INTERNAL',
        links: [{ rel: 'approve', href: 'https://www.paypal.com/checkoutnow?token=ORDER-INTERNAL' }],
      }),
    );
    const { testHandler: handler } = await import('../create-paypal-test-approval-link');

    const res = await handler({
      httpMethod: 'POST',
      headers: { 'x-internal-secret': 'return-secret' },
      body: '{}',
      queryStringParameters: null,
    } as any, {} as any);
    const body = JSON.parse(res.body);
    const request = JSON.parse(paypalFetchMock.mock.calls[0][1].body);

    expect(res.statusCode).toBe(200);
    expect(body).toEqual(expect.objectContaining({
      status: 'passed',
      check: 'paypal_test_approval_link',
      orderId: 'ORDER-INTERNAL',
      approvalUrl: 'https://www.paypal.com/checkoutnow?token=ORDER-INTERNAL',
    }));
    expect(body.returnUrl).toContain('/.netlify/functions/capture-paypal-test-return?state=');
    expect(request.purchase_units[0]).toEqual(expect.objectContaining({
      custom_id: 'founder-1',
      amount: { currency_code: 'USD', value: '2.00' },
    }));
    expect(request.payment_source.paypal.experience_context.return_url).toContain('state=');
  });

  it('requires the internal secret before creating the internal approval link', async () => {
    vi.stubEnv('INTERNAL_API_SECRET', 'return-secret');
    vi.stubEnv('FOUNDER_UUID', 'founder-1');
    const { testHandler: handler } = await import('../create-paypal-test-approval-link');

    const res = await handler({
      httpMethod: 'POST',
      headers: {},
      body: '{}',
      queryStringParameters: null,
    } as any, {} as any);

    expect(res.statusCode).toBe(403);
    expect(paypalFetchMock).not.toHaveBeenCalled();
  });
});
