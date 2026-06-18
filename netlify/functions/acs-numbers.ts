import { Handler, HandlerEvent } from '@netlify/functions';
import {
  listAcsNumbers,
  releaseAcsNumber,
  searchAcsNumbers,
  purchaseAcsNumbers,
  getAcsCredentials,
  buildAcsAuthHeaders,
} from './_shared/acs-sdk';
import { getServiceSupabase } from './_shared/token-utils';
import { getRequestOrigin, getV2CorsHeaders } from './_shared/cors-v2';
import { getHeader, hasSharedSecret } from './_shared/user-auth';
import { withLegacyHandler } from './_shared/runtime-compat';

/**
 * ACS Phone Numbers — replaces twilio-numbers.ts
 *
 * GET  /acs-numbers                         — list owned numbers
 * GET  /acs-numbers?action=available        — search available (returns operationId)
 * POST /acs-numbers { action: 'purchase' }  — purchase reserved number
 * POST /acs-numbers { action: 'release' }   — release owned number
 * GET  /acs-numbers?action=operation&id=... — poll search/purchase operation status
 */

const NUMBERS_API_VERSION = '2022-12-01';

function json(headers: Record<string, string>, statusCode: number, body: Record<string, unknown>) {
  return { statusCode, headers, body: JSON.stringify(body) };
}

async function requireNumberAdmin(event: HandlerEvent, headers: Record<string, string>) {
  if (hasSharedSecret(event)) {
    return { ok: true as const, source: 'internal' as const };
  }

  const authHeader = getHeader(event, 'authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { ok: false as const, response: json(headers, 401, { error: 'Authentication required' }) };
  }

  const token = authHeader.slice('Bearer '.length);
  const supabase = getServiceSupabase();
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    return { ok: false as const, response: json(headers, 401, { error: 'Invalid or expired token' }) };
  }

  const role = (data.user.app_metadata as { role?: string } | undefined)?.role;
  if (role === 'founder') {
    return { ok: true as const, source: 'founder' as const };
  }

  if (data.user.email) {
    const { data: adminRow } = await supabase
      .from('platform_admins')
      .select('id')
      .eq('email', data.user.email)
      .maybeSingle();

    if (adminRow) return { ok: true as const, source: 'platform_admin' as const };
  }

  return {
    ok: false as const,
    response: json(headers, 403, { error: 'Forbidden - phone-number administration required' }),
  };
}

async function getOperationStatus(operationId: string): Promise<any> {
  const { endpoint, key } = getAcsCredentials();
  // operationId may be a full URL or a relative path
  const url = operationId.startsWith('http') ? operationId : `${endpoint}${operationId}`;
  const authHeaders = buildAcsAuthHeaders('GET', url, '', key);
  const res = await fetch(url, { headers: { ...authHeaders } });
  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(`ACS operation status error ${res.status}: ${err}`);
  }
  return res.json();
}

const handler: Handler = async (event) => {
  const origin = getRequestOrigin(event.headers as Record<string, string | undefined>);
  const cors = getV2CorsHeaders(origin, { methods: 'GET, POST' });
  const headers = cors.headers;

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (origin && !cors.allowed) {
    return json(headers, 403, { error: 'Origin not allowed' });
  }

  const auth = await requireNumberAdmin(event, headers);
  if (!auth.ok) {
    return auth.response;
  }

  try {
    // ── GET ───────────────────────────────────────────────────────
    if (event.httpMethod === 'GET') {
      const action = event.queryStringParameters?.action;

      if (action === 'available') {
        const countryCode = event.queryStringParameters?.country || 'US';
        const areaCode = event.queryStringParameters?.area_code;
        const quantity = parseInt(event.queryStringParameters?.quantity || '5', 10);

        const operationId = await searchAcsNumbers(countryCode, areaCode, quantity);
        return {
          statusCode: 202,
          headers,
          body: JSON.stringify({
            message: 'Search started. Poll the operationId to get results.',
            operationId,
          }),
        };
      }

      if (action === 'operation') {
        const operationId = event.queryStringParameters?.id;
        if (!operationId) {
          return json(headers, 400, { error: 'id required' });
        }
        const status = await getOperationStatus(operationId);
        const numbers = (status.phoneNumbers || []).map((n: any) => ({
          phone_number: n.phoneNumber || n.id,
          phone_number_type: n.phoneNumberType,
          capabilities: n.capabilities,
          monthly_cost: '$1.00',
        }));
        return { statusCode: 200, headers, body: JSON.stringify({ status: status.status, numbers }) };
      }

      // Default: list owned numbers
      const numbers = await listAcsNumbers();
      const formatted = numbers.map((n: any) => ({
        phone_number: n.id || n.phoneNumber,
        phone_number_type: n.phoneNumberType,
        capabilities: n.capabilities,
        assignment_type: n.assignmentType,
        purchase_date: n.purchaseDate,
      }));
      return { statusCode: 200, headers, body: JSON.stringify(formatted) };
    }

    // ── POST ──────────────────────────────────────────────────────
    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { action: postAction } = body;

      // Purchase: provide a searchId from a completed search operation
      if (postAction === 'purchase') {
        const { search_id } = body;
        if (!search_id) {
          return json(headers, 400, { error: 'search_id required (operationId from a completed search)' });
        }
        const operationId = await purchaseAcsNumbers(search_id);
        return {
          statusCode: 202,
          headers,
          body: JSON.stringify({
            message: 'Purchase started. Poll operationId for completion.',
            operationId,
          }),
        };
      }

      // Release a phone number
      if (postAction === 'release') {
        const { phone_number } = body;
        if (!phone_number) {
          return json(headers, 400, { error: 'phone_number required' });
        }
        await releaseAcsNumber(phone_number);
        return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
      }

      // Configure SMS webhook for a number (update ACS Event Grid subscription)
      if (postAction === 'configure') {
        // ACS SMS webhooks are configured via Azure Event Grid subscriptions,
        // not per-number like Twilio. Point users to Azure Portal / CLI.
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            message: 'ACS SMS routing is configured via Azure Event Grid. Set your webhook URL (acs-inbound-sms function) as the endpoint for Microsoft.Communication.SMSReceived events on your ACS resource.',
            webhook_url_example: `${process.env.URL || 'https://your-site.netlify.app'}/.netlify/functions/acs-inbound-sms`,
          }),
        };
      }

      return json(headers, 400, { error: 'Invalid action. Use: purchase, release, or configure' });
    }

    return json(headers, 405, { error: 'Method not allowed' });
  } catch (error) {
    console.error('[acs-numbers] Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'ACS numbers operation failed', details: error instanceof Error ? error.message : 'Unknown error' }),
    };
  }
};

export const testHandler = handler;
export default withLegacyHandler(handler);
