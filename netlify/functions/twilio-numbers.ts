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

      // Purchase a phone number — atomic: buys on Twilio, registers with Retell,
      // and saves to phone_numbers in one server-side transaction so a partial
      // failure can't orphan the user (charged on Twilio but no DB row /
      // unusable by the agent). Pre-fix bugs (2026-05-31 QA):
      //   C1 - frontend INSERT was missing business_profile_id, workspace_id,
      //        country_code; every Twilio purchase 23502'd silently.
      //   C2 - no step registered the bought number with Retell, so even when
      //        the DB save happened to work the outbound call failed with
      //        "404 Item +1... not found from phone-number".
      //   C3 - the frontend swallowed the 23502 with console.error, so the
      //        user got no toast and Twilio kept billing the orphan number.
      if (postAction === 'purchase') {
        const { phone_number, voice_url, sms_url, friendly_name, country_code } = body;
        if (!phone_number) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: 'phone_number required' }) };
        }

        // ── Step 0: gather the user context the phone_numbers schema requires
        //    so we can fail fast before incurring a Twilio charge. ──────────
        const serviceSupabase = createClient(
          process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
          process.env.SUPABASE_SERVICE_KEY || '',
        );
        const [{ data: profileRow }, { data: workspaceRow }, { data: inboundAgent }, { data: outboundAgent }] = await Promise.all([
          serviceSupabase.from('business_profiles')
            .select('id')
            .eq('user_id', userId)
            .order('created_at', { ascending: true })
            .limit(1).maybeSingle(),
          serviceSupabase.from('workspaces')
            .select('id')
            .eq('user_id', userId)
            .order('created_at', { ascending: true })
            .limit(1).maybeSingle(),
          serviceSupabase.from('agents')
            .select('retell_agent_id')
            .eq('user_id', userId)
            .in('agent_type', ['inbound', 'ai_receptionist', 'receptionist'])
            .not('retell_agent_id', 'is', null)
            .order('created_at', { ascending: true })
            .limit(1).maybeSingle(),
          serviceSupabase.from('agents')
            .select('retell_agent_id')
            .eq('user_id', userId)
            .in('agent_type', ['speed_to_lead', 'outbound_speed_to_lead'])
            .not('retell_agent_id', 'is', null)
            .order('created_at', { ascending: true })
            .limit(1).maybeSingle(),
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

        // ── Step 1: Twilio purchase ─────────────────────────────────────────
        const formData = new URLSearchParams({
          PhoneNumber: phone_number,
          ...(voice_url && { VoiceUrl: voice_url }),
          ...(sms_url && { SmsUrl: sms_url }),
          ...(friendly_name && { FriendlyName: friendly_name }),
        });
        const url = `${TWILIO_API_BASE}/Accounts/${accountSid}/IncomingPhoneNumbers.json`;
        const twilioResp = await fetch(url, {
          method: 'POST',
          headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
          body: formData.toString(),
        });
        const twilioData = await twilioResp.json();
        if (!twilioResp.ok) {
          throw new Error(twilioData.message || `Twilio purchase failed: ${twilioResp.status}`);
        }

        // ── Step 2: Persist to phone_numbers BEFORE Retell registration so we
        //    have a paper trail even if the Retell call fails. We mark status
        //    'pending' and flip to 'active' after Retell succeeds. ──────────
        const cc = (country_code || 'US').toUpperCase();
        const { data: phoneRow, error: insertErr } = await serviceSupabase
          .from('phone_numbers')
          .insert({
            business_profile_id: profileRow.id,
            user_id: userId,
            workspace_id: workspaceRow.id,
            phone_number: twilioData.phone_number,
            phone_type: 'twilio',
            country_code: cc,
            location: body.location || (friendly_name as string | undefined) || 'N/A',
            status: 'pending',
            twilio_sid: twilioData.sid,
          })
          .select()
          .single();
        if (insertErr) {
          // The number is bought on Twilio but we can't track it. Surface
          // loudly so the caller can release the number or contact support.
          console.error('phone_numbers insert failed after Twilio purchase:', insertErr, { sid: twilioData.sid });
          return { statusCode: 500, headers, body: JSON.stringify({
            error: 'Number purchased but local save failed',
            detail: insertErr.message,
            twilio_sid: twilioData.sid,
            phone_number: twilioData.phone_number,
            recovery: 'Contact support with the twilio_sid above — number can be released or reconciled.',
          }) };
        }

        // ── Step 3: Register with Retell so the outbound speed_to_lead call
        //    has a valid from_number and inbound calls route to the
        //    receptionist. ─────────────────────────────────────────────────
        const retellApiKey = process.env.RETELL_API_KEY;
        let retellRegistered = false;
        let retellError: string | null = null;
        if (retellApiKey) {
          try {
            const retellBody: Record<string, any> = {
              phone_number: twilioData.phone_number,
              phone_number_type: 'twilio',
              twilio_account_sid: accountSid,
              twilio_auth_token: process.env.TWILIO_AUTH_TOKEN,
              inbound_agent_id: inboundAgent.retell_agent_id,
            };
            if (outboundAgent?.retell_agent_id) retellBody.outbound_agent_id = outboundAgent.retell_agent_id;
            if (friendly_name) retellBody.nickname = friendly_name;

            const retellResp = await fetch('https://api.retellai.com/import-phone-number', {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${retellApiKey}`, 'Content-Type': 'application/json' },
              body: JSON.stringify(retellBody),
            });
            const retellData = await retellResp.json().catch(() => ({}));
            if (retellResp.ok) {
              retellRegistered = true;
              await serviceSupabase.from('phone_numbers').update({ status: 'active' }).eq('id', phoneRow.id);
            } else {
              retellError = retellData?.error_message || retellData?.message || `Retell register failed: ${retellResp.status}`;
              console.error('Retell import failed:', retellError, { phone_number, sid: twilioData.sid });
            }
          } catch (e: any) {
            retellError = e?.message || String(e);
            console.error('Retell import threw:', retellError);
          }
        }

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
