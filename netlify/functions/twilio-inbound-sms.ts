import { Handler } from '@netlify/functions';
import { maskPhone } from './_shared/redact-secrets';
import { createClient } from '@supabase/supabase-js';
import { notifyError } from './_shared/notify';
import { verifyTwilioSignature } from './_shared/verify-signatures';
import { withLegacyHandler } from './_shared/runtime-compat';
import { isLocalDev } from './_shared/prod-detect';
import { appendChatMessage } from './_shared/chats-sync';
import { ensureWorkspaceForUser } from './_shared/setup-workspace';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://puszjwovldwgitfpsnfm.supabase.co';

function getServiceClient() {
  return createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * Build a deterministic thread ID from two phone numbers.
 * Sorted so the same pair always produces the same thread ID.
 */
function buildThreadId(phone1: string, phone2: string): string {
  const sorted = [phone1, phone2].sort();
  return `${sorted[0]}_${sorted[1]}`;
}

/**
 * Twilio Inbound SMS Webhook
 * Receives incoming SMS messages from Twilio, stores them in sms_conversations,
 * handles appointment confirmations/cancellations, and triggers AI auto-reply.
 * URL: /.netlify/functions/twilio-inbound-sms
 */
const handler: Handler = async (event) => {
  // Twilio sends POST with application/x-www-form-urlencoded
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/xml' },
      body: '<Response/>',
    };
  }

  // Fail-closed unless running under `netlify dev`. TWILIO_AUTH_TOKEN MUST be set.
  if (!process.env.TWILIO_AUTH_TOKEN && !isLocalDev()) {
    console.error('[twilio-inbound-sms] TWILIO_AUTH_TOKEN unset; refusing');
    return { statusCode: 500, headers: { 'Content-Type': 'text/xml' }, body: '<Response/>' };
  }
  const sigResult = verifyTwilioSignature(event);
  if (sigResult === 'invalid' || (sigResult === 'missing' && process.env.TWILIO_AUTH_TOKEN)) {
    console.warn(`[twilio-inbound-sms] Rejecting ${sigResult} Twilio signature`);
    return {
      statusCode: 403,
      headers: { 'Content-Type': 'text/xml' },
      body: '<Response/>',
    };
  }

  const supabase = getServiceClient();

  try {
    // Parse Twilio webhook payload (URL-encoded form data)
    const params = new URLSearchParams(event.body || '');
    const from = params.get('From') || '';
    const to = params.get('To') || '';
    const body = params.get('Body') || '';
    const messageSid = params.get('MessageSid') || '';
    const numMedia = parseInt(params.get('NumMedia') || '0', 10);

    if (!from || !body) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'text/xml' },
        body: '<Response/>',
      };
    }

    console.log(`[twilio-inbound-sms] From: ${maskPhone(from)}, To: ${to}`);

    // Look up which user owns the receiving phone number
    const { data: phoneRow } = await supabase
      .from('phone_numbers')
      .select('user_id, workspace_id')
      .eq('phone_number', to)
      .single();

    const userId = phoneRow?.user_id || null;
    const workspaceId = phoneRow?.workspace_id || null;

    // Collect media URLs if any
    const mediaUrls: string[] = [];
    for (let i = 0; i < numMedia; i++) {
      const mediaUrl = params.get(`MediaUrl${i}`);
      if (mediaUrl) mediaUrls.push(mediaUrl);
    }

    // Build thread ID for conversation grouping
    const threadId = buildThreadId(from, to);

    // Store the inbound message
    const { data: insertedMsg, error: insertError } = await supabase
      .from('sms_conversations')
      .insert({
        user_id: userId,
        workspace_id: workspaceId,
        direction: 'inbound',
        from_number: from,
        to_number: to,
        body,
        twilio_sid: messageSid,
        media_urls: mediaUrls.length > 0 ? mediaUrls : null,
        status: 'received',
        thread_id: threadId,
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('[twilio-inbound-sms] Failed to store message:', insertError);
      await notifyError('twilio-inbound-sms: Insert failed', insertError, { from, to });
    }

    // Dual-write into `chats` so the unified inbox (V2MessagesPage) shows
    // live SMS threads instead of the empty state.
    if (userId) {
      try {
        const workspace = await ensureWorkspaceForUser<{ id: string }>(userId, 'id');
        await appendChatMessage(supabase, {
          userId,
          workspaceId: workspace?.id || null,
          sessionId: threadId,
          source: 'phone',
          primaryPhone: from,
          sender: 'customer',
          content: body,
        });
      } catch (chatSyncErr) {
        console.error('[twilio-inbound-sms] chats dual-write failed:', chatSyncErr);
      }
    }

    // Check if this is a reply to a scheduled message (appointment confirmation, etc.)
    const lowerBody = body.toLowerCase().trim();

    // ─── SMS opt-out (TCPA) ────────────────────────────────────────
    // Carrier keywords. "cancel" excluded — it belongs to the appointment
    // flow below. All outbound SMS share one Twilio from-number, so an
    // opt-out is platform-wide, keyed by phone alone.
    const isOptOut = /^(stop|stopall|unsubscribe|end|quit)$/.test(lowerBody);
    const isOptIn = /^(start|unstop)$/.test(lowerBody);

    if (isOptOut) {
      const [optoutRes, enrollRes, cancelRes] = await Promise.all([
        supabase.from('sms_optouts').upsert({ phone: from, user_id: userId }, { onConflict: 'phone' }),
        supabase
          .from('followup_enrollments')
          .update({ status: 'unsubscribed' })
          .eq('contact_phone', from)
          .eq('status', 'active'),
        supabase
          .from('scheduled_messages')
          .update({ status: 'cancelled', error: 'recipient opted out (STOP)' })
          .eq('recipient_phone', from)
          .eq('status', 'scheduled'),
      ]);
      const optErr = optoutRes.error || enrollRes.error || cancelRes.error;
      if (optErr) {
        console.error('[twilio-inbound-sms] Opt-out processing failed:', optErr);
        await notifyError('twilio-inbound-sms: Opt-out processing failed', optErr, { from });
      }
      console.log(`[twilio-inbound-sms] Opt-out processed for ${maskPhone(from)}`);
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'text/xml' },
        body: '<Response><Message>You have been unsubscribed and will receive no further messages. Reply START to resubscribe.</Message></Response>',
      };
    }

    if (isOptIn) {
      const { error: optInErr } = await supabase.from('sms_optouts').delete().eq('phone', from);
      if (optInErr) console.error('[twilio-inbound-sms] Opt-in processing failed:', optInErr);
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'text/xml' },
        body: '<Response><Message>You have been resubscribed. Reply STOP to unsubscribe.</Message></Response>',
      };
    }

    const isConfirm = /^(yes|confirm|ok|y|sure|1)$/i.test(lowerBody);
    const isCancel = /^(no|cancel|n|2)$/i.test(lowerBody);

    if (userId && (isConfirm || isCancel)) {
      // Find the most recent appointment for this phone number
      const { data: appt } = await supabase
        .from('appointments')
        .select('id, status')
        .eq('user_id', userId)
        .eq('client_phone', from)
        .eq('status', 'confirmed')
        .order('starts_at', { ascending: true })
        .limit(1)
        .single();

      if (appt && isCancel) {
        await supabase
          .from('appointments')
          .update({ status: 'cancelled', updated_at: new Date().toISOString() })
          .eq('id', appt.id);

        // Cancel pending messages for this appointment
        await supabase
          .from('scheduled_messages')
          .update({ status: 'cancelled' })
          .eq('appointment_id', appt.id)
          .eq('status', 'scheduled');
      }
    }

    // ─── Trigger AI Auto-Reply ────────────────────────────────────
    // Fire-and-forget: call the SMS AI responder asynchronously.
    // We don't await this because Twilio requires a fast TwiML response.
    if (userId && insertedMsg?.id) {
      // Check if SMS AI is enabled for this user
      const { data: smsSettings } = await supabase
        .from('sms_settings')
        .select('is_enabled')
        .eq('user_id', userId)
        .maybeSingle();

      if (smsSettings?.is_enabled !== false) {
        // Determine the base URL for the AI responder function
        const siteUrl = process.env.URL || process.env.DEPLOY_URL || '';
        if (siteUrl) {
          // Fire-and-forget — don't await, don't block TwiML response
          fetch(`${siteUrl}/.netlify/functions/sms-ai-responder`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(process.env.INTERNAL_API_SECRET || process.env.INTERNAL_WEBHOOK_SECRET
                ? { 'x-internal-secret': process.env.INTERNAL_API_SECRET || process.env.INTERNAL_WEBHOOK_SECRET || '' }
                : {}),
            },
            body: JSON.stringify({
              messageId: insertedMsg.id,
              userId,
              action: 'generate',
            }),
          }).catch(err => {
            console.error('[twilio-inbound-sms] Failed to trigger AI responder:', err);
          });
        }
      }
    }

    // Return TwiML acknowledgment (AI reply is sent separately via Twilio REST API)
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/xml' },
      body: '<Response/>',
    };
  } catch (err: any) {
    console.error('[twilio-inbound-sms] Error:', err);
    await notifyError('twilio-inbound-sms: Unhandled exception', err);
    // ponytail: 500 (not 200) so Twilio's own retry policy kicks in on transient failures
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'text/xml' },
      body: '<Response/>',
    };
  }
};

export const testHandler = handler;
export default withLegacyHandler(handler);
