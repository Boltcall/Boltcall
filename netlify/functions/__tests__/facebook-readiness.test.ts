import { beforeEach, describe, expect, it, vi } from 'vitest';

function event(headers: Record<string, string> = {}) {
  return {
    httpMethod: 'POST',
    headers,
    body: '{}',
    queryStringParameters: null,
  } as any;
}

function graphResponse(body: Record<string, unknown>, ok = true, status = 200) {
  return {
    ok,
    status,
    json: vi.fn(async () => body),
    text: vi.fn(async () => JSON.stringify(body)),
  } as any;
}

describe('facebook-readiness', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubEnv('INTERNAL_API_SECRET', 'test-internal-secret');
    vi.stubEnv('FB_APP_ID', 'fb-app-id');
    vi.stubEnv('FB_APP_SECRET', 'fb-app-secret');
    vi.stubEnv('FB_WEBHOOK_VERIFY_TOKEN', 'fb-verify-token');
    vi.stubGlobal('fetch', vi.fn());
  });

  it('requires the internal secret before touching Facebook', async () => {
    const { handler } = await import('../facebook-readiness');

    const res = await handler(event(), {} as any);

    expect(res.statusCode).toBe(403);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('reports Facebook runtime readiness without exposing secrets or tokens', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(graphResponse({ access_token: 'fb-app-token-secret' }))
      .mockResolvedValueOnce(graphResponse({ data: { is_valid: true, app_id: 'fb-app-id' } }));
    const { handler } = await import('../facebook-readiness');

    const res = await handler(event({ 'x-internal-secret': 'test-internal-secret' }), {} as any);
    const body = JSON.parse(res.body);

    expect(res.statusCode).toBe(200);
    expect(body).toEqual({
      status: 'passed',
      check: 'facebook_api_readiness',
      graphVersion: 'v20.0',
      hasAppId: true,
      hasAppSecret: true,
      hasWebhookVerifyToken: true,
      hasAppAccessToken: true,
      tokenValid: true,
      appIdMatches: true,
    });
    expect(JSON.stringify(body)).not.toContain('fb-app-token-secret');
    expect(JSON.stringify(body)).not.toContain('fb-app-secret');
    expect(JSON.stringify(body)).not.toContain('fb-verify-token');
  });

  it('fails closed when required Facebook env is missing', async () => {
    vi.stubEnv('FB_APP_SECRET', '');
    const { handler } = await import('../facebook-readiness');

    const res = await handler(event({ 'x-internal-secret': 'test-internal-secret' }), {} as any);
    const body = JSON.parse(res.body);

    expect(res.statusCode).toBe(500);
    expect(body).toMatchObject({
      status: 'failed',
      hasAppId: true,
      hasAppSecret: false,
      hasWebhookVerifyToken: true,
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('returns a sanitized failure when Facebook rejects the app credentials', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(graphResponse({ error: { message: 'invalid appsecret_proof' } }, false, 400));
    const { handler } = await import('../facebook-readiness');

    const res = await handler(event({ 'x-internal-secret': 'test-internal-secret' }), {} as any);
    const body = JSON.parse(res.body);

    expect(res.statusCode).toBe(502);
    expect(body).toMatchObject({
      status: 'failed',
      check: 'facebook_api_readiness',
      hasAppId: true,
      hasAppSecret: true,
      hasWebhookVerifyToken: true,
    });
  });
});
