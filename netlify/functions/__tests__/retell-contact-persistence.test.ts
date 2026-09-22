import { beforeEach, expect, it, vi } from 'vitest';
const insert = vi.hoisted(() => vi.fn());
vi.mock('../_shared/notify', () => ({ notifyError: vi.fn() }));
vi.mock('../_shared/fire-webhooks', () => ({ fireWebhooks: vi.fn() }));
vi.mock('../_shared/verify-signatures', () => ({ verifyRetellSignature: () => 'valid' }));
vi.mock('../_shared/token-utils', () => ({ getServiceSupabase: () => ({ from: (table: string) => {
  if (table === 'leads') return { insert };
  const q: any = { select: () => q, or: () => q, limit: () => q, eq: () => q, update: () => q,
    maybeSingle: async () => ({ data: table === 'agents' ? { user_id: 'test-owner' } : null }),
    then: (resolve: any) => Promise.resolve({ error: null }).then(resolve) };
  return q;
} }) }));
import { testHandler as handler } from '../retell-webhook';
const call = { call_id: 'test-call', agent_id: 'agent-test', call_type: 'phone_call', direction: 'outbound', from_number: '+12025550100', to_number: '+12025550101', call_status: 'ended', duration_ms: 30000 };
const invoke = () => handler({ httpMethod: 'POST', headers: {}, body: JSON.stringify({ event: 'call_ended', call }) } as any, {} as any, vi.fn());
beforeEach(() => { insert.mockReset().mockResolvedValue({ error: null }); vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true })); });
it('persists and syncs the contacted person for current outbound Retell payloads', async () => {
  expect((await invoke())?.statusCode).toBe(200);
  expect(insert).toHaveBeenCalledWith(expect.objectContaining({ phone: call.to_number }));
  const sync = vi.mocked(fetch).mock.calls.find(([url]) => String(url).endsWith('/integration-sync'));
  expect(JSON.parse(String(sync?.[1]?.body)).lead.phone).toBe(call.to_number);
});
it('does not acknowledge successful persistence or sync when lead storage fails', async () => {
  insert.mockResolvedValue({ error: { code: '08006', message: 'database unavailable' } });
  expect((await invoke())?.statusCode).toBe(500);
  expect(vi.mocked(fetch).mock.calls.some(([url]) => String(url).endsWith('/integration-sync'))).toBe(false);
});
