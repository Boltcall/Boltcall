import { Car, Gavel, Globe2, Heart, ScrollText } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// Practice-area copy for the law-firm marketing pages (home strip + lawyer landing page).
// Every capability below mirrors the legal template in netlify/functions/generate-agent-prompt.ts
// (urgency triage, intake questions, hard rules). Keep the two in sync: do not claim anything here
// the prompt does not do.
export interface PracticeArea {
  id: string;
  name: string;
  icon: LucideIcon;
  /** One line for the homepage card. */
  short: string;
  /** What the caller is usually going through. */
  situation: string;
  /** Matters flagged urgent and routed to a person first. */
  urgent: string[];
  /** Intake questions the AI asks. */
  intake: string[];
}

export const PRACTICE_AREAS: PracticeArea[] = [
  {
    id: 'personal-injury',
    name: 'Personal injury',
    icon: Car,
    short: 'Accident details, injuries, and insurance status captured on the first call.',
    situation: 'Callers are often hurt, shaken, and already talking to an insurance adjuster. They call several firms.',
    urgent: ['A filing or statute-of-limitations deadline coming up soon', 'A caller who was asked to sign something by an insurer'],
    intake: ['Type and date of the accident', 'Injuries, in the caller\'s own words', 'Police report and witnesses', 'Whether they have spoken to or signed anything with an insurer'],
  },
  {
    id: 'family-law',
    name: 'Family law',
    icon: Heart,
    short: 'Safety check first, then children, assets, and any court date.',
    situation: 'Callers are often emotional and scared. A calm first conversation matters as much as speed.',
    urgent: ['Domestic violence or a safety concern', 'A custody emergency or a violated order', 'A court date within 48 hours'],
    intake: ['Marital or partnership status', 'Whether children are involved', 'Significant assets or property', 'Any existing order or hearing'],
  },
  {
    id: 'criminal-defense',
    name: 'Criminal defense',
    icon: Gavel,
    short: 'Arrests and court dates flagged urgent and sent to a person right away.',
    situation: 'The call may come from a jail phone or a panicked relative at midnight. Minutes matter.',
    urgent: ['The caller or a family member is in custody or was just arrested', 'A court date within 48 hours', 'A caller in extreme distress'],
    intake: ['The charges involved', 'Whether the person is in custody or released', 'Court date and bail status', 'Whether the caller is the accused or a family member'],
  },
  {
    id: 'immigration',
    name: 'Immigration',
    icon: Globe2,
    short: 'Calm, slow intake for callers who fear deportation. English and Spanish.',
    situation: 'Callers may be afraid and may not speak English first. Tone and language matter.',
    urgent: ['A deportation order, removal proceedings, or ICE enforcement', 'A filing deadline within days'],
    intake: ['Current status or situation', 'Any removal proceedings', 'Pending USCIS applications', 'The outcome the caller hopes for'],
  },
  {
    id: 'estate-planning',
    name: 'Estate planning',
    icon: ScrollText,
    short: 'Existing documents, assets, and any health event that makes it urgent.',
    situation: 'Most callers are planning ahead, but some call after a diagnosis or a death in the family.',
    urgent: ['A health event that makes the matter time-sensitive'],
    intake: ['Whether a will, trust, or power of attorney already exists', 'The general kinds of assets involved', 'Any urgency behind the call'],
  },
];
