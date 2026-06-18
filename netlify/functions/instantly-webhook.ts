import { Handler } from '@netlify/functions';
import { getSupabase } from './_shared/token-utils';
import { withLegacyHandler } from './_shared/runtime-compat';

// Instantly webhook receiver — captures lead-level events for attribution.
// Configured in Instantly dashboard at:
//   Settings > Integrations > Webhooks > Add webhook
//     URL: https://boltcall.org/.netlify/functions/instantly-webhook
//     Events: lead_created, lead_replied, lead_bounced, email_sent
//     Secret: <INSTANTLY_WEBHOOK_SECRET>
//
// On any lead event, we upsert the matching outbound_touch_attribution row
// keyed on campaign_lead_uid (which we injected as a custom var per lead
// during cold-email:create-campaign Phase 9 deployment).

const headers = {
  'Content-Type': 'application/json',
};

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  // Signature verification: Instantly signs payloads via HMAC on the body
  // using INSTANTLY_WEBHOOK_SECRET. Skip verification if secret unset (dev).
  const secret = process.env.INSTANTLY_WEBHOOK_SECRET;
  if (secret) {
    const sig = event.headers['x-instantly-signature'] || event.headers['X-Instantly-Signature'];
    if (!sig) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Missing signature' }) };
    }
    const crypto = await import('node:crypto');
    const expected = crypto.createHmac('sha256', secret).update(event.body || '').digest('hex');
    if (sig !== expected) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Bad signature' }) };
    }
  }

  let payload: Record<string, unknown> = {};
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const eventType = typeof payload.event === 'string' ? payload.event : '';
  const lead = (payload.lead && typeof payload.lead === 'object') ? payload.lead as Record<string, unknown> : {};
  const customVars = (lead.custom_variables && typeof lead.custom_variables === 'object')
    ? lead.custom_variables as Record<string, unknown>
    : {};

  // {{lead_uid}} is added as an Instantly custom variable at deployment time.
  const uid = typeof customVars.lead_uid === 'string' ? customVars.lead_uid : '';
  const leadEmail = typeof lead.email === 'string' ? lead.email : null;
  const leadCompany = typeof lead.company_name === 'string' ? lead.company_name : null;
  const campaignId = typeof payload.campaign_id === 'string' ? payload.campaign_id : 'unknown';

  if (!uid) {
    // Skip silently — leads sent before the {{lead_uid}} merge tag was wired
    // up will never have it. That's expected; this is a new-campaigns-only feature.
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true, action: 'no_uid' }) };
  }

  const supabase = getSupabase();

  // Upsert by uid so:
  // - The site-side silent-touch-attribution may have inserted a placeholder
  //   row (campaign_id='unknown'); we backfill campaign_id, lead_email, lead_company.
  // - Multiple webhook events for the same lead just update the row.
  const { data: existing } = await supabase
    .from('outbound_touch_attribution')
    .select('id, signup_at, booking_at, silent_self_serve')
    .eq('campaign_lead_uid', uid)
    .maybeSingle();

  if (!existing) {
    // First event we've seen for this uid — insert
    await supabase.from('outbound_touch_attribution').insert({
      campaign_lead_uid: uid,
      campaign_id: campaignId,
      lead_email: leadEmail,
      lead_company: leadCompany,
    });
  } else {
    // Backfill identifying fields if they were empty
    await supabase
      .from('outbound_touch_attribution')
      .update({
        campaign_id: campaignId === 'unknown' ? undefined : campaignId,
        lead_email: leadEmail ?? undefined,
        lead_company: leadCompany ?? undefined,
      })
      .eq('campaign_lead_uid', uid);
  }

  // Reply event closes the silent-self-serve window. If the lead replies after
  // booking/signup, that's a normal sale path, not silent self-serve.
  if (eventType === 'lead_replied') {
    await supabase
      .from('outbound_touch_attribution')
      .update({ silent_self_serve: false })
      .eq('campaign_lead_uid', uid);
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ ok: true, event: eventType, uid }),
  };
};

export default withLegacyHandler(handler);
