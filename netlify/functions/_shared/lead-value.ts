/**
 * Lead value routing: after a call, decide whether this lead is a big job
 * (owner gets email + SMS now), out of scope, or normal.
 *
 * Value comes from the owner's own services catalog when the caller's service
 * matches, else the AI's post-call estimate. The big-job threshold is the
 * owner's setting (business_profiles.user_preferences.lead_value), else an
 * industry default, else 3x the average deal value. No threshold = no
 * big-job alerts, never a guess.
 */
import { estimateBookingValueCents } from './booking-value';
import { resolveTwilioFromNumber, toE164 } from './twilio-from-number';
import DEFAULTS from './lead-value-defaults.json';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- same duck type as twilio-from-number.ts
type SupabaseLike = { from(table: string): any };

export type LeadValueTier = 'high' | 'normal' | 'out_of_scope' | 'unknown';

export interface LeadValueAssessment {
  tier: LeadValueTier;
  estimated_value_cents: number | null;
  value_source: 'catalog' | 'ai_estimate' | null;
  threshold_cents: number | null;
  service_requested: string | null;
}

// Typical "drop everything" job size per vertical, in cents. Owner setting wins.
// JSON so the settings page can show the default as a placeholder.
export const DEFAULT_THRESHOLD_CENTS: Record<string, number> = DEFAULTS;

const positiveInt = (v: unknown): number | null => {
  const n = typeof v === 'string' ? Number(v.replace(/[$,\s]/g, '')) : Number(v);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
};

export function resolveThresholdCents(
  userPreferences: unknown,
  mainCategory: string | null | undefined,
  avgDealValueCents: number | null | undefined,
): number | null {
  const prefs = (userPreferences && typeof userPreferences === 'object' ? userPreferences : {}) as { lead_value?: { high_value_threshold_cents?: unknown } };
  const own = positiveInt(prefs.lead_value?.high_value_threshold_cents);
  if (own) return own;
  const byCategory = mainCategory ? DEFAULT_THRESHOLD_CENTS[mainCategory.toLowerCase()] : undefined;
  if (byCategory) return byCategory;
  const avg = positiveInt(avgDealValueCents);
  return avg ? avg * 3 : null;
}

export function classifyLeadValue(input: {
  estimatedCents: number | null;
  outOfScope: boolean;
  thresholdCents: number | null;
}): LeadValueTier {
  if (input.outOfScope) return 'out_of_scope';
  if (input.estimatedCents == null) return 'unknown';
  if (input.thresholdCents != null && input.estimatedCents >= input.thresholdCents) return 'high';
  return 'normal';
}

/**
 * Reads custom_analysis_data fields estimated_job_value (USD), service_requested
 * and out_of_scope (set in retell-agents getDefaultAgentConfig). Never throws:
 * a pricing hiccup must not block the lead or the urgent alert.
 */
export async function assessLeadValue(
  supabase: SupabaseLike,
  userId: string,
  analysis: Record<string, unknown>,
): Promise<LeadValueAssessment> {
  const service = typeof analysis.service_requested === 'string' ? analysis.service_requested.trim() : '';
  const outOfScope = analysis.out_of_scope === true;
  const aiCents = (() => {
    const usd = positiveInt(analysis.estimated_job_value);
    return usd ? usd * 100 : null;
  })();

  let catalogCents: number | null = null;
  let profile: { main_category?: string | null; avg_deal_value_cents?: number | null; user_preferences?: unknown } | null = null;
  try {
    if (service) catalogCents = await estimateBookingValueCents(supabase as Parameters<typeof estimateBookingValueCents>[0], userId, service, { useAverage: false });
    const { data } = await supabase
      .from('business_profiles')
      .select('main_category, avg_deal_value_cents, user_preferences')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();
    profile = data;
  } catch (err) {
    console.error('[lead-value] lookup failed (non-fatal):', err);
  }

  const estimated = catalogCents ?? aiCents;
  const threshold = resolveThresholdCents(profile?.user_preferences, profile?.main_category, profile?.avg_deal_value_cents);
  return {
    tier: classifyLeadValue({ estimatedCents: estimated, outOfScope, thresholdCents: threshold }),
    estimated_value_cents: estimated,
    value_source: catalogCents != null ? 'catalog' : aiCents != null ? 'ai_estimate' : null,
    threshold_cents: threshold,
    service_requested: service || null,
  };
}

export const formatUsd = (cents: number) => `$${Math.round(cents / 100).toLocaleString('en-US')}`;

/**
 * SMS to the owner's notification_phone (Settings > Notifications). Skips when
 * no phone is saved or SMS notifications are off. Sent from the tenant's own
 * line so the owner recognises it. Never throws; returns whether it went out.
 */
export async function smsOwner(supabase: SupabaseLike, userId: string, body: string): Promise<boolean> {
  try {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    if (!sid || !token) return false;
    const { data: prefs } = await supabase
      .from('notification_preferences')
      .select('notification_phone, sms_notifications')
      .eq('user_id', userId)
      .maybeSingle();
    const to = toE164(prefs?.notification_phone);
    if (!to || prefs?.sms_notifications === false) return false;
    const from = await resolveTwilioFromNumber(supabase, userId);
    if (!from) return false;
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ To: to, From: from, Body: body.slice(0, 600) }).toString(),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) console.error(`[lead-value] owner SMS failed ${res.status} for user ${userId}`);
    return res.ok;
  } catch (err) {
    console.error('[lead-value] owner SMS failed:', err);
    return false;
  }
}
