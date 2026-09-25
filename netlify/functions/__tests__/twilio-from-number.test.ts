import { afterEach, expect, it } from 'vitest';
import { resolveTwilioFromNumber, toE164 } from '../_shared/twilio-from-number';

const db = (row: any) => ({
  from: () => {
    const q: any = { select: () => q, eq: () => q, order: () => q, limit: () => q, maybeSingle: async () => ({ data: row, error: null }) };
    return q;
  },
});

afterEach(() => { delete process.env.TWILIO_FROM_NUMBER; });

it("sends from the tenant's own line even when a shared number is configured", async () => {
  process.env.TWILIO_FROM_NUMBER = '+15550009999';
  expect(await resolveTwilioFromNumber(db({ phone_number: '+15551230000' }), 'user-1')).toBe('+15551230000');
});

it('falls back to the shared number only when the tenant has no line', async () => {
  process.env.TWILIO_FROM_NUMBER = '+15550009999';
  expect(await resolveTwilioFromNumber(db(null), 'user-1')).toBe('+15550009999');
  expect(await resolveTwilioFromNumber(db(null), 'user-1', null)).toBeNull(); // Retell calls
});

it('normalizes US numbers to E.164 for opt-out and dedup matching', () => {
  expect(toE164('(555) 111-2222')).toBe('+15551112222');
  expect(toE164('1-555-111-2222')).toBe('+15551112222');
  expect(toE164('+44 20 7946 0000')).toBe('+442079460000');
  expect(toE164('')).toBe('');
});
