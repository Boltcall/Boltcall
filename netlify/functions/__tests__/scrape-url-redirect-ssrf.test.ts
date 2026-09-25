import { beforeEach, describe, expect, it, vi } from 'vitest';

// F117: the basic-scrape fallback must re-validate every redirect hop, not
// just the original URL, or a public URL that 302s to a private IP bypasses
// the SSRF guard entirely.

const getServiceSupabaseMock = vi.hoisted(() => vi.fn());

vi.mock('../_shared/token-utils', () => ({
  getServiceSupabase: getServiceSupabaseMock,
}));

function makePost(body: Record<string, unknown>, headers: Record<string, string> = {}) {
  return {
    httpMethod: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
    queryStringParameters: null,
  } as any;
}

describe('scrape-url redirect SSRF guard', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.INTERNAL_API_SECRET = 'test-internal-secret';
    delete process.env.FIRECRAWL_API_KEY_1;
    delete process.env.FIRECRAWL_API_KEY_2;
    delete process.env.FIRECRAWL_API_KEY_3;

    getServiceSupabaseMock.mockReturnValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-a' } }, error: null }) },
    });
  });

  it('blocks a public URL that 302-redirects to a private IP, without ever fetching the private target', async () => {
    const fetchMock = vi.fn(async (url: string | URL) => {
      const href = String(url);
      if (href.includes('n8n.srv974118.hstgr.cloud')) {
        return { ok: false, status: 502, headers: new Headers(), json: async () => ({ success: false }) };
      }
      if (href === 'https://example.com/') {
        return {
          ok: false,
          status: 302,
          headers: new Headers({ location: 'http://169.254.169.254/latest/meta-data/' }),
        };
      }
      throw new Error(`Unexpected fetch to ${href}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    const { testHandler: handler } = await import('../scrape-url');
    const res = await handler(
      makePost({ url: 'https://example.com/' }, { 'x-internal-secret': 'test-internal-secret' }),
      {} as any,
    );

    const body = JSON.parse(res.body);
    expect(body.source).toBe('error');
    expect(fetchMock).not.toHaveBeenCalledWith('http://169.254.169.254/latest/meta-data/', expect.anything());
  });

  it('follows a redirect to another public host and scrapes it', async () => {
    const fetchMock = vi.fn(async (url: string | URL) => {
      const href = String(url);
      if (href.includes('n8n.srv974118.hstgr.cloud')) {
        return { ok: false, status: 502, headers: new Headers(), json: async () => ({ success: false }) };
      }
      if (href === 'https://example.com/') {
        return { ok: false, status: 302, headers: new Headers({ location: 'https://example.org/landing' }) };
      }
      if (href === 'https://example.org/landing') {
        return {
          ok: true,
          status: 200,
          headers: new Headers(),
          text: async () => '<html><head><title>Landing</title></head><body>hi</body></html>',
        };
      }
      throw new Error(`Unexpected fetch to ${href}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    const { testHandler: handler } = await import('../scrape-url');
    const res = await handler(
      makePost({ url: 'https://example.com/' }, { 'x-internal-secret': 'test-internal-secret' }),
      {} as any,
    );

    const body = JSON.parse(res.body);
    expect(body.title).toBe('Landing');
    expect(body.source).toBe('basic');
  });
});
