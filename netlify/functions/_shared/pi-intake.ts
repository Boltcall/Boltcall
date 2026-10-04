import { z } from 'zod';

export const FREE_CONVERSATIONS = 10;
export const MAX_MESSAGES = 24;
export const THREAD_HOURS = 72;
export const firmInput = z.object({
  name: z.string().trim().min(2).max(120),
  practiceAreas: z.array(z.string().trim().min(1).max(100)).max(15),
  locations: z.array(z.string().trim().min(1).max(100)).max(15),
  phone: z.string().trim().max(40).default(''),
  handoffEmail: z.string().email().max(180).optional().or(z.literal('')),
  timezone: z.string().max(100).refine(value=>{try{new Intl.DateTimeFormat('en-US',{timeZone:value});return true;}catch{return false;}},'Invalid timezone').default('America/New_York'),
  questions: z.array(z.string().trim().min(8).max(240)).min(3).max(8).optional(),
});
export type FirmDraft = ReturnType<typeof buildFirmDraft>;
export type IntakeMessage = { role: 'assistant' | 'user'; text: string; field?: string };
export const DEFAULT_QUESTIONS = [
  'What is your name, and who else was involved? Please share names only so the firm can check for conflicts.',
  'What type of incident are you contacting the firm about? Please keep it brief and do not send medical records or sensitive documents.',
  'When and where did the incident happen?',
  'Are you already represented by a lawyer for this matter?',
  'What is a good time for the intake team to call you?',
];

export function buildFirmDraft(website: string, input: z.input<typeof firmInput>) {
  const data = firmInput.parse(input);
  return { ...data, website, questions: data.questions || [...DEFAULT_QUESTIONS], approved: false };
}

export function nextIntakeReply(firm: FirmDraft, history: IntakeMessage[], message: string) {
  const answered = history.filter(item => item.role === 'user').length;
  const text = message.trim();
  if (/^(stop|unsubscribe|cancel|end|quit|stopall)\s*[.!]?$/i.test(text)) {
    return { text: '', status: 'opted_out', nextStep: answered };
  }
  if (/\b(emergency|can't breathe|cannot breathe|suicid|kill myself|immediate danger)\b/i.test(text)) {
    return { text: 'If you are in immediate danger or need urgent medical help, contact local emergency services now. This assistant cannot provide emergency assistance. Your message is flagged for the intake team.', status: 'needs_attention', nextStep: answered };
  }
  if (/\b(lawyer|attorney|human|person|help|deadline|court|settlement|worth|value|should i|insurance|insurer|represent|signed)\b/i.test(text)) {
    return { text: 'An intake team member needs to review this with you. I cannot give legal advice, assess your case, or confirm representation. Your message has been flagged for human follow-up.', status: 'needs_attention', nextStep: answered };
  }
  if (!history.length) {
    return { text: `Hi, this is the automated intake assistant for ${firm.name}. This is not legal advice and does not create an attorney-client relationship. Reply STOP to opt out or HUMAN for staff. ${firm.questions[0]}`, status: 'active', nextStep: 0 };
  }
  // ponytail: a guided intake, not an unconstrained legal chatbot. Staff reviews every summary.
  const nextStep = answered + 1;
  return nextStep < firm.questions.length
    ? { text: firm.questions[nextStep], status: 'active', nextStep }
    : { text: 'Thank you. Your intake is ready for the team to review and arrange a follow-up. No appointment or representation is confirmed. Reply HUMAN if you need staff.', status: 'needs_attention', nextStep };
}

export function intakeSummary(firm: FirmDraft, messages: IntakeMessage[]) {
  return messages.filter(item => item.role === 'user').map((item, i) => ({
    question: item.field || firm.questions[i] || 'Additional message', answer: item.text,
  }));
}
