import type { SupabaseClient } from '@supabase/supabase-js';

export interface FindOrCreateLeadInput {
  userId: string;
  phone?: string | null;
  email?: string | null;
  source: string;
  status?: string;
  score?: number;
  tags?: string[];
  name?: string | null;
}

export interface FindOrCreateLeadResult {
  id: string;
  isNew: boolean;
}

/**
 * Dedup a lead by phone, then email, before creating one. Shared across
 * SMS/WhatsApp/email inbound paths so the same person contacting through
 * two channels doesn't spawn two `leads` rows.
 */
export async function findOrCreateLead(
  supabase: SupabaseClient,
  input: FindOrCreateLeadInput,
): Promise<FindOrCreateLeadResult> {
  const { userId, phone, email, source, status = 'new', score, tags, name } = input;
  if (!phone && !email) {
    throw new Error('findOrCreateLead requires phone or email');
  }

  if (phone) {
    const { data } = await supabase
      .from('leads').select('id').eq('user_id', userId).eq('phone', phone).maybeSingle();
    if (data) return { id: data.id, isNew: false };
  }
  if (email) {
    const { data } = await supabase
      .from('leads').select('id').eq('user_id', userId).eq('email', email).maybeSingle();
    if (data) return { id: data.id, isNew: false };
  }

  const nameParts = (name || '').trim().split(/\s+/).filter(Boolean);
  const { data: created, error } = await supabase
    .from('leads')
    .insert({
      user_id: userId,
      phone: phone || null,
      email: email || null,
      source,
      status,
      ...(score !== undefined ? { score } : {}),
      ...(tags ? { tags } : {}),
      ...(name ? { name, first_name: nameParts[0] || name, last_name: nameParts.slice(1).join(' ') } : {}),
    })
    .select('id')
    .single();

  if (error) throw error;
  return { id: created!.id, isNew: true };
}
