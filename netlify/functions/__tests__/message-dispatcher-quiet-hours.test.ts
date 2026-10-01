import { describe, it, expect } from 'vitest';
import { isQuietHours, nextAllowedSendTime, pickTimezone } from '../message-dispatcher';

// 2026-07-11 is EDT (UTC-4): 03:00 UTC = 23:00 EDT, 16:00 UTC = 12:00 EDT
const NY = 'America/New_York';

describe('quiet hours (TCPA)', () => {
  it('flags 23:00 local as quiet', () => {
    expect(isQuietHours(NY, new Date('2026-07-11T03:00:00Z'))).toBe(true);
  });

  it('flags 06:00 local as quiet', () => {
    expect(isQuietHours(NY, new Date('2026-07-11T10:00:00Z'))).toBe(true);
  });

  it('allows midday local', () => {
    expect(isQuietHours(NY, new Date('2026-07-11T16:00:00Z'))).toBe(false);
  });

  it('allows exactly 08:00 and blocks exactly 21:00 local', () => {
    expect(isQuietHours(NY, new Date('2026-07-11T12:00:00Z'))).toBe(false); // 08:00 EDT
    expect(isQuietHours(NY, new Date('2026-07-12T01:00:00Z'))).toBe(true); // 21:00 EDT
  });

  it('defers a 23:00 message to 08:00 next morning local time', () => {
    const now = new Date('2026-07-11T03:30:00Z'); // 23:30 EDT
    const deferred = new Date(nextAllowedSendTime(NY, now));
    expect(isQuietHours(NY, deferred)).toBe(false);
    // 08:xx EDT = 12:xx UTC same calendar day (Jul 11)
    expect(deferred.toISOString()).toBe('2026-07-11T12:00:00.000Z');
  });

  it('defers an early-morning message to 08:00 the same morning', () => {
    const now = new Date('2026-07-11T09:15:00Z'); // 05:15 EDT
    const deferred = new Date(nextAllowedSendTime(NY, now));
    expect(isQuietHours(NY, deferred)).toBe(false);
    expect(deferred.toISOString()).toBe('2026-07-11T12:00:00.000Z');
  });

  it('falls back to UTC on a bad timezone string', () => {
    expect(isQuietHours('Not/AZone', new Date('2026-07-11T23:00:00Z'))).toBe(true);
    expect(isQuietHours('Not/AZone', new Date('2026-07-11T12:00:00Z'))).toBe(false);
  });

  it('uses the firm timezone: SMS setting, then setup location, then Eastern', () => {
    expect(pickTimezone('America/Chicago', 'America/Los_Angeles')).toBe('America/Chicago');
    // 'UTC' = sms_settings column default (never set) -> location captured at setup
    expect(pickTimezone('UTC', 'America/Los_Angeles')).toBe('America/Los_Angeles');
    expect(pickTimezone(null, 'Not/AZone')).toBe(NY);
    expect(pickTimezone(undefined, null)).toBe(NY);
    // 13:00Z = 06:00 in LA (quiet for an LA firm) but 09:00 Eastern (open)
    const sixAmLA = new Date('2026-07-11T13:00:00Z');
    expect(isQuietHours(pickTimezone('UTC', 'America/Los_Angeles'), sixAmLA)).toBe(true);
    expect(isQuietHours(pickTimezone(null, null), sixAmLA)).toBe(false);
  });
});
