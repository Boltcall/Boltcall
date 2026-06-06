import { beforeEach, describe, expect, it, vi } from 'vitest';

const chatCompletionMock = vi.hoisted(() => vi.fn());
const getServiceSupabaseMock = vi.hoisted(() => vi.fn());
const notifyErrorMock = vi.hoisted(() => vi.fn());
const notifyInfoMock = vi.hoisted(() => vi.fn());
const requireInternalOrMatchingUserMock = vi.hoisted(() => vi.fn());
const userOwnsAgentMock = vi.hoisted(() => vi.fn());

vi.mock('../_shared/azure-ai', () => ({
  chatCompletion: chatCompletionMock,
}));

vi.mock('../_shared/notify', () => ({
  notifyError: notifyErrorMock,
  notifyInfo: notifyInfoMock,
}));

vi.mock('../_shared/token-utils', () => ({
  getServiceSupabase: getServiceSupabaseMock,
}));

vi.mock('../_shared/user-auth', () => ({
  requireInternalOrMatchingUser: requireInternalOrMatchingUserMock,
}));

vi.mock('../_shared/require-auth', () => ({
  userOwnsAgent: userOwnsAgentMock,
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

describe('conversation-outcome tenant hardening', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn());
    requireInternalOrMatchingUserMock.mockResolvedValue({ ok: true, userId: 'user-a', user: null });
    userOwnsAgentMock.mockResolvedValue(false);
  });

  it('rejects outcome writes and self-heal triggers for agents outside the requested user tenant', async () => {
    const { handler } = await import('../conversation-outcome');

    const res = await handler(
      makePost({
        userId: 'user-a',
        agentId: 'agent-victim',
        channel: 'voice',
        conversationId: 'call-a',
        transcript: 'lead: hello',
      }),
      {} as any,
    );

    expect(res.statusCode).toBe(403);
    expect(JSON.parse(res.body).error).toMatch(/authorized/i);
    expect(userOwnsAgentMock).toHaveBeenCalledWith('user-a', 'agent-victim');
    expect(chatCompletionMock).not.toHaveBeenCalled();
    expect(getServiceSupabaseMock).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
    expect(notifyInfoMock).not.toHaveBeenCalled();
  });
});
