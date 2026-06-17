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

  it('schedules immediate SMS after an unanswered outbound Facebook lead call', async () => {
    const inserts: Record<string, any[]> = {};
    const makeInsert = (table: string) => vi.fn(async (row: any) => {
      inserts[table] ||= [];
      inserts[table].push(row);
      return { data: row, error: null };
    });

    const chains = {
      agents: {
        select: () => ({
          or: () => ({
            limit: () => ({
              maybeSingle: async () => ({ data: { user_id: 'founder-user-id' }, error: null }),
            }),
          }),
        }),
      },
      business_features: {
        select: () => ({
          eq: () => ({
            single: async () => ({ data: { missed_call_config: {} }, error: null }),
          }),
        }),
      },
      leads: {
        select: () => ({
          eq: () => ({
            eq: () => ({
              order: () => ({
                limit: () => ({
                  single: async () => ({ data: { id: 'lead-from-phone' }, error: null }),
                }),
              }),
            }),
          }),
        }),
      },
      business_profiles: {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: { business_name: 'Boltcall' }, error: null }),
          }),
        }),
      },
      phone_numbers: {
        select: () => ({
          eq: () => ({
            eq: () => ({
              order: () => ({
                limit: () => ({
                  maybeSingle: async () => ({ data: { phone_number: '+13613044585' }, error: null }),
                }),
              }),
            }),
          }),
        }),
      },
      scheduled_messages: {
        insert: makeInsert('scheduled_messages'),
      },
    } as Record<string, any>;

    getSupabaseMock.mockReturnValue({
      from: vi.fn((table: string) => {
        if (chains[table]) return chains[table];
        throw new Error(`unexpected table ${table}`);
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
            call_id: 'call-facebook-no-answer',
            agent_id: 'agent-owned',
            call_type: 'outbound_api',
            call_status: 'not_connected',
            duration_ms: 0,
            from_number: '+13613044585',
            to_number: '+15555550217',
            metadata: {
              source: 'facebook_lead_ad',
              user_id: 'founder-user-id',
              lead_id: 'facebook-lead-1',
            },
          },
        }),
      } as any,
      {} as any,
      vi.fn(),
    );

    expect(res?.statusCode).toBe(200);
    expect(JSON.parse(res?.body || '{}')).toMatchObject({
      ok: true,
      missed: true,
      textback: true,
      lead_id: 'facebook-lead-1',
    });
    expect(inserts.scheduled_messages).toHaveLength(1);
    expect(inserts.scheduled_messages[0]).toMatchObject({
      type: 'missed_call_textback',
      channel: 'sms',
      recipient_phone: '+15555550217',
      status: 'scheduled',
      user_id: 'founder-user-id',
      metadata: expect.objectContaining({
        call_id: 'call-facebook-no-answer',
        lead_id: 'facebook-lead-1',
      }),
    });
    expect(new Date(inserts.scheduled_messages[0].scheduled_for).getTime())
      .toBeLessThanOrEqual(Date.now() + 5000);
  });
});
