import { Handler } from '@netlify/functions';
import Retell from 'retell-sdk';
import { getSupabase } from './_shared/token-utils';
import { fireWebhooks } from './_shared/fire-webhooks';
import { handleInboundLead } from './_shared/lead-response-service';
import { notifyError } from './_shared/notify';

/**
 * Google Ads Lead Form Webhook
 *
 * Receives lead submissions from Google Ads Lead Form Assets and feeds them
 * into Boltcall's instant-callback pipeline.
 *
 * Setup flow (customer-side):
 *   1. Boltcall dashboard → Ad Instant Response → Google Ads card.
 *   2. Copy the webhook URL (this endpoint) + the workspace's google_key.
 *   3. In Google Ads → Assets → Lead forms → "Lead delivery options":
 *        - Webhook URL: https://boltcall.org/.netlify/functions/google-leads-webhook
 *        - Key:         <google_key from dashboard>
 *      Save. Done.
 *
 * Inbound payload (developers.google.com/google-ads/webhook/docs/implementation):
 *   {
 *     "lead_id":          "string",
 *     "user_column_data": [{ "column_id": "FULL_NAME", "string_value": "...",
 *                            "column_name": "Full Name" }, ...],
 *     "api_version":      "1.0",
 *     "form_id":          12345,
 *     "campaign_id":      67890,
 *     "adgroup_id":       11111,
 *     "creative_id":      22222,
 *     "gcl_id":           "Cj0KCQ...",
 *     "google_key":       "<workspace secret>",
 *     "is_test":          false,
 *     "lead_submit_time": "2026-06-03T12:30:00Z"
 *   }
 *
 * Required response: {} on 200, {"message": "..."} on 4xx/5xx.
 * 4xx = not retryable, 5xx = retryable.
 *
 * Dedup: lead_id is the canonical Google ID. We rely on the partial unique
 *        index `leads_google_lead_id_uidx` on
 *        `leads (user_id, raw_data->>'google_lead_id')
 *           WHERE source='google_lead_form'`
 *        so that concurrent retries can't both insert.
 */

// ─── constants ────────────────────────────────────────────────────────────

const HEADERS = {
  'Content-Type': 'application/json',
};

/**
 * Hard caps to make a stolen key bounded in blast radius.
 * Google's Lead Form has at most ~10 questions, each value capped at 80 chars
 * by Google's UI — these caps are generously above that.
 */
const MAX_BODY_BYTES = 8 * 1024; // 8 KB — well above any legitimate Google payload
const MAX_COLUMNS = 32;
const MAX_STRING_VALUE_LEN = 1024;

// ─── helpers ──────────────────────────────────────────────────────────────

function ok(extra: Record<string, any> = {}) {
  return { statusCode: 200, headers: HEADERS, body: JSON.stringify(extra) };
}
function badRequest(message: string) {
  return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ message }) };
}
function unauthorized(message = 'Invalid google_key') {
  return { statusCode: 401, headers: HEADERS, body: JSON.stringify({ message }) };
}
function serverError(message = 'Internal error') {
  return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ message }) };
}

function newRequestId(): string {
  // Cheap correlation id — enough to grep one request across function logs.
  return 'gl_' + Math.random().toString(36).slice(2, 8) + Date.now().toString(36);
}

/**
 * Map Google's typed cell array into a flat lead shape compatible with
 * handleInboundLead. Custom columns become raw_data.custom_fields[column_name].
 * Truncate everything to bounded sizes to keep the JSONB column small.
 */
