import { Handler } from '@netlify/functions';
import { getSupabase } from './_shared/token-utils';
import { withLegacyHandler } from './_shared/runtime-compat';

const headers = {
  'Access-Control-Allow-Origin': 'https://boltcall.org',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

// Loose validator — uids are arbitrary opaque strings, but we cap length and
// charset to avoid abuse via malformed payloads from random web traffic.
const UID_RE = /^[A-Za-z0-9_-]{6,128}$/;

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let body: Record<string, unknown> = {};
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const uid = typeof body.uid === 'string' ? body.uid : '';
  const path = typeof body.path === 'string' ? body.path.slice(0, 256) : null;
  const referrer = typeof body.referrer === 'string' ? body.referrer.slice(0, 512) : null;

  if (!uid || !UID_RE.test(uid)) {
    // Silent failure — we don't want a malformed uid to surface an error on the page
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true, action: 'noop' }) };
  }

  const supabase = getSupabase();

  // Row may not exist yet — campaign_lead_uid is supposed to be pre-inserted
  // by the Instantly side (cold-email:create-campaign Phase 9), but in case
  // the visit arrives before the insert (race, manual link sharing, etc.) we
  // upsert with the minimum required campaign_id of 'unknown' rather than
  // dropping the data on the floor.
  const { data: existing, error: selErr } = await supabase
    .from('outbound_touch_attribution')
    .select('id, first_visit_at, visit_count')
    .eq('campaign_lead_uid', uid)
    .maybeSingle();

  if (selErr) {
    console.warn('[silent-touch-attribution] select failed:', selErr.message);
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true, action: 'select_failed' }) };
  }

  const now = new Date().toISOString();

  if (!existing) {
    // Race / orphan path — insert a placeholder row so the data is captured.
    // Phase 9 of create-campaign will retroactively backfill campaign_id and
    // lead_email when the campaign is created.
    const { error: insErr } = await supabase.from('outbound_touch_attribution').insert({
      campaign_lead_uid: uid,
      campaign_id: 'unknown',
      first_visit_at: now,
      visit_count: 1,
    });
    if (insErr) {
      // Probably a duplicate-key race — fall through to update
      console.warn('[silent-touch-attribution] insert raced:', insErr.message);
    } else {
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, action: 'orphan_visit', path, referrer }) };
    }
  }

  // Update: set first_visit_at only if null, always increment visit_count
  const { error: updErr } = await supabase
    .from('outbound_touch_attribution')
    .update({
      first_visit_at: existing?.first_visit_at ?? now,
      visit_count: (existing?.visit_count ?? 0) + 1,
    })
    .eq('campaign_lead_uid', uid);

  if (updErr) {
    console.warn('[silent-touch-attribution] update failed:', updErr.message);
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true, action: 'update_failed' }) };
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ ok: true, action: existing?.first_visit_at ? 'revisit' : 'first_visit' }),
  };
};

export default withLegacyHandler(handler);
