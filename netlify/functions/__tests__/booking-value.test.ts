import { describe, it, expect } from 'vitest';
import { estimateBookingValueCents } from '../_shared/booking-value';

// Minimal chainable stub: services matched by ilike pattern against a
// fixture list; business_profiles returns the given fallback.
function fakeSupabase(services: Array<{ name: string; price_cents: number | null }>, avgCents: number | null) {
  const ilikeMatch = (pattern: string, name: string) => {
    const re = new RegExp('^' + pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*') + '$', 'i');
    return re.test(name);
  };
  return {
    from(table: string) {
      let pattern: string | null = null;
      const chain: any = {
        select: () => chain,
        eq: () => chain,
        not: () => chain,
        limit: () => chain,
        ilike: (_col: string, p: string) => { pattern = p; return chain; },
        maybeSingle: async () => {
          if (table === 'business_profiles') return { data: avgCents == null ? null : { avg_deal_value_cents: avgCents } };
          const hit = services.find((s) => s.price_cents != null && pattern && ilikeMatch(pattern, s.name));
          return { data: hit ? { price_cents: hit.price_cents } : null };
        },
      };
      return chain;
    },
  } as any;
}

describe('estimateBookingValueCents', () => {
  const catalog = [
    { name: 'Drain cleaning', price_cents: 25000 },
    { name: 'Water heater install', price_cents: 180000 },
  ];

  it('matches exact service name', async () => {
    expect(await estimateBookingValueCents(fakeSupabase(catalog, 50000), 'u1', 'Drain cleaning')).toBe(25000);
  });

  it('matches fuzzily when booking title contains extra words', async () => {
    expect(await estimateBookingValueCents(fakeSupabase(catalog, 50000), 'u1', 'heater')).toBe(180000);
  });

  it('falls back to avg deal value for unknown service', async () => {
    expect(await estimateBookingValueCents(fakeSupabase(catalog, 50000), 'u1', 'Roof repair')).toBe(50000);
  });

  it('returns null when nothing configured', async () => {
    expect(await estimateBookingValueCents(fakeSupabase([], null), 'u1', 'Anything')).toBe(null);
  });

  it('never throws on a broken client', async () => {
    const broken = { from() { throw new Error('boom'); } } as any;
    expect(await estimateBookingValueCents(broken, 'u1', 'Drain cleaning')).toBe(null);
  });
});
