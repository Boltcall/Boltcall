import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  assessLeadValue,
  classifyLeadValue,
  DEFAULT_THRESHOLD_CENTS,
  formatUsd,
  resolveThresholdCents,
  smsOwner,
} from '../_shared/lead-value';

// Minimal table fake: each table answers its maybeSingle with a fixed row.
function fakeSupabase(rows: { services?: any; business_profiles?: any; notification_preferences?: any; phone_numbers?: any }) {
  const calls: string[] = [];
  return {
    calls,
    from(table: string) {
      calls.push(table);
      const b: any = {};
      for (const m of ['select', 'eq', 'ilike', 'not', 'order', 'limit']) b[m] = () => b;
      b.maybeSingle = async () => ({ data: (rows as any)[table] ?? null, error: null });
      return b;
    },
  };
}

describe('resolveThresholdCents', () => {
  it('prefers the owner setting over the industry default', () => {
    expect(resolveThresholdCents({ lead_value: { high_value_threshold_cents: 250_000 } }, 'roofing', null)).toBe(250_000);
  });

  it('falls back to the industry default, case-insensitive', () => {
    expect(resolveThresholdCents({}, 'HVAC', null)).toBe(DEFAULT_THRESHOLD_CENTS.hvac);
  });

  it('falls back to 3x the average deal for unknown industries', () => {
    expect(resolveThresholdCents(null, 'other', 40_000)).toBe(120_000);
  });

  it('returns null when nothing is known, so no big-job alert is ever guessed', () => {
    expect(resolveThresholdCents(undefined, 'other', null)).toBeNull();
  });

  it.each([0, -5, 'abc', null])('ignores an invalid owner setting (%s)', (bad) => {
    expect(resolveThresholdCents({ lead_value: { high_value_threshold_cents: bad } }, 'plumbing', null)).toBe(DEFAULT_THRESHOLD_CENTS.plumbing);
  });
});

describe('classifyLeadValue', () => {
  it('out of scope wins over any value', () => {
    expect(classifyLeadValue({ estimatedCents: 9_999_999, outOfScope: true, thresholdCents: 100 })).toBe('out_of_scope');
  });
  it('high at or above the threshold', () => {
    expect(classifyLeadValue({ estimatedCents: 500_000, outOfScope: false, thresholdCents: 500_000 })).toBe('high');
  });
  it('normal below the threshold', () => {
    expect(classifyLeadValue({ estimatedCents: 499_999, outOfScope: false, thresholdCents: 500_000 })).toBe('normal');
  });
  it('normal when there is a value but no threshold', () => {
    expect(classifyLeadValue({ estimatedCents: 500_000, outOfScope: false, thresholdCents: null })).toBe('normal');
  });
  it('unknown with no estimate', () => {
    expect(classifyLeadValue({ estimatedCents: null, outOfScope: false, thresholdCents: 1 })).toBe('unknown');
  });
});

describe('assessLeadValue', () => {
  it('uses the owner catalog price over the AI estimate', async () => {
    const sb = fakeSupabase({ services: { price_cents: 1_200_000 }, business_profiles: { main_category: 'roofing' } });
    const r = await assessLeadValue(sb, 'u1', { service_requested: 'Roof replacement', estimated_job_value: 3000 });
    expect(r).toEqual({
      tier: 'high',
      estimated_value_cents: 1_200_000,
      value_source: 'catalog',
      threshold_cents: DEFAULT_THRESHOLD_CENTS.roofing,
      service_requested: 'Roof replacement',
    });
  });

  it('uses the AI estimate (USD, string tolerated) when the catalog has no match', async () => {
    const sb = fakeSupabase({ business_profiles: { main_category: 'hvac' } });
    const r = await assessLeadValue(sb, 'u1', { service_requested: 'new AC unit', estimated_job_value: '$7,500' });
    expect(r).toMatchObject({ tier: 'high', estimated_value_cents: 750_000, value_source: 'ai_estimate' });
  });

  it('never falls back to the average deal value as an estimate', async () => {
    const sb = fakeSupabase({ business_profiles: { main_category: 'other', avg_deal_value_cents: 90_000 } });
    const r = await assessLeadValue(sb, 'u1', { service_requested: 'something', estimated_job_value: 0 });
    expect(r).toMatchObject({ tier: 'unknown', estimated_value_cents: null, value_source: null, threshold_cents: 270_000 });
  });

  it('skips the catalog lookup when no service was captured', async () => {
    const sb = fakeSupabase({ business_profiles: { main_category: 'plumbing' } });
    const r = await assessLeadValue(sb, 'u1', { estimated_job_value: 150 });
    expect(sb.calls).not.toContain('services');
    expect(r).toMatchObject({ tier: 'normal', estimated_value_cents: 15_000, service_requested: null });
  });

  it('flags out of scope', async () => {
    const r = await assessLeadValue(fakeSupabase({}), 'u1', { out_of_scope: true, service_requested: 'tree removal' });
    expect(r.tier).toBe('out_of_scope');
  });

  it('never throws when the database fails', async () => {
    const sb = { from: () => { throw new Error('db down'); } };
    const r = await assessLeadValue(sb, 'u1', { estimated_job_value: 100 });
    expect(r).toMatchObject({ tier: 'normal', estimated_value_cents: 10_000, threshold_cents: null });
  });
});

describe('formatUsd', () => {
  it('rounds cents to whole dollars with separators', () => {
    expect(formatUsd(1_234_567)).toBe('$12,346');
  });
});

describe('smsOwner', () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);
    vi.stubEnv('TWILIO_ACCOUNT_SID', 'AC123');
    vi.stubEnv('TWILIO_AUTH_TOKEN', 'tok');
    vi.stubEnv('TWILIO_FROM_NUMBER', '+15550000000');
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('texts the owner phone from the tenant line', async () => {
    const sb = fakeSupabase({
      notification_preferences: { notification_phone: '(512) 555-0199', sms_notifications: true },
      phone_numbers: { phone_number: '+15125550000' },
    });
    expect(await smsOwner(sb, 'u1', 'Big job')).toBe(true);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.twilio.com/2010-04-01/Accounts/AC123/Messages.json');
    const body = new URLSearchParams(init.body);
    expect(body.get('To')).toBe('+15125550199');
    expect(body.get('From')).toBe('+15125550000');
    expect(body.get('Body')).toBe('Big job');
  });

  it.each([
    ['no phone saved', { notification_phone: null }],
    ['SMS notifications off', { notification_phone: '+15125550199', sms_notifications: false }],
    ['no preferences row', null],
  ])('sends nothing when %s', async (_l, prefs) => {
    expect(await smsOwner(fakeSupabase({ notification_preferences: prefs }), 'u1', 'x')).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends nothing without Twilio credentials', async () => {
    vi.stubEnv('TWILIO_AUTH_TOKEN', '');
    const sb = fakeSupabase({ notification_preferences: { notification_phone: '+15125550199' } });
    expect(await smsOwner(sb, 'u1', 'x')).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns false instead of throwing when Twilio errors', async () => {
    fetchMock.mockRejectedValue(new Error('network'));
    const sb = fakeSupabase({ notification_preferences: { notification_phone: '+15125550199' } });
    expect(await smsOwner(sb, 'u1', 'x')).toBe(false);
  });
});
