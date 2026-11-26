import { beforeEach, describe, expect, it, vi } from 'vitest';

const alertOwnerMock = vi.hoisted(() => vi.fn(async () => true));
const notifyErrorMock = vi.hoisted(() => vi.fn());
const smsOwnerMock = vi.hoisted(() => vi.fn(async () => true));
const assessMock = vi.hoisted(() => vi.fn());
const getSupabaseMock = vi.hoisted(() => vi.fn());

vi.mock('../_shared/notify', () => ({ notifyError: notifyErrorMock, alertOwner: alertOwnerMock }));
vi.mock('../_shared/token-utils', () => ({ getSupabase: getSupabaseMock, getServiceSupabase: getSupabaseMock }));
vi.mock('../_shared/fire-webhooks', () => ({ fireWebhooks: vi.fn() }));
vi.mock('../_shared/verify-signatures', () => ({ verifyRetellSignature: vi.fn(() => 'ok') }));
vi.mock('../_shared/lead-value', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../_shared/lead-value')>()),
  assessLeadValue: assessMock,
  smsOwner: smsOwnerMock,
}));

// In-memory leads table: insert enforces the primary key, update honors eq/is filters
// on raw_data->>marker paths.
function fakeSupabase(store: Record<string, any>) {
  const leads = {
    insert: async (row: any) => {
      if (store[row.id]) return { error: { code: '23505' } };
      store[row.id] = { ...row };
      return { error: null };
    },
    update: (fields: any) => {
      const filters: Array<(r: any) => boolean> = [];
      const run = () => {
        const hits = Object.values(store).filter((r) => filters.every((f) => f(r)));
        hits.forEach((r) => Object.assign(r, fields));
        return { data: hits.map((r) => ({ id: r.id })), error: null };
      };
      const b: any = {
        eq: (col: string, val: unknown) => (filters.push((r) => r[col] === val), b),
        is: (col: string, val: unknown) => {
          const key = col.replace('raw_data->>', '');
          filters.push((r) => (r.raw_data?.[key] ?? null) === val);
          return b;
        },
        select: async () => run(),
        then: (res: any, rej: any) => Promise.resolve(run()).then(res, rej),
      };
      return b;
    },
  };
  const chain: any = { select: () => chain, eq: () => chain, or: () => chain, limit: () => chain, update: () => chain };
  chain.maybeSingle = async () => ({ data: null, error: null });
  chain.then = (res: any) => Promise.resolve({ error: null }).then(res);
  const agents: any = { select: () => agents, or: () => agents, limit: () => agents, maybeSingle: async () => ({ data: { user_id: 'user-a' }, error: null }) };
  return { from: (t: string) => (t === 'leads' ? leads : t === 'agents' ? agents : chain) };
}

function post(event: string, analysis?: Record<string, unknown>) {
  return {
    httpMethod: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      event,
      call: {
        call_id: 'call-value-1',
        agent_id: 'agent-owned',
        call_type: 'phone_call',
        from_number: '+15125550100',
        call_status: 'ended',
        duration_ms: 60000,
        ...(analysis ? { call_analysis: { call_summary: 'Intake', custom_analysis_data: analysis } } : {}),
      },
    }),
  } as any;
}

const assessment = (over: Record<string, unknown>) => ({
  tier: 'normal',
  estimated_value_cents: null,
  value_source: null,
  threshold_cents: 500_000,
  service_requested: null,
  ...over,
});

