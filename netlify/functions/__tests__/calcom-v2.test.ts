import { beforeEach, expect, it, vi } from 'vitest';
import { calcomFetch, calcomUrl, getCalcomEventType, getCalcomSlots } from '../_shared/calcom-v2';
beforeEach(() => vi.stubGlobal('fetch', vi.fn()));
it('selects the exact consultation instead of the first similarly named event', async () => {
  vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ status: 'success', data: [{ id: 1, slug: 'other-consultation' }, { id: 2, slug: 'free-consultation' }] })));
  expect((await getCalcomEventType('test-key'))?.id).toBe(2);
});
it('refuses ambiguous or unrelated event types and never reuses another credential cache', async () => {
  vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ status: 'success', data: [{ id: 1, slug: 'other' }, { id: 2, slug: 'different' }] })));
  expect(await getCalcomEventType('test-key')).toBeNull();
  vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ status: 'success', data: [{ id: 3, slug: 'free-consultation' }] })));
  expect((await getCalcomEventType('other-key'))?.id).toBe(3);
  expect(vi.mocked(fetch).mock.calls[1][1]?.headers).toMatchObject({ Authorization: 'Bearer other-key' });
});
it('does not turn a malformed availability response into no availability', async () => {
  vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ status: 'success', data: { slots: 'invalid' } })));
  await expect(getCalcomSlots('test-key',1,'2026-10-22','2026-10-23','UTC')).rejects.toThrow();
});
it('does not retry mutations and prevents credential redirects', async () => {
  vi.mocked(fetch).mockRejectedValue(new Error('timeout'));
  await expect(calcomFetch('test-key','/bookings',{ method:'POST' })).rejects.toThrow();
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(vi.mocked(fetch).mock.calls[0][1]?.redirect).toBe('error');
});
it('does not accept external paths or query-string credentials', () => {
  expect(()=>calcomUrl('//example.com')).toThrow();
  expect(()=>calcomUrl('/slots?apiKey=not-a-secret')).toThrow();
});
