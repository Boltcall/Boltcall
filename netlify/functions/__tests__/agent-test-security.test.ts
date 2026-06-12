import { beforeEach, describe, expect, it, vi } from 'vitest';

const requireUserMock = vi.hoisted(() => vi.fn());
const userOwnsAgentMock = vi.hoisted(() => vi.fn());
const getSupabaseMock = vi.hoisted(() => vi.fn());
const chatCompletionMock = vi.hoisted(() => vi.fn());

vi.mock('../_shared/user-auth', () => ({
  requireUser: requireUserMock,
}));

vi.mock('../_shared/require-auth', () => ({
  userOwnsAgent: userOwnsAgentMock,
}));

vi.mock('../_shared/token-utils', () => ({
  getSupabase: getSupabaseMock,
}));

vi.mock('../_shared/azure-ai', () => ({
  chatCompletion: chatCompletionMock,
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
    chatCompletionMock.mockResolvedValue(JSON.stringify({
      call_successful: true,
      call_summary: 'The agent met the scenario criteria.',
      user_sentiment: 'neutral',
      evaluator_reason: 'criteria_met',
    }));
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

  it('returns 400 for malformed JSON before auth or Retell work', async () => {
    const { handler } = await import('../agent-test');

    const res = await handler(
      { httpMethod: 'POST', headers: { 'content-type': 'application/json' }, body: '{' } as any,
      {} as any,
    );

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body)).toEqual({ error: 'Invalid JSON body' });
    expect(requireUserMock).not.toHaveBeenCalled();
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

  it('scores completed scenarios with the AI evaluator instead of returning unknown verdicts', async () => {
    userOwnsAgentMock.mockResolvedValue(true);
    (fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          agent_name: 'Front Desk',
          response_engine: { type: 'retell-llm', llm_id: 'llm-1' },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ agent_id: 'chat-agent-1' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ chat_id: 'chat-1', first_message: 'Hi, how can I help?' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ messages: [{ role: 'assistant', content: 'I can help you book Tuesday at 9.' }] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

    const { handler } = await import('../agent-test');

    const res = await handler(
      makePost({
        action: 'run-tests',
        agentId: 'agent-owned',
        scenarios: [{
          id: 'booking',
          name: 'Booking',
          messages: ['Can I book Tuesday at 9?'],
          successCriteria: 'Agent should help book Tuesday at 9.',
        }],
      }),
      {} as any,
    );

    const body = JSON.parse(res.body);
    expect(res.statusCode).toBe(200);
    expect(body.summary).toEqual({ total: 1, passed: 1, failed: 0, unknown: 0 });
    expect(body.results[0].analysis.call_successful).toBe(true);
    expect(chatCompletionMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining('Agent should help book Tuesday at 9.'),
      { maxTokens: 700, tier: 'light' },
    );
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
