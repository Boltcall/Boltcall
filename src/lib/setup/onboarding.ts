export const PENDING_SETUP_STORAGE_KEY = 'boltcall_pending_agent_setup';

export const INDUSTRY_OPTIONS = [
  { value: 'other', label: 'Other' },
  { value: 'roofing', label: 'Roofing' },
  { value: 'law-firms', label: 'Law Firms' },
  { value: 'med-spa', label: 'Med Spa' },
  { value: 'solar', label: 'Solar' },
] as const;

export const VOICE_OPTIONS = [
  { value: '11labs-Grace', label: 'Grace', description: 'Warm and confident' },
  { value: '11labs-Nico', label: 'Nico', description: 'Direct and energetic' },
  { value: 'retell-Leland', label: 'Leland', description: 'Polished and calm' },
] as const;

export const GOAL_OPTIONS = [
  { value: 'book-appointments', label: 'Book appointments' },
  { value: 'qualify-and-capture', label: 'Qualify and capture leads' },
] as const;

export const TONE_OPTIONS = [
  { value: 'friendly_concise', label: 'Friendly and concise' },
  { value: 'formal', label: 'Professional' },
] as const;

export interface PendingAgentSetup {
  ownerName?: string;
  businessName: string;
  websiteUrl: string;
  country?: string;
  industry: (typeof INDUSTRY_OPTIONS)[number]['value'];
  voiceId: (typeof VOICE_OPTIONS)[number]['value'];
  goal: (typeof GOAL_OPTIONS)[number]['value'];
  tone: (typeof TONE_OPTIONS)[number]['value'];
  transferNumber: string;
  kbFileNames?: string[];
  createdAt: string;
}

export function savePendingAgentSetup(data: PendingAgentSetup) {
  localStorage.setItem(PENDING_SETUP_STORAGE_KEY, JSON.stringify(data));
}

export function readPendingAgentSetup(): PendingAgentSetup | null {
  const raw = localStorage.getItem(PENDING_SETUP_STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as PendingAgentSetup;
  } catch {
    localStorage.removeItem(PENDING_SETUP_STORAGE_KEY);
    return null;
  }
}

export function clearPendingAgentSetup() {
  localStorage.removeItem(PENDING_SETUP_STORAGE_KEY);
}

export function getIndustryLabel(value: string) {
  return INDUSTRY_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

export function getVoiceLabel(value: string) {
  return VOICE_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

export function getGoalLabel(value: string) {
  return GOAL_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

export function getToneLabel(value: string) {
  return TONE_OPTIONS.find((option) => option.value === value)?.label ?? value;
}
