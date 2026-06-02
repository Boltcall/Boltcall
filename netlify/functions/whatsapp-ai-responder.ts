import { Handler } from '@netlify/functions';
import { getSupabase, deductTokens, TOKEN_COSTS } from './_shared/token-utils';
import { notifyError, notifyInfo } from './_shared/notify';
import { chatCompletion } from './_shared/azure-ai';
import { buildAgentContext } from './_shared/agent-context';

/**
 * WhatsApp AI Responder — Generates AI replies for inbound WhatsApp messages.
 *
 * Triggered by whatsapp-webhook after storing the message, OR
 * called directly from the dashboard to generate/regenerate drafts.
 *
 * POST /.netlify/functions/whatsapp-ai-responder
 * {
 *   messageId: string,
 *   userId: string,
 *   action?: 'generate' | 'regenerate' | 'approve' | 'reject'
 * }
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

function buildThreadId(phone1: string, phone2: string): string {
  const sorted = [phone1, phone2].sort();
  return `${sorted[0]}_${sorted[1]}`;
}

function isWithinBusinessHours(settings: any): boolean {
  if (!settings.business_hours_only) return true;
  try {
    const tz = settings.business_timezone || 'UTC';
    const now = new Date();
    const localeStr = now.toLocaleString('en-US', { timeZone: tz, hour12: false, hour: '2-digit', minute: '2-digit' });
    const [hh, mm] = localeStr.split(':').map((n) => parseInt(n, 10));
    const nowMinutes = hh * 60 + mm;
    const [sH, sM] = (settings.business_hours_start || '09:00').split(':').map((n: string) => parseInt(n, 10));
    const [eH, eM] = (settings.business_hours_end || '18:00').split(':').map((n: string) => parseInt(n, 10));
    const startMinutes = sH * 60 + sM;
    const endMinutes = eH * 60 + eM;
    return nowMinutes >= startMinutes && nowMinutes < endMinutes;
  } catch {
    return true;
  }
}

async function callWhatsappSend(userId: string, to: string, body: string): Promise<{ success: boolean; wa_message_id?: string; error?: string }> {
  try {
    const sendUrl = (process.env.URL || '') + '/.netlify/functions/whatsapp-send';
    const res = await fetch(sendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': process.env.INTERNAL_WEBHOOK_SECRET || '',
      },
      body: JSON.stringify({ userId, to, body }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { success: false, error: data?.error || `HTTP ${res.status}` };
    return { success: true, wa_message_id: data?.wa_message_id };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

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

  const supabase = getSupabase();

  // Verify auth: internal webhook calls bypass JWT using a shared secret header;
  // all other callers must supply a valid Supabase Bearer JWT.
  const internalSecret = event.headers['x-internal-secret'];
  const isInternalCall = !!(process.env.INTERNAL_WEBHOOK_SECRET && internalSecret === process.env.INTERNAL_WEBHOOK_SECRET);

  if (!isInternalCall) {
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
  }

  try {
    // ─── Reject action ─────────────────────────────────────────────
    if (action === 'reject') {
      await supabase
        .from('whatsapp_conversations')
        .update({ ai_draft_status: 'rejected' })
        .eq('id', messageId);
      return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ success: true, status: 'rejected' }) };
    }

    // ─── Approve action ────────────────────────────────────────────
    if (action === 'approve') {
      const { data: msg } = await supabase
        .from('whatsapp_conversations')
        .select('*')
        .eq('id', messageId)
        .single();

      if (!msg || !msg.ai_draft) {
        return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'No draft to approve' }) };
      }

      const sendResult = await callWhatsappSend(userId, msg.from_number, msg.ai_draft);
      if (!sendResult.success) {
        return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Failed to send WhatsApp message', detail: sendResult.error }) };
      }

      await supabase
        .from('whatsapp_conversations')
        .update({ ai_draft_status: 'approved' })
        .eq('id', messageId);

      return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ success: true, status: 'approved', wa_message_id: sendResult.wa_message_id }) };
    }

    // ─── Generate / Regenerate ─────────────────────────────────────

    // 1. Fetch the inbound message
    const { data: message, error: msgErr } = await supabase
      .from('whatsapp_conversations')
      .select('*')
      .eq('id', messageId)
      .single();

    if (msgErr || !message) {
      return { statusCode: 404, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Message not found' }) };
    }

    if (action !== 'regenerate' && message.ai_draft_status) {
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({ message: 'Draft already exists', status: message.ai_draft_status }),
      };
    }

    const threadId = message.thread_id || buildThreadId(message.from_number, message.to_number);

    // 2. Load thread history (last 10 messages same thread_id)
    const { data: history } = await supabase
      .from('whatsapp_conversations')
      .select('direction, from_number, body, created_at, qualification')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true })
      .limit(10);

    // 3. Load WhatsApp settings
    const { data: settings } = await supabase
      .from('whatsapp_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    const waSettings = settings || {
      auto_reply_enabled: false,
      response_tone: 'professional',
      qualification_enabled: true,
      booking_enabled: true,
      business_hours_only: false,
      max_ai_messages_per_conversation: 5,
    };

    // 4. Business hours check — if outside hours, optionally send out-of-hours reply
    if (!isWithinBusinessHours(waSettings)) {
      const outOfHoursMsg = waSettings.out_of_hours_message || "Thanks for reaching out! We're currently closed but will reply soon.";
      await supabase
        .from('whatsapp_conversations')
        .update({
          ai_draft: outOfHoursMsg,
          ai_draft_status: waSettings.auto_reply_enabled ? 'auto_sent' : 'pending',
          thread_id: threadId,
        })
        .eq('id', messageId);

      if (waSettings.auto_reply_enabled) {
        await callWhatsappSend(userId, message.from_number, outOfHoursMsg);
      }

      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({ success: true, outOfHours: true, reply: outOfHoursMsg }),
      };
    }

    // 5. Check max AI messages limit
    const aiMessageCount = (history || []).filter((h) => h.direction === 'outbound' && h.qualification).length;
    if (aiMessageCount >= (waSettings.max_ai_messages_per_conversation || 5)) {
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({ message: 'Max AI messages reached for this conversation', skipped: true }),
      };
    }

    // 6. Load business profile
    const { data: businessProfile } = await supabase
      .from('business_profiles')
      .select('business_name, website_url, main_category, service_areas, opening_hours, languages')
      .eq('user_id', userId)
      .maybeSingle();

    const biz = businessProfile;
    const bizContext = biz
      ? `Business: ${biz.business_name || 'Unknown'}
Category: ${biz.main_category || 'General'}
Website: ${biz.website_url || 'N/A'}
Hours: ${biz.opening_hours || 'Not specified'}
Service areas: ${Array.isArray(biz.service_areas) ? biz.service_areas.join(', ') : biz.service_areas || 'Not specified'}`
      : 'Business profile not configured.';

    const conversationText = (history || [])
      .map((h) => {
        const dir = h.direction === 'inbound' ? 'CUSTOMER' : 'BUSINESS';
        return `[${dir}] ${h.body}`;
      })
      .join('\n');

    // Pull the user's primary agent + KB so WhatsApp replies share the same
    // knowledge AND the same master system_prompt as the Retell voice agent.
    // Tier-2 search runs against the inbound WhatsApp body.
    const agentCtx = await buildAgentContext(userId, message.body);

    // Prefer the agent's canonical system_prompt (mirrored from Retell) when
    // available — same identity / knowledge as voice. Fall back to legacy
    // preamble if not synced yet.
    const basePrompt = agentCtx.systemPrompt
      ? `${agentCtx.systemPrompt}\n\n--- CHANNEL: WHATSAPP ---\nThis conversation is happening over WhatsApp, not voice. Apply your usual identity and knowledge but follow the WhatsApp response rules below.`
      : `You are an AI WhatsApp assistant for a local service business. You handle inbound WhatsApp messages: answering questions, qualifying leads, and booking appointments.`;

    // 7. Build prompt
    const systemPrompt = `${basePrompt}

${bizContext}
${agentCtx.kbPromptBlock ? `\n${agentCtx.kbPromptBlock}` : ''}
${agentCtx.kbSearchBlock ? `\n${agentCtx.kbSearchBlock}` : ''}

RESPONSE RULES:
- Tone: ${waSettings.response_tone}
- LANGUAGE: Reply in the SAME language the customer wrote in their latest message. If they wrote in English, reply in English. If in Spanish, Spanish. If in Hebrew, Hebrew. Do NOT switch to the business's country language just because the business is based there.
- Keep responses short and conversational — WhatsApp messaging style. 1-3 sentences max.
- Be warm, helpful, and direct
- Never fabricate pricing, availability, or details you don't know
- If unsure, say "Let me check and get back to you" or direct them to the website/phone
- Sign as the business (never mention AI)
- Plain text — no markdown
${waSettings.booking_enabled ? '- If the customer wants to book, offer to schedule a time' : '- Do NOT offer to book appointments'}

RESPOND IN THIS EXACT JSON FORMAT:
{
  "reply": "Your WhatsApp response text here",
  "intent": "booking|inquiry|complaint|followup|spam|other",
  "score": 0-100,
  "qualification_reason": "Brief reason for score",
  "suggested_action": "book|respond|escalate|ignore"
}`;

    const userPrompt = `WhatsApp conversation so far:
${conversationText}

Generate a reply to the latest customer message and qualify the lead.`;

    // 8. Call AI
    let rawResponse: string;
    try {
      rawResponse = await chatCompletion(systemPrompt, userPrompt, { maxTokens: 512 });
    } catch (aiErr: any) {
      const detail = aiErr?.message || String(aiErr);
      console.error('[whatsapp-ai-responder] AI error:', detail);
      return {
        statusCode: 500,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'AI generation failed', detail }),
      };
    }

    // 9. Parse JSON from Claude response
    let parsed: any;
    try {
      const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : rawResponse);
    } catch {
      parsed = {
        reply: rawResponse.replace(/```[\s\S]*?```/g, '').trim(),
        intent: 'other',
        score: 50,
        qualification_reason: 'Could not parse AI response',
        suggested_action: 'respond',
      };
    }

    const replyText = parsed.reply || '';
    const qualification = {
      intent: parsed.intent || 'other',
      score: parsed.score ?? 50,
      reason: parsed.qualification_reason || 'Unknown',
      suggested_action: parsed.suggested_action || 'respond',
    };

    // 10. Store AI draft + qualification
    const draftStatus = waSettings.auto_reply_enabled ? 'auto_sent' : 'pending';
    await supabase
      .from('whatsapp_conversations')
      .update({
        ai_draft: replyText,
        ai_draft_status: draftStatus,
        qualification,
        thread_id: threadId,
      })
      .eq('id', messageId);

    // 11. If auto-reply, send immediately
    if (waSettings.auto_reply_enabled && replyText) {
      const sendResult = await callWhatsappSend(userId, message.from_number, replyText);
      if (!sendResult.success) {
        console.error('[whatsapp-ai-responder] Auto-send failed:', sendResult.error);
        await supabase
          .from('whatsapp_conversations')
          .update({ ai_draft_status: 'pending' })
          .eq('id', messageId);
      } else {
        await notifyInfo(`WhatsApp auto-reply sent to ${message.from_number} — intent: ${qualification.intent} (${qualification.score}/100)`);
      }
    } else if (qualification.intent === 'booking' || qualification.score >= 70) {
      await notifyInfo(`Hot WhatsApp lead — draft ready. From: ${message.from_number} | Intent: ${qualification.intent} (${qualification.score}/100)`);
    }

    // 12. Deduct tokens for AI draft generation
    await deductTokens(userId, TOKEN_COSTS.whatsapp_ai_draft, 'whatsapp_ai_draft', 'WhatsApp AI draft', { messageId }, supabase);

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: true,
        draftStatus,
        reply: replyText,
        qualification,
        messageId,
        threadId,
      }),
    };
  } catch (error) {
    console.error('[whatsapp-ai-responder] Error:', error);
    await notifyError('whatsapp-ai-responder', error as Error, { messageId, userId });
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
