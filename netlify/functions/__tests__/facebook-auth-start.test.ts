import { beforeEach, describe, expect, it, vi } from 'vitest';

const createOAuthStateMock = vi.hoisted(() => vi.fn());
const requireMatchingUserMock = vi.hoisted(() => vi.fn());

vi.mock('../_shared/oauth-state', () => ({
  createOAuthState: createOAuthStateMock,
}));

vi.mock('../_shared/user-auth', () => ({
  requireMatchingUser: requireMatchingUserMock,
}));

describe('facebook-auth-start', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.unstubAllEnvs();

    vi.stubEnv('FB_APP_ID', 'fb-app-id');
    vi.stubEnv('URL', 'https://boltcall.org');
    createOAuthStateMock.mockReturnValue('signed-state');
    requireMatchingUserMock.mockResolvedValue({
      ok: true,
      userId: 'founder-user-id',
      user: { id: 'founder-user-id' },
    });
  });

  it('requests the Page permissions needed to subscribe and test Lead Ads forms', async () => {
    const { handler } = await import('../facebook-auth-start');

    const res = await handler({
      httpMethod: 'GET',
      headers: { authorization: 'Bearer jwt' },
      queryStringParameters: { user_id: 'founder-user-id' },
    } as any, {} as any);

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(String(res.body));
    const url = new URL(body.url);
    const scopes = new Set(url.searchParams.get('scope')?.split(',') || []);

    expect(scopes).toContain('pages_manage_metadata');
    expect(scopes).toContain('pages_manage_ads');
    expect(scopes).toContain('pages_read_engagement');
    expect(scopes).toContain('leads_retrieval');
    expect(scopes).toContain('pages_show_list');
  });
});
