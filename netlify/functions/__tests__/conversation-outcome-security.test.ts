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

function makeSupabase() {
  const inserted: Record<string, unknown>[] = [];
  return {
    inserted,
    client: {
      from: vi.fn((table: string) => {
        if (table !== 'conversation_wins') return {};
        return {
          insert: (row: Record<string, unknown>) => {
            inserted.push(row);
            return Promise.resolve({ data: null, error: null });
          },
        };
      }),
    },
  };
}

describe('conversation-outcome tenant hardening', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn());
    vi.stubEnv('INTERNAL_API_SECRET', 'test-internal-secret');
    vi.stubEnv('URL', 'https://boltcall.test');
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

  it('records a win and triggers success analysis for successful conversations', async () => {
    userOwnsAgentMock.mockResolvedValue(true);
    const supabase = makeSupabase();
    getServiceSupabaseMock.mockReturnValue(supabase.client);
    (fetch as any).mockResolvedValue({ ok: true });

    const { handler } = await import('../conversation-outcome');

    const res = await handler(
      makePost({
        userId: 'user-a',
        agentId: 'agent-owned',
        channel: 'voice',
        conversationId: 'call-win',
        transcript: 'lead: I need help booking an appointment\nagent: You are booked for Tuesday at 10am. See you then.',
        callAnalysis: { call_successful: true, call_summary: 'Appointment booked for Tuesday' },
      }),
      {} as any,
    );

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toMatchObject({
      outcome: 'win',
      healTriggered: false,
      successAnalysisTriggered: true,
    });
    expect(supabase.inserted).toEqual([
      expect.objectContaining({
        user_id: 'user-a',
        agent_id: 'agent-owned',
        channel: 'voice',
        outcome_type: 'booked',
        conversation_id: 'call-win',
      }),
    ]);
    expect(fetch).toHaveBeenCalledWith(
      'https://boltcall.test/.netlify/functions/agent-self-heal',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'x-internal-secret': 'test-internal-secret' }),
        body: expect.stringContaining('"action":"analyze-success"'),
      }),
    );
  });

  it('triggers self-heal and does not record a win for failed conversations', async () => {
    userOwnsAgentMock.mockResolvedValue(true);
    const supabase = makeSupabase();
    getServiceSupabaseMock.mockReturnValue(supabase.client);
    (fetch as any).mockResolvedValue({ ok: true });

    const { handler } = await import('../conversation-outcome');

    const res = await handler(
      makePost({
        userId: 'user-a',
        agentId: 'agent-owned',
        channel: 'voice',
        conversationId: 'call-fail',
        transcript: 'lead: I need an appointment\nagent: Please call later',
        callAnalysis: { call_successful: false, call_summary: 'Lead wanted booking but no booking was offered' },
      }),
      {} as any,
    );

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toMatchObject({
      outcome: 'fail',
      healTriggered: true,
    });
    expect(supabase.inserted).toHaveLength(0);
    expect(fetch).toHaveBeenCalledWith(
      'https://boltcall.test/.netlify/functions/agent-self-heal',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'x-internal-secret': 'test-internal-secret' }),
        body: expect.stringContaining('"action":"heal"'),
      }),
    );
    expect(notifyInfoMock).toHaveBeenCalled();
  });
});
