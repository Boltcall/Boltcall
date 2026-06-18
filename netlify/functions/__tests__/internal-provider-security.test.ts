import { beforeEach, describe, expect, it, vi } from 'vitest';

function makePost(body: Record<string, unknown>, headers: Record<string, string> = {}) {
  return {
    httpMethod: 'POST',
    headers: {
      'content-type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(body),
    queryStringParameters: null,
  } as any;
}

describe('internal provider endpoint hardening', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.INTERNAL_API_SECRET = 'test-internal-secret';
    delete process.env.INTERNAL_WEBHOOK_SECRET;
    delete process.env.CRON_SECRET;
    vi.stubGlobal('fetch', vi.fn());
  });

  it('requires an internal secret before scraping with Firecrawl or fallback providers', async () => {
    process.env.FIRECRAWL_API_KEY_1 = 'firecrawl-test-key';
    const { testHandler: handler } = await import('../firecrawl-scrape');

    const res = await handler(makePost({ url: 'https://example.com' }), {} as any);

    expect(res.statusCode).toBe(403);
    expect(JSON.parse(res.body).error).toMatch(/forbidden/i);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('rejects private-network scrape targets before calling Firecrawl or fallback providers', async () => {
    process.env.FIRECRAWL_API_KEY_1 = 'firecrawl-test-key';
    const { testHandler: handler } = await import('../firecrawl-scrape');

    const res = await handler(
      makePost(
        { url: 'http://127.0.0.1:54321/admin' },
        { 'x-internal-secret': 'test-internal-secret' },
      ),
      {} as any,
    );

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error).toMatch(/private network/i);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('rejects private-network scrape-url targets before the basic fetch fallback', async () => {
    const { testHandler: handler } = await import('../scrape-url');

    const res = await handler(
      makePost(
        { url: 'http://127.0.0.1:54321/admin' },
        { 'x-internal-secret': 'test-internal-secret' },
      ),
      {} as any,
    );

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error).toMatch(/private network/i);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('requires an internal secret before issuing Greeninvoice documents', async () => {
    process.env.GREENINVOICE_API_KEY = 'greeninvoice-test-key';
    process.env.GREENINVOICE_SECRET = 'greeninvoice-test-secret';
    const { testHandler: handler } = await import('../greeninvoice-issue');

    const res = await handler(
      makePost({
        stripeInvoiceId: 'in_test',
        userId: 'user-a',
        amountILS: 1000,
      }),
      {} as any,
    );

    expect(res.statusCode).toBe(403);
    expect(JSON.parse(res.body).error).toMatch(/forbidden/i);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('does not operate as an unauthenticated email relay', async () => {
    process.env.BREVO_API_KEY = 'brevo-test-key';
    const { testHandler: handler } = await import('../send-email');

    const res = await handler(
      makePost({
        to: 'lead@example.com',
        subject: 'Hello',
        textContent: 'Hi',
      }),
      {} as any,
    );

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error).toMatch(/userid/i);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('rejects Cal.com webhooks when the signing secret is not configured', async () => {
    delete process.env.CALCOM_WEBHOOK_SECRET;
    const { testHandler: handler } = await import('../appointment-handler');

    const res = await handler(
      makePost({ triggerEvent: 'BOOKING_CREATED', payload: {} }),
      {} as any,
    );

    expect(res.statusCode).toBe(500);
    expect(JSON.parse(res.body).error).toMatch(/webhook secret/i);
    expect(fetch).not.toHaveBeenCalled();
  });
});
