import { Handler } from '@netlify/functions';
import * as crypto from 'crypto';
import { getSupabase } from './_shared/token-utils';
import { notifyError } from './_shared/notify';
import { withLegacyHandler } from './_shared/runtime-compat';

/**
 * WhatsApp Settings — manage WhatsApp integration config.
 *
 * POST /.netlify/functions/whatsapp-settings
 * Body: { userId, action, ...params }
 * Actions: get | save | test | disconnect
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

function maskSettings(row: any) {
  if (!row) return null;
  return { ...row, wa_access_token: row.wa_access_token ? '***' : null };
}

const SAVEABLE_FIELDS = [
  'wa_phone_number_id',
  'wa_business_account_id',
  'is_enabled',
  'auto_reply_enabled',
  'response_tone',
  'qualification_enabled',
  'booking_enabled',
  'business_hours_only',
  'business_hours_start',
  'business_hours_end',
  'business_timezone',
  'max_ai_messages_per_conversation',
  'greeting_template',
  'out_of_hours_message',
];

export const handler: Handler = async (event) => {
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

  const { userId, action } = payload;
  if (!userId || !action) {
    return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'userId and action required' }) };
  }

  const supabase = getSupabase();

  // Verify auth: Supabase JWT from Authorization header, sub must match userId
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

  // Support both nested ({ settings: { ... } }) and flat payload formats
  const settingsInput: Record<string, any> = (payload && typeof payload.settings === 'object' && payload.settings) || {};
  const fieldFrom = (field: string) => (settingsInput[field] !== undefined ? settingsInput[field] : payload[field]);

  try {
    // ─── GET ───────────────────────────────────────────────────────
    if (action === 'get') {
      const { data: row } = await supabase
        .from('whatsapp_settings')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({ success: true, settings: maskSettings(row) }),
      };
    }

    // ─── SAVE ──────────────────────────────────────────────────────
    if (action === 'save') {
      const { data: existing } = await supabase
        .from('whatsapp_settings')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      const update: Record<string, any> = {
        user_id: userId,
        updated_at: new Date().toISOString(),
      };

      for (const field of SAVEABLE_FIELDS) {
        const val = fieldFrom(field);
        if (val !== undefined) update[field] = val;
      }

      // Only update token if provided and not the masked placeholder
      const accessTokenInput = fieldFrom('wa_access_token');
      if (accessTokenInput !== undefined && accessTokenInput !== '***') {
        update.wa_access_token = accessTokenInput;
      }

      // Auto-generate webhook_verify_token if not set
      if (!existing?.webhook_verify_token) {
        update.webhook_verify_token = crypto.randomUUID();
      }

      const { data: saved, error: saveErr } = await supabase
        .from('whatsapp_settings')
        .upsert(update, { onConflict: 'user_id' })
        .select('*')
        .single();

      if (saveErr) {
        console.error('[whatsapp-settings] Save failed:', saveErr);
        return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Save failed', detail: saveErr.message }) };
      }

      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({ success: true, settings: maskSettings(saved) }),
      };
    }

    // ─── VALIDATE ─────────────────────────────────────────────────
    // Calls Meta Graph API read-only to verify credentials without sending a message
    if (action === 'validate') {
      let phoneNumberId = fieldFrom('wa_phone_number_id');
      let accessToken = fieldFrom('wa_access_token');

      // Fall back to stored credentials if not provided or masked
      if (!phoneNumberId || !accessToken || accessToken === '***') {
        const { data: stored } = await supabase
          .from('whatsapp_settings')
          .select('wa_phone_number_id, wa_access_token')
          .eq('user_id', userId)
          .maybeSingle();
        phoneNumberId = phoneNumberId || stored?.wa_phone_number_id;
        accessToken = (!accessToken || accessToken === '***') ? stored?.wa_access_token : accessToken;
      }

      if (!phoneNumberId || !accessToken) {
        return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'No credentials to validate' }) };
      }

      const metaRes = await fetch(
        `https://graph.facebook.com/v19.0/${phoneNumberId}?fields=display_phone_number,verified_name`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const metaData = await metaRes.json().catch(() => ({}));
      if (!metaRes.ok) {
        return {
          statusCode: 200,
          headers: CORS_HEADERS,
          body: JSON.stringify({ valid: false, error: metaData?.error?.message || 'Invalid credentials' }),
        };
      }
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({ valid: true, phone: metaData.display_phone_number, name: metaData.verified_name }),
      };
    }

    // ─── TEST ──────────────────────────────────────────────────────
    if (action === 'test') {
      const testPhone = payload.testPhone;
      if (!testPhone) {
        return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'testPhone required' }) };
      }

      const sendUrl = (process.env.URL || '') + '/.netlify/functions/whatsapp-send';
      const res = await fetch(sendUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(process.env.INTERNAL_API_SECRET || process.env.INTERNAL_WEBHOOK_SECRET
            ? { 'x-internal-secret': process.env.INTERNAL_API_SECRET || process.env.INTERNAL_WEBHOOK_SECRET || '' }
            : {}),
        },
        body: JSON.stringify({
          userId,
          to: testPhone,
          body: 'Test message from Boltcall — your WhatsApp integration is working.',
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        return {
          statusCode: 500,
          headers: CORS_HEADERS,
          body: JSON.stringify({ success: false, error: data?.error || 'Test send failed', detail: data }),
        };
      }

      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({ success: true, message: `Test message sent to ${testPhone}` }),
      };
    }

    // ─── DISCONNECT ────────────────────────────────────────────────
    if (action === 'disconnect') {
      const { error: disconnectErr } = await supabase
        .from('whatsapp_settings')
        .update({
          wa_phone_number_id: null,
          wa_access_token: null,
          wa_business_account_id: null,
          is_enabled: false,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (disconnectErr) {
        return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Disconnect failed', detail: disconnectErr.message }) };
      }

      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({ success: true }),
      };
    }

    return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: `Unknown action: ${action}` }) };
  } catch (error) {
    console.error('[whatsapp-settings] Error:', error);
    await notifyError('whatsapp-settings', error as Error, { userId, action });
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};

export default withLegacyHandler(handler);
