import { describe, expect, it } from 'vitest';
import {
  FOLLOWUP_LIMITS,
  getFollowupPresetSteps,
  summarizeFollowupSteps,
  validateFollowupSteps,
} from '../followupPresets';

describe('followup presets', () => {
  it('creates a balanced ad no-answer sequence with bounded steps', () => {
    const steps = getFollowupPresetSteps('ad_no_answer', 'standard');

    expect(steps).toHaveLength(4);
    expect(summarizeFollowupSteps(steps)).toBe('5m SMS -> 30m CALL -> 2h SMS -> 1d SMS');
    expect(validateFollowupSteps(steps)).toBeNull();
  });

  it('rejects sequences that can over-contact leads', () => {
    const tooManySteps = Array.from({ length: FOLLOWUP_LIMITS.maxSteps + 1 }, (_, index) => ({
      step_order: index + 1,
      channel: 'sms' as const,
      delay_minutes: index * 60,
      template: 'Hi {{client_name}}, checking in.',
      subject: '',
      is_active: true,
    }));

    expect(validateFollowupSteps(tooManySteps)).toMatch(/steps or fewer/i);
  });

  it('rejects immediate AI call retries while allowing immediate SMS', () => {
    expect(validateFollowupSteps([
      {
        step_order: 1,
        channel: 'sms',
        delay_minutes: 0,
        template: 'Hi {{client_name}}, want help now?',
        subject: '',
        is_active: true,
      },
    ])).toBeNull();

    expect(validateFollowupSteps([
      {
        step_order: 1,
        channel: 'call',
        delay_minutes: 0,
        template: '',
        subject: '',
        is_active: true,
      },
    ])).toMatch(/at least 15 minutes/i);
  });

  it('keeps SMS copy within carrier-safe length', () => {
    const message = 'x'.repeat(FOLLOWUP_LIMITS.maxSmsChars + 1);

    expect(validateFollowupSteps([
      {
        step_order: 1,
        channel: 'sms',
        delay_minutes: 5,
        template: message,
        subject: '',
        is_active: true,
      },
    ])).toMatch(/SMS is too long/i);
  });
});
