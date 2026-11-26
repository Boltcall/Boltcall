// Lead value routing helpers (UI side). Backend contract: netlify/functions/_shared/lead-value.ts
import DEFAULTS from '../../netlify/functions/_shared/lead-value-defaults.json';

export interface ValueRouting {
  tier: 'high' | 'normal' | 'out_of_scope' | 'unknown';
  estimated_value_cents: number | null;
  value_source: 'catalog' | 'ai_estimate' | null;
  threshold_cents: number | null;
  service_requested: string | null;
}

const usd = (cents: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(cents / 100);

/** Reads leads.raw_data.value_routing. Older leads have none. */
export function getValueRouting(rawData: unknown): ValueRouting | null {
  const vr = (rawData as { value_routing?: ValueRouting } | null | undefined)?.value_routing;
  return vr && typeof vr === 'object' && typeof vr.tier === 'string' ? vr : null;
}

/** Badge for the leads list. Normal, unknown and missing show nothing. */
export function valueBadge(vr: ValueRouting | null): { kind: 'big' | 'out'; label: string } | null {
  if (vr?.tier === 'high') {
    return { kind: 'big', label: vr.estimated_value_cents ? `Big job ~${usd(vr.estimated_value_cents)}` : 'Big job' };
  }
  if (vr?.tier === 'out_of_scope') return { kind: 'out', label: 'Out of scope' };
  return null;
}

/** Detail line under the summary, e.g. "Roof replacement, ~$15,000 (AI estimate)". */
export function valueDetail(vr: ValueRouting | null): string | null {
  if (!vr) return null;
  const est = vr.estimated_value_cents
    ? `~${usd(vr.estimated_value_cents)}${vr.value_source === 'ai_estimate' ? ' (AI estimate)' : ''}`
    : '';
  return [vr.service_requested, est].filter(Boolean).join(', ') || null;
}

/** "8000" -> 800000. Whole dollars only. Blank -> null (use default). NaN-safe invalid -> undefined. */
export function dollarsToCents(input: string): number | null | undefined {
  const s = input.trim().replace(/[$,\s]/g, '');
  if (!s) return null;
  if (!/^\d+$/.test(s)) return undefined;
  const n = Number(s);
  return n > 0 ? n * 100 : undefined;
}

export const centsToDollars = (cents: unknown): string =>
  typeof cents === 'number' && cents > 0 ? String(Math.round(cents / 100)) : '';

export function readThresholdCents(prefs: unknown): number | null {
  const v = (prefs as { lead_value?: { high_value_threshold_cents?: unknown } } | null)?.lead_value?.high_value_threshold_cents;
  return typeof v === 'number' && v > 0 ? v : null;
}

/** Industry default shown as the placeholder, e.g. 800000 for roofing. */
export function defaultThresholdCents(mainCategory: string | null | undefined): number | null {
  return (DEFAULTS as Record<string, number>)[(mainCategory || '').toLowerCase()] ?? null;
}

/** Sets or clears the big-job amount, keeping every other key in user_preferences. */
export function mergeThresholdIntoPrefs(prefs: unknown, cents: number | null): Record<string, unknown> {
  const base = prefs && typeof prefs === 'object' ? { ...(prefs as Record<string, unknown>) } : {};
  const lead_value: Record<string, unknown> = { ...(base.lead_value as Record<string, unknown>) };
  if (cents == null) delete lead_value.high_value_threshold_cents;
  else lead_value.high_value_threshold_cents = cents;
  if (Object.keys(lead_value).length) base.lead_value = lead_value;
  else delete base.lead_value;
  return base;
}

/** 10+ digits. Blank is fine (SMS off). */
export const isValidAlertPhone = (s: string): boolean => !s.trim() || s.replace(/\D/g, '').length >= 10;

export const formatDollars = (cents: number): string => usd(cents);
