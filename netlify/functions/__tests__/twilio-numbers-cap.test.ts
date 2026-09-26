import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ owned: 0, sub: null as unknown }));

vi.mock('../_shared/require-auth', () => ({
  requireAuth: vi.fn(async () => ({ ok: true, userId: 'user-a', source: 'jwt' })),
  getUserPhoneNumbers: vi.fn(),
  userOwnsPhoneNumber: vi.fn(),
}));

function chain(table: string) {
  const rows: Record<string, unknown> = {
    business_profiles: { id: 'bp-1' },
    workspaces: { id: 'ws-1', name: 'Harper Law' },
    agents: { retell_agent_id: 'agent-1' },
    subscriptions: state.sub,
  };
  const c: any = {};
  for (const k of ['select', 'eq', 'in', 'not', 'order', 'limit']) c[k] = vi.fn(() => c);
  c.maybeSingle = vi.fn(async () => ({ data: rows[table] ?? null, error: null }));
  c.then = (res: any, rej: any) => Promise.resolve({ count: state.owned, error: null }).then(res, rej);
  return c;
}

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ from: (t: string) => chain(t) })),
}));

const purchase = () => ({
  httpMethod: 'POST',
  headers: { authorization: 'Bearer t' },
  body: JSON.stringify({ action: 'purchase', country_code: 'US' }),
} as any);

describe('twilio-numbers purchase cap', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.TWILIO_ACCOUNT_SID = 'AC1';
    process.env.TWILIO_AUTH_TOKEN = 't';
    process.env.RETELL_API_KEY = 'k';
    globalThis.fetch = vi.fn(async () => ({ ok: false, json: async () => ({}) })) as any;
  });

  it('refuses a second number without an active subscription, before calling Retell', async () => {
    state.owned = 1;
    state.sub = null;
    const { testHandler } = await import('../twilio-numbers');
    const res = await testHandler(purchase(), {} as any);

    expect(res.statusCode).toBe(402);
    expect(JSON.parse(res.body).code).toBe('subscription_required');
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('lets the first (onboarding) number through to Retell', async () => {
    state.owned = 0;
    state.sub = null;
    const { testHandler } = await import('../twilio-numbers');
    await testHandler(purchase(), {} as any);

    expect(globalThis.fetch).toHaveBeenCalledWith('https://api.retellai.com/create-phone-number', expect.anything());
  });
});
