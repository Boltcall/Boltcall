import { describe, it, expect } from 'vitest';
import {
  getValueRouting, valueBadge, valueDetail, dollarsToCents, centsToDollars,
  mergeThresholdIntoPrefs, defaultThresholdCents, isValidAlertPhone,
} from '../leadValue';

const vr = (o = {}) => ({ tier: 'high', estimated_value_cents: 1500000, value_source: 'ai_estimate', threshold_cents: 800000, service_requested: 'Roof replacement', ...o });

describe('valueBadge', () => {
  it('big job shows the estimate', () => {
    expect(valueBadge(getValueRouting({ value_routing: vr() }))).toEqual({ kind: 'big', label: 'Big job ~$15,000' });
  });
  it('big job without an estimate still shows', () => {
    expect(valueBadge(getValueRouting({ value_routing: vr({ estimated_value_cents: null }) }))?.label).toBe('Big job');
  });
  it('out of scope', () => {
    expect(valueBadge(getValueRouting({ value_routing: vr({ tier: 'out_of_scope' }) }))).toEqual({ kind: 'out', label: 'Out of scope' });
  });
  it.each([
    ['normal', { value_routing: vr({ tier: 'normal' }) }],
    ['unknown', { value_routing: vr({ tier: 'unknown' }) }],
    ['no value_routing', { other: 1 }],
    ['null raw_data', null],
    ['undefined raw_data', undefined],
    ['garbage value_routing', { value_routing: 'x' }],
  ])('shows nothing for %s', (_n, raw) => {
    expect(valueBadge(getValueRouting(raw))).toBeNull();
  });
});

describe('valueDetail', () => {
  it('marks AI estimates', () => {
    expect(valueDetail(getValueRouting({ value_routing: vr() }))).toBe('Roof replacement, ~$15,000 (AI estimate)');
  });
  it('catalog price has no AI label', () => {
    expect(valueDetail(getValueRouting({ value_routing: vr({ value_source: 'catalog' }) }))).toBe('Roof replacement, ~$15,000');
  });
  it('nothing for missing data', () => {
    expect(valueDetail(null)).toBeNull();
  });
});

describe('settings helpers', () => {
  it('converts dollars to cents', () => {
    expect(dollarsToCents('8000')).toBe(800000);
    expect(dollarsToCents('$8,000')).toBe(800000);
    expect(dollarsToCents('  ')).toBeNull();
    expect(dollarsToCents('0')).toBeUndefined();
    expect(dollarsToCents('-5')).toBeUndefined();
    expect(dollarsToCents('12.5')).toBeUndefined();
    expect(dollarsToCents('abc')).toBeUndefined();
    expect(centsToDollars(800000)).toBe('8000');
    expect(centsToDollars(null)).toBe('');
  });
  it('merge keeps other keys and other lead_value keys', () => {
    const prefs = { theme: 'dark', lead_value: { other: 1, high_value_threshold_cents: 100 } };
    expect(mergeThresholdIntoPrefs(prefs, 800000)).toEqual({ theme: 'dark', lead_value: { other: 1, high_value_threshold_cents: 800000 } });
    expect(prefs.lead_value.high_value_threshold_cents).toBe(100); // not mutated
  });
  it('clearing removes only the threshold', () => {
    expect(mergeThresholdIntoPrefs({ theme: 'dark', lead_value: { high_value_threshold_cents: 5 } }, null)).toEqual({ theme: 'dark' });
    expect(mergeThresholdIntoPrefs(null, 700000)).toEqual({ lead_value: { high_value_threshold_cents: 700000 } });
  });
  it('industry default', () => {
    expect(defaultThresholdCents('Roofing')).toBe(800000);
    expect(defaultThresholdCents('nope')).toBeNull();
    expect(defaultThresholdCents(null)).toBeNull();
  });
  it('phone needs 10+ digits or blank', () => {
    expect(isValidAlertPhone('')).toBe(true);
    expect(isValidAlertPhone('(555) 123-4567')).toBe(true);
    expect(isValidAlertPhone('555-1234')).toBe(false);
  });
});
