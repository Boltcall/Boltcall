import { Handler } from '@netlify/functions';
import crypto from 'crypto';
import { notifyError } from './_shared/notify';
import { getServiceSupabase } from './_shared/token-utils';
import { authenticateApiKey } from './_shared/validate-api-key';
import { hasSharedSecret, requireMatchingUser } from './_shared/user-auth';
import { validateOutboundHttpsUrl } from './_shared/outbound-url';

/**
 * Webhook Manager Function
 *
 * Actions:
 *   - list: Get all webhooks for a user
 *   - create: Create a new webhook
 *   - update: Update a webhook (name, url, trigger, active status)
 *   - delete: Delete a webhook
 *   - test: Send a test payload to a webhook
 *   - events: Get event log for a webhook (last 100)
 *   - fire: Internal — fire all matching webhooks for a trigger event
 */

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

const TRIGGER_EVENTS = [
  'new_lead',
  'missed_call',
  'appointment_booked',
  'call_completed',
  'review_received',
] as const;

const SAMPLE_PAYLOADS: Record<string, object> = {
  new_lead: {
    event: 'new_lead',
    timestamp: new Date().toISOString(),
    data: {
      id: 'lead_sample_123',
      name: 'Jane Smith',
      email: 'jane@example.com',
      phone: '+447700900123',
      source: 'ai_receptionist',
      status: 'new',
      notes: 'Interested in a quote for kitchen renovation',
      created_at: new Date().toISOString(),
    },
  },
  missed_call: {
    event: 'missed_call',
    timestamp: new Date().toISOString(),
    data: {
      id: 'call_sample_456',
      caller_number: '+447700900456',
      caller_name: 'John Doe',
      duration_seconds: 0,
      reason: 'no_answer',
      called_at: new Date().toISOString(),
    },
  },
  appointment_booked: {
    event: 'appointment_booked',
    timestamp: new Date().toISOString(),
    data: {
      id: 'apt_sample_789',
      customer_name: 'Sarah Johnson',
      customer_email: 'sarah@example.com',
      customer_phone: '+447700900789',
      start_time: new Date(Date.now() + 86400000).toISOString(),
      end_time: new Date(Date.now() + 86400000 + 1800000).toISOString(),
      service: 'Consultation',
      notes: 'First-time customer',
    },
  },
  call_completed: {
    event: 'call_completed',
    timestamp: new Date().toISOString(),
    data: {
      id: 'call_sample_012',
      caller_number: '+447700900012',
      caller_name: 'Mike Wilson',
      duration_seconds: 185,
      summary: 'Customer called about pricing for annual service plan',
      outcome: 'appointment_booked',
      sentiment: 'positive',
      recording_url: null,
    },
  },
  review_received: {
    event: 'review_received',
    timestamp: new Date().toISOString(),
    data: {
      id: 'review_sample_345',
      customer_name: 'Emily Brown',
      platform: 'google',
      rating: 5,
      text: 'Excellent service! Very responsive and professional.',
      created_at: new Date().toISOString(),
    },
  },
};

