import { Handler } from '@netlify/functions';
import { getServiceSupabase, deductTokens } from './_shared/token-utils';
import { notifyError } from './_shared/notify';
import { getValidAccessToken, type EmailAccount } from './_shared/email-token-refresh';
import { chatCompletion } from './_shared/azure-ai';
import { buildAgentContext } from './_shared/agent-context';
import { requireInternalOrMatchingUser } from './_shared/user-auth';
import { withLegacyHandler } from './_shared/runtime-compat';

/**
 * Email AI Responder — Generates AI draft responses for inbound email threads.
 *
 * POST /.netlify/functions/email-ai-responder
 * {
 *   threadId: string,     // email_threads.id
 *   userId: string,       // Supabase user ID
 *   accountId: string,    // email_accounts.id
 *   action: 'generate' | 'regenerate'
 * }
 *
 * Pipeline:
 *   1. Fetch thread messages (last 5)
 *   2. Fetch business profile + lead info
 *   3. Build Claude prompt with context
 *   4. Generate AI draft
 *   5. Store draft in email_messages
 *   6. If auto_send, send immediately via Brevo
 *   7. Deduct tokens
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

const AI_DRAFT_TOKEN_COST = 8;

const handler: Handler = async (event) => {
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

  const { threadId, userId, accountId, action = 'generate' } = body;
  if (!threadId || !userId) {
    return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'threadId and userId required' }) };
  }

  const auth = await requireInternalOrMatchingUser(event, userId, CORS_HEADERS);
  if (!auth.ok) return auth.response;

  const supabase = getServiceSupabase();

  try {
    // 1. Fetch thread + messages
    const { data: thread } = await supabase
      .from('email_threads')
      .select('*, email_accounts!inner(settings, email_address)')
      .eq('id', threadId)
      .eq('user_id', userId)
      .single();

    if (!thread) {
      return { statusCode: 404, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Thread not found' }) };
    }

    const { data: messages } = await supabase
      .from('email_messages')
      .select('*')
      .eq('thread_id', threadId)
      .eq('user_id', userId)
      .order('received_at', { ascending: true })
      .limit(5);

    if (!messages || messages.length === 0) {
      return { statusCode: 404, headers: CORS_HEADERS, body: JSON.stringify({ error: 'No messages in thread' }) };
    }

    const latestInbound = [...messages].reverse().find(m => m.direction === 'inbound');
    if (!latestInbound) {
      return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'No inbound message to respond to' }) };
    }

    // Check if draft already exists for this message (skip on regenerate)
    if (action !== 'regenerate' && latestInbound.ai_draft_status) {
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({ message: 'Draft already exists', status: latestInbound.ai_draft_status }),
      };
    }

    // 2. Fetch business profile
    const { data: businessProfile } = await supabase
      .from('business_profiles')
      .select('business_name, website_url, main_category, service_areas, opening_hours, languages')
      .eq('user_id', userId)
      .maybeSingle();

    // 3. Fetch lead info
    let leadContext = '';
    if (thread.lead_id) {
      const { data: lead } = await supabase
        .from('leads')
        .select('name, email, phone, source, status, tags')
        .eq('id', thread.lead_id)
        .eq('user_id', userId)
        .single();

      if (lead) {
        leadContext = `\nLead info: ${lead.name} (${lead.email})${lead.phone ? `, phone: ${lead.phone}` : ''}${lead.tags ? `, tags: ${lead.tags}` : ''}`;
      }
    }

    // 4. Get account settings
    const accountSettings = thread.email_accounts?.settings || { response_tone: 'professional' };
    const tone = accountSettings.response_tone || 'professional';

    // 5. Build conversation history
    const conversationHistory = messages
      .map(m => {
        const dir = m.direction === 'inbound' ? `FROM ${m.from_address}` : `SENT BY YOU`;
        const body = (m.body_text || '').substring(0, 4000);
        return `[${dir}] Subject: ${m.subject || '(no subject)'}\n${body}`;
      })
      .join('\n---\n');

    // 6. Build business context
    const biz = businessProfile;
    const bizContext = biz
      ? `Business: ${biz.business_name || 'Unknown'}
Category: ${biz.main_category || 'General'}
Website: ${biz.website_url || 'N/A'}
Hours: ${biz.opening_hours || 'Not specified'}
Service areas: ${Array.isArray(biz.service_areas) ? biz.service_areas.join(', ') : biz.service_areas || 'Not specified'}`
      : 'Business profile not configured.';

    // 7. Pull the user's primary agent + KB so email replies share the same
    //    knowledge AND the same master system_prompt as the Retell voice
    //    agent. Tier-2 search is keyed on the latest inbound email body.
    const inboundBody = (latestInbound.body_text || '').substring(0, 2000);
    const agentCtx = await buildAgentContext(userId, inboundBody);

    // Prefer the agent's canonical system_prompt (mirrored from Retell) when
    // available — same identity / knowledge as voice. Fall back to legacy
    // preamble if not synced yet.
    const basePrompt = agentCtx.systemPrompt
      ? `${agentCtx.systemPrompt}\n\n--- CHANNEL: EMAIL ---\nThis conversation is happening over email, not voice. Apply your usual identity and knowledge but follow the email response guidelines below.`
      : `You are an AI email assistant for a local business. Your job is to draft professional, helpful email responses to inbound customer inquiries.`;

    // 8. Call AI
    const systemPrompt = `${basePrompt}

${bizContext}
${leadContext}
${agentCtx.kbPromptBlock ? `\n${agentCtx.kbPromptBlock}` : ''}
${agentCtx.kbSearchBlock ? `\n${agentCtx.kbSearchBlock}` : ''}

Response guidelines:
- Tone: ${tone}
- Be helpful, accurate, and on-brand
- If you don't know something specific (pricing, exact availability), offer to have a team member follow up or suggest they call/book
- Include a clear call-to-action (book appointment, call, visit website)
- Keep responses concise: 2-4 short paragraphs max
- Never fabricate pricing, availability, or technical details
- Sign off as the business team (not as AI)
- Do NOT include a subject line — only the body text
- Do NOT use markdown formatting — write plain email text`;

    const userPrompt = `Here is the email conversation thread. Write a response to the latest inbound email.

${conversationHistory}

Draft a response to the latest message from ${latestInbound.from_address}.`;

    let draftText: string;
    try {
      draftText = await chatCompletion(systemPrompt, userPrompt, { maxTokens: 1024, heavy: true });
    } catch (aiErr: any) {
      console.error('[email-ai-responder] AI error:', aiErr.message);
      return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ error: 'AI generation failed' }) };
    }

    if (!draftText) {
      return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Empty AI response' }) };
    }

    // Convert plain text to simple HTML
    const draftHtml = draftText
      .split('\n\n')
      .map((p: string) => `<p>${p.replace(/\n/g, '<br>')}</p>`)
      .join('');

    // 8. Store draft
    const draftStatus = accountSettings.auto_send ? 'auto_sent' : 'pending';

    await supabase
      .from('email_messages')
      .update({
        ai_draft_text: draftText,
        ai_draft_html: draftHtml,
        ai_draft_status: draftStatus,
        ai_draft_generated_at: new Date().toISOString(),
      })
      .eq('id', latestInbound.id)
      .eq('user_id', userId);

    // 9. Deduct tokens for AI generation
    await deductTokens(userId, AI_DRAFT_TOKEN_COST, 'email_sent', `AI email draft for thread ${threadId}`, {
      thread_id: threadId,
      message_id: latestInbound.id,
    });

    // 10. If auto_send, send immediately via provider's native API
    if (accountSettings.auto_send) {
      try {
        // Get the email account to send through the client's own inbox
        const { data: emailAccount } = await supabase
          .from('email_accounts')
          .select('*')
          .eq('id', accountId || thread.email_account_id)
          .eq('user_id', userId)
          .single();

        if (emailAccount) {
          const sendResult = await sendViaProvider(
            emailAccount as EmailAccount,
            supabase,
            latestInbound.from_address,
            `Re: ${thread.subject || '(no subject)'}`,
            draftText,
            draftHtml
          );

          if (sendResult.success) {
            // Record the outbound message
            await supabase.from('email_messages').insert({
              thread_id: threadId,
              user_id: userId,
              provider_message_id: sendResult.messageId || `ai_response_${Date.now()}`,
              direction: 'outbound',
              from_address: emailAccount.email_address,
              to_addresses: [latestInbound.from_address],
              subject: `Re: ${thread.subject || '(no subject)'}`,
              body_text: draftText,
              body_html: draftHtml,
              sent_at: new Date().toISOString(),
              sent_via: emailAccount.provider === 'gmail' ? 'gmail_api' : 'outlook_api',
            });

            // Update thread status
            await supabase
              .from('email_threads')
              .update({ status: 'replied', updated_at: new Date().toISOString() })
              .eq('id', threadId)
              .eq('user_id', userId);

            // Deduct send tokens
            await deductTokens(userId, 3, 'email_sent', `Email sent via ${emailAccount.provider} for thread ${threadId}`);
          }
        }
      } catch (sendErr) {
        console.error('Auto-send failed:', sendErr);
        // Revert draft status to pending so user can manually send
        await supabase
          .from('email_messages')
          .update({ ai_draft_status: 'pending' })
          .eq('id', latestInbound.id)
          .eq('user_id', userId);
      }
    }

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: true,
        draftStatus,
        messageId: latestInbound.id,
        threadId,
      }),
    };
  } catch (error) {
    console.error('Email AI responder error:', error);
    await notifyError('email-ai-responder', error as Error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};

// ─── Send email via provider's native API (client's own inbox) ──────────

async function sendViaProvider(
  account: EmailAccount,
  supabase: any,
  to: string,
  subject: string,
  bodyText: string,
  bodyHtml: string
): Promise<{ success: boolean; messageId?: string }> {
  const accessToken = await getValidAccessToken(account, supabase);

  if (account.provider === 'gmail') {
    return sendViaGmail(accessToken, account.email_address, to, subject, bodyText, bodyHtml);
  } else {
    return sendViaOutlook(accessToken, to, subject, bodyHtml);
  }
}

async function sendViaGmail(
  accessToken: string,
  from: string,
  to: string,
  subject: string,
  bodyText: string,
  bodyHtml: string
): Promise<{ success: boolean; messageId?: string }> {
  // Gmail API requires RFC 2822 formatted email, base64url encoded
  const boundary = `boundary_${Date.now()}`;
  const rawEmail = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    '',
    bodyText,
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    '',
    bodyHtml,
    '',
    `--${boundary}--`,
  ].join('\r\n');

  // base64url encode the raw email
  const encoded = Buffer.from(rawEmail).toString('base64url');

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw: encoded }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('Gmail send failed:', err);
    return { success: false };
  }

  const data = await res.json();
  return { success: true, messageId: data.id };
}

async function sendViaOutlook(
  accessToken: string,
  to: string,
  subject: string,
  bodyHtml: string
): Promise<{ success: boolean; messageId?: string }> {
  const res = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: {
        subject,
        body: { contentType: 'HTML', content: bodyHtml },
        toRecipients: [{ emailAddress: { address: to } }],
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('Outlook send failed:', err);
    return { success: false };
  }

  return { success: true, messageId: `outlook_${Date.now()}` };
}

export const testHandler = handler;
export default withLegacyHandler(handler);