function flattenUserColumnData(cells: any[] | undefined): {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  custom_fields: Record<string, string>;
} {
  const out: any = { custom_fields: {} };
  if (!Array.isArray(cells)) return out;

  for (let i = 0; i < Math.min(cells.length, MAX_COLUMNS); i++) {
    const cell = cells[i] || {};
    const id = String(cell.column_id || '').toUpperCase();
    const raw = cell.string_value;
    if (raw == null || raw === '') continue;

    const val = String(raw).slice(0, MAX_STRING_VALUE_LEN);

    switch (id) {
      case 'FULL_NAME': {
        const parts = val.trim().split(/\s+/);
        out.first_name = parts.shift() || undefined;
        out.last_name = parts.length ? parts.join(' ') : undefined;
        break;
      }
      case 'FIRST_NAME':
        out.first_name = val;
        break;
      case 'LAST_NAME':
        out.last_name = val;
        break;
      case 'EMAIL':
      case 'WORK_EMAIL':
        out.email = val;
        break;
      case 'PHONE_NUMBER':
      case 'WORK_PHONE':
        out.phone = val;
        break;
      case 'STREET_ADDRESS':
      case 'CITY':
      case 'REGION':
      case 'POSTAL_CODE':
      case 'COUNTRY':
        out.custom_fields[id.toLowerCase()] = val;
        break;
      default: {
        // Custom question or unknown standard column → keep raw.
        // Some Google deployments send empty column_name AND empty column_id;
        // bucket those under a stable key so they don't clobber each other.
        const key =
          (cell.column_name && String(cell.column_name).slice(0, 64)) ||
          (id && id.toLowerCase()) ||
          `unnamed_${i}`;
        out.custom_fields[key] = val;
      }
    }
  }
  return out;
}

/**
 * The same syncCrm that lead-webhook.ts uses, inlined to keep this function
 * self-contained. Drives connected HubSpot / GoHighLevel / Salesforce / etc.
 * for Google leads at parity with website-form + facebook_lead_ad sources.
 */
