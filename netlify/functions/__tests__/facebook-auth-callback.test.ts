import { beforeEach, describe, expect, it, vi } from 'vitest';

const verifyOAuthStateMock = vi.hoisted(() => vi.fn());
const getServiceSupabaseMock = vi.hoisted(() => vi.fn());

vi.mock('../_shared/oauth-state', () => ({
  verifyOAuthState: verifyOAuthStateMock,
}));

vi.mock('../_shared/token-utils', () => ({
  getServiceSupabase: getServiceSupabaseMock,
}));

function jsonResponse(body: Record<string, unknown>, ok = true) {
  return {
    ok,
    json: async () => body,
  } as Response;
}

function makeEvent() {
  return {
    httpMethod: 'GET',
    queryStringParameters: {
      code: 'oauth-code',
      state: 'signed-state',
    },
  } as any;
}

describe('facebook-auth-callback', () => {
  let upsertMock: ReturnType<typeof vi.fn>;
  let workspaceMaybeSingleMock: ReturnType<typeof vi.fn>;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.unstubAllEnvs();

    vi.stubEnv('FB_APP_ID', 'fb-app-id');
    vi.stubEnv('FB_APP_SECRET', 'fb-app-secret');
    vi.stubEnv('URL', 'https://boltcall.org');

    verifyOAuthStateMock.mockReturnValue({
      provider: 'facebook',
      userId: 'founder-user-id',
      nonce: 'nonce',
      iat: Date.now(),
    });

    upsertMock = vi.fn(async () => ({ error: null }));
    workspaceMaybeSingleMock = vi.fn(async () => ({
      data: { id: 'workspace-id-1' },
      error: null,
    }));

    const workspaceChain: any = {
      select: vi.fn(() => workspaceChain),
      eq: vi.fn(() => workspaceChain),
      limit: vi.fn(() => workspaceChain),
      maybeSingle: workspaceMaybeSingleMock,
    };
    const connectionsChain = {
      upsert: upsertMock,
    };

    getServiceSupabaseMock.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'workspaces') return workspaceChain;
        if (table === 'facebook_page_connections') return connectionsChain;
        throw new Error(`Unexpected table: ${table}`);
      }),
    });

    fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ access_token: 'user-token' }))
      .mockResolvedValueOnce(jsonResponse({
        data: [
          { id: 'page-1', name: 'Rapid Rooter QA', access_token: 'page-token' },
        ],
      }))
      .mockResolvedValueOnce(jsonResponse({ success: true }));
    vi.stubGlobal('fetch', fetchMock);
  });

  it('stores the Page token under access_token and scopes the connection to the resolved workspace', async () => {
    const { handler } = await import('../facebook-auth-callback');

    const res = await handler(makeEvent(), {} as any);

    expect(res.statusCode).toBe(302);
    expect(res.headers?.Location).toContain('/dashboard/instant-lead-reply?fb=success');
    expect(workspaceMaybeSingleMock).toHaveBeenCalled();
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'founder-user-id',
        workspace_id: 'workspace-id-1',
        page_id: 'page-1',
        page_name: 'Rapid Rooter QA',
        access_token: 'page-token',
      }),
      { onConflict: 'page_id' },
    );
    expect(upsertMock.mock.calls[0]?.[0]).not.toHaveProperty('page_access_token');
  });
});
