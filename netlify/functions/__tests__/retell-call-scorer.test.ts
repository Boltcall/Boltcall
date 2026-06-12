import { beforeEach, describe, expect, it, vi } from 'vitest';

const chatCompletionMock = vi.hoisted(() => vi.fn());
const getSupabaseMock = vi.hoisted(() => vi.fn());

vi.mock('../_shared/azure-ai', () => ({
  chatCompletion: chatCompletionMock,
}));

vi.mock('../_shared/token-utils', () => ({
  getSupabase: getSupabaseMock,
}));

function makePost(call: Record<string, unknown>) {
  return {
    httpMethod: 'POST',
    headers: {
      'x-internal-secret': 'test-internal-secret',
      'content-type': 'application/json',
    },
    body: JSON.stringify({ call }),
    queryStringParameters: null,
  } as any;
}

function makeSupabase() {
  const upserts: Record<string, unknown[]> = {};
  return {
    upserts,
    from: vi.fn((table: string) => {
      if (table === 'agents') {
        return {
          select: () => ({
            or: () => ({
              limit: () => ({
                maybeSingle: () => Promise.resolve({
                  data: {
                    id: 'agent-row-1',
                    workspace_id: 'workspace-1',
                    name: 'Dental Front Desk',
                    description: 'Dental practice receptionist',
                  },
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      if (table === 'retell_prompt_versions') {
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
      if (table === 'aios_event_log') {
        return {
          insert: (row: unknown) => Promise.resolve({ data: row, error: null }),
        };
      }
      return {
        upsert: (rows: unknown) => {
          upserts[table] = Array.isArray(rows) ? rows : [rows];
          return Promise.resolve({ data: rows, error: null });
        },
      };
    }),
  };
}

describe('retell-call-scorer', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubEnv('INTERNAL_API_SECRET', 'test-internal-secret');
    chatCompletionMock.mockResolvedValue(JSON.stringify({
      booking_attempt: { score: 1, notes: 'Booked clearly' },
      objection_handling: { score: 0.5, notes: 'No objection' },
      on_script: { score: 0.8, notes: 'Mostly compliant' },
      caller_sentiment: { score: 0.9, notes: 'Positive' },
      hallucination_free: { score: 1, notes: 'No invented facts' },
      latency_ok: { score: 0.8, notes: 'Natural flow' },
    }));
  });

  it('scores completed Retell calls through the shared chatCompletion helper', async () => {
    const supabase = makeSupabase();
    getSupabaseMock.mockReturnValue(supabase);
    const { handler } = await import('../retell-call-scorer');

    const res = await handler(
      makePost({
        call_id: 'call-1',
        agent_id: 'retell-agent-1',
        call_status: 'ended',
        duration_ms: 45000,
        transcript: 'user: I need a cleaning appointment next week.\nagent: I can help with that and book you for Tuesday at 9am.',
        call_analysis: { call_successful: true, call_summary: 'Appointment booked for Tuesday.' },
      }),
      {} as any,
    );

    const body = JSON.parse(res.body);
    expect(res.statusCode).toBe(200);
    expect(body.scored).toBe(true);
    expect(body.call_id).toBe('call-1');
    expect(chatCompletionMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining('Transcript:'),
      { tier: 'light', maxTokens: 400 },
    );
    expect(supabase.upserts.retell_calls).toHaveLength(1);
    expect(supabase.upserts.retell_call_scores).toHaveLength(6);
  });
});
