import { Handler } from '@netlify/functions';
import { deductTokens, deductTokensBatch, getServiceSupabase, TOKEN_COSTS } from './_shared/token-utils';
import { authenticateApiKey } from './_shared/validate-api-key';
import { requireUser } from './_shared/user-auth';
import { withLegacyHandler } from './_shared/runtime-compat';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

const TWILIO_API_BASE = 'https://api.twilio.com/2010-04-01';

async function twilioRequest(path: string, method: string, body?: Record<string, string>) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    throw new Error('Twilio credentials not configured');
  }

  const url = `${TWILIO_API_BASE}/Accounts/${accountSid}${path}`;
  const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

  const options: RequestInit = {
    method,
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  };

  if (body) {
    options.body = new URLSearchParams(body).toString();
  }

  const response = await fetch(url, options);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || `Twilio API error: ${response.status}`);
  }

  return data;
}

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
  if (requestedFrom) {
    return ownedNumbers.includes(requestedFrom) ? requestedFrom : null;
  }
  return ownedNumbers[0] || null;
}

const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { action } = body;

    // Resolve userId from API key if present (Zapier)
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

    // Send a single SMS
    if (action === 'send') {
      const { to, from, message } = body;
      if (!to || !message) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'to and message are required' }),
        };
      }

      const fromNumber = await resolveFromNumber(body.user_id, from);
      if (!fromNumber) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'No active sending number found for this user' }),
        };
      }

      const result = await twilioRequest('/Messages.json', 'POST', {
        To: to,
        From: fromNumber,
        Body: message,
      });

      // Deduct tokens for SMS sent (user_id is optional — skip if not provided)
      if (body.user_id) {
        try {
          await deductTokens(
            body.user_id,
            TOKEN_COSTS.sms_sent,
            'sms_sent',
            `SMS to ${to}`,
            { message_sid: result.sid, to, from: fromNumber }
          );
        } catch (tokenErr) {
          console.error('SMS token deduction failed (non-blocking):', tokenErr);
        }
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message_sid: result.sid,
          status: result.status,
          to: result.to,
          from: result.from,
        }),
      };
    }

    // Send bulk SMS
    if (action === 'send_bulk') {
      const { messages } = body;
      if (!messages?.length) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'messages array required' }),
        };
      }

      const fromNumber = await resolveFromNumber(body.user_id, body.from);
      if (!fromNumber) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'No active sending number found for this user' }),
        };
      }
      const results = await Promise.allSettled(
        messages.map((msg: { to: string; message: string }) =>
          twilioRequest('/Messages.json', 'POST', {
            To: msg.to,
            From: fromNumber,
            Body: msg.message,
          })
        )
      );

      const summary = results.map((result, i) => ({
        to: messages[i].to,
        success: result.status === 'fulfilled',
        message_sid: result.status === 'fulfilled' ? result.value.sid : undefined,
        error: result.status === 'rejected' ? result.reason.message : undefined,
      }));

      // Deduct tokens for all successfully sent SMS in batch
      if (body.user_id) {
        const successfulSms = summary.filter((s) => s.success);
        if (successfulSms.length > 0) {
          try {
            await deductTokensBatch(
              body.user_id,
              successfulSms.map((s) => ({
                cost: TOKEN_COSTS.sms_sent,
                category: 'sms_sent' as const,
                description: `SMS to ${s.to}`,
                metadata: { message_sid: s.message_sid, to: s.to, bulk: true },
              }))
            );
          } catch (tokenErr) {
            console.error('Bulk SMS token deduction failed (non-blocking):', tokenErr);
          }
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

    // Get message history
    if (action === 'list') {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

      const ownedNumbers = await getOwnedPhoneNumbers(body.user_id);
      const requestedFrom = body.from as string | undefined;
      const requestedTo = body.to as string | undefined;
      if ((requestedFrom && !ownedNumbers.includes(requestedFrom)) || (requestedTo && !ownedNumbers.includes(requestedTo))) {
        return { statusCode: 403, headers, body: JSON.stringify({ error: 'Requested number does not belong to this user' }) };
      }

      const numbersToQuery = requestedFrom || requestedTo ? [requestedFrom || requestedTo] : ownedNumbers;
      const messagesBySid = new Map<string, any>();
      for (const ownedNumber of numbersToQuery.filter(Boolean) as string[]) {
        for (const directionField of ['From', 'To']) {
          const params = new URLSearchParams({ PageSize: String(body.limit || 50), [directionField]: ownedNumber });
          if (body.date_sent) params.set('DateSent', body.date_sent);

          const url = `${TWILIO_API_BASE}/Accounts/${accountSid}/Messages.json?${params.toString()}`;
          const response = await fetch(url, { headers: { 'Authorization': `Basic ${auth}` } });
          const data = await response.json();
          for (const message of data.messages || []) {
            if (message.sid) messagesBySid.set(message.sid, message);
          }
        }
      }
      const messages = Array.from(messagesBySid.values()).slice(0, body.limit || 50);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          messages,
          total: messages.length,
        }),
      };
    }

    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Invalid action. Use: send, send_bulk, or list' }),
    };
  } catch (error) {
    console.error('twilio-sms error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Twilio SMS operation failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};

export const testHandler = handler;
export default withLegacyHandler(handler);
