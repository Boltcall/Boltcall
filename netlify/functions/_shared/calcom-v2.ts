/** Cal.com v2 transport. Credentials belong in headers, never URLs/logs. */
export const CALCOM_API_BASE = 'https://api.cal.com/v2';

export function calcomHeaders(apiKey: string, path: string): Record<string, string> {
  if (!apiKey) throw new Error('Cal.com credentials are not configured');
  const version = path.startsWith('/event-types') ? '2024-06-14'
    : path.startsWith('/slots') ? '2024-09-04'
    : path.startsWith('/bookings') ? '2024-08-13' : null;
  return { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json',
    ...(version ? { 'cal-api-version': version } : {}) };
}

export function calcomUrl(path: string, query: Record<string, string> = {}): string {
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('?')) throw new Error('Invalid Cal.com path');
  const url = new URL(CALCOM_API_BASE + path);
  for (const [key, value] of Object.entries(query)) if (value) url.searchParams.set(key, value);
  return url.toString();
}

export function calcomFetch(apiKey: string, path: string, init: RequestInit = {}, query: Record<string, string> = {}): Promise<Response> {
  return fetch(calcomUrl(path, query), { ...init, headers: calcomHeaders(apiKey, path),
    redirect: 'error', signal: init.signal || AbortSignal.timeout(15000) });
}

export interface CalcomEventType { id: number; slug: string; title?: string; lengthInMinutes: number; }

export async function getCalcomEventType(apiKey: string, slug?: string): Promise<CalcomEventType | null> {
  if (!apiKey) return null;
  const response = await calcomFetch(apiKey, '/event-types');
  if (!response.ok) throw new Error(`Cal.com event types returned HTTP ${response.status}`);
  const result = await response.json();
  if (result.status !== 'success' || !Array.isArray(result.data)) throw new Error('Invalid Cal.com event types response');
  const events = result.data.filter((event: any) => Number.isInteger(event.id) && event.id > 0);
  // Do not silently book the first unrelated event when several are present.
  const matches = events.filter((event: any) => event.slug === (slug || 'free-consultation'));
  return matches.length === 1 ? matches[0] : !slug && events.length === 1 ? events[0] : null;
}

export async function getCalcomSlots(apiKey: string, eventTypeId: number, start: string, end: string, timeZone: string): Promise<Record<string, { start: string }[]>> {
  const response = await calcomFetch(apiKey, '/slots', {}, { eventTypeId: String(eventTypeId), start, end, timeZone });
  if (!response.ok) throw new Error(`Cal.com slots returned HTTP ${response.status}`);
  const result = await response.json();
  if (result.status !== 'success' || !result.data || typeof result.data !== 'object' || Array.isArray(result.data)) throw new Error('Invalid Cal.com slots response');
  for (const slots of Object.values(result.data)) {
    if (!Array.isArray(slots) || slots.some(s => typeof s?.start !== 'string' || !Number.isFinite(Date.parse(s.start)))) throw new Error('Invalid Cal.com slot');
  }
  return result.data;
}
