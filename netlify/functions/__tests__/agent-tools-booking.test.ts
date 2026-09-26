import { afterAll, beforeEach, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ owner: true, persistError: false, google: false, busy: false, booking: { id: 42 } as any, callIdMissing: false, inserts: [] as any[] }));
vi.mock('../_shared/verify-signatures', () => ({ verifyRetellSignature: () => 'valid' }));
vi.mock('../_shared/notify', () => ({ alertOwner: vi.fn().mockResolvedValue(true), notifyInfo: vi.fn().mockResolvedValue(undefined), notifyError: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../_shared/booking-value', () => ({ estimateBookingValueCents: async () => 0 }));
vi.mock('../_shared/token-utils', () => ({ TOKEN_COSTS: { lead_processed: 1 }, deductTokens: vi.fn(), getServiceSupabase: () => ({ from: (table: string) => {
  const q: any = { select: () => q, eq: () => q,
    single: async () => ({ data: state.owner ? { user_id: 'test-owner', language: 'en' } : null }),
    maybeSingle: async () => ({ data: state.google ? { config: { access_token: 'test-only', calendar_id: 'test-calendar' }, api_key: 'test-refresh' } : null }),
    insert: async (row: any) => { state.inserts.push({ table, row }); return state.callIdMissing && table === 'appointments' && 'call_id' in row ? { error: { code: 'PGRST204' } } : { error: state.persistError ? { message: 'storage unavailable' } : null }; } };
  return q;
} }) }));
import { testHandler as handler } from '../agent-tools';
const args = { name: 'Alec Test', email: 'alec@example.invalid', date: '2026-10-20', time: '10:00', start: '2026-10-20T10:00:00-05:00', timezone: 'America/Chicago' };
const invoke = (body: any) => handler({ httpMethod: 'POST', headers: {}, body: JSON.stringify(body) } as any, {} as any, vi.fn());
const legacy = () => ({ name: 'book_appointment', call_id: 'test-call', agent_id: 'agent-test', arguments: { ...args } });
beforeEach(() => {
 state.owner = true; state.persistError = false; state.google = false; state.busy = false; state.booking = { id: 42 }; state.callIdMissing = false; state.inserts = [];
 process.env.CALCOM_API_KEY = 'test-cal-key';
 vi.stubGlobal('fetch', vi.fn(async (url: any) => ({ ok: true, json: async () => String(url).includes('/freeBusy') ? { calendars: { 'test-calendar': { busy: state.busy ? [{ start: args.start }] : [] } } } : String(url).includes('/event-types') ? { event_types: [{ id: 1 }] } : state.booking })));
});
it('accepts the current Retell custom-function call/args envelope', async () => {
 const r = await invoke({ name: 'book_appointment', call: { call_id: 'test-call', agent_id: 'agent-test' }, args });
 expect(JSON.parse(r?.body || '{}').content).toContain('confirmed');
});
it('does not use a global calendar when agent ownership cannot be resolved', async () => {
 state.owner = false;
 const r = await invoke(legacy());
 expect(JSON.parse(r?.body || '{}').content).not.toContain('confirmed');
 expect(fetch).not.toHaveBeenCalled();
});
it('never confirms a provider success without a booking reference', async () => {
 state.booking = {};
 const r = await invoke(legacy());
 expect(JSON.parse(r?.body || '{}').content).not.toContain('confirmed');
});
it('reports reconciliation when provider booking succeeded but persistence failed', async () => {
 state.persistError = true;
 const r = await invoke(legacy());
 expect(JSON.parse(r?.body || '{}').content).toMatch(/reference.*42.*do not.*book again/i);
 expect(JSON.parse(r?.body || '{}').content).not.toContain('confirmed');
});
it('sends the confirmed offset and timezone to the calendar rather than assuming UTC', async () => {
 await invoke(legacy());
 const request = vi.mocked(fetch).mock.calls.find(([url]) => String(url).includes('/bookings'));
 expect(JSON.parse(String(request?.[1]?.body))).toMatchObject({ start: '2026-10-20T15:00:00.000Z', timeZone: 'America/Chicago' });
});
it('asks for an unambiguous slot instead of booking a bare local time', async () => {
 const body = legacy(); delete (body.arguments as any).start;
 const r = await invoke(body);
 expect(JSON.parse(r?.body || '{}').content).not.toContain('confirmed');
 expect(fetch).not.toHaveBeenCalled();
});
it('rejects an offset that does not match the named timezone', async () => {
 const body = legacy(); body.arguments = { ...args, start: '2026-10-20T10:00:00Z' };
 const r = await invoke(body);
 expect(JSON.parse(r?.body || '{}').content).not.toContain('confirmed');
 expect(fetch).not.toHaveBeenCalled();
});
it('does not create a Google event when the slot is already busy', async () => {
 state.google = true; state.busy = true;
 const r = await invoke(legacy());
 expect(JSON.parse(r?.body || '{}').content).not.toContain('confirmed');
 expect(fetch).toHaveBeenCalledWith('https://www.googleapis.com/calendar/v3/freeBusy', expect.any(Object));
 expect(vi.mocked(fetch).mock.calls.some(([url]) => String(url).includes('/events?'))).toBe(false);
});
it.each(['2026-11-01T01:30:00-05:00', '2026-11-01T01:30:00-06:00'])('preserves the explicit DST fold occurrence %s', async (start) => {
 const body = legacy(); body.arguments = { ...args, date: '2026-11-01', time: '01:30', start };
 const r = await invoke(body);
 expect(JSON.parse(r?.body || '{}').content).toContain('confirmed');
 const request = vi.mocked(fetch).mock.calls.find(([url]) => String(url).includes('/bookings'));
 expect(JSON.parse(String(request?.[1]?.body)).start).toBe(new Date(start).toISOString());
});
it('rejects a nonexistent spring-forward clock time', async () => {
 const body = legacy(); body.arguments = { ...args, date: '2027-03-14', time: '02:30', start: '2027-03-14T02:30:00-06:00' };
 const r = await invoke(body);
 expect(JSON.parse(r?.body || '{}').content).not.toContain('confirmed');
 expect(fetch).not.toHaveBeenCalled();
});
it('checks the full 25-hour local calendar day at the DST fall transition', async () => {
 state.google = true;
 await invoke({ name: 'check_availability', agent_id: 'agent-test', arguments: { date: '2026-11-01', timezone: 'America/Chicago' } });
 const request = vi.mocked(fetch).mock.calls.find(([url]) => String(url).includes('/events?'));
 const url = new URL(String(request?.[0]));
 expect(url.searchParams.get('timeMin')).toBe('2026-11-01T05:00:00.000Z');
 expect(url.searchParams.get('timeMax')).toBe('2026-11-02T06:00:00.000Z');
});
it('with no calendar connected, records a callback request and tells the agent to promise a call back', async () => {
 delete process.env.CALCOM_API_KEY;
 const r = await invoke({ name: 'book_appointment', call_id: 'test-call', agent_id: 'agent-test', arguments: { name: 'Alec Test', phone: '+15551112222', date: '2026-10-20', time: '10:00' } });
 const content = JSON.parse(r?.body || '{}').content;
 expect(content).toMatch(/call them back/i);
 expect(content).not.toMatch(/contact the team directly/i);
 expect(state.inserts.find((i) => i.table === 'callbacks')?.row).toMatchObject({ user_id: 'test-owner', client_name: 'Alec Test', client_phone: '+15551112222', status: 'pending' });
 const { alertOwner } = await import('../_shared/notify');
 expect(alertOwner).toHaveBeenCalledWith(expect.anything(), 'test-owner', 'Callback requested: Alec Test', expect.any(Array));
 expect(fetch).not.toHaveBeenCalled();
});
it('with no calendar and no caller phone, still records the callback with a non-null phone', async () => {
 delete process.env.CALCOM_API_KEY;
 const r = await invoke({ name: 'book_appointment', call_id: 'test-call', agent_id: 'agent-test', arguments: { name: 'Alec Test', date: '2026-10-20', time: '10:00' } });
 expect(JSON.parse(r?.body || '{}').content).toMatch(/call them back/i);
 expect(state.inserts.find((i) => i.table === 'callbacks')?.row.client_phone).toBe('not provided');
});
it('still saves the booking when appointments.call_id is missing in the schema', async () => {
 state.callIdMissing = true;
 const r = await invoke(legacy());
 expect(JSON.parse(r?.body || '{}').content).toContain('confirmed');
 const appts = state.inserts.filter((i) => i.table === 'appointments');
 expect(appts).toHaveLength(2);
 expect(appts[1].row).not.toHaveProperty('call_id');
});
afterAll(() => { delete process.env.CALCOM_API_KEY; });
