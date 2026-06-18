import { Handler } from '@netlify/functions';
import { deductTokens, deductTokensBatch, getServiceSupabase, TOKEN_COSTS } from './_shared/token-utils';
import { authenticateApiKey } from './_shared/validate-api-key';
import { sendAcsSms } from './_shared/acs-sdk';
import { requireUser } from './_shared/user-auth';
import { withLegacyHandler } from './_shared/runtime-compat';

/**
 * ACS SMS — replaces twilio-sms.ts
 *
 * Same action interface: send | send_bulk | list
 * Uses ACS for send; queries Supabase sms_conversations for list
 * (ACS has no REST API for listing sent messages).
 */

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

async function getOwnedPhoneNumbers(userId: string): Promise<string[]> {
  const supabase = getServiceSupabase();
  const { data } = await supabase
    .from('phone_numbers')
    .select('phone_number')
    .eq('user_id', userId)
    .eq('status', 'active');
  return (data || []).map((row: any) => row.phone_number).filter(Boolean);
}

async function resolveFromNumber(userId: string, requestedFrom?: string): Promise<string | null> {
  const ownedNumbers = await getOwnedPhoneNumbers(userId);
  if (requestedFrom) return ownedNumbers.includes(requestedFrom) ? requestedFrom : null;
  return ownedNumbers[0] || null;
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

    // Resolve userId from API key if present
    const apiAuth = await authenticateApiKey(event.headers as Record<string, string>, event.queryStringParameters);
    if (apiAuth.hasKey && !apiAuth.userId) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: apiAuth.error || 'Invalid API key' }) };
    }
    if (apiAuth.userId) {
      body.user_id = apiAuth.userId;
    } else {
      const userAuth = await requireUser(event, headers);
      if (!userAuth.ok) return userAuth.response;
      body.user_id = userAuth.userId;
    }

    // ── send ──────────────────────────────────────────────────────
    if (action === 'send') {
      const { to, from, message } = body;
      if (!to || !message) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'to and message are required' }) };
      }

      const fromNumber = await resolveFromNumber(body.user_id, from);
      if (!fromNumber) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'No active sending number found for this user' }) };
      }

      const result = await sendAcsSms(fromNumber, to, message);
      if (!result.success) {
        return { statusCode: 500, headers, body: JSON.stringify({ error: result.error || 'SMS send failed' }) };
      }

      if (body.user_id) {
        try {
          await deductTokens(body.user_id, TOKEN_COSTS.sms_sent, 'sms_sent', `SMS to ${to}`, { message_sid: result.messageId, to, from: fromNumber });
        } catch { /* non-blocking */ }
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message_sid: result.messageId, to, from: fromNumber }),
      };
    }

    // ── send_bulk ─────────────────────────────────────────────────
    if (action === 'send_bulk') {
      const { messages } = body;
      if (!messages?.length) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'messages array required' }) };
      }

      const fromNumber = await resolveFromNumber(body.user_id, body.from);
      if (!fromNumber) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'No active sending number found for this user' }) };
      }

      const results = await Promise.allSettled(
        messages.map((msg: { to: string; message: string }) =>
          sendAcsSms(fromNumber, msg.to, msg.message)
        )
      );

      const summary = results.map((result, i) => ({
        to: messages[i].to,
        success: result.status === 'fulfilled' && result.value.success,
        message_sid: result.status === 'fulfilled' ? result.value.messageId : undefined,
        error: result.status === 'rejected' ? result.reason?.message : (result.status === 'fulfilled' ? result.value.error : undefined),
      }));

      if (body.user_id) {
        const successful = summary.filter(s => s.success);
        if (successful.length > 0) {
          try {
            await deductTokensBatch(
              body.user_id,
              successful.map(s => ({
                cost: TOKEN_COSTS.sms_sent,
                category: 'sms_sent' as const,
                description: `SMS to ${s.to}`,
                metadata: { message_sid: s.message_sid, to: s.to, bulk: true },
              }))
            );
          } catch { /* non-blocking */ }
        }
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          sent: summary.filter(s => s.success).length,
          failed: summary.filter(s => !s.success).length,
          results: summary,
        }),
      };
    }

    // ── list — query from Supabase (ACS has no message history API) ──
    if (action === 'list') {
      const supabase = getServiceSupabase();
      const limit = Math.min(body.limit || 50, 200);

      let query = supabase
        .from('sms_conversations')
        .select('id, from_number, to_number, body, direction, status, created_at, twilio_sid')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (body.to) query = query.eq('to_number', body.to);
      if (body.from) query = query.eq('from_number', body.from);
      if (body.user_id) query = query.eq('user_id', body.user_id);

      const { data: messages, error } = await query;
      if (error) throw error;

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ messages: messages || [], total: messages?.length || 0 }),
      };
    }

    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid action. Use: send, send_bulk, or list' }) };
  } catch (error) {
    console.error('[acs-sms] Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'ACS SMS operation failed', details: error instanceof Error ? error.message : 'Unknown error' }),
    };
  }
};

export default withLegacyHandler(handler);
