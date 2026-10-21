import { beforeEach, expect, it, vi } from 'vitest';
vi.mock('../_shared/emit-agency-event', () => ({ emitAgencyEvent: vi.fn() }));
import { createEventType, getAvailability, getBookings, cancelBooking } from '../_shared/agency-adapters/calcom-adapter';
beforeEach(() => { process.env.CALCOM_API_KEY = 'cal_test_only'; });
it('creates event types with v2 duration and unwraps data', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ status: 'success', data: { id: 10 } }))));
  const result = await createEventType({ client_id: 'test-client', name: 'Test', slug: 'test', duration_min: 20, scheduling_url_owner: 'test-owner' });
  expect(result.event_type_id).toBe(10);
  const [url, init] = vi.mocked(fetch).mock.calls[0];
  expect(url).toBe('https://api.cal.com/v2/event-types');
  expect(JSON.parse(String(init?.body))).toMatchObject({ lengthInMinutes: 20 });
  expect(init?.headers).toMatchObject({ Authorization: 'Bearer cal_test_only' });
});
it('reads v2 bookings including start and UID without losing numeric report IDs', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ status: 'success', data: [{ id: 10, uid: 'booking-test', start: '2026-10-22T06:00:00Z', status: 'accepted', attendees: [] }] }))));
  const rows = await getBookings({ client_id: 'test-client', event_type_id: 10, since: '2026-10-22', until: '2026-10-23' });
  expect(rows[0]).toMatchObject({ booking_id: 10, booking_uid: 'booking-test', started_at: '2026-10-22T06:00:00Z' });
});
it('cancels by UID using POST and does not retry an ambiguous mutation', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response('failed', { status: 500 })));
  await expect(cancelBooking({ booking_uid: 'booking-test', reason: 'Test cleanup' })).rejects.toThrow();
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(vi.mocked(fetch).mock.calls[0][0]).toBe('https://api.cal.com/v2/bookings/booking-test/cancel');
  expect(vi.mocked(fetch).mock.calls[0][1]?.method).toBe('POST');
});
it('reads v2 slot data with the correct date parameters', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ status: 'success', data: { '2026-10-22': [{ start: '2026-10-22T06:00:00Z' }] } }))));
  const slots = await getAvailability({ event_type_id: 10, date_from: '2026-10-22', date_to: '2026-10-23' });
  expect(slots[0].slot_start).toBe('2026-10-22T06:00:00Z');
  const url = new URL(String(vi.mocked(fetch).mock.calls[0][0]));
  expect(url.pathname).toBe('/v2/slots');
  expect(url.searchParams.get('start')).toBe('2026-10-22');
  expect(url.searchParams.has('apiKey')).toBe(false);
});
