import { Handler } from '@netlify/functions';
import { getSupabase, deductTokens, TOKEN_COSTS } from './_shared/token-utils';
import { notifyError } from './_shared/notify';
import { withLegacyHandler } from './_shared/runtime-compat';

/**
 * WhatsApp Send — Sends an outbound WhatsApp message via Meta Cloud API.
 *
 * POST /.netlify/functions/whatsapp-send
 * Body: { userId, to, body, messageId? }
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

const PHONE_REGEX = /^\+?[1-9]\d{6,14}$/;

function buildThreadId(phone1: string, phone2: string): string {
  const sorted = [phone1, phone2].sort();
  return `${sorted[0]}_${sorted[1]}`;
}

const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS_HEADERS, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let payload: any;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const { userId, to, body: messageBody } = payload;
  if (!userId || !to || !messageBody) {
    return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'userId, to, and body required' }) };
  }

  const supabase = getSupabase();

  // Verify auth: internal calls (from AI responder / webhook) bypass JWT using a shared secret;
  // all other callers must supply a valid Supabase Bearer JWT.
  const internalSecret = event.headers['x-internal-secret'];
  const expectedInternalSecret = process.env.INTERNAL_API_SECRET || process.env.INTERNAL_WEBHOOK_SECRET || '';
  const isInternalCall = !!(expectedInternalSecret && internalSecret === expectedInternalSecret);

  if (!isInternalCall) {
    const authHeader = event.headers.authorization || event.headers.Authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { statusCode: 401, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Authentication required' }) };
    }
    const token = authHeader.substring(7);
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authUser) {
      return { statusCode: 401, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Invalid or expired token' }) };
    }
    if (authUser.id !== userId) {
      return { statusCode: 403, headers: CORS_HEADERS, body: JSON.stringify({ error: 'userId does not match authenticated user' }) };
    }
  }

  // Validate `to` phone and `body` text
  const toDigits = String(to).replace(/\D/g, '');
  if (!PHONE_REGEX.test(toDigits)) {
    return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Invalid phone number' }) };
  }
  if (typeof messageBody !== 'string' || messageBody.length === 0 || messageBody.length > 4096) {
    return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Message must be 1-4096 characters' }) };
  }

  try {
    // 1. Load WhatsApp settings
    const { data: settings, error: settingsErr } = await supabase
      .from('whatsapp_settings')
      .select('wa_phone_number_id, wa_access_token, is_enabled')
      .eq('user_id', userId)
      .maybeSingle();

    if (settingsErr || !settings) {
      return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'WhatsApp settings not found' }) };
    }

    if (!settings.wa_phone_number_id || !settings.wa_access_token) {
      return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'WhatsApp credentials not configured' }) };
    }

    // 2. POST to Meta Cloud API
    const metaUrl = `https://graph.facebook.com/v19.0/${settings.wa_phone_number_id}/messages`;
    const metaRes = await fetch(metaUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${settings.wa_access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: messageBody },
      }),
    });

    const metaData = await metaRes.json().catch(() => ({}));

    if (!metaRes.ok) {
      console.error('[whatsapp-send] Meta API error:', metaData);
      await notifyError('whatsapp-send: Meta API error', new Error(JSON.stringify(metaData)), { userId, to });
      return { statusCode: 502, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Meta API error', detail: metaData }) };
    }

    const waMessageId = metaData?.messages?.[0]?.id || null;
    const fromNumber = settings.wa_phone_number_id;
    const threadId = buildThreadId(fromNumber, to);

    // 3. Store outbound message
    await supabase.from('whatsapp_conversations').insert({
      user_id: userId,
      direction: 'outbound',
      from_number: fromNumber,
      to_number: to,
      body: messageBody,
      wa_message_id: waMessageId,
      thread_id: threadId,
      status: 'sent',
    });

    // 4. Deduct WhatsApp send tokens
    await deductTokens(userId, TOKEN_COSTS.whatsapp_sent, 'whatsapp_sent', 'WhatsApp message sent', {}, supabase);

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ success: true, wa_message_id: waMessageId }),
    };
  } catch (error) {
    console.error('[whatsapp-send] Error:', error);
    await notifyError('whatsapp-send', error as Error, { userId, to });
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};

export const testHandler = handler;
export default withLegacyHandler(handler);
