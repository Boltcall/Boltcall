import { beforeEach, describe, expect, it, vi } from 'vitest';

const createOAuthStateMock = vi.hoisted(() => vi.fn());
const requireMatchingUserMock = vi.hoisted(() => vi.fn());

vi.mock('../_shared/oauth-state', () => ({
  createOAuthState: createOAuthStateMock,
}));

vi.mock('../_shared/user-auth', () => ({
  requireMatchingUser: requireMatchingUserMock,
}));

describe('clio-auth-start', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.unstubAllEnvs();

    vi.stubEnv('CLIO_CLIENT_ID', 'clio-client-id');
    vi.stubEnv('URL', 'https://boltcall.org');
    createOAuthStateMock.mockReturnValue('signed-state');
    requireMatchingUserMock.mockResolvedValue({
      ok: true,
      userId: 'firm-user-id',
      user: { id: 'firm-user-id' },
    });
  });

  it('builds the US authorize URL with the registered redirect', async () => {
    const { testHandler: handler } = await import('../clio-auth-start');

    const res = await handler({
      httpMethod: 'GET',
      headers: { authorization: 'Bearer jwt' },
      queryStringParameters: { user_id: 'firm-user-id' },
    } as any, {} as any);

    expect(res.statusCode).toBe(200);
    const url = new URL(JSON.parse(String(res.body)).url);

    expect(url.origin).toBe('https://app.clio.com');
    expect(url.pathname).toBe('/oauth/authorize');
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('client_id')).toBe('clio-client-id');
    expect(url.searchParams.get('redirect_uri')).toBe('https://boltcall.org/.netlify/functions/clio-auth-callback');
    expect(url.searchParams.get('state')).toBe('signed-state');
    expect(url.searchParams.get('redirect_on_decline')).toBe('true');
  });

  it('signs the region into state so the callback hits the right token endpoint', async () => {
    const { testHandler: handler } = await import('../clio-auth-start');

    const res = await handler({
      httpMethod: 'GET',
      headers: { authorization: 'Bearer jwt' },
      queryStringParameters: { user_id: 'firm-user-id', region: 'eu' },
    } as any, {} as any);

    const url = new URL(JSON.parse(String(res.body)).url);
    expect(url.origin).toBe('https://eu.app.clio.com');
    expect(createOAuthStateMock).toHaveBeenCalledWith('clio', 'firm-user-id', { region: 'eu' });
  });

  it('falls back to the US app when an unknown region is requested', async () => {
    const { testHandler: handler } = await import('../clio-auth-start');

    const res = await handler({
      httpMethod: 'GET',
      headers: { authorization: 'Bearer jwt' },
      queryStringParameters: { user_id: 'firm-user-id', region: 'mars' },
    } as any, {} as any);

    expect(new URL(JSON.parse(String(res.body)).url).origin).toBe('https://app.clio.com');
    expect(createOAuthStateMock).toHaveBeenCalledWith('clio', 'firm-user-id', { region: 'us' });
  });

  it('refuses a region with no developer application configured', async () => {
    vi.stubEnv('CLIO_CLIENT_ID', '');
    const { testHandler: handler } = await import('../clio-auth-start');

    const res = await handler({
      httpMethod: 'GET',
      headers: { authorization: 'Bearer jwt' },
      queryStringParameters: { user_id: 'firm-user-id', region: 'ca' },
    } as any, {} as any);

    expect(res.statusCode).toBe(500);
    expect(JSON.parse(String(res.body)).error).toContain('ca');
  });

  it('prefers a region-specific client id over the default app', async () => {
    vi.stubEnv('CLIO_CLIENT_ID_EU', 'clio-eu-client-id');
    const { testHandler: handler } = await import('../clio-auth-start');

    const res = await handler({
      httpMethod: 'GET',
      headers: { authorization: 'Bearer jwt' },
      queryStringParameters: { user_id: 'firm-user-id', region: 'eu' },
    } as any, {} as any);

    expect(new URL(JSON.parse(String(res.body)).url).searchParams.get('client_id')).toBe('clio-eu-client-id');
  });
});

describe('oauth-state extra payload', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.stubEnv('OAUTH_STATE_SECRET', 'test-secret');
  });

  it('round-trips the signed region through verify', async () => {
    const actual = await vi.importActual<typeof import('../_shared/oauth-state')>('../_shared/oauth-state');
    const state = actual.createOAuthState('clio', 'firm-user-id', { region: 'au' });
    const payload = actual.verifyOAuthState(state, 'clio');

    expect(payload?.userId).toBe('firm-user-id');
    expect(payload?.extra?.region).toBe('au');
  });

  it('rejects a state whose signature does not cover the tampered region', async () => {
    const actual = await vi.importActual<typeof import('../_shared/oauth-state')>('../_shared/oauth-state');
    const state = actual.createOAuthState('clio', 'firm-user-id', { region: 'au' });

    const [encoded, sig] = state.split('.');
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
    payload.extra.region = 'us';
    const tampered = `${Buffer.from(JSON.stringify(payload)).toString('base64url')}.${sig}`;

    expect(actual.verifyOAuthState(tampered, 'clio')).toBeNull();
  });
});
