import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { requireAuth, getUserPhoneNumbers, userOwnsPhoneNumber } from './_shared/require-auth';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json',
};

const TWILIO_API_BASE = 'https://api.twilio.com/2010-04-01';

function getTwilioAuth() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!accountSid || !authToken) {
    throw new Error('Twilio credentials not configured');
  }
  return {
    accountSid,
    auth: Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
  };
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // ── Auth gate — every method requires a valid Supabase JWT or bc_ API key ──
  const authResult = await requireAuth(event);
  if (!authResult.ok) return authResult.response;
  const userId = authResult.userId;

  try {
    const { accountSid, auth } = getTwilioAuth();

    // GET /twilio-numbers — list owned numbers
    // GET /twilio-numbers?action=available&country=US — search available numbers
    if (event.httpMethod === 'GET') {
      const action = event.queryStringParameters?.action;

      if (action === 'available') {
        const country = event.queryStringParameters?.country || 'US';
        const type = event.queryStringParameters?.type || 'Local';
        const areaCode = event.queryStringParameters?.area_code;
        const contains = event.queryStringParameters?.contains;

        const params = new URLSearchParams();
        if (areaCode) params.set('AreaCode', areaCode);
        if (contains) params.set('Contains', contains);
        params.set('PageSize', '20');

        const url = `${TWILIO_API_BASE}/Accounts/${accountSid}/AvailablePhoneNumbers/${country}/${type}.json?${params.toString()}`;
        const response = await fetch(url, {
          headers: { 'Authorization': `Basic ${auth}` },
        });
        const data = await response.json();

        if (!response.ok) {
          // Surface Twilio errors instead of silently returning [], which used
          // to make a 401 (bad creds) look identical to "no numbers in that
          // area" to the UI — see 2026-05-31 ship QA.
          console.error('Twilio AvailablePhoneNumbers failed:', response.status, data);
          return {
            statusCode: 502,
            headers,
            body: JSON.stringify({
              error: 'Phone provider unavailable. Please try again or contact support.',
              twilio_status: response.status,
              twilio_code: data?.code,
              twilio_message: data?.message,
            }),
          };
        }

        const numbers = (data.available_phone_numbers || []).map((num: any) => ({
          phone_number: num.phone_number,
          friendly_name: num.friendly_name,
          region: num.region,
          locality: num.locality,
          rate_center: num.rate_center,
          capabilities: num.capabilities,
          monthly_cost: '$1.15', // Twilio local number base price
        }));

        return { statusCode: 200, headers, body: JSON.stringify(numbers) };
      }

      // Default: list owned numbers — scope to numbers owned by this user.
      const userNumbers = await getUserPhoneNumbers(userId);
      if (userNumbers.length === 0) {
        return { statusCode: 200, headers, body: JSON.stringify([]) };
      }
      const userNumberSet = new Set(userNumbers);

      const url = `${TWILIO_API_BASE}/Accounts/${accountSid}/IncomingPhoneNumbers.json`;
      const response = await fetch(url, {
        headers: { 'Authorization': `Basic ${auth}` },
      });
      const data = await response.json();

      if (!response.ok) {
        console.error('Twilio IncomingPhoneNumbers list failed:', response.status, data);
        return {
          statusCode: 502,
          headers,
          body: JSON.stringify({
            error: 'Phone provider unavailable. Please try again or contact support.',
            twilio_status: response.status,
            twilio_code: data?.code,
            twilio_message: data?.message,
          }),
        };
      }

      const numbers = (data.incoming_phone_numbers || [])
        .filter((num: any) => userNumberSet.has(num.phone_number))
        .map((num: any) => ({
          sid: num.sid,
          phone_number: num.phone_number,
          friendly_name: num.friendly_name,
          status: num.status,
          voice_url: num.voice_url,
          sms_url: num.sms_url,
          capabilities: num.capabilities,
          date_created: num.date_created,
        }));

      return { statusCode: 200, headers, body: JSON.stringify(numbers) };
    }

    // POST /twilio-numbers — purchase or configure a number
    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { action: postAction } = body;

      // Purchase a phone number — the user clicks Buy in the dashboard and
      // gets back a fully-working Retell-provisioned number with both
      // inbound (AI receptionist) and outbound (speed_to_lead callback)
      // agents already attached. End to end in one server-side step.
      //
      // History: this used to go through Twilio's IncomingPhoneNumbers API
      // and then try Retell's import-phone-number to wire the bought number
      // into the AI. That path needs a Twilio Elastic SIP Trunk
      // termination_uri that Boltcall doesn't currently provision, so import
      // always failed with "request/body must have required property
      // 'termination_uri'". Net effect: the user got billed by Twilio for a
      // number their AI couldn't actually use. See C2 in the 2026-05-31 QA.
      //
      // Switching to Retell's create-phone-number provisions a number from
      // Retell's own Twilio pool, wires both agents in the same call, and
      // returns a number that works on the first call. Tested live during
      // the 2026-05-31 QA: smoke-test workspace's +15129574374 was created
      // this way and an outbound speed_to_lead call from it to a US number
      // registered cleanly (call_56b2c954385cf599e41d8d2d4e5).
      //
      // The body still accepts `phone_number` for backwards compatibility
      // with the existing UI (which lets the user "click" a specific Twilio
      // number from the search list) — we use it only to extract the area
      // code, since Retell picks the actual number from its pool.
      if (postAction === 'purchase') {
        const { phone_number, friendly_name, country_code } = body;

        // ── Step 0: gather the user context phone_numbers requires and the
        //    agent IDs Retell needs to attach. ─────────────────────────────
        const serviceSupabase = createClient(
          process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
          process.env.SUPABASE_SERVICE_KEY || '',
        );
        const [{ data: profileRow }, { data: workspaceRow }, { data: inboundAgent }, { data: outboundAgent }] = await Promise.all([
          serviceSupabase.from('business_profiles').select('id').eq('user_id', userId)
            .order('created_at', { ascending: true }).limit(1).maybeSingle(),
          serviceSupabase.from('workspaces').select('id, name').eq('user_id', userId)
            .order('created_at', { ascending: true }).limit(1).maybeSingle(),
          serviceSupabase.from('agents').select('retell_agent_id')
            .eq('user_id', userId).in('agent_type', ['inbound', 'ai_receptionist', 'receptionist'])
            .not('retell_agent_id', 'is', null)
            .order('created_at', { ascending: true }).limit(1).maybeSingle(),
          serviceSupabase.from('agents').select('retell_agent_id')
            .eq('user_id', userId).in('agent_type', ['speed_to_lead', 'outbound_speed_to_lead'])
            .not('retell_agent_id', 'is', null)
            .order('created_at', { ascending: true }).limit(1).maybeSingle(),
        ]);
        if (!profileRow?.id || !workspaceRow?.id) {
          return { statusCode: 409, headers, body: JSON.stringify({
            error: 'Finish onboarding first',
            detail: 'A business profile + workspace must exist before buying a number.',
          }) };
        }
        if (!inboundAgent?.retell_agent_id) {
          return { statusCode: 409, headers, body: JSON.stringify({
            error: 'No inbound agent provisioned',
            detail: 'The inbound AI receptionist must exist before buying a number — Retell needs an inbound_agent_id to route calls.',
          }) };
        }

        // ── Step 1: Retell provisions the number with both agents attached.
        const retellApiKey = process.env.RETELL_API_KEY;
        if (!retellApiKey) {
          return { statusCode: 500, headers, body: JSON.stringify({ error: 'RETELL_API_KEY not configured' }) };
        }
        const cc = (country_code || 'US').toUpperCase();
        // Pull the area code out of the "selected" number when present —
        // accepts +15125551234, 15125551234, 5125551234, or just "512".
        let areaCode: number | undefined;
        if (typeof phone_number === 'string') {
          const digits = phone_number.replace(/\D/g, '');
          // For US/CA the leading 1 is the country code; the next 3 digits
          // are the NPA. For everything else, fall back to the first 3
          // digits which Retell will validate.
          const npa = (cc === 'US' || cc === 'CA') && digits.length >= 11
            ? digits.slice(1, 4)
            : digits.slice(0, 3);
          const parsed = Number.parseInt(npa, 10);
          if (Number.isFinite(parsed) && parsed >= 100 && parsed <= 999) areaCode = parsed;
        }

        const retellBody: Record<string, any> = {
          country_code: cc === 'US' || cc === 'CA' ? cc : 'US', // Retell currently only takes US|CA
          inbound_agent_id: inboundAgent.retell_agent_id,
        };
        if (outboundAgent?.retell_agent_id) retellBody.outbound_agent_id = outboundAgent.retell_agent_id;
        if (areaCode) retellBody.area_code = areaCode;
        if (friendly_name) retellBody.nickname = friendly_name;
        else if (workspaceRow.name) retellBody.nickname = workspaceRow.name;

        const retellResp = await fetch('https://api.retellai.com/create-phone-number', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${retellApiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(retellBody),
        });
        const retellData = await retellResp.json().catch(() => ({}));
        if (!retellResp.ok) {
          const msg = retellData?.error_message || retellData?.message || `Retell create-phone-number failed: ${retellResp.status}`;
          console.error('Retell create-phone-number failed:', msg, { areaCode, cc });
          return { statusCode: 502, headers, body: JSON.stringify({
            error: 'Phone provider unavailable. Please try again or contact support.',
            detail: msg,
          }) };
        }
        const provisionedNumber = retellData.phone_number;
        if (!provisionedNumber) {
          return { statusCode: 502, headers, body: JSON.stringify({
            error: 'Retell did not return a phone number',
            detail: JSON.stringify(retellData).slice(0, 500),
          }) };
        }

        // ── Step 2: Persist to phone_numbers with status='active' since the
        //    Retell side is already wired up. ────────────────────────────
        const { data: phoneRow, error: insertErr } = await serviceSupabase
          .from('phone_numbers')
          .insert({
            business_profile_id: profileRow.id,
            user_id: userId,
            workspace_id: workspaceRow.id,
            phone_number: provisionedNumber,
            phone_type: 'retell-twilio',
            country_code: cc,
            location: body.location || (friendly_name as string | undefined) || retellData.phone_number_pretty || 'N/A',
            status: 'active',
            twilio_sid: 'retell_pool',
          })
          .select()
          .single();
        if (insertErr) {
          console.error('phone_numbers insert failed after Retell provision:', insertErr, { provisionedNumber });
          // We've already provisioned on Retell; reconcile by deleting that
          // side too so we don't leave a stray number that's billing.
          try {
            await fetch(`https://api.retellai.com/delete-phone-number/${encodeURIComponent(provisionedNumber)}`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${retellApiKey}` },
            });
          } catch (e) {
            console.error('Retell rollback failed:', e);
          }
          return { statusCode: 500, headers, body: JSON.stringify({
            error: 'Provisioned but local save failed; provisioner was rolled back.',
            detail: insertErr.message,
          }) };
        }

        // For UI compatibility with the previous response shape.
        const retellRegistered = true;
        const retellError = null as string | null;
        const twilioData = { sid: 'retell_pool', phone_number: provisionedNumber, friendly_name: retellBody.nickname || '' };

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            sid: twilioData.sid,
            phone_number: twilioData.phone_number,
            friendly_name: twilioData.friendly_name,
            db_id: phoneRow.id,
            retell_registered: retellRegistered,
            retell_error: retellError,
            status: retellRegistered ? 'active' : 'pending',
          }),
        };
      }

      // Configure an existing number (update voice/SMS URLs)
      if (postAction === 'configure') {
        const { sid, voice_url, sms_url, friendly_name } = body;
        if (!sid) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: 'sid required' }) };
        }

        // Verify the SID resolves to a phone number owned by this user before
        // letting them rewrite voice/SMS webhooks (call-hijack vector).
        const lookupUrl = `${TWILIO_API_BASE}/Accounts/${accountSid}/IncomingPhoneNumbers/${sid}.json`;
        const lookupResp = await fetch(lookupUrl, { headers: { 'Authorization': `Basic ${auth}` } });
        if (!lookupResp.ok) {
          return { statusCode: 404, headers, body: JSON.stringify({ error: 'Phone number not found' }) };
        }
        const lookupData = await lookupResp.json();
        if (!(await userOwnsPhoneNumber(userId, lookupData.phone_number))) {
          return { statusCode: 403, headers, body: JSON.stringify({ error: 'Not authorized to configure this number' }) };
        }

        const formData = new URLSearchParams();
        if (voice_url) formData.set('VoiceUrl', voice_url);
        if (sms_url) formData.set('SmsUrl', sms_url);
        if (friendly_name) formData.set('FriendlyName', friendly_name);

        const url = `${TWILIO_API_BASE}/Accounts/${accountSid}/IncomingPhoneNumbers/${sid}.json`;
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: formData.toString(),
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || `Configuration failed: ${response.status}`);
        }

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true, phone_number: data.phone_number }),
        };
      }

      // Release a phone number
      if (postAction === 'release') {
        const { sid } = body;
        if (!sid) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: 'sid required' }) };
        }

        // Verify ownership before releasing.
        const lookupUrl = `${TWILIO_API_BASE}/Accounts/${accountSid}/IncomingPhoneNumbers/${sid}.json`;
        const lookupResp = await fetch(lookupUrl, { headers: { 'Authorization': `Basic ${auth}` } });
        if (!lookupResp.ok) {
          return { statusCode: 404, headers, body: JSON.stringify({ error: 'Phone number not found' }) };
        }
        const lookupData = await lookupResp.json();
        if (!(await userOwnsPhoneNumber(userId, lookupData.phone_number))) {
          return { statusCode: 403, headers, body: JSON.stringify({ error: 'Not authorized to release this number' }) };
        }

        const url = `${TWILIO_API_BASE}/Accounts/${accountSid}/IncomingPhoneNumbers/${sid}.json`;
        const response = await fetch(url, {
          method: 'DELETE',
          headers: { 'Authorization': `Basic ${auth}` },
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.message || `Release failed: ${response.status}`);
        }

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true }),
        };
      }

      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid action. Use: purchase, configure, or release' }),
      };
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  } catch (error) {
    console.error('twilio-numbers error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Twilio numbers operation failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
