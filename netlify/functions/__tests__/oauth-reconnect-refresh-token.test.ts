import { beforeEach, describe, expect, it, vi } from 'vitest';

const verifyOAuthStateMock = vi.hoisted(() => vi.fn());
const getServiceSupabaseMock = vi.hoisted(() => vi.fn());

vi.mock('../_shared/oauth-state', () => ({
  verifyOAuthState: verifyOAuthStateMock,
}));

vi.mock('../_shared/token-utils', () => ({
  getServiceSupabase: getServiceSupabaseMock,
}));

vi.mock('../_shared/app-secrets', () => ({
  getAppSecret: vi.fn(async () => 'hubspot-secret'),
}));

function jsonResponse(body: Record<string, unknown>, ok = true) {
  return { ok, json: async () => body } as Response;
}

function makeEvent() {
  return {
    httpMethod: 'GET',
    queryStringParameters: { code: 'oauth-code', state: 'signed-state' },
  } as any;
}

function makeSupabaseWithExistingIntegration() {
  const updateMock = vi.fn(() => ({ eq: vi.fn(async () => ({ error: null })) }));
  const maybeSingleMock = vi.fn(async () => ({ data: { id: 'integration-1' }, error: null }));
  const from = vi.fn(() => ({
    select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: maybeSingleMock }) }) }),
    update: updateMock,
  }));
  return { sb: { from }, updateMock };
}

describe('OAuth reconnect callbacks preserve refresh_token when the provider omits it (F111)', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.stubEnv('URL', 'https://boltcall.org');
    verifyOAuthStateMock.mockReturnValue({ provider: 'google_calendar', userId: 'user-1' });
  });

  it('google-calendar-auth-callback does not null out api_key on a reconnect with no refresh_token', async () => {
    vi.stubEnv('GOOGLE_CLIENT_ID', 'client-id');
    vi.stubEnv('GOOGLE_CLIENT_SECRET', 'client-secret');
    const { sb, updateMock } = makeSupabaseWithExistingIntegration();
    getServiceSupabaseMock.mockReturnValue(sb);

    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(jsonResponse({ access_token: 'new-access-token', expires_in: 3600 })) // token exchange, no refresh_token
      .mockResolvedValueOnce(jsonResponse({ email: 'firm@example.com' })) // userinfo
      .mockResolvedValueOnce(jsonResponse({ items: [{ primary: true, id: 'cal-1', summary: 'Primary' }] })), // calendarList
    );

    const { testHandler: handler } = await import('../google-calendar-auth-callback');
    const res = await handler(makeEvent(), {} as any);

    expect(res.statusCode).toBe(302);
    expect(updateMock).toHaveBeenCalledTimes(1);
    const updatePayload = updateMock.mock.calls[0][0] as Record<string, unknown>;
    expect(updatePayload.api_key).toBeUndefined();
  });

  it('hubspot-auth-callback does not null out api_key on a reconnect with no refresh_token', async () => {
    verifyOAuthStateMock.mockReturnValue({ provider: 'hubspot', userId: 'user-1' });
    vi.stubEnv('HUBSPOT_CLIENT_ID', 'client-id');
    vi.stubEnv('HUBSPOT_CLIENT_SECRET', 'client-secret');
    const { sb, updateMock } = makeSupabaseWithExistingIntegration();
    getServiceSupabaseMock.mockReturnValue(sb);

    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(jsonResponse({ access_token: 'new-access-token', expires_in: 1800 })) // token exchange, no refresh_token
      .mockResolvedValueOnce(jsonResponse({ hub_domain: 'firm.hubspot.com' })), // access-token info (best-effort)
    );

    const { testHandler: handler } = await import('../hubspot-auth-callback');
    const res = await handler(makeEvent(), {} as any);

    expect(res.statusCode).toBe(302);
    expect(updateMock).toHaveBeenCalledTimes(1);
    const updatePayload = updateMock.mock.calls[0][0] as Record<string, unknown>;
    expect(updatePayload.api_key).toBeUndefined();
  });
});
