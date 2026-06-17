export type FollowupTrigger =
  | 'missed_call'
  | 'website_no_answer'
  | 'ad_no_answer'
  | 'appointment_completed'
  | 'lead_created'
  | 'manual';

export type FollowupChannel = 'sms' | 'email' | 'call';

export type FollowupPresetId = 'gentle' | 'standard' | 'aggressive';

export type FollowupStepDraft = {
  step_order: number;
  channel: FollowupChannel;
  delay_minutes: number;
  template: string;
  subject: string;
  is_active: boolean;
};

export const FOLLOWUP_LIMITS = {
  maxSteps: 5,
  maxCallSteps: 2,
  maxSmsChars: 320,
  maxEmailChars: 2000,
  minRetryCallDelayMinutes: 15,
};

export const FOLLOWUP_PRESET_META: Record<
  FollowupPresetId,
  { label: string; description: string }
> = {
  gentle: {
    label: 'Gentle',
    description: 'Fewer touches, more breathing room.',
  },
  standard: {
    label: 'Standard',
    description: 'Balanced speed and persistence.',
  },
  aggressive: {
    label: 'Aggressive',
    description: 'Fastest recovery for hot paid leads.',
  },
};

const AD_SMS_1 =
  'Hi {{client_name}}, this is {{business_name}}. We just tried calling about your request. Want help now? Reply here or call {{business_phone}}.';

const AD_SMS_2 =
  'Still happy to help, {{client_name}}. Reply with a good time and we will get you taken care of.';

const AD_SMS_3 =
  'Last quick follow-up from {{business_name}}. If you still need help, reply here and we will jump on it.';

const WEBSITE_SMS_1 =
  'Hi {{client_name}}, thanks for reaching out to {{business_name}}. We tried calling and can help here by text too.';

const MISSED_CALL_SMS_1 =
  'Hi {{client_name}}, sorry we missed you. This is {{business_name}}. Reply here or call {{business_phone}} and we will help.';

const step = (
  step_order: number,
  channel: FollowupChannel,
  delay_minutes: number,
  template = '',
  subject = '',
): FollowupStepDraft => ({
  step_order,
  channel,
  delay_minutes,
  template,
  subject,
  is_active: true,
});

const PRESETS: Record<
  Exclude<FollowupTrigger, 'appointment_completed' | 'lead_created' | 'manual'>,
  Record<FollowupPresetId, FollowupStepDraft[]>
> = {
  ad_no_answer: {
    gentle: [
      step(1, 'sms', 10, AD_SMS_1),
      step(2, 'sms', 240, AD_SMS_2),
      step(3, 'sms', 1440, AD_SMS_3),
    ],
    standard: [
      step(1, 'sms', 5, AD_SMS_1),
      step(2, 'call', 30),
      step(3, 'sms', 120, AD_SMS_2),
      step(4, 'sms', 1440, AD_SMS_3),
    ],
    aggressive: [
      step(1, 'sms', 0, AD_SMS_1),
      step(2, 'call', 15),
      step(3, 'sms', 60, AD_SMS_2),
      step(4, 'call', 180),
      step(5, 'sms', 1440, AD_SMS_3),
    ],
  },
  website_no_answer: {
    gentle: [
      step(1, 'sms', 15, WEBSITE_SMS_1),
      step(2, 'sms', 240, AD_SMS_2),
      step(3, 'email', 1440, 'Hi {{client_name}},\n\nWe received your request and would still love to help.\n\nBest,\n{{business_name}}', 'Re: Your request'),
    ],
    standard: [
      step(1, 'sms', 5, WEBSITE_SMS_1),
      step(2, 'call', 30),
      step(3, 'sms', 120, AD_SMS_2),
      step(4, 'email', 1440, 'Hi {{client_name}},\n\nWe tried reaching you and are still here if you need help.\n\nBest,\n{{business_name}}', 'We tried reaching you'),
    ],
    aggressive: [
      step(1, 'sms', 0, WEBSITE_SMS_1),
      step(2, 'call', 15),
      step(3, 'sms', 60, AD_SMS_2),
      step(4, 'call', 180),
      step(5, 'email', 1440, 'Hi {{client_name}},\n\nLast quick follow-up. Reply here if you still want help.\n\nBest,\n{{business_name}}', 'Quick follow-up'),
    ],
  },
  missed_call: {
    gentle: [
      step(1, 'sms', 0, MISSED_CALL_SMS_1),
      step(2, 'sms', 240, AD_SMS_2),
    ],
    standard: [
      step(1, 'sms', 0, MISSED_CALL_SMS_1),
      step(2, 'call', 30),
      step(3, 'sms', 180, AD_SMS_2),
    ],
    aggressive: [
      step(1, 'sms', 0, MISSED_CALL_SMS_1),
      step(2, 'call', 15),
      step(3, 'sms', 60, AD_SMS_2),
      step(4, 'call', 180),
    ],
  },
};

