import { Handler } from '@netlify/functions';
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

      // Purchase a phone number
      if (postAction === 'purchase') {
        const { phone_number, voice_url, sms_url, friendly_name } = body;
        if (!phone_number) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: 'phone_number required' }) };
        }

        const formData = new URLSearchParams({
          PhoneNumber: phone_number,
          ...(voice_url && { VoiceUrl: voice_url }),
          ...(sms_url && { SmsUrl: sms_url }),
          ...(friendly_name && { FriendlyName: friendly_name }),
        });

        const url = `${TWILIO_API_BASE}/Accounts/${accountSid}/IncomingPhoneNumbers.json`;
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
          throw new Error(data.message || `Purchase failed: ${response.status}`);
        }

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            sid: data.sid,
            phone_number: data.phone_number,
            friendly_name: data.friendly_name,
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
