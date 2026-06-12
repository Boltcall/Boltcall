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

function makeCustomLlmSupabase() {
  const state = {
    prompt: 'Original custom LLM prompt',
    healInserted: null as Record<string, unknown> | null,
    reviewInserted: null as Record<string, unknown> | null,
  };

  const okThenable = {
    then: (resolve: (value: { error: null }) => unknown) => Promise.resolve({ error: null }).then(resolve),
  };

  return {
    state,
    client: {
      from: vi.fn((table: string) => {
        if (table === 'agent_self_heal_log') {
          return {
            select: (_cols?: string, opts?: { count?: string; head?: boolean }) => {
              if (opts?.head) {
                return {
                  eq: () => ({
                    gte: () => Promise.resolve({ count: 0, error: null }),
                  }),
                };
              }
              return {
                eq: () => ({
                  eq: () => ({
                    single: () => Promise.resolve({
                      data: { agent_id: 'agent-owned', original_prompt: state.prompt },
                      error: null,
                    }),
                  }),
                }),
              };
            },
            insert: (row: Record<string, unknown>) => {
              state.healInserted = row;
              return {
                select: () => ({
                  single: () => Promise.resolve({ data: { id: 'heal-1' }, error: null }),
                }),
              };
            },
          };
        }

        if (table === 'agents') {
          const agentLookupResult = {
            limit: () => ({
              maybeSingle: () => Promise.resolve({
                data: { id: 'agent-row-1', system_prompt: state.prompt },
                error: null,
              }),
            }),
          };

          return {
            select: () => ({
              or: () => agentLookupResult,
              eq: () => ({
                or: () => agentLookupResult,
              }),
            }),
            update: (patch: { system_prompt?: string }) => {
              if (patch.system_prompt) state.prompt = patch.system_prompt;
              return { eq: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }) };
            },
          };
        }

        if (table === 'qa_rubrics') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  limit: () => ({
                    maybeSingle: () => Promise.resolve({ data: null, error: null }),
                  }),
                }),
              }),
            }),
          };
        }

        if (table === 'qa_reviews') {
          return {
            insert: (row: Record<string, unknown>) => {
              state.reviewInserted = row;
              return okThenable;
            },
            update: () => ({
              eq: () => ({
                eq: () => okThenable,
              }),
            }),
          };
        }

        return {};
      }),
    },
  };
}

describe('agent-self-heal tenant hardening', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.RETELL_API_KEY = 'test-retell-key';
    process.env.RETELL_CHAT_ANALYSIS_DELAY_MS = '0';
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

  it('returns 400 for malformed JSON before auth or provider work', async () => {
    const { handler } = await import('../agent-self-heal');

    const res = await handler(
      { httpMethod: 'POST', headers: { 'content-type': 'application/json' }, body: '{' } as any,
      {} as any,
    );

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body)).toEqual({ error: 'Invalid JSON body' });
    expect(requireInternalOrMatchingUserMock).not.toHaveBeenCalled();
    expect(requireUserMock).not.toHaveBeenCalled();
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

  it('can heal custom-llm agents by updating the mirrored Supabase prompt and verifying all scenarios', async () => {
    userOwnsAgentMock.mockResolvedValue(true);
    deductTokensMock.mockResolvedValue({ success: true, tokensDeducted: 20, remainingBalance: 100 });
    const supabase = makeCustomLlmSupabase();
    getServiceSupabaseMock.mockReturnValue(supabase.client);
    chatCompletionMock.mockImplementation(async (systemPrompt: string) => {
      if (systemPrompt.includes('voice agent debugger')) {
        return JSON.stringify({
          failureType: 'missed_booking',
          failureSummary: 'The agent did not offer a booking slot.',
          rootCause: 'Booking instruction was too weak.',
          testMessages: ['I need an appointment'],
          promptFix: 'Always offer the next available booking slot when intent is clear.',
          severity: 'high',
        });
      }
      if (systemPrompt.includes('AI agent test engineer')) {
        return JSON.stringify([
          { label: 'similar_1', messages: ['Can I book?'] },
          { label: 'similar_2', messages: ['Need an appointment'] },
          { label: 'similar_3', messages: ['Do you have tomorrow?'] },
          { label: 'exact', messages: ['I need an appointment'] },
        ]);
      }
      if (systemPrompt.includes('verification judge')) {
        return JSON.stringify({ passed: true, score: 95, notes: 'The fix held.' });
      }
      return '{}';
    });

    (fetch as any).mockImplementation(async (url: string, options?: RequestInit) => {
      const path = new URL(url).pathname;
      if (path.includes('/get-agent/')) {
        return {
          ok: true,
          json: async () => ({ agent_id: 'agent-owned', agent_name: 'Custom Agent', response_engine: { type: 'custom-llm' } }),
        };
      }
      if (path.endsWith('/create-retell-llm')) {
        return { ok: true, json: async () => ({ llm_id: `temp-llm-${Math.random()}` }) };
      }
      if (path.endsWith('/create-chat-agent')) {
        return { ok: true, json: async () => ({ agent_id: `chat-agent-${Math.random()}` }) };
      }
      if (path.endsWith('/create-chat')) {
        return { ok: true, json: async () => ({ chat_id: `chat-${Math.random()}`, first_message: 'Hi, I can help book you.' }) };
      }
      if (path.endsWith('/create-chat-completion')) {
        return { ok: true, json: async () => ({ messages: [{ role: 'assistant', content: 'I can book the next available slot for you.' }] }) };
      }
      if (path.includes('/get-chat/')) {
        return { ok: true, json: async () => ({ chat_analysis: { call_successful: false } }) };
      }
      if (path.includes('/end-chat/') || path.includes('/delete-chat-agent/') || path.includes('/delete-retell-llm/')) {
        return { ok: true, status: 204, json: async () => ({}) };
      }
      throw new Error(`Unexpected Retell path: ${path}`);
    });

    const { handler } = await import('../agent-self-heal');
    const res = await handler(
      makePost({
        action: 'heal',
        userId: 'user-a',
        agentId: 'agent-owned',
        transcript: 'lead: I need an appointment\nagent: Please call later',
        callAnalysis: { call_successful: false },
      }),
      {} as any,
    );

    const body = JSON.parse(res.body);
    expect(res.statusCode).toBe(200);
    expect(body.fix.verified).toBe(true);
    expect(body.fix.passedRuns).toBe(4);
    expect(supabase.state.prompt).toContain('AUTO-FIX v1');
    expect(supabase.state.prompt).toContain('Always offer the next available booking slot');
    expect(supabase.state.healInserted?.status).toBe('fixed');
    expect(supabase.state.reviewInserted?.heal_log_id).toBe('heal-1');
    expect(fetch).not.toHaveBeenCalledWith(
      expect.stringContaining('/update-retell-llm/'),
      expect.anything(),
    );
  });
});
