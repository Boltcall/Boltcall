import { beforeEach, describe, expect, it, vi } from 'vitest';

const getServiceSupabaseMock = vi.hoisted(() => vi.fn());

vi.mock('../_shared/token-utils', () => ({
  getServiceSupabase: getServiceSupabaseMock,
}));

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

describe('scrape-url customer auth', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.INTERNAL_API_SECRET = 'test-internal-secret';
    delete process.env.FIRECRAWL_API_KEY_1;
    delete process.env.FIRECRAWL_API_KEY_2;
    delete process.env.FIRECRAWL_API_KEY_3;

    getServiceSupabaseMock.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-a', email: 'customer@example.com' } },
          error: null,
        }),
      },
    });

    vi.stubGlobal('fetch', vi.fn(async (url: string | URL) => {
      const href = String(url);
      if (href.includes('n8n.srv974118.hstgr.cloud')) {
        return { ok: false, json: async () => ({ success: false }) };
      }

      return {
        ok: true,
        text: async () => '<html><head><title>Customer Site</title></head><body><main>We repair HVAC systems and book emergency appointments.</main></body></html>',
      };
    }));
  });

  it('allows a logged-in customer to scrape a public website without an internal secret header', async () => {
    const { testHandler: handler } = await import('../scrape-url');

    const res = await handler(
      makePost(
        { url: 'https://example.com' },
        { authorization: 'Bearer valid-customer-token' },
      ),
      {} as any,
    );

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toMatchObject({
      title: 'Customer Site',
      source: 'basic',
    });
    expect(getServiceSupabaseMock().auth.getUser).toHaveBeenCalledWith('valid-customer-token');
  });
});
