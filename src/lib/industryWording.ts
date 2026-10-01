// Industry-aware product wording. The product stays multi-industry: only law
// firms (canonical `law_firm`, legacy `legal`/`lawyer`) get their own terms,
// everyone else keeps the generic local-business words.
export const isLawFirm = (industry?: string | null): boolean =>
  ['law_firm', 'legal', 'lawyer'].includes((industry ?? '').trim().toLowerCase());

export interface Wording {
  lead: string;
  leads: string;
  customer: string;
  customers: string;
  job: string;
  jobs: string;
  appointment: string;
  appointments: string;
  call: string;
  calls: string;
}

const GENERIC: Wording = {
  lead: 'lead', leads: 'leads',
  customer: 'customer', customers: 'customers',
  job: 'job', jobs: 'jobs',
  appointment: 'appointment', appointments: 'appointments',
  call: 'call', calls: 'calls',
};

const LAW_FIRM: Wording = {
  lead: 'potential client', leads: 'potential clients',
  customer: 'client', customers: 'clients',
  job: 'matter', jobs: 'matters',
  appointment: 'consultation', appointments: 'consultations',
  call: 'intake call', calls: 'intake calls',
};

export const wordingFor = (industry?: string | null): Wording => (isLawFirm(industry) ? LAW_FIRM : GENERIC);

// "1 consultation" / "3 consultations"
export const countOf = (n: number, singular: string, plural: string): string =>
  `${n} ${n === 1 ? singular : plural}`;

// For text we don't author (AI summaries, fallback strings): swap the two generic
// terms law firms read wrong. No-op for every other industry.
export const localize = (text: string, lawFirm: boolean): string =>
  lawFirm
    ? text
        .replace(/\bLeads\b/g, 'Potential clients').replace(/\bleads\b/g, 'potential clients')
        .replace(/\bLead\b/g, 'Potential client').replace(/\blead\b/g, 'potential client')
        .replace(/\bAppointments?\b/g, (m) => (m.endsWith('s') ? 'Consultations' : 'Consultation'))
        .replace(/\bappointments?\b/g, (m) => (m.endsWith('s') ? 'consultations' : 'consultation'))
    : text;
