import { Handler } from '@netlify/functions';
import { requireUser } from './_shared/user-auth';
import { withLegacyHandler } from './_shared/runtime-compat';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

const CEKURA_API_BASE = 'https://api.cekura.com/v1';

async function cekuraRequest(path: string, method: string, body?: any) {
  const apiKey = process.env.CEKURA_API_KEY;
  if (!apiKey) {
    throw new Error('Cekura API key not configured');
  }

  const response = await fetch(`${CEKURA_API_BASE}${path}`, {
    method,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    ...(body && { body: JSON.stringify(body) }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || data.error || `Cekura API error: ${response.status}`);
  }
  return data;
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const auth = await requireUser(event, headers);
  if (!auth.ok) return auth.response;

  try {
    const body = JSON.parse(event.body || '{}');
    const { action } = body;

    // Start phone verification (sends OTP to caller)
    if (action === 'start_verification') {
      const { phone_number, channel } = body;
      if (!phone_number) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'phone_number required' }),
        };
      }

      const result = await cekuraRequest('/verifications', 'POST', {
        phone_number,
        channel: channel || 'sms', // sms or call
      });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          verification_id: result.verification_id || result.id,
          status: result.status,
          channel: result.channel,
        }),
      };
    }

    // Check verification code
    if (action === 'check_verification') {
      const { phone_number, code, verification_id } = body;
      if (!phone_number || !code) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'phone_number and code required' }),
        };
      }

      const result = await cekuraRequest('/verifications/check', 'POST', {
        phone_number,
        code,
        ...(verification_id && { verification_id }),
      });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          verified: result.status === 'approved' || result.verified === true,
          status: result.status,
        }),
      };
    }

    // Validate phone number (check if real, carrier info)
    if (action === 'validate') {
      const { phone_number } = body;
      if (!phone_number) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'phone_number required' }),
        };
      }

      const result = await cekuraRequest('/phone/validate', 'POST', {
        phone_number,
      });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          valid: result.valid,
          phone_type: result.phone_type, // mobile, landline, voip
          carrier: result.carrier,
          country_code: result.country_code,
          national_format: result.national_format,
        }),
      };
    }

    // Get caller identity
    if (action === 'caller_id') {
      const { phone_number } = body;
      if (!phone_number) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'phone_number required' }),
        };
      }

      const result = await cekuraRequest('/phone/lookup', 'POST', {
        phone_number,
      });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          caller_name: result.caller_name,
          caller_type: result.caller_type,
          phone_type: result.phone_type,
          carrier: result.carrier,
        }),
      };
    }

    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        error: 'Invalid action. Use: start_verification, check_verification, validate, or caller_id',
      }),
    };
  } catch (error) {
    console.error('cekura-verify error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Cekura verification failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};

export default withLegacyHandler(handler);
