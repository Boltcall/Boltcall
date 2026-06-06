import { Handler } from '@netlify/functions';
import { getServiceSupabase, deductTokens, TOKEN_COSTS } from './_shared/token-utils';
import { notifyError, notifyInfo } from './_shared/notify';
import { chatCompletion } from './_shared/azure-ai';
import { buildAgentContext } from './_shared/agent-context';
import { sendAcsSms } from './_shared/acs-sdk';
import { requireInternalOrMatchingUser } from './_shared/user-auth';

/**
 * SMS AI Responder — Generates AI-powered responses for inbound SMS.
 *
 * AI:  Azure OpenAI (falls back to Anthropic if Azure not configured)
 * SMS: Azure Communication Services (falls back to Twilio if ACS not configured)
 *
 * POST /.netlify/functions/sms-ai-responder
 * { messageId, userId, action?: 'generate'|'regenerate'|'approve'|'reject' }
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

const SMS_AI_TOKEN_COST = 8;

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS_HEADERS, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let body: any;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const { messageId, userId, action = 'generate' } = body;
  if (!messageId || !userId) {
    return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'messageId and userId required' }) };
  }

  const auth = await requireInternalOrMatchingUser(event, userId, CORS_HEADERS);
  if (!auth.ok) return auth.response;

  const supabase = getServiceSupabase();

  try {
    if (action === 'approve') return await handleApprove(supabase, messageId, userId);
    if (action === 'reject') {
      await supabase.from('sms_conversations').update({ ai_draft_status: 'rejected' }).eq('id', messageId).eq('user_id', userId);
      return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ success: true, status: 'rejected' }) };
    }

    const { data: message, error: msgErr } = await supabase
      .from('sms_conversations').select('*').eq('id', messageId).eq('user_id', userId).single();
    if (msgErr || !message) {
      return { statusCode: 404, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Message not found' }) };
    }
    if (action !== 'regenerate' && message.ai_draft_status) {
      return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ message: 'Draft already exists', status: message.ai_draft_status }) };
    }

    const threadId = buildThreadId(message.from_number, message.to_number);
    if (!message.thread_id) {
      await supabase.from('sms_conversations').update({ thread_id: threadId }).eq('id', messageId).eq('user_id', userId);
    }

    const { data: history } = await supabase
      .from('sms_conversations')
      .select('direction, from_number, body, created_at, qualification')
      .eq('thread_id', threadId).eq('user_id', userId).order('created_at', { ascending: true }).limit(20);

    const { data: settings } = await supabase.from('sms_settings').select('*').eq('user_id', userId).maybeSingle();
    const smsSettings = settings || {
      auto_reply_enabled: false, response_tone: 'professional', qualification_enabled: true,
      booking_enabled: true, business_hours_only: false, max_ai_messages_per_conversation: 10,
    };

    const aiMessageCount = (history || []).filter(h => h.direction === 'outbound' && h.qualification).length;
    if (aiMessageCount >= smsSettings.max_ai_messages_per_conversation) {
      return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ message: 'Max AI messages reached', skipped: true }) };
    }

    const { data: businessProfile } = await supabase
      .from('business_profiles')
      .select('business_name, website_url, main_category, service_areas, opening_hours, languages')
      .eq('user_id', userId).maybeSingle();

    let leadId = message.lead_id;
    let leadContext = '';
    const { data: existingLead } = await supabase
      .from('leads').select('id, name, email, phone, source, status, tags, score')
      .eq('user_id', userId).eq('phone', message.from_number).maybeSingle();
    if (existingLead) {
      leadId = existingLead.id;
      leadContext = `Existing lead: ${existingLead.name || 'Unknown'} (${existingLead.email || 'no email'}), status: ${existingLead.status}, score: ${existingLead.score || 'unscored'}`;
    }

    let availabilityContext = '';
    if (smsSettings.booking_enabled && smsSettings.calcom_event_slug) {
      availabilityContext = await getCalcomAvailability(smsSettings.calcom_event_slug);
    }

    const biz = businessProfile;
    const bizContext = biz
      ? `Business: ${biz.business_name || 'Unknown'}\nCategory: ${biz.main_category || 'General'}\nWebsite: ${biz.website_url || 'N/A'}\nHours: ${biz.opening_hours || 'Not specified'}\nService areas: ${Array.isArray(biz.service_areas) ? biz.service_areas.join(', ') : biz.service_areas || 'Not specified'}`
      : 'Business profile not configured.';

    const conversationText = (history || [])
      .map(h => `[${h.direction === 'inbound' ? 'CUSTOMER' : 'BUSINESS'}] ${h.body}`)
      .join('\n');

    // Pull the user's primary agent + KB so SMS replies share the same
    // knowledge AND the same master system_prompt as the Retell voice agent.
    // Tier-2 search is keyed on the latest inbound message body.
    const agentCtx = await buildAgentContext(userId, message.body);

    // Prefer the agent's canonical system_prompt (mirrored from Retell) when
    // available — that's how voice currently behaves, so text matches voice.
    // Falls back to the legacy "AI SMS assistant" preamble if no agent prompt
    // has been synced yet (new accounts, agents without Retell wiring).
    const basePrompt = agentCtx.systemPrompt
      ? `${agentCtx.systemPrompt}\n\n--- CHANNEL: SMS ---\nThis conversation is happening over SMS, not voice. Apply your usual identity and knowledge but follow the SMS response rules below.`
      : `You are an AI SMS assistant for a local business. You handle inbound text messages: answering questions, qualifying leads, and booking appointments.`;

    const systemPrompt = `${basePrompt}

${bizContext}
${leadContext ? `\n${leadContext}` : ''}
${availabilityContext ? `\nAvailable appointment slots:\n${availabilityContext}` : ''}
${agentCtx.kbPromptBlock ? `\n${agentCtx.kbPromptBlock}` : ''}
${agentCtx.kbSearchBlock ? `\n${agentCtx.kbSearchBlock}` : ''}

RESPONSE RULES:
- Tone: ${smsSettings.response_tone}
- Keep responses SHORT — this is SMS. 1-3 sentences max.
- Be warm, helpful, and direct. Sign as the business (never mention AI).
- No markdown. Plain SMS text only.
${smsSettings.booking_enabled ? '- If the customer wants to book, suggest available times from the slots provided.' : '- Do NOT offer to book appointments.'}

RESPOND IN THIS EXACT JSON FORMAT:
{
  "reply": "Your SMS response text here",
  "qualification": {
    "intent": "booking|inquiry|complaint|followup|spam|other",
    "score": 0-100,
    "reason": "Brief reason for score",
    "suggested_action": "book|respond|escalate|ignore"
  }${smsSettings.booking_enabled ? `,
  "booking": {
    "wants_to_book": true/false,
    "suggested_slot": "ISO datetime if applicable, or null",
    "service_requested": "what they want to book for, or null"
  }` : ''}
}`;

    const userPrompt = `SMS conversation so far:\n${conversationText}\n\nGenerate a reply to the latest customer message and qualify the lead.`;

    let rawResponse: string;
    try {
      rawResponse = await chatCompletion(systemPrompt, userPrompt, { maxTokens: 512 });
    } catch (aiErr: any) {
      console.error('[sms-ai-responder] AI error:', aiErr.message);
      return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ error: 'AI generation failed' }) };
    }

    let parsed: any;
    try {
      const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : rawResponse);
    } catch {
      parsed = {
        reply: rawResponse.replace(/```[\s\S]*?```/g, '').trim(),
        qualification: { intent: 'other', score: 50, reason: 'Could not parse AI response', suggested_action: 'respond' },
      };
    }

    const replyText = parsed.reply || '';
    const qualification = parsed.qualification || { intent: 'other', score: 50, reason: 'Unknown', suggested_action: 'respond' };
    const booking = parsed.booking || null;

    const draftStatus = smsSettings.auto_reply_enabled ? 'auto_sent' : 'pending';
    await supabase.from('sms_conversations')
      .update({ ai_draft: replyText, ai_draft_status: draftStatus, qualification, thread_id: threadId, lead_id: leadId })
      .eq('id', messageId)
      .eq('user_id', userId);

    if (!existingLead && qualification.score >= 30) {
      const { data: newLead } = await supabase.from('leads').insert({
        user_id: userId, phone: message.from_number, source: 'sms',
        status: qualification.intent === 'booking' ? 'hot' : 'new',
        score: qualification.score, tags: [qualification.intent],
      }).select('id').single();
      if (newLead) {
        leadId = newLead.id;
        await supabase.from('sms_conversations').update({ lead_id: leadId }).eq('id', messageId).eq('user_id', userId);
      }
    } else if (existingLead && qualification.score > (existingLead.score || 0)) {
      await supabase.from('leads').update({
        score: qualification.score,
        status: qualification.intent === 'booking' ? 'hot' : existingLead.status,
      }).eq('id', existingLead.id);
    }

    if (smsSettings.auto_reply_enabled && replyText) {
      const sendResult = await sendSms(message.to_number, message.from_number, replyText);
      if (sendResult.success) {
        await supabase.from('sms_conversations').insert({
          user_id: userId, workspace_id: message.workspace_id, direction: 'outbound',
          from_number: message.to_number, to_number: message.from_number,
          body: replyText, twilio_sid: sendResult.messageId,
          status: 'sent', thread_id: threadId, lead_id: leadId, qualification,
        });
        await supabase.from('sms_conversations')
          .update({ ai_responded_at: new Date().toISOString(), ai_draft_status: 'auto_sent' })
          .eq('id', messageId)
          .eq('user_id', userId);
        await deductTokens(userId, SMS_AI_TOKEN_COST + TOKEN_COSTS.sms_sent, 'sms_sent', `AI SMS reply to ${message.from_number}`, { message_id: messageId, thread_id: threadId });
        await notifyInfo(`📱 *SMS Auto\\-Reply Sent*\nTo: ${message.from_number}\nIntent: ${qualification.intent} (${qualification.score}/100)\nReply: ${replyText.slice(0, 100)}`);
      } else {
        console.error('[sms-ai-responder] Failed to send SMS:', sendResult.error);
        await supabase.from('sms_conversations').update({ ai_draft_status: 'pending' }).eq('id', messageId).eq('user_id', userId);
      }
    } else {
      await deductTokens(userId, SMS_AI_TOKEN_COST, 'sms_sent', `AI SMS draft for ${message.from_number}`, { message_id: messageId, thread_id: threadId });
      if (qualification.intent === 'booking' || qualification.score >= 70) {
        await notifyInfo(`📱 *Hot SMS Lead \\- Draft Ready*\nFrom: ${message.from_number}\nIntent: ${qualification.intent} (${qualification.score}/100)\nMessage: ${message.body.slice(0, 100)}\nDraft: ${replyText.slice(0, 100)}`);
      }
    }

    if (booking?.wants_to_book && smsSettings.booking_enabled && smsSettings.calcom_event_slug && booking.suggested_slot) {
      await supabase.from('sms_conversations')
        .update({ qualification: { ...qualification, booking_intent: true, suggested_slot: booking.suggested_slot, service_requested: booking.service_requested } })
        .eq('id', messageId)
        .eq('user_id', userId);
    }

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ success: true, draftStatus, reply: replyText, qualification, booking: booking || null, messageId, threadId }),
    };
  } catch (error) {
    console.error('[sms-ai-responder] Error:', error);
    await notifyError('sms-ai-responder', error as Error, { messageId, userId });
    return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Internal server error' }) };
  }
};

async function handleApprove(supabase: any, messageId: string, userId: string) {
  const { data: msg } = await supabase.from('sms_conversations').select('*').eq('id', messageId).eq('user_id', userId).single();
  if (!msg || !msg.ai_draft) {
    return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'No draft to approve' }) };
  }
  const sendResult = await sendSms(msg.to_number, msg.from_number, msg.ai_draft);
  if (!sendResult.success) {
    return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Failed to send SMS' }) };
  }
  const threadId = msg.thread_id || buildThreadId(msg.from_number, msg.to_number);
  await supabase.from('sms_conversations').insert({
    user_id: userId, workspace_id: msg.workspace_id, direction: 'outbound',
    from_number: msg.to_number, to_number: msg.from_number,
    body: msg.ai_draft, twilio_sid: sendResult.messageId,
    status: 'sent', thread_id: threadId, lead_id: msg.lead_id,
  });
  await supabase.from('sms_conversations')
    .update({ ai_draft_status: 'approved', ai_responded_at: new Date().toISOString() })
    .eq('id', messageId)
    .eq('user_id', userId);
  await deductTokens(userId, TOKEN_COSTS.sms_sent, 'sms_sent', `Approved SMS to ${msg.from_number}`, { message_id: messageId });
  return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ success: true, status: 'approved', sid: sendResult.messageId }) };
}

// ACS primary, Twilio fallback
async function sendSms(from: string, to: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (process.env.ACS_CONNECTION_STRING) return sendAcsSms(from, to, message);
  return sendTwilioSms(from, to, message);
}

async function sendTwilioSms(from: string, to: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!accountSid || !authToken) return { success: false, error: 'No SMS provider configured' };
  try {
    const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: 'POST',
      headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ From: from, To: to, Body: message }).toString(),
    });
    const data = await res.json();
    if (!res.ok) return { success: false, error: data.message || `Twilio error: ${res.status}` };
    return { success: true, messageId: data.sid };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

function buildThreadId(phone1: string, phone2: string): string {
  return [phone1, phone2].sort().join('_');
}

async function getCalcomAvailability(eventSlug: string): Promise<string> {
  const calcomApiKey = process.env.CALCOM_API_KEY;
  if (!calcomApiKey) return '';
  try {
    const now = new Date();
    const endDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const params = new URLSearchParams({ apiKey: calcomApiKey, dateFrom: now.toISOString(), dateTo: endDate.toISOString(), eventTypeSlug: eventSlug });
    const res = await fetch(`https://api.cal.com/v1/availability?${params.toString()}`);
    if (!res.ok) return '';
    const data = await res.json();
    const slots = data.slots || {};
    const slotLines: string[] = [];
    for (const [date, times] of Object.entries(slots)) {
      if (Array.isArray(times) && times.length > 0) {
        const timeStrs = times.slice(0, 4).map((t: any) => new Date(t.time || t).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }));
        slotLines.push(`${date}: ${timeStrs.join(', ')}`);
      }
    }
    return slotLines.length > 0 ? slotLines.slice(0, 5).join('\n') : 'No available slots in the next 7 days.';
  } catch {
    return '';
  }
}
