import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { withLegacyHandler } from './_shared/runtime-compat';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS',
  'Content-Type': 'application/json',
};

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://hbwogktdajorojljkjwg.supabase.co';
const APPOINTMENT_HANDLER_URL = 'https://boltcall.org/.netlify/functions/appointment-handler';

const CALCOM_EVENT_TRIGGERS = [
  'BOOKING_CREATED',
  'BOOKING_CANCELLED',
  'BOOKING_RESCHEDULED',
];

async function getUserFromToken(token: string) {
  const supabase = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY!);
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

function getServiceClient() {
  return createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY!);
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Extract and verify JWT
  const authHeader = event.headers.authorization || event.headers.Authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Missing or invalid Authorization header' }),
    };
  }

  const token = authHeader.replace('Bearer ', '');
  const user = await getUserFromToken(token);
  if (!user) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Invalid or expired token' }),
    };
  }

  const supabase = getServiceClient();

  // ─── POST: Register Cal.com webhook ───────────────────────────────
  if (event.httpMethod === 'POST') {
    try {
      const body = JSON.parse(event.body || '{}');
      const { cal_api_key } = body;

      if (!cal_api_key || typeof cal_api_key !== 'string' || cal_api_key.trim().length === 0) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'cal_api_key is required' }),
        };
      }

      // Register webhook on Cal.com — include the shared secret so Cal.com
      // signs each delivery and appointment-handler can verify it.
      const calcomSecret = process.env.CALCOM_WEBHOOK_SECRET;
      const calResponse = await fetch(
        `https://api.cal.com/v1/webhooks?apiKey=${encodeURIComponent(cal_api_key.trim())}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subscriberUrl: APPOINTMENT_HANDLER_URL,
            eventTriggers: CALCOM_EVENT_TRIGGERS,
            active: true,
            ...(calcomSecret ? { secret: calcomSecret } : {}),
          }),
        }
      );

      if (!calResponse.ok) {
        const calError = await calResponse.text();
        console.error('Cal.com API error:', calResponse.status, calError);
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            error: 'Failed to register webhook on Cal.com. Please verify your API key is valid.',
            details: calResponse.status,
          }),
        };
      }

      const calData = await calResponse.json();
      const webhookId = calData.webhook?.id || calData.id;

      if (!webhookId) {
        console.error('Cal.com response missing webhook ID:', calData);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Cal.com returned an unexpected response. Webhook may have been created — check your Cal.com dashboard.' }),
        };
      }

      // Read existing reminders_config to preserve other fields
      const { data: existing } = await supabase
        .from('business_features')
        .select('reminders_config')
        .eq('user_id', user.id)
        .single();

      const existingConfig = (existing?.reminders_config || {}) as Record<string, any>;

      // Store Cal.com credentials in reminders_config
      const { error: updateError } = await supabase
        .from('business_features')
        .update({
          reminders_config: {
            ...existingConfig,
            cal_api_key: cal_api_key.trim(),
            cal_webhook_id: String(webhookId),
            cal_connected: true,
          },
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Supabase update error:', updateError);
        // Webhook was created on Cal.com but we failed to store it — try to clean up
        await fetch(
          `https://api.cal.com/v1/webhooks/${webhookId}?apiKey=${encodeURIComponent(cal_api_key.trim())}`,
          { method: 'DELETE' }
        ).catch(() => {});
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Failed to save configuration. Please try again.' }),
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Cal.com webhook registered successfully',
          webhook_id: webhookId,
        }),
      };
    } catch (err: any) {
      console.error('POST /calcom-webhook error:', err);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: err.message || 'Internal server error' }),
      };
    }
  }

  // ─── DELETE: Remove Cal.com webhook ───────────────────────────────
  if (event.httpMethod === 'DELETE') {
    try {
      // Read stored webhook ID and API key
      const { data, error: fetchError } = await supabase
        .from('business_features')
        .select('reminders_config')
        .eq('user_id', user.id)
        .single();

      if (fetchError || !data) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'No configuration found for this user' }),
        };
      }

      const config = (data.reminders_config || {}) as Record<string, any>;
      const { cal_api_key, cal_webhook_id } = config;

      if (!cal_api_key || !cal_webhook_id) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'No Cal.com integration found to disconnect' }),
        };
      }

      // Delete webhook from Cal.com
      const calResponse = await fetch(
        `https://api.cal.com/v1/webhooks/${cal_webhook_id}?apiKey=${encodeURIComponent(cal_api_key)}`,
        { method: 'DELETE' }
      );

      // Even if Cal.com delete fails (e.g. webhook already removed), we still clear our config
      if (!calResponse.ok) {
        console.warn('Cal.com webhook delete returned:', calResponse.status, await calResponse.text().catch(() => ''));
      }

      // Clear Cal.com fields from config, preserve other settings
      const { cal_api_key: _key, cal_webhook_id: _wid, cal_connected: _conn, ...remainingConfig } = config;

      const { error: updateError } = await supabase
        .from('business_features')
        .update({
          reminders_config: {
            ...remainingConfig,
            cal_connected: false,
          },
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Supabase update error on DELETE:', updateError);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Failed to update configuration. Please try again.' }),
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Cal.com webhook removed and integration disconnected',
        }),
      };
    } catch (err: any) {
      console.error('DELETE /calcom-webhook error:', err);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: err.message || 'Internal server error' }),
      };
    }
  }

  return {
    statusCode: 405,
    headers,
    body: JSON.stringify({ error: 'Method not allowed' }),
  };
};

export default withLegacyHandler(handler);
