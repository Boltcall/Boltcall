import { describe, test, expect } from 'vitest';
import { checkAnchor, anchorEventDedupKey, anchorLabel } from '../kpiGuard';

describe('kpiGuard', () => {
  test('naked tile fails', () => {
    expect(checkAnchor({})).toEqual({ ok: false, reason: 'missing' });
  });

  test('target passes', () => {
    expect(checkAnchor({ target: '$500/day' })).toEqual({ ok: true, reason: 'has_target' });
  });

  test('deltaVsPrior passes', () => {
    expect(checkAnchor({ deltaVsPrior: '+12%' })).toEqual({ ok: true, reason: 'has_delta' });
  });

  test('benchmark passes', () => {
    expect(checkAnchor({ benchmark: 'industry avg 3%' })).toEqual({ ok: true, reason: 'has_benchmark' });
  });

  test('explicit anchor="none" passes', () => {
    expect(checkAnchor({ anchor: 'none' })).toEqual({ ok: true, reason: 'explicit_none' });
  });

  test('empty-string anchors treated as missing', () => {
    expect(checkAnchor({ deltaVsPrior: '', benchmark: '', target: '' }).ok).toBe(false);
  });

  test('zero-value target still passes', () => {
    expect(checkAnchor({ target: 0 }).ok).toBe(true);
  });

  test('anchorEventDedupKey stable per day', () => {
    const a = anchorEventDedupKey('leads.today', '2026-08-13T00:00:00Z');
    const b = anchorEventDedupKey('leads.today', '2026-08-13T22:00:00Z');
    expect(a).toBe(b);
  });

  test('anchorEventDedupKey differs by day', () => {
    const a = anchorEventDedupKey('leads.today', '2026-08-13T00:00:00Z');
    const b = anchorEventDedupKey('leads.today', '2026-08-14T00:00:00Z');
    expect(a).not.toBe(b);
  });

  test('anchorLabel renders each anchor kind', () => {
    expect(anchorLabel({ deltaVsPrior: '+5%' })).toContain('vs prior');
    expect(anchorLabel({ benchmark: 'peer avg' })).toContain('vs');
    expect(anchorLabel({ target: '100/day' })).toContain('target');
    expect(anchorLabel({ anchor: 'none' })).toBe('');
    expect(anchorLabel({})).toBe('no anchor');
  });
});
