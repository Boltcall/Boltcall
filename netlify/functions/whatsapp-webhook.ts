import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';
import { notifyError } from './_shared/notify';
import { withLegacyHandler } from './_shared/runtime-compat';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://hbwogktdajorojljkjwg.supabase.co';

function getServiceClient() {
  return createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function buildThreadId(phone1: string, phone2: string): string {
  const sorted = [phone1, phone2].sort();
  return `${sorted[0]}_${sorted[1]}`;
}

function validatePhone(phone: string): boolean {
  return /^\+?[1-9]\d{6,14}$/.test(phone.replace(/\D/g, ''));
}

/**
 * WhatsApp Webhook — Meta Cloud API
 * GET:  verification challenge
 * POST: inbound messages with HMAC-SHA256 signature verification
 * URL: /.netlify/functions/whatsapp-webhook
 */
const handler: Handler = async (event) => {
  const supabase = getServiceClient();

  // GET: Meta verification challenge
  if (event.httpMethod === 'GET') {
    const params = event.queryStringParameters || {};
    const mode = params['hub.mode'];
    const token = params['hub.verify_token'];
    const challenge = params['hub.challenge'];

    if (mode !== 'subscribe' || !token) {
      return { statusCode: 403, body: 'Forbidden' };
    }

    let valid = false;
    try {
      const { data: settingsRows } = await supabase
        .from('whatsapp_settings')
        .select('webhook_verify_token')
        .eq('webhook_verify_token', token)
        .limit(1);
      if (settingsRows && settingsRows.length > 0) valid = true;
    } catch (e) {
      console.error('[whatsapp-webhook] DB token lookup failed:', e);
    }

    if (!valid && process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN && token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
      valid = true;
    }

    if (!valid) {
      return { statusCode: 403, body: 'Forbidden' };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/plain' },
      body: challenge || '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const rawBody = event.body || '';

  // HMAC signature verification (skip if no APP_SECRET set — dev mode)
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (appSecret) {
    const sigHeader = event.headers['x-hub-signature-256'] || event.headers['X-Hub-Signature-256'] || '';
    const expected = 'sha256=' + crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex');
    if (sigHeader !== expected) {
      console.error('[whatsapp-webhook] Invalid signature');
      return { statusCode: 403, body: 'Invalid signature' };
    }
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return { statusCode: 200, body: 'ok' };
  }

  try {
    const entries = payload?.entry || [];
    for (const entry of entries) {
      const changes = entry?.changes || [];
      for (const change of changes) {
        const value = change?.value;
        if (!value) continue;

        const metadata = value.metadata || {};
        const phoneNumberId = metadata.phone_number_id;
        const displayPhoneNumber = metadata.display_phone_number || phoneNumberId || '';

        let userId: string | null = null;
        if (phoneNumberId) {
          const { data: settingsRow } = await supabase
            .from('whatsapp_settings')
            .select('user_id')
            .eq('wa_phone_number_id', phoneNumberId)
            .maybeSingle();
          userId = settingsRow?.user_id || null;
        }

        const messages = value.messages || [];
        for (const message of messages) {
          const from = message.from || '';
          const to = displayPhoneNumber;
          const body = message.text?.body || '[media]';
          const waMessageId = message.id;

          if (!validatePhone(from)) {
            console.warn('[whatsapp-webhook] Invalid from phone, skipping:', from);
            continue;
          }

          const mediaUrls: any[] = [];
          for (const mediaType of ['image', 'video', 'audio', 'document', 'sticker']) {
            if (message[mediaType]?.id) {
              mediaUrls.push({ type: mediaType, id: message[mediaType].id, mime_type: message[mediaType].mime_type });
            }
          }

          const threadId = buildThreadId(from, to);

          const { data: insertedMsg, error: insertError } = await supabase
            .from('whatsapp_conversations')
            .insert({
              user_id: userId,
              direction: 'inbound',
              from_number: from,
              to_number: to,
              body,
              wa_message_id: waMessageId,
              media_urls: mediaUrls.length > 0 ? mediaUrls : [],
              status: 'received',
              thread_id: threadId,
            })
            .select('id')
            .single();

          if (insertError) {
            if ((insertError as any).code === '23505') {
              console.log('[whatsapp-webhook] Duplicate message, skipping:', waMessageId);
              continue;
            }
            console.error('[whatsapp-webhook] Insert failed:', insertError);
            await notifyError('whatsapp-webhook: Insert failed', insertError as any, { from, to });
            continue;
          }

          // Trigger AI responder. Fire-and-forget is unreliable on Netlify
          // (Lambda freezes the execution context on return). Await with a
          // 12s timeout — Meta accepts up to 20s webhook ack time.
          if (userId && insertedMsg?.id) {
            const responderUrl = (process.env.URL || '') + '/.netlify/functions/whatsapp-ai-responder';
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 12000);
            try {
              await fetch(responderUrl, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'x-internal-secret': process.env.INTERNAL_WEBHOOK_SECRET || '',
                },
                body: JSON.stringify({ messageId: insertedMsg.id, userId, action: 'generate' }),
                signal: controller.signal,
              });
            } catch (err) {
              console.error('[whatsapp-webhook] Failed to trigger AI responder:', err);
            } finally {
              clearTimeout(timeoutId);
            }
          }
        }

        // Process delivery status updates from Meta
        const statuses = value.statuses || [];
        for (const status of statuses) {
          if (!status.id || !status.status) continue;
          const dbStatus = status.status === 'delivered' ? 'sent'
                         : status.status === 'failed'    ? 'failed'
                         : null;
          if (dbStatus) {
            await supabase.from('whatsapp_conversations')
              .update({ status: dbStatus })
              .eq('wa_message_id', status.id);
          }
        }
      }
    }
  } catch (err) {
    console.error('[whatsapp-webhook] Error processing payload:', err);
    await notifyError('whatsapp-webhook: Process error', err as Error, {});
  }

  // Always return 200 immediately so Meta doesn't retry
  return { statusCode: 200, body: 'ok' };
};

export const testHandler = handler;
export default withLegacyHandler(handler);
