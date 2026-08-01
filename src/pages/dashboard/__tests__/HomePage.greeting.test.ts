import { describe, it, expect } from 'vitest';
import { buildGreeting } from '../HomePage';

const base = {
  firstName: 'Noam',
  agentName: 'Alex',
  businessName: 'Acme Plumbing',
};

describe('buildGreeting', () => {
  it('shows real stat when calls were handled', () => {
    const { hello, outcome } = buildGreeting({
      ...base,
      now: new Date('2026-07-08T09:00:00'), // Wednesday morning
      handledSinceYesterday: 6,
    });
    expect(hello).toBe('Good morning, Noam.');
    expect(outcome).toBe('Alex answered 6 calls for Acme Plumbing since yesterday.');
  });

  it('falls back to standing-by copy with no data — never fabricates', () => {
    const { outcome } = buildGreeting({
      ...base,
      now: new Date('2026-07-08T20:00:00'),
      handledSinceYesterday: 0,
    });
    expect(outcome).toBe('Alex is standing by for Acme Plumbing.');
  });

  it('adds fresh-start framing on Monday (P15)', () => {
    const { outcome } = buildGreeting({
      ...base,
      now: new Date('2026-07-06T10:00:00'), // Monday
      handledSinceYesterday: 3,
    });
    expect(outcome).toMatch(/^New week\./);
  });

  it('omits business clause when businessName missing', () => {
    const { outcome } = buildGreeting({
      ...base,
      businessName: null,
      now: new Date('2026-07-08T10:00:00'),
      handledSinceYesterday: 1,
    });
    expect(outcome).toBe('Alex answered 1 call since yesterday.');
  });
});
