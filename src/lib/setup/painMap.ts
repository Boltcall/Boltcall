// Central mapping for the /start onboarding pain-point choice.
// PainPoint is the value emitted by PainScene (StartOnboarding.tsx).
// STORE_KEY is the field the dashboard checklist reads out of
// setupStore.survey.painPoints (useSetupProgress.ts / PAIN_POINT_TASKS).
// The names diverge — /start uses "slow_followup"/"front_desk", the checklist
// uses "slow_response"/"manual_booking" — so bridging the two needs one place
// that owns the translation.

export type PainPoint = 'missed_calls' | 'after_hours' | 'slow_followup' | 'front_desk';

export const PAIN_TO_STORE_KEY: Record<PainPoint, string> = {
  missed_calls: 'missed_calls',
  after_hours: 'after_hours',
  slow_followup: 'slow_response',
  front_desk: 'manual_booking',
};

export function isPainPoint(v: unknown): v is PainPoint {
  return v === 'missed_calls' || v === 'after_hours' || v === 'slow_followup' || v === 'front_desk';
}
