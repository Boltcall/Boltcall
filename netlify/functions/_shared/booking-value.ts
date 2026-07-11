import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Value a booking in cents: match the user's services catalog by name
 * (exact first, then fuzzy), fall back to business_profiles.avg_deal_value_cents.
 * Never throws — pricing must never block a booking insert.
 */
export async function estimateBookingValueCents(
  supabase: SupabaseClient,
  userId: string,
  serviceName: string | null | undefined
): Promise<number | null> {
  try {
    if (serviceName?.trim()) {
      const name = serviceName.trim().replace(/[%_]/g, ' ');
      const { data: exact } = await supabase
        .from('services')
        .select('price_cents')
        .eq('user_id', userId)
        .ilike('name', name)
        .not('price_cents', 'is', null)
        .limit(1)
        .maybeSingle();
      if (exact?.price_cents != null) return exact.price_cents;

      const { data: fuzzy } = await supabase
        .from('services')
        .select('price_cents')
        .eq('user_id', userId)
        .ilike('name', `%${name}%`)
        .not('price_cents', 'is', null)
        .limit(1)
        .maybeSingle();
      if (fuzzy?.price_cents != null) return fuzzy.price_cents;
    }

    const { data: profile } = await supabase
      .from('business_profiles')
      .select('avg_deal_value_cents')
      .eq('user_id', userId)
      .maybeSingle();
    return profile?.avg_deal_value_cents ?? null;
  } catch (err) {
    console.error('[booking-value] estimate failed (non-fatal):', err);
    return null;
  }
}
