import { beforeEach, expect, it, vi } from 'vitest';
const upsert = vi.hoisted(() => vi.fn());
vi.mock('../_shared/token-utils', () => ({ getServiceSupabase: () => ({ from: (table: string) => { expect(table).toBe('retell_calls'); return { upsert }; } }) }));
vi.mock('../_shared/verify-signatures', () => ({ verifyRetellSignature: () => 'valid' }));
vi.mock('../_shared/notify', () => ({ notifyError: vi.fn() }));
import { testHandler as handler } from '../retell-webhook';
const call = { call_id: 'test-demo-call', agent_id: 'agent-test', call_status: 'ended', call_type: 'web_call', duration_ms: 30000, start_timestamp: 1790000000000, metadata: { source: 'facebook-dm-demo', demo_id: 'test-demo' }, transcript: 'Synthetic intake only. No booking was made.' };
const invoke = (event: string) => handler({ httpMethod: 'POST', headers: {}, body: JSON.stringify({ event, call }) } as any, {} as any, vi.fn());
beforeEach(() => { upsert.mockReset().mockResolvedValue({ error: null }); vi.stubGlobal('fetch', vi.fn()); });
it('persists demo events by call ID without marketing, scoring, SMS or CRM side effects', async () => {
 expect((await invoke('call_ended'))?.statusCode).toBe(200);
 expect((await invoke('call_analyzed'))?.statusCode).toBe(200);
 expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ call_id: call.call_id, retell_payload: call, vertical: 'other', outcome: 'no_outcome' }), { onConflict: 'call_id' });
 expect(fetch).not.toHaveBeenCalled();
});
it('asks the provider to retry when demo outcome storage fails', async () => {
 upsert.mockResolvedValue({ error: { code: '08006' } });
 expect((await invoke('call_ended'))?.statusCode).toBe(500);
});
