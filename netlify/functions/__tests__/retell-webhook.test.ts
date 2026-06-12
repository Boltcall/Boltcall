import { beforeEach, describe, expect, it, vi } from 'vitest';

const fireWebhooksMock = vi.hoisted(() => vi.fn());
const getSupabaseMock = vi.hoisted(() => vi.fn());
const verifyRetellSignatureMock = vi.hoisted(() => vi.fn(() => 'ok'));

vi.mock('../_shared/notify', () => ({
  notifyError: vi.fn(),
}));

vi.mock('../_shared/token-utils', () => ({
  getSupabase: getSupabaseMock,
}));

vi.mock('../_shared/fire-webhooks', () => ({
  fireWebhooks: fireWebhooksMock,
}));

vi.mock('../_shared/verify-signatures', () => ({
  verifyRetellSignature: verifyRetellSignatureMock,
}));

describe('retell-webhook', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
    verifyRetellSignatureMock.mockReturnValue('ok');
  });

  it('returns 400 for malformed JSON instead of the generic 500 handler', async () => {
    const { handler } = await import('../retell-webhook');

    const res = await handler(
      {
        httpMethod: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{',
      } as any,
      {} as any,
      vi.fn(),
    );

    expect(res?.statusCode).toBe(400);
    expect(JSON.parse(res?.body || '{}')).toEqual({ error: 'Invalid JSON body' });
  });

  it('rejects missing Retell signatures whenever the Retell secret is configured', async () => {
    vi.stubEnv('RETELL_API_KEY', 'test-retell-secret');
    verifyRetellSignatureMock.mockReturnValue('missing');

    const { handler } = await import('../retell-webhook');

    const res = await handler(
      {
        httpMethod: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ call: { call_id: 'call-123', agent_id: 'agent-123' } }),
      } as any,
      {} as any,
      vi.fn(),
    );

    expect(res?.statusCode).toBe(401);
    expect(JSON.parse(res?.body || '{}').error).toMatch(/signature required/i);
  });

  it('routes completed substantive calls through outcome evaluation and scoring', async () => {
    vi.stubEnv('URL', 'https://boltcall.test');
    vi.stubEnv('INTERNAL_API_SECRET', 'test-internal-secret');
    getSupabaseMock.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'agents') {
          return {
            select: () => ({
              or: () => ({
                limit: () => ({
                  maybeSingle: () => Promise.resolve({ data: { user_id: 'user-a' }, error: null }),
                }),
              }),
            }),
          };
        }
        return {};
      }),
    });

    const { handler } = await import('../retell-webhook');

    const res = await handler(
      {
        httpMethod: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          event: 'call_ended',
          call: {
            call_id: 'call-complete-1',
            agent_id: 'agent-owned',
            call_status: 'ended',
            duration_ms: 45000,
            transcript: 'lead: I need an appointment tomorrow morning. agent: I can help with that and book you for tomorrow at 10am.',
            call_analysis: { call_successful: true, call_summary: 'Appointment booked for tomorrow at 10am' },
          },
        }),
      } as any,
      {} as any,
      vi.fn(),
    );

    expect(res?.statusCode).toBe(200);
    expect(JSON.parse(res?.body || '{}')).toMatchObject({
      ok: true,
      missed: false,
      outcomeEvaluationTriggered: true,
    });
    expect(fetch).toHaveBeenCalledWith(
      'https://boltcall.test/.netlify/functions/conversation-outcome',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'x-internal-secret': 'test-internal-secret' }),
        body: expect.stringContaining('"conversationId":"call-complete-1"'),
      }),
    );
    expect(fetch).toHaveBeenCalledWith(
      'https://boltcall.test/.netlify/functions/retell-call-scorer',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'x-internal-secret': 'test-internal-secret' }),
        body: expect.stringContaining('"call_id":"call-complete-1"'),
      }),
    );
    expect(fireWebhooksMock).toHaveBeenCalledWith('user-a', 'call_completed', expect.any(Object));
  });
});
