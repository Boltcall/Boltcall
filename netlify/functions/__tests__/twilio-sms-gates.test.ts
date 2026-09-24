import { beforeEach, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ optouts: [] as string[], balanceOk: true }));

vi.mock('../_shared/validate-api-key', () => ({
  authenticateApiKey: async () => ({ hasKey: true, userId: 'user-1' }),
}));
vi.mock('../_shared/token-utils', () => ({
  TOKEN_COSTS: { sms_sent: 5 },
  deductTokens: vi.fn(async () => ({ success: true })),
  deductTokensBatch: vi.fn(async () => ({ success: true })),
  hasTokenBalance: vi.fn(async () => state.balanceOk),
  getServiceSupabase: () => ({
    from: (table: string) => {
      const q: any = {
        select: () => q,
        eq: () => q,
        in: async (_col: string, keys: string[]) => table === 'sms_optouts'
          ? { data: state.optouts.filter((p) => keys.includes(p)).map((phone) => ({ phone })), error: null }
          : { data: [], error: null },
        then: (resolve: any) => resolve({ data: [{ phone_number: '+15550001111' }], error: null }),
      };
      return q;
    },
  }),
}));

import { testHandler as handler } from '../twilio-sms';
import { deductTokens, hasTokenBalance } from '../_shared/token-utils';

const invoke = (body: any) =>
  handler({ httpMethod: 'POST', headers: {}, body: JSON.stringify(body) } as any, {} as any, vi.fn()) as Promise<any>;

beforeEach(() => {
  state.optouts = [];
  state.balanceOk = true;
  vi.clearAllMocks();
  process.env.TWILIO_ACCOUNT_SID = 'AC-test';
  process.env.TWILIO_AUTH_TOKEN = 'test-token';
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ sid: 'SM1', status: 'queued' }) })));
});

it('refuses to text a number that replied STOP, even when written in a different format', async () => {
  state.optouts = ['+15552223333'];
  const r = await invoke({ action: 'send', to: '(555) 222-3333', message: 'hi' });
  expect(r.statusCode).toBe(409);
  expect(fetch).not.toHaveBeenCalled();
});

it('checks the balance but still sends when short (warn-only until payments credit tokens)', async () => {
  state.balanceOk = false;
  const r = await invoke({ action: 'send', to: '+15552223333', message: 'hi' });
  expect(r.statusCode).toBe(200);
  expect(hasTokenBalance).toHaveBeenCalledWith('user-1', 5);
  expect(fetch).toHaveBeenCalledOnce();
});

it('sends and then deducts when the recipient is reachable and funded', async () => {
  const r = await invoke({ action: 'send', to: '+15552223333', message: 'hi' });
  expect(r.statusCode).toBe(200);
  expect(hasTokenBalance).toHaveBeenCalledWith('user-1', 5);
  expect(fetch).toHaveBeenCalledOnce();
  expect(deductTokens).toHaveBeenCalledOnce();
});

it('bulk: skips opted-out recipients, reports them, and only charges for the rest', async () => {
  state.optouts = ['+15552223333'];
  const r = await invoke({ action: 'send_bulk', messages: [{ to: '+15552223333', message: 'a' }, { to: '+15554445555', message: 'b' }] });
  const body = JSON.parse(r.body);
  expect(body.sent).toBe(1);
  expect(body.results[0]).toMatchObject({ success: false, error: expect.stringMatching(/opted out/i) });
  expect(hasTokenBalance).toHaveBeenCalledWith('user-1', 5);
  expect(fetch).toHaveBeenCalledOnce();
});
