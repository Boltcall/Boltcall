import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import Retell from 'retell-sdk';
import { deductTokens, TOKEN_COSTS } from './_shared/token-utils';
import { notifyError } from './_shared/notify';
import { authorizeRunner } from './_shared/agency-runner-auth';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://hbwogktdajorojljkjwg.supabase.co';
const TWILIO_API_BASE = 'https://api.twilio.com/2010-04-01';

function getServiceClient() {
  return createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY!);
}

async function sendTwilioSms(to: string, message: string): Promise<{ sid: string } | { error: string }> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    return { error: 'Twilio credentials not configured' };
  }

  const url = `${TWILIO_API_BASE}/Accounts/${accountSid}/Messages.json`;
  const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      To: to,
      From: fromNumber,
      Body: message,
    }).toString(),
  });

  const data = await response.json();

  if (!response.ok) {
    return { error: data.message || `Twilio API error: ${response.status}` };
  }

  return { sid: data.sid };
}

export const handler: Handler = async (event) => {
  // Support both Netlify scheduled invocations and manual POST calls
  const isScheduled = !event.httpMethod || event.httpMethod === 'POST';
  if (!isScheduled && event.httpMethod !== 'GET') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  // Auth check for manual calls — require secret header (skip for scheduled invocations)
  const dispatcherKey = process.env.DISPATCHER_SECRET;
  const providedKey = event.headers['x-dispatcher-key'] || event.headers['X-Dispatcher-Key'];
  if (!dispatcherKey || providedKey !== dispatcherKey) {
    const authz = await authorizeRunner(event);
    if (!authz.ok) {
      return { statusCode: authz.status, body: JSON.stringify({ error: authz.message }) };
    }
  }

  const supabase = getServiceClient();

  try {
    // Fetch due messages (batch of 50 to avoid timeouts)
    const { data: messages, error: fetchError } = await supabase
      .from('scheduled_messages')
      .select('*')
      .eq('status', 'scheduled')
      .lte('scheduled_for', new Date().toISOString())
      .order('scheduled_for', { ascending: true })
      .limit(50);

    if (fetchError) {
      console.error('[message-dispatcher] Failed to fetch messages:', fetchError);
      await notifyError('message-dispatcher: Failed to fetch due messages', fetchError);
      return { statusCode: 500, body: JSON.stringify({ error: 'Failed to fetch due messages' }) };
    }

    if (!messages || messages.length === 0) {
      return { statusCode: 200, body: JSON.stringify({ processed: 0, sent: 0, failed: 0 }) };
    }

    let sent = 0;
    let failed = 0;

    for (const msg of messages) {
      if (msg.channel === 'sms' && msg.recipient_phone) {
        const result = await sendTwilioSms(msg.recipient_phone, msg.message_body);

        if ('sid' in result) {
          // Success
          await supabase
            .from('scheduled_messages')
            .update({
              status: 'sent',
              sent_at: new Date().toISOString(),
              twilio_sid: result.sid,
              tokens_deducted: TOKEN_COSTS.sms_sent,
            })
            .eq('id', msg.id);

          // Deduct tokens
          try {
            await deductTokens(
              msg.user_id,
              TOKEN_COSTS.sms_sent,
              'sms_sent',
              `${msg.type === 'reminder' ? 'Reminder' : 'Review request'} SMS to ${msg.recipient_phone}`,
              { scheduled_message_id: msg.id, twilio_sid: result.sid, type: msg.type },
              supabase
            );
          } catch (tokenErr) {
            console.error('[message-dispatcher] Token deduction failed (non-blocking):', tokenErr);
          }

          sent++;
        } else {
          // Failure
          await supabase
            .from('scheduled_messages')
            .update({
              status: 'failed',
              error: result.error,
            })
            .eq('id', msg.id);

          await notifyError('message-dispatcher: SMS send failed', result.error, {
            messageId: msg.id,
            recipient: msg.recipient_phone,
            messageType: msg.type,
            userId: msg.user_id,
          });

          failed++;
        }
      } else if (msg.channel === 'email' && msg.recipient_email) {
        // Send email via Brevo API
        const brevoApiKey = process.env.BREVO_API_KEY;
        if (!brevoApiKey) {
          await supabase
            .from('scheduled_messages')
            .update({ status: 'failed', error: 'Brevo API key not configured' })
            .eq('id', msg.id);
          failed++;
          continue;
        }

        const emailBody = {
          sender: {
            name: process.env.BREVO_FROM_NAME || 'Boltcall',
            email: process.env.BREVO_FROM_EMAIL || 'noreply@boltcall.org',
          },
          to: [{ email: msg.recipient_email }],
          subject: msg.subject || (msg.type === 'reminder' ? 'Appointment Reminder' : 'We\'d love your feedback'),
          htmlContent: `<p>${(msg.message_body || '').replace(/\n/g, '<br/>')}</p>`,
        };

        const emailResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            'api-key': brevoApiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(emailBody),
        });

        const emailData = await emailResponse.json();

        if (emailResponse.ok) {
          await supabase
            .from('scheduled_messages')
            .update({
              status: 'sent',
              sent_at: new Date().toISOString(),
              tokens_deducted: TOKEN_COSTS.email_sent,
            })
            .eq('id', msg.id);

          try {
            await deductTokens(
              msg.user_id,
              TOKEN_COSTS.email_sent,
              'email_sent',
              `${msg.type === 'reminder' ? 'Reminder' : 'Review request'} email to ${msg.recipient_email}`,
              { scheduled_message_id: msg.id, type: msg.type },
              supabase
            );
          } catch (tokenErr) {
            console.error('[message-dispatcher] Token deduction failed (non-blocking):', tokenErr);
          }

          sent++;
        } else {
          const errorMsg = emailData.message || `Brevo API error: ${emailResponse.status}`;
          await supabase
            .from('scheduled_messages')
            .update({ status: 'failed', error: errorMsg })
            .eq('id', msg.id);

          await notifyError('message-dispatcher: Email send failed', errorMsg, {
            messageId: msg.id,
            recipient: msg.recipient_email,
            messageType: msg.type,
          });

          failed++;
        }
      } else if (msg.channel === 'call' && msg.recipient_phone) {
        // Trigger a Retell AI call retry
        const retellApiKey = process.env.RETELL_API_KEY;
        const agentId = msg.metadata?.agent_id;
        const fromNumber = msg.metadata?.from_number;

        if (!retellApiKey || !agentId || !fromNumber) {
          const missingField = !retellApiKey ? 'RETELL_API_KEY' : !agentId ? 'agent_id' : 'from_number';
          await supabase
            .from('scheduled_messages')
            .update({ status: 'failed', error: `Call retry missing config: ${missingField}` })
            .eq('id', msg.id);
          await notifyError('message-dispatcher: Call retry config missing', missingField, {
            messageId: msg.id,
            userId: msg.user_id,
          });
          failed++;
          continue;
        }

        try {
          const retell = new Retell({ apiKey: retellApiKey });
          const callResp = await retell.call.createPhoneCall({
            from_number: fromNumber,
            to_number: msg.recipient_phone,
            agent_id: agentId,
            metadata: {
              source: 'followup_sequence',
              scheduled_message_id: msg.id,
              user_id: msg.user_id,
            },
          } as unknown as Parameters<typeof retell.call.createPhoneCall>[0]);

          await supabase
            .from('scheduled_messages')
            .update({
              status: 'sent',
              sent_at: new Date().toISOString(),
              metadata: { ...msg.metadata, retell_call_id: callResp.call_id },
              tokens_deducted: TOKEN_COSTS.outbound_call,
            })
            .eq('id', msg.id);

          try {
            await deductTokens(
              msg.user_id,
              TOKEN_COSTS.outbound_call,
              'outbound_call',
              `Follow-up call retry to ${msg.recipient_phone}`,
              { scheduled_message_id: msg.id, retell_call_id: callResp.call_id },
              supabase
            );
          } catch (tokenErr) {
            console.error('[message-dispatcher] Token deduction failed (non-blocking):', tokenErr);
          }

          sent++;
        } catch (callErr: any) {
          const errMsg = callErr?.message || 'Retell call creation failed';
          await supabase
            .from('scheduled_messages')
            .update({ status: 'failed', error: errMsg })
            .eq('id', msg.id);
          await notifyError('message-dispatcher: Call retry failed', errMsg, {
            messageId: msg.id,
            recipient: msg.recipient_phone,
            userId: msg.user_id,
          });
          failed++;
        }
      } else {
        // Unknown channel or missing recipient
        await supabase
          .from('scheduled_messages')
          .update({
            status: 'failed',
            error: !msg.recipient_phone && !msg.recipient_email
              ? 'No recipient contact info'
              : `Unsupported channel: ${msg.channel}`,
          })
          .eq('id', msg.id);

        failed++;
      }
    }

    console.log(`[message-dispatcher] Processed: ${messages.length}, Sent: ${sent}, Failed: ${failed}`);

    return {
      statusCode: 200,
      body: JSON.stringify({ processed: messages.length, sent, failed }),
    };
  } catch (err: any) {
    console.error('[message-dispatcher] Error:', err);
    await notifyError('message-dispatcher: Unhandled exception', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Message dispatch failed. Our team has been notified.' }),
    };
  }
};
