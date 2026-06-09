import { beforeEach, describe, expect, it, vi } from 'vitest';

const requireUserMock = vi.hoisted(() => vi.fn());
const userOwnsAgentMock = vi.hoisted(() => vi.fn());
const getSupabaseMock = vi.hoisted(() => vi.fn());

vi.mock('../_shared/user-auth', () => ({
  requireUser: requireUserMock,
}));

vi.mock('../_shared/require-auth', () => ({
  userOwnsAgent: userOwnsAgentMock,
}));

vi.mock('../_shared/token-utils', () => ({
  getSupabase: getSupabaseMock,
}));

function makePost(body: Record<string, unknown>) {
  return {
    httpMethod: 'POST',
    headers: {
      authorization: 'Bearer valid-token',
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
    queryStringParameters: null,
  } as any;
}

describe('agent-test tenant hardening', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.RETELL_API_KEY = 'test-retell-key';
    vi.stubGlobal('fetch', vi.fn());
    requireUserMock.mockResolvedValue({ ok: true, userId: 'user-a', user: { id: 'user-a' } });
    userOwnsAgentMock.mockResolvedValue(false);
  });

  it('requires authentication before exposing test scenarios or Retell actions', async () => {
    requireUserMock.mockResolvedValue({
      ok: false,
      response: {
        statusCode: 401,
        headers: {},
        body: JSON.stringify({ error: 'Authentication required' }),
      },
    });
    const { handler } = await import('../agent-test');

    const res = await handler(makePost({ action: 'list-scenarios' }), {} as any);

    expect(res.statusCode).toBe(401);
    expect(userOwnsAgentMock).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('rejects full test runs for agents outside the authenticated user tenant', async () => {
    const { handler } = await import('../agent-test');

    const res = await handler(
      makePost({
        action: 'run-tests',
        agentId: 'agent-victim',
      }),
      {} as any,
    );

    expect(res.statusCode).toBe(403);
    expect(JSON.parse(res.body).error).toMatch(/authorized/i);
    expect(userOwnsAgentMock).toHaveBeenCalledWith('user-a', 'agent-victim');
    expect(getSupabaseMock).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('rejects single scenario runs for agents outside the authenticated user tenant', async () => {
    const { handler } = await import('../agent-test');

    const res = await handler(
      makePost({
        action: 'run-single',
        agentId: 'agent-victim',
        scenario: {
          id: 'probe',
          name: 'Probe',
          messages: ['hello'],
          successCriteria: 'no provider calls',
        },
      }),
      {} as any,
    );

    expect(res.statusCode).toBe(403);
    expect(JSON.parse(res.body).error).toMatch(/authorized/i);
    expect(userOwnsAgentMock).toHaveBeenCalledWith('user-a', 'agent-victim');
    expect(getSupabaseMock).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });
});
