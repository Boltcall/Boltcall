type SupabaseLike = { from(table: string): any };

/**
 * Sender for a tenant's outbound SMS/calls: the tenant's own active line, so
 * replies route back to the right firm (twilio-inbound-sms resolves the tenant
 * by phone_numbers.phone_number = To). The shared TWILIO_FROM_NUMBER is only a
 * fallback for tenants with no line yet; pass `fallback = null` where a shared
 * number can't work (Retell calls need a number imported into Retell).
 */
export async function resolveTwilioFromNumber(
  supabase: SupabaseLike,
  userId: string | null | undefined,
  fallback: string | null = process.env.TWILIO_FROM_NUMBER || null,
): Promise<string | null> {
  if (userId) {
    const { data } = await supabase
      .from('phone_numbers')
      .select('phone_number')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('is_primary', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data?.phone_number) return data.phone_number;
  }
  return fallback;
}

/** Best-effort E.164 (US default) so '(555) 111-2222' and '+15551112222' compare equal. */
export function toE164(phone: string | null | undefined): string {
  const raw = String(phone || '').trim();
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  if (!raw.startsWith('+') && digits.length === 10) return `+1${digits}`;
  return `+${digits}`;
}