export function getFollowupPresetSteps(
  trigger: FollowupTrigger,
  preset: FollowupPresetId,
): FollowupStepDraft[] {
  if (trigger === 'appointment_completed' || trigger === 'lead_created' || trigger === 'manual') {
    return [step(1, 'sms', 1440, 'Hi {{client_name}}, just checking in from {{business_name}}. How can we help?')];
  }

  return PRESETS[trigger][preset].map((item, index) => ({
    ...item,
    step_order: index + 1,
  }));
}

export function formatFollowupDelay(minutes: number): string {
  if (minutes === 0) return 'immediately';
  if (minutes % 1440 === 0) return `${minutes / 1440}d`;
  if (minutes % 60 === 0) return `${minutes / 60}h`;
  return `${minutes}m`;
}

export function summarizeFollowupSteps(steps: Pick<FollowupStepDraft, 'channel' | 'delay_minutes'>[]): string {
  return steps
    .map((item) => `${formatFollowupDelay(item.delay_minutes)} ${item.channel.toUpperCase()}`)
    .join(' -> ');
}

export function validateFollowupSteps(steps: FollowupStepDraft[]): string | null {
  if (steps.length === 0) return 'Add at least one step.';
  if (steps.length > FOLLOWUP_LIMITS.maxSteps) {
    return `Use ${FOLLOWUP_LIMITS.maxSteps} steps or fewer to avoid over-contacting leads.`;
  }

  const callSteps = steps.filter((item) => item.channel === 'call');
  if (callSteps.length > FOLLOWUP_LIMITS.maxCallSteps) {
    return `Use ${FOLLOWUP_LIMITS.maxCallSteps} AI call retries or fewer.`;
  }

  for (let index = 0; index < steps.length; index++) {
    const item = steps[index];
    const stepNumber = index + 1;
    if (item.delay_minutes < 0) return `Step ${stepNumber} timing cannot be negative.`;
    if (
      item.channel === 'call' &&
      item.delay_minutes < FOLLOWUP_LIMITS.minRetryCallDelayMinutes
    ) {
      return `Step ${stepNumber} AI call retry must wait at least ${FOLLOWUP_LIMITS.minRetryCallDelayMinutes} minutes.`;
    }
    if (item.channel === 'sms') {
      if (!item.template.trim()) return `Step ${stepNumber} SMS message is empty.`;
      if (item.template.length > FOLLOWUP_LIMITS.maxSmsChars) {
        return `Step ${stepNumber} SMS is too long. Keep it under ${FOLLOWUP_LIMITS.maxSmsChars} characters.`;
      }
    }
    if (item.channel === 'email') {
      if (!item.subject.trim()) return `Step ${stepNumber} needs a subject line.`;
      if (!item.template.trim()) return `Step ${stepNumber} email message is empty.`;
      if (item.template.length > FOLLOWUP_LIMITS.maxEmailChars) {
        return `Step ${stepNumber} email is too long. Keep it under ${FOLLOWUP_LIMITS.maxEmailChars} characters.`;
      }
    }
  }

  return null;
}