describe('retell-webhook value routing', () => {
  let store: Record<string, any>;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
    store = {};
    getSupabaseMock.mockReturnValue(fakeSupabase(store));
  });

  it('alerts the owner by email and SMS exactly once for a big job, even on a duplicate call_analyzed', async () => {
    assessMock.mockResolvedValue(assessment({
      tier: 'high', estimated_value_cents: 1_500_000, value_source: 'ai_estimate', service_requested: 'full roof replacement',
    }));
    const { testHandler: handler } = await import('../retell-webhook');
    const analysis = { urgent: false, caller_name: 'Dana Fox', service_requested: 'full roof replacement', estimated_job_value: 15000 };

    await handler(post('call_ended'), {} as any, vi.fn());
    await handler(post('call_analyzed', analysis), {} as any, vi.fn());
    const dup = await handler(post('call_analyzed', analysis), {} as any, vi.fn());

    expect(dup?.statusCode).toBe(200);
    expect(alertOwnerMock).toHaveBeenCalledTimes(1);
    const [, userId, subject, lines, opts] = alertOwnerMock.mock.calls[0] as any[];
    expect(userId).toBe('user-a');
    expect(subject).toBe('Big job (~$15,000): Dana Fox, call them back first');
    expect(lines).toEqual(expect.arrayContaining([
      'Phone: +15125550100',
      'Service: full roof replacement',
      'Estimated job value: $15,000 (AI estimate)',
      'Your alert amount: $5,000',
    ]));
    expect(opts).toEqual({ urgent: true });
    expect(smsOwnerMock).toHaveBeenCalledTimes(1);
    expect(smsOwnerMock.mock.calls[0][2]).toBe('Boltcall big job: Dana Fox (+15125550100), full roof replacement, ~$15,000. Call them back first.');

    const lead = Object.values(store)[0];
    expect(lead).toMatchObject({ first_name: 'Dana', last_name: 'Fox' });
    expect(lead.raw_data.value_routing).toMatchObject({ tier: 'high', estimated_value_cents: 1_500_000 });
    expect(lead.raw_data.value_alerted_at).toEqual(expect.any(String));
  });

  it('sends a one-time note for an out-of-scope caller, no SMS', async () => {
    assessMock.mockResolvedValue(assessment({ tier: 'out_of_scope', service_requested: 'tree removal' }));
    const { testHandler: handler } = await import('../retell-webhook');
    const analysis = { urgent: false, caller_name: 'Lee Park', out_of_scope: true, service_requested: 'tree removal' };

    await handler(post('call_analyzed', analysis), {} as any, vi.fn());
    await handler(post('call_analyzed', analysis), {} as any, vi.fn());

    expect(alertOwnerMock).toHaveBeenCalledTimes(1);
    const [, , subject, lines, opts] = alertOwnerMock.mock.calls[0] as any[];
    expect(subject).toBe('Out of scope call: Lee Park asked for tree removal');
    expect(lines).toContain('Asked for: tree removal');
    expect(opts).toBeUndefined();
    expect(smsOwnerMock).not.toHaveBeenCalled();
    expect(Object.values(store)[0].raw_data.value_routing.tier).toBe('out_of_scope');
  });

  it.each(['normal', 'unknown'])('stores a %s lead with its value but alerts no one', async (tier) => {
    assessMock.mockResolvedValue(assessment({ tier, estimated_value_cents: tier === 'normal' ? 20_000 : null }));
    const { testHandler: handler } = await import('../retell-webhook');

    await handler(post('call_analyzed', { urgent: false, caller_name: 'Sam Reed' }), {} as any, vi.fn());

    expect(alertOwnerMock).not.toHaveBeenCalled();
    expect(smsOwnerMock).not.toHaveBeenCalled();
    const lead = Object.values(store)[0];
    expect(lead).toMatchObject({ first_name: 'Sam', last_name: 'Reed' });
    expect(lead.raw_data.value_routing.tier).toBe(tier);
  });

  it('an urgent big job sends one urgent alert that carries the value, plus one SMS', async () => {
    assessMock.mockResolvedValue(assessment({ tier: 'high', estimated_value_cents: 2_000_000, value_source: 'catalog' }));
    const { testHandler: handler } = await import('../retell-webhook');
    const analysis = { urgent: true, urgency_reason: 'court date tomorrow', caller_name: 'Ana Cruz' };

    await handler(post('call_analyzed', analysis), {} as any, vi.fn());
    await handler(post('call_analyzed', analysis), {} as any, vi.fn());

    expect(alertOwnerMock).toHaveBeenCalledTimes(1);
    const [, , subject, lines] = alertOwnerMock.mock.calls[0] as any[];
    expect(subject).toMatch(/^URGENT/);
    expect(lines).toContain('Estimated job value: $20,000');
    expect(smsOwnerMock).toHaveBeenCalledTimes(1);
    expect(smsOwnerMock.mock.calls[0][2]).toMatch(/^Boltcall URGENT: Ana Cruz \(\+15125550100\) needs a call back now\. court date tomorrow$/);
    expect(Object.values(store)[0].raw_data.value_alerted_at).toBeUndefined();
  });

  it('does not touch value routing when the call has no analysis yet', async () => {
    const { testHandler: handler } = await import('../retell-webhook');
    await handler(post('call_ended'), {} as any, vi.fn());
    expect(assessMock).not.toHaveBeenCalled();
    expect(alertOwnerMock).not.toHaveBeenCalled();
  });
});
