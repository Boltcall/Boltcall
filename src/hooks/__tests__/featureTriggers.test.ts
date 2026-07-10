import { describe, it, expect } from 'vitest';
import { pickFeatureSuggestion, type TriggerInputs } from '../useFeatureTriggers';
import { resolveMilestones } from '../../utils/milestones';

const base: TriggerInputs = {
  missedCalls7d: 0,
  bookedJobs: 0,
  smsOn: false,
  remindersOn: false,
  reputationOn: false,
  avgJobValue: 450,
  agentName: 'Alex',
};

describe('pickFeatureSuggestion', () => {
  it('returns null when no trigger fires', () => {
    expect(pickFeatureSuggestion(base)).toBeNull();
  });

  it('suggests text-back on ≥3 missed calls with sms off, with labeled estimate', () => {
    const s = pickFeatureSuggestion({ ...base, missedCalls7d: 3 });
    expect(s?.id).toBe('sms_textback');
    expect(s?.title).toContain('$1,350');
    expect(s?.description.toLowerCase()).toContain('estimate');
  });

  it('never fires sms suggestion when sms already on', () => {
    expect(pickFeatureSuggestion({ ...base, missedCalls7d: 5, smsOn: true })).not.toMatchObject({ id: 'sms_textback' });
  });

  it('suggests reminders after first booking', () => {
    expect(pickFeatureSuggestion({ ...base, bookedJobs: 1 })?.id).toBe('reminders');
  });

  it('suggests reputation at 10 bookings when reminders already on', () => {
    expect(pickFeatureSuggestion({ ...base, bookedJobs: 10, remindersOn: true })?.id).toBe('reputation');
  });

  it('returns at most one suggestion even when several triggers fire', () => {
    const s = pickFeatureSuggestion({ ...base, missedCalls7d: 5, bookedJobs: 12 });
    expect(s).not.toBeNull();
    expect(Array.isArray(s)).toBe(false);
  });
});

describe('resolveMilestones', () => {
  it('empty for a fresh account', () => {
    expect(resolveMilestones({ bookingCount: 0, callCount: 0 })).toEqual([]);
  });

  it('first booking milestone at 1', () => {
    expect(resolveMilestones({ bookingCount: 1, callCount: 0 }).map(m => m.id)).toEqual(['first_booking']);
  });

  it('accumulates thresholds', () => {
    expect(resolveMilestones({ bookingCount: 10, callCount: 100 }).map(m => m.id))
      .toEqual(['first_booking', 'tenth_booking', 'hundredth_call']);
  });
});
