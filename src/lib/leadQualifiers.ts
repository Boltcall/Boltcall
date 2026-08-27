// Lead-sizing buckets shared by the audit funnels. Volume x job value is what
// turns a lead into a missed-call revenue estimate, so the same buckets have to
// mean the same thing wherever we ask.

export const MONTHLY_LEADS_OPTIONS = [
  { value: '0-10', label: '0 – 10' },
  { value: '10-50', label: '10 – 50' },
  { value: '50-100', label: '50 – 100' },
  { value: '100+', label: '100+' },
] as const;

export const JOB_VALUE_OPTIONS = [
  { value: 'Under $500', label: 'Under $500' },
  { value: '$500-$2K', label: '$500 – $2,000' },
  { value: '$2K-$5K', label: '$2,000 – $5,000' },
  { value: '$5K-$10K', label: '$5,000 – $10,000' },
  { value: '$10K+', label: '$10,000+' },
] as const;

export const MONTHLY_LEADS_VALUES: string[] = MONTHLY_LEADS_OPTIONS.map((o) => o.value);
export const JOB_VALUE_VALUES: string[] = JOB_VALUE_OPTIONS.map((o) => o.value);
