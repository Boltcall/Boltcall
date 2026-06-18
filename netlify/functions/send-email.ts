import { Handler } from '@netlify/functions';
import { deductTokens, TOKEN_COSTS } from './_shared/token-utils';
import { notifyError } from './_shared/notify';
import { authenticateApiKey } from './_shared/validate-api-key';
import { requireInternalOrMatchingUser } from './_shared/user-auth';
import { withLegacyHandler } from './_shared/runtime-compat';

const BREVO_API_BASE = 'https://api.brevo.com/v3';

interface SendEmailParams {
  to: string;        // recipient email
  subject: string;
  htmlContent?: string;
  textContent?: string;
  fromName?: string;
  fromEmail?: string;
  userId?: string;    // for token deduction
  metadata?: Record<string, unknown>;
}

async function sendBrevoEmail(params: SendEmailParams): Promise<{ messageId: string } | { error: string }> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    return { error: 'Brevo API key not configured (BREVO_API_KEY)' };
  }

  const fromEmail = params.fromEmail || process.env.BREVO_FROM_EMAIL || 'noreply@boltcall.org';
  const fromName = params.fromName || process.env.BREVO_FROM_NAME || 'Boltcall';

  const body = {
    sender: { name: fromName, email: fromEmail },
    to: [{ email: params.to }],
    subject: params.subject,
    htmlContent: params.htmlContent || undefined,
    textContent: params.textContent || undefined,
  };

  const response = await fetch(`${BREVO_API_BASE}/smtp/email`, {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (!response.ok) {
    return { error: data.message || `Brevo API error: ${response.status}` };
  }

  return { messageId: data.messageId || 'sent' };
}

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const action = body.action || 'send';

    // Resolve userId from API key if present (Zapier)
    const auth = await authenticateApiKey(event.headers as Record<string, string>, event.queryStringParameters);
    if (auth.hasKey && !auth.userId) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: auth.error || 'Invalid API key' }) };
    }
    if (auth.userId) body.userId = auth.userId;
    if (!auth.hasKey) {
      const requestedUserId = typeof body.userId === 'string' ? body.userId : null;
      const userAuth = await requireInternalOrMatchingUser(event, requestedUserId, headers);
      if (!userAuth.ok) return userAuth.response;
      if (requestedUserId) body.userId = userAuth.userId;
    }

    if (action === 'send') {
      const { to, subject, htmlContent, textContent, fromName, fromEmail, userId, metadata } = body;

      if (!to || !subject) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'to and subject are required' }) };
      }

      const result = await sendBrevoEmail({ to, subject, htmlContent, textContent, fromName, fromEmail, userId, metadata });

      if ('error' in result) {
        await notifyError('send-email: Brevo send failed', result.error, { to, subject });
        return { statusCode: 500, headers, body: JSON.stringify({ error: result.error }) };
      }

      // Deduct tokens if userId provided
      if (userId) {
        try {
          await deductTokens(userId, TOKEN_COSTS.email_sent, 'email_sent', `Email to ${to}: ${subject}`, metadata);
        } catch (err) {
          console.error('[send-email] Token deduction failed (non-blocking):', err);
        }
      }

      return { statusCode: 200, headers, body: JSON.stringify({ success: true, messageId: result.messageId }) };
    }

    return { statusCode: 400, headers, body: JSON.stringify({ error: `Unknown action: ${action}` }) };
  } catch (err: any) {
    console.error('[send-email] Error:', err);
    await notifyError('send-email: Unhandled exception', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Email send failed' }) };
  }
};

// Export for use by message-dispatcher
export { sendBrevoEmail };

export default withLegacyHandler(handler);
