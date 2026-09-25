import { beforeEach, describe, expect, it, vi } from 'vitest';

const alertOwnerMock = vi.hoisted(() => vi.fn(async () => true));
const getSupabaseMock = vi.hoisted(() => vi.fn());

vi.mock('../_shared/notify', () => ({ notifyError: vi.fn(), alertOwner: alertOwnerMock }));
vi.mock('../_shared/token-utils', () => ({ getSupabase: getSupabaseMock, getServiceSupabase: getSupabaseMock }));
vi.mock('../_shared/fire-webhooks', () => ({ fireWebhooks: vi.fn() }));
vi.mock('../_shared/verify-signatures', () => ({ verifyRetellSignature: vi.fn(() => 'ok') }));

// In-memory leads table: insert enforces the primary key, update honors eq/is filters.
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
          expect(col).toBe('raw_data->>urgent_alerted_at');
          filters.push((r) => (r.raw_data?.urgent_alerted_at ?? null) === val);
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
        call_id: 'call-urgent-1',
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

describe('retell-webhook urgent owner alert', () => {
  let store: Record<string, any>;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
    store = {};
    getSupabaseMock.mockReturnValue(fakeSupabase(store));
  });

  it('alerts the owner exactly once for an urgent call, even when call_analyzed is delivered twice', async () => {
    const { testHandler: handler } = await import('../retell-webhook');
    const urgent = {
      urgent: true,
      urgency_reason: 'Son arrested last night, arraignment tomorrow',
      caller_name: 'Maria  Lopez Garcia',
      caller_email: 'maria@example.com',
      practice_area: 'criminal defense',
      adverse_parties: '',
    };

    await handler(post('call_ended'), {} as any, vi.fn());
    await handler(post('call_analyzed', urgent), {} as any, vi.fn());
    const dup = await handler(post('call_analyzed', urgent), {} as any, vi.fn());

    expect(dup?.statusCode).toBe(200);
    expect(alertOwnerMock).toHaveBeenCalledTimes(1);
    const [, userId, subject, lines] = alertOwnerMock.mock.calls[0] as any[];
    expect(userId).toBe('user-a');
    expect(subject).toMatch(/^URGENT/);
    expect(lines).toEqual(expect.arrayContaining([
      'Caller: Maria  Lopez Garcia',
      'Phone: +15125550100',
      'Reason: Son arrested last night, arraignment tomorrow',
      'Practice area: criminal defense',
    ]));
    const lead = Object.values(store)[0];
    expect(lead).toMatchObject({ first_name: 'Maria', last_name: 'Lopez Garcia', email: 'maria@example.com' });
    expect(lead.raw_data.call_analysis.custom_analysis_data.practice_area).toBe('criminal defense');
    expect(lead.raw_data.urgent_alerted_at).toEqual(expect.any(String));
  });

  it.each([
    ['urgent=false', { urgent: false, caller_name: 'Sam Reed', practice_area: 'estate planning' }],
    ['no analysis data', undefined],
  ])('sends no alert for %s', async (_label, analysis) => {
    const { testHandler: handler } = await import('../retell-webhook');
    const res = await handler(post('call_analyzed', analysis), {} as any, vi.fn());

    expect(res?.statusCode).toBe(200);
    expect(alertOwnerMock).not.toHaveBeenCalled();
    if (analysis) expect(Object.values(store)[0]).toMatchObject({ first_name: 'Sam', last_name: 'Reed' });
  });
});