function buildSyncCrm() {
  return async (lead: Record<string, any>, userId: string, originalBody: Record<string, any>) => {
    const baseUrl = process.env.URL || process.env.DEPLOY_URL || 'https://boltcall.org';
    await fetch(`${baseUrl}/.netlify/functions/integration-sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.INTERNAL_API_SECRET || process.env.INTERNAL_WEBHOOK_SECRET
          ? { 'x-internal-secret': process.env.INTERNAL_API_SECRET || process.env.INTERNAL_WEBHOOK_SECRET || '' }
          : {}),
      },
      body: JSON.stringify({
        action: 'sync_lead',
        userId,
        lead: {
          name: originalBody.name || null,
          first_name: lead.first_name || null,
          last_name: lead.last_name || null,
          phone: lead.phone || null,
          email: lead.email || null,
          source: lead.source || 'google_lead_form',
          status: lead.status || 'new',
          notes: originalBody.notes || originalBody.message || null,
        },
      }),
    });
  };
}

// ─── handler ──────────────────────────────────────────────────────────────

export const handler: Handler = async (event) => {
  const reqId = newRequestId();

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: HEADERS, body: JSON.stringify({ message: 'Method not allowed' }) };
  }

  // 0. Bound payload size before parsing. A leaked key with no size cap
  //    could let an attacker inflate raw_data JSONB cells to multi-MB.
  const rawBody = event.body || '';
  if (rawBody.length > MAX_BODY_BYTES) {
    console.warn(`[google-leads-webhook] ${reqId} payload too large (${rawBody.length} bytes)`);
    return badRequest('Payload too large');
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return badRequest('Invalid JSON');
  }

  const googleKey = payload.google_key;
  if (!googleKey || typeof googleKey !== 'string') {
    return unauthorized('Missing google_key');
  }

  const supabase = getSupabase();

  // 1. Resolve workspace by google_key (single canonical lookup).
  //    Don't leak whether the key exists or not — always return the same
  //    'unauthorized' shape so an attacker can't enumerate valid keys.
  const { data: features, error: featuresErr } = await supabase
    .from('business_features')
    .select('user_id')
    .eq('google_lead_form_key', googleKey)
    .maybeSingle();

  if (featuresErr) {
    console.error(`[google-leads-webhook] ${reqId} lookup failed:`, featuresErr);
    return serverError('Lookup failed');
  }
  if (!features?.user_id) {
    return unauthorized();
  }
  const userId = features.user_id;

  // 2. Test ping (Google's "Send test data" button). Accept early before
  //    requiring lead_id — Google's test payload may omit it. Log it so
  //    the customer-support team can confirm "yes, your form is wired up."
  if (payload.is_test === true) {
    console.log(`[google-leads-webhook] ${reqId} is_test ping accepted for user=${userId}`);
    return ok({ ok: true, test: true });
  }

  const leadId = payload.lead_id;
  if (!leadId) {
    return badRequest('Missing lead_id');
  }

  // 3. Dedup the common case: sequential Google retry (we already accepted
  //    this lead_id, Google didn't get our 200 in time, retried). The unique
  //    index `leads_google_lead_id_uidx` covers the rare concurrent race,
  //    but handleInboundLead swallows that as outcome.status='failed' rather
  //    than throwing, so this pre-SELECT is the cleaner way to surface the
  //    dedup hit as a 200 to Google.
  const { data: existing } = await supabase
    .from('leads')
    .select('id')
    .eq('user_id', userId)
    .eq('source', 'google_lead_form')
    .filter('raw_data->>google_lead_id', 'eq', String(leadId))
    .limit(1)
    .maybeSingle();
  if (existing?.id) {
    console.log(`[google-leads-webhook] ${reqId} dedup hit for lead ${leadId}`);
    return ok({ ok: true, deduped: true });
  }

  // 4. Map Google's cell-array → flat lead shape.
  const flat = flattenUserColumnData(payload.user_column_data);

  // 4. If no email AND no phone, the lead is uncontactable. handleInboundLead
  //    would reject it anyway, but we return 200 (not 400) so Google doesn't
  //    retry — retrying would not produce contact info. Log it so we can see
  //    how often Google delivers contactless leads.
  if (!flat.email && !flat.phone) {
    console.warn(
      `[google-leads-webhook] ${reqId} lead ${leadId} has no email or phone; accepting and discarding`,
    );
    return ok({ ok: true, discarded: 'no_contact' });
  }

  // 5. Build the body for handleInboundLead. Persist Google's bookkeeping
  //    fields inside raw_data — handleInboundLead's normalizer drops anything
  //    not in the leads-table schema, but it preserves raw_data wholesale.
  const body = {
    user_id: userId,
    first_name: flat.first_name,
    last_name: flat.last_name,
    email: flat.email,
    phone: flat.phone,
    source: 'google_lead_form',
    google_lead_id: String(leadId),
    google_form_id: payload.form_id ?? null,
    google_campaign_id: payload.campaign_id ?? null,
    google_adgroup_id: payload.adgroup_id ?? null,
    google_creative_id: payload.creative_id ?? null,
    google_asset_group_id: payload.asset_group_id ?? null,
    google_gcl_id: payload.gcl_id ?? null,
    google_lead_stage: payload.lead_stage ?? null,
    google_lead_submit_time: payload.lead_submit_time ?? null,
    custom_fields: Object.keys(flat.custom_fields).length ? flat.custom_fields : undefined,
  };

  try {
    const retellApiKey = process.env.RETELL_API_KEY;
    const outcome = await handleInboundLead(
      { body, source: 'google_lead_form' },
      {
        supabase,
        retellApiKey,
        retellFactory: retellApiKey ? () => new Retell({ apiKey: retellApiKey }) : undefined,
        fireWebhooks,
        syncCrm: buildSyncCrm(),
      },
    );

    if (outcome.status === 'captured') {
      console.log(
        `[google-leads-webhook] ${reqId} lead ${leadId} captured for user=${userId} first_touch=${outcome.first_touch_status}`,
      );
      return ok();
    }

    if (outcome.status === 'rejected') {
      // 200 to prevent retries — rejection is deterministic.
      return ok({ ok: true, rejected: true, warnings: outcome.warnings });
    }

    // outcome.status === 'failed' — surface as 5xx so Google retries.
    await notifyError(
      'google-leads-webhook: lead processing failed',
      new Error(outcome.warnings.join(', ') || 'lead processing failed'),
      { reqId, leadId, userId },
    );
    return serverError('Lead processing failed');
  } catch (err: any) {
    // unique_violation = the dedup index caught a concurrent retry.
    if (err?.code === '23505' || err?.message?.includes('leads_google_lead_id_uidx')) {
      console.log(`[google-leads-webhook] ${reqId} dedup (concurrent retry) for lead ${leadId}`);
      return ok({ ok: true, deduped: true });
    }
    console.error(`[google-leads-webhook] ${reqId} error:`, err);
    await notifyError('google-leads-webhook: unhandled exception', err as Error, { reqId, leadId });
    return serverError();
  }
};
