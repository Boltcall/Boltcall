// Average job value per industry — used for loss-aversion estimates on the
// Home hub ("2 leads got no reply — worth roughly $X"). Always label output
// as an estimate. Editable per-business in Settings → General (future).
export const INDUSTRY_AVG_JOB_VALUE: Record<string, number> = {
  plumber: 450,
  plumbing: 450,
  dentist: 600,
  dental: 600,
  lawyer: 2500,
  legal: 2500,
  hvac: 550,
  'med spa': 350,
  medspa: 350,
  generic: 400,
};

export function avgJobValueFor(industry: string | null | undefined): number {
  if (!industry) return INDUSTRY_AVG_JOB_VALUE.generic;
  const key = industry.trim().toLowerCase();
  return INDUSTRY_AVG_JOB_VALUE[key] ?? INDUSTRY_AVG_JOB_VALUE.generic;
}
