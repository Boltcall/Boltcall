import { beforeEach, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ config: {} as any, error: false }));
vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({
  auth: { getUser: async () => ({ data: { user: { id: 'test-owner' } } }) },
  from: () => {
    const q: any = { select: () => q, eq: () => q,
      single: async () => ({ data: { reminders_config: state.config } }),
      update: (row: any) => { state.config = row.reminders_config; return q; },
      then: (resolve: any) => resolve({ error: state.error ? { code: 'test-error' } : null }) };
    return q;
  },
}) }));
import { testHandler } from '../calcom-webhook';
const invoke = (method = 'POST') => testHandler({ httpMethod: method, headers: { authorization: 'Bearer test-user-jwt' }, body: JSON.stringify({ cal_api_key: 'cal_test_only' }) } as any, {} as any, vi.fn());
beforeEach(() => {
  state.config = { unrelated: true }; state.error = false;
  process.env.CALCOM_WEBHOOK_SECRET = 'test-signing-secret';
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 201, json: async () => ({ status: 'success', data: { id: 'hook-test' } }) })));
});
it('registers a v2 webhook with bearer authentication and triggers then saves the reference', async () => {
  const result = await invoke();
  expect(result?.statusCode).toBe(200);
  expect(fetch).toHaveBeenCalledWith('https://api.cal.com/v2/webhooks', expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer cal_test_only' }) }));
  const payload = JSON.parse(String(vi.mocked(fetch).mock.calls[0][1]?.body));
  expect(payload).toMatchObject({ triggers: ['BOOKING_CREATED','BOOKING_CANCELLED','BOOKING_RESCHEDULED'], secret: 'test-signing-secret' });
  expect(payload).not.toHaveProperty('eventTriggers');
  expect(state.config).toMatchObject({ unrelated: true, cal_connected: true, cal_webhook_id: 'hook-test' });
});
it('does not create an unsigned webhook when its signing secret is missing', async () => {
  delete process.env.CALCOM_WEBHOOK_SECRET;
  expect((await invoke())?.statusCode).toBe(503);
  expect(fetch).not.toHaveBeenCalled();
});
it('does not claim disconnect when provider deletion fails', async () => {
  state.config = { cal_api_key: 'cal_test_only', cal_webhook_id: 'hook-test', cal_connected: true };
  vi.mocked(fetch).mockResolvedValue({ ok: false, status: 500 } as any);
  expect((await invoke('DELETE'))?.statusCode).toBe(502);
  expect(state.config.cal_connected).toBe(true);
});
it('deletes through v2 with header credentials and preserves unrelated settings', async () => {
  state.config = { unrelated: true, cal_api_key: 'cal_test_only', cal_webhook_id: 'hook-test', cal_connected: true };
  expect((await invoke('DELETE'))?.statusCode).toBe(200);
  expect(fetch).toHaveBeenCalledWith('https://api.cal.com/v2/webhooks/hook-test', expect.objectContaining({ method: 'DELETE', headers: expect.objectContaining({ Authorization: 'Bearer cal_test_only' }) }));
  expect(state.config).toEqual({ unrelated: true, cal_connected: false });
});
it('cleans up only the newly created webhook when persistence fails', async () => {
  state.error = true;
  expect((await invoke())?.statusCode).toBe(500);
  expect(vi.mocked(fetch).mock.calls[1][0]).toBe('https://api.cal.com/v2/webhooks/hook-test');
  expect(vi.mocked(fetch).mock.calls[1][1]?.method).toBe('DELETE');
});
