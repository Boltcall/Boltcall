import { beforeEach, describe, expect, it, vi } from 'vitest';

// F104: ?action=operation&id=<url> must not fetch an arbitrary host with
// real ACS HMAC auth headers attached — only the configured ACS endpoint.

function makeGetEvent(id: string, secret: string) {
  return {
    httpMethod: 'GET',
    headers: { 'x-internal-secret': secret },
    queryStringParameters: { action: 'operation', id },
  } as any;
}

describe('acs-numbers operation-status SSRF guard', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.INTERNAL_API_SECRET = 'test-internal-secret';
    delete process.env.INTERNAL_WEBHOOK_SECRET;
    delete process.env.CRON_SECRET;
    process.env.ACS_CONNECTION_STRING =
      'endpoint=https://boltcall.communication.azure.com/;accesskey=' + Buffer.from('test-key').toString('base64');
    vi.stubGlobal('fetch', vi.fn());
  });

  it('rejects a full-URL operationId pointing at a different host without ever fetching it', async () => {
    const { testHandler: handler } = await import('../acs-numbers');

    const res = await handler(
      makeGetEvent('http://169.254.169.254/latest/meta-data/', 'test-internal-secret'),
      {} as any,
    );

    expect(res.statusCode).toBe(500);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('allows a relative operationId that resolves onto the configured ACS endpoint', async () => {
    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'succeeded', phoneNumbers: [] }),
    });

    const { testHandler: handler } = await import('../acs-numbers');
    const res = await handler(
      makeGetEvent('/phoneNumbers/operations/search/abc123?api-version=2022-12-01', 'test-internal-secret'),
      {} as any,
    );

    expect(res.statusCode).toBe(200);
    expect(fetch).toHaveBeenCalledWith(
      'https://boltcall.communication.azure.com/phoneNumbers/operations/search/abc123?api-version=2022-12-01',
      expect.anything(),
    );
  });
});