async function sendWebhook(
  url: string,
  payload: object,
  secret?: string | null
): Promise<{ statusCode: number; body: string; durationMs: number; success: boolean }> {
  const urlCheck = await validateOutboundHttpsUrl(url);
  if (!urlCheck.ok) {
    return {
      statusCode: 0,
      body: urlCheck.error,
      durationMs: 0,
      success: false,
    };
  }

  const bodyStr = JSON.stringify(payload);
  const reqHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': 'Boltcall-Webhook/1.0',
  };

  if (secret) {
    const signature = crypto
      .createHmac('sha256', secret)
      .update(bodyStr)
      .digest('hex');
    reqHeaders['X-Boltcall-Signature'] = `sha256=${signature}`;
  }

  const start = Date.now();
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: reqHeaders,
      body: bodyStr,
      signal: AbortSignal.timeout(10000), // 10s timeout
    });
    const durationMs = Date.now() - start;
    let body = '';
    try {
      body = await res.text();
    } catch {}
    return {
      statusCode: res.status,
      body: body.substring(0, 500),
      durationMs,
      success: res.status >= 200 && res.status < 300,
    };
  } catch (err) {
    const durationMs = Date.now() - start;
    return {
      statusCode: 0,
      body: err instanceof Error ? err.message : 'Request failed',
      durationMs,
      success: false,
    };
  }
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { action } = body;
    const supabase = getServiceSupabase();

    // Resolve userId: API key auth takes priority, then internal secret/JWT.
    if (action !== 'sample_payload') {
      const apiAuth = await authenticateApiKey(event.headers as Record<string, string>, event.queryStringParameters);
      if (apiAuth.hasKey && !apiAuth.userId) {
        return { statusCode: 401, headers, body: JSON.stringify({ error: apiAuth.error || 'Invalid API key' }) };
      }
      if (apiAuth.userId) {
        body.userId = apiAuth.userId;
      } else if (action === 'fire' && hasSharedSecret(event)) {
        // Internal fan-out keeps the request user scoped by its signed body.
      } else {
        const userAuth = await requireMatchingUser(event, body.userId, headers);
        if (!userAuth.ok) return userAuth.response;
        body.userId = userAuth.userId;
      }
    }

    // ─── LIST ────────────────────────────────────────────────────────
    if (action === 'list') {
      const { userId } = body;
      if (!userId) return { statusCode: 400, headers, body: JSON.stringify({ error: 'userId required' }) };

      const { data, error } = await supabase
        .from('user_webhooks')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, webhooks: data || [] }) };
    }

    // ─── CREATE ──────────────────────────────────────────────────────
    if (action === 'create') {
      const { userId, name, triggerEvent, url } = body;
      if (!userId || !triggerEvent || !url) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'userId, triggerEvent, and url required' }) };
      }
      if (!TRIGGER_EVENTS.includes(triggerEvent)) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: `Invalid trigger. Must be: ${TRIGGER_EVENTS.join(', ')}` }) };
      }
      const urlCheck = await validateOutboundHttpsUrl(url);
      if (!urlCheck.ok) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: urlCheck.error }) };
      }

      // Generate a signing secret
      const secret = crypto.randomBytes(32).toString('hex');

      const { data, error } = await supabase
        .from('user_webhooks')
        .insert({
          user_id: userId,
          name: name || `${triggerEvent} webhook`,
          trigger_event: triggerEvent,
          url,
          secret,
        })
        .select()
        .single();

      if (error) throw error;
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, webhook: data }) };
    }

    // ─── UPDATE ──────────────────────────────────────────────────────
    if (action === 'update') {
      const { userId, webhookId, name, url, triggerEvent, isActive } = body;
      if (!userId || !webhookId) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'userId and webhookId required' }) };
      }

      const updates: Record<string, any> = { updated_at: new Date().toISOString() };
      if (name !== undefined) updates.name = name;
      if (url !== undefined) {
        const urlCheck = await validateOutboundHttpsUrl(url);
        if (!urlCheck.ok) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: urlCheck.error }) };
        }
        updates.url = url;
      }
      if (triggerEvent !== undefined) updates.trigger_event = triggerEvent;
      if (isActive !== undefined) updates.is_active = isActive;

      const { data, error } = await supabase
        .from('user_webhooks')
        .update(updates)
        .eq('id', webhookId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, webhook: data }) };
    }

    // ─── DELETE ──────────────────────────────────────────────────────
    if (action === 'delete') {
      const { userId, webhookId } = body;
      if (!userId || !webhookId) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'userId and webhookId required' }) };
      }

      const { error } = await supabase
        .from('user_webhooks')
        .delete()
        .eq('id', webhookId)
        .eq('user_id', userId);

      if (error) throw error;
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
    }

    // ─── TEST ────────────────────────────────────────────────────────
    if (action === 'test') {
      const { userId, webhookId } = body;
      if (!userId || !webhookId) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'userId and webhookId required' }) };
      }

      const { data: webhook, error: whError } = await supabase
        .from('user_webhooks')
        .select('*')
        .eq('id', webhookId)
        .eq('user_id', userId)
        .single();

      if (whError || !webhook) {
        return { statusCode: 404, headers, body: JSON.stringify({ error: 'Webhook not found' }) };
      }

      const samplePayload = SAMPLE_PAYLOADS[webhook.trigger_event] || SAMPLE_PAYLOADS.new_lead;
      const result = await sendWebhook(webhook.url, samplePayload, webhook.secret);

      // Log the test event
      await supabase.from('webhook_events').insert({
        webhook_id: webhookId,
        user_id: userId,
        trigger_event: webhook.trigger_event,
        payload: samplePayload,
        status_code: result.statusCode,
        response_body: result.body,
        success: result.success,
        duration_ms: result.durationMs,
      });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: result.success,
          statusCode: result.statusCode,
          durationMs: result.durationMs,
          response: result.body,
        }),
      };
    }

    // ─── EVENTS (log) ────────────────────────────────────────────────
    if (action === 'events') {
      const { userId, webhookId, limit: eventLimit } = body;
      if (!userId) return { statusCode: 400, headers, body: JSON.stringify({ error: 'userId required' }) };

      let query = supabase
        .from('webhook_events')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(eventLimit || 100);

      if (webhookId) {
        query = query.eq('webhook_id', webhookId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, events: data || [] }) };
    }

    // ─── FIRE: Internal — fire webhooks for a trigger ────────────────
    if (action === 'fire') {
      const { userId, triggerEvent, payload } = body;
      if (!userId || !triggerEvent || !payload) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'userId, triggerEvent, and payload required' }) };
      }

      const { data: webhooks } = await supabase
        .from('user_webhooks')
        .select('*')
        .eq('user_id', userId)
        .eq('trigger_event', triggerEvent)
        .eq('is_active', true);

      if (!webhooks || webhooks.length === 0) {
        return { statusCode: 200, headers, body: JSON.stringify({ success: true, fired: 0 }) };
      }

      const results: Array<{
        webhookId: string;
        statusCode: number;
        body: string;
        durationMs: number;
        success: boolean;
      }> = [];
      for (const webhook of webhooks) {
        const fullPayload = {
          event: triggerEvent,
          timestamp: new Date().toISOString(),
          data: payload,
        };

        const result = await sendWebhook(webhook.url, fullPayload, webhook.secret);

        // Log event
        await supabase.from('webhook_events').insert({
          webhook_id: webhook.id,
          user_id: userId,
          trigger_event: triggerEvent,
          payload: fullPayload,
          status_code: result.statusCode,
          response_body: result.body,
          success: result.success,
          duration_ms: result.durationMs,
        });

        results.push({ webhookId: webhook.id, ...result });
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, fired: results.length, results }),
      };
    }

    // ─── SAMPLE_PAYLOAD ──────────────────────────────────────────────
    if (action === 'sample_payload') {
      const { triggerEvent } = body;
      const payload = SAMPLE_PAYLOADS[triggerEvent] || SAMPLE_PAYLOADS.new_lead;
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, payload }) };
    }

    // ─── SYNC_HISTORY ────────────────────────────────────────────────
    if (action === 'sync_history') {
      const { userId, provider, limit: histLimit } = body;
      if (!userId) return { statusCode: 400, headers, body: JSON.stringify({ error: 'userId required' }) };

      let query = supabase
        .from('integration_sync_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(histLimit || 50);

      if (provider) {
        query = query.eq('provider', provider);
      }

      const { data, error } = await query;
      if (error) throw error;
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, history: data || [] }) };
    }

    // ─── UPDATE_SYNC_SETTINGS ────────────────────────────────────────
    if (action === 'update_sync_settings') {
      const { userId, provider, syncDirection, syncData, fieldMapping } = body;
      if (!userId || !provider) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'userId and provider required' }) };
      }

      const updates: Record<string, any> = { updated_at: new Date().toISOString() };
      if (syncDirection !== undefined) updates.sync_direction = syncDirection;
      if (syncData !== undefined) updates.sync_data = syncData;
      if (fieldMapping !== undefined) updates.field_mapping = fieldMapping;

      const { error } = await supabase
        .from('user_integrations')
        .update(updates)
        .eq('user_id', userId)
        .eq('provider', provider);

      if (error) throw error;
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
    }

    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid action' }) };

  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error('[webhook-manager] Error:', errMsg);
    await notifyError('webhook-manager: Failed', errMsg);
    return { statusCode: 500, headers, body: JSON.stringify({ error: errMsg }) };
  }
};
