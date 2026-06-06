import { beforeEach, describe, expect, it, vi } from 'vitest';

const chatCompletionMock = vi.hoisted(() => vi.fn());
const deductTokensMock = vi.hoisted(() => vi.fn());
const getServiceSupabaseMock = vi.hoisted(() => vi.fn());
const notifyErrorMock = vi.hoisted(() => vi.fn());
const notifyInfoMock = vi.hoisted(() => vi.fn());
const requireInternalOrMatchingUserMock = vi.hoisted(() => vi.fn());
const requireUserMock = vi.hoisted(() => vi.fn());
const userOwnsAgentMock = vi.hoisted(() => vi.fn());

vi.mock('../_shared/azure-ai', () => ({
  chatCompletion: chatCompletionMock,
}));

vi.mock('../_shared/notify', () => ({
  notifyError: notifyErrorMock,
  notifyInfo: notifyInfoMock,
}));

vi.mock('../_shared/token-utils', () => ({
  deductTokens: deductTokensMock,
  getServiceSupabase: getServiceSupabaseMock,
  TOKEN_COSTS: {
    ai_qa_success_analysis: 10,
    ai_self_heal: 50,
  },
}));

vi.mock('../_shared/user-auth', () => ({
  requireInternalOrMatchingUser: requireInternalOrMatchingUserMock,
  requireUser: requireUserMock,
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

describe('agent-self-heal tenant hardening', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.RETELL_API_KEY = 'test-retell-key';
    vi.stubGlobal('fetch', vi.fn());
    requireInternalOrMatchingUserMock.mockResolvedValue({ ok: true, userId: 'user-a', user: null });
    requireUserMock.mockResolvedValue({ ok: true, userId: 'user-a', user: { id: 'user-a' } });
    userOwnsAgentMock.mockResolvedValue(false);
  });

  it('rejects self-heal runs for agents outside the requested user tenant before token or provider work', async () => {
    const { handler } = await import('../agent-self-heal');

    const res = await handler(
      makePost({
        action: 'heal',
        userId: 'user-a',
        agentId: 'agent-victim',
        transcript: 'lead: hello',
      }),
      {} as any,
    );

    expect(res.statusCode).toBe(403);
    expect(JSON.parse(res.body).error).toMatch(/authorized/i);
    expect(userOwnsAgentMock).toHaveBeenCalledWith('user-a', 'agent-victim');
    expect(getServiceSupabaseMock).not.toHaveBeenCalled();
    expect(deductTokensMock).not.toHaveBeenCalled();
    expect(chatCompletionMock).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('rejects success analysis for agents outside the requested user tenant before charging tokens', async () => {
    const { handler } = await import('../agent-self-heal');

    const res = await handler(
      makePost({
        action: 'analyze-success',
        userId: 'user-a',
        agentId: 'agent-victim',
        transcript: 'lead: thanks, booked',
      }),
      {} as any,
    );

    expect(res.statusCode).toBe(403);
    expect(JSON.parse(res.body).error).toMatch(/authorized/i);
    expect(userOwnsAgentMock).toHaveBeenCalledWith('user-a', 'agent-victim');
    expect(getServiceSupabaseMock).not.toHaveBeenCalled();
    expect(deductTokensMock).not.toHaveBeenCalled();
    expect(chatCompletionMock).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('rejects filtered history reads for agents outside the effective user tenant', async () => {
    const { handler } = await import('../agent-self-heal');

    const res = await handler(
      makePost({
        action: 'history',
        userId: 'user-a',
        agentId: 'agent-victim',
      }),
      {} as any,
    );

    expect(res.statusCode).toBe(403);
    expect(JSON.parse(res.body).error).toMatch(/authorized/i);
    expect(userOwnsAgentMock).toHaveBeenCalledWith('user-a', 'agent-victim');
    expect(getServiceSupabaseMock).not.toHaveBeenCalled();
  });
});
