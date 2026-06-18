import { Handler } from '@netlify/functions';
import { getServiceSupabase, deductTokens } from './_shared/token-utils';
import { requireMatchingUser } from './_shared/user-auth';
import { getValidAccessToken, type EmailAccount } from './_shared/email-token-refresh';
import { withLegacyHandler } from './_shared/runtime-compat';

/**
 * Email Actions — CRUD endpoint for the email service dashboard.
 *
 * POST /.netlify/functions/email-actions
 * { action: string, ...params }
 *
 * Actions:
 *   - list_accounts       — Get connected email accounts
 *   - disconnect          — Disconnect an email account
 *   - update_settings     — Update account settings (auto_send, tone, excluded_senders)
 *   - get_threads         — Get email threads with pagination + filters
 *   - get_thread_detail   — Get a single thread with all messages
 *   - get_pending_drafts  — Get messages with pending AI drafts
 *   - approve_draft       — Approve and send an AI draft
 *   - reject_draft        — Reject an AI draft
 *   - edit_send           — Edit a draft and send
 *   - mark_thread         — Mark thread as closed/ignored/open
 *   - get_stats           — Get email service stats
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

function json(statusCode: number, body: any) {
  return { statusCode, headers: CORS_HEADERS, body: JSON.stringify(body) };
}

const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS_HEADERS, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed' });
  }

  let body: any;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return json(400, { error: 'Invalid JSON' });
  }

  const { action, userId } = body;
  if (!action || !userId) {
    return json(400, { error: 'action and userId required' });
  }

  const auth = await requireMatchingUser(event, userId, CORS_HEADERS);
  if (!auth.ok) return auth.response;

  const supabase = getServiceSupabase();

  try {
    switch (action) {
      case 'list_accounts':
        return await listAccounts(supabase, userId);

      case 'disconnect':
        return await disconnectAccount(supabase, userId, body.accountId);

      case 'update_settings':
        return await updateSettings(supabase, userId, body.accountId, body.settings);

      case 'get_threads':
        return await getThreads(supabase, userId, body);

      case 'get_thread_detail':
        return await getThreadDetail(supabase, userId, body.threadId);

      case 'get_pending_drafts':
        return await getPendingDrafts(supabase, userId);

      case 'approve_draft':
        return await approveDraft(supabase, userId, body);

      case 'reject_draft':
        return await rejectDraft(supabase, userId, body.messageId);

      case 'edit_send':
        return await editAndSend(supabase, userId, body);

      case 'mark_thread':
        return await markThread(supabase, userId, body.threadId, body.status);

      case 'get_stats':
        return await getStats(supabase, userId);

      default:
        return json(400, { error: `Unknown action: ${action}` });
    }
  } catch (error) {
    console.error(`Email action '${action}' failed:`, error);
    return json(500, { error: 'Internal server error' });
  }
};

// ─── Action Handlers ────────────────────────────────────────────────────

async function listAccounts(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from('email_accounts')
    .select('id, provider, email_address, is_active, settings, last_synced_at, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) return json(500, { error: error.message });
  return json(200, { accounts: data || [] });
}

async function disconnectAccount(supabase: any, userId: string, accountId: string) {
  if (!accountId) return json(400, { error: 'accountId required' });

  const { error } = await supabase
    .from('email_accounts')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', accountId)
    .eq('user_id', userId);

  if (error) return json(500, { error: error.message });
  return json(200, { success: true });
}

async function updateSettings(supabase: any, userId: string, accountId: string, settings: any) {
  if (!accountId || !settings) return json(400, { error: 'accountId and settings required' });

  // Merge with existing settings
  const { data: account } = await supabase
    .from('email_accounts')
    .select('settings')
    .eq('id', accountId)
    .eq('user_id', userId)
    .single();

  if (!account) return json(404, { error: 'Account not found' });

  const merged = { ...account.settings, ...settings };

  const { error } = await supabase
    .from('email_accounts')
    .update({ settings: merged, updated_at: new Date().toISOString() })
    .eq('id', accountId)
    .eq('user_id', userId);

  if (error) return json(500, { error: error.message });
  return json(200, { success: true, settings: merged });
}

async function getThreads(supabase: any, userId: string, body: any) {
  const { accountId, status, page = 1, limit = 20 } = body;
  const offset = (page - 1) * limit;

  let query = supabase
    .from('email_threads')
    .select('*, leads(first_name, last_name, email, phone)', { count: 'exact' })
    .eq('user_id', userId)
    .order('last_message_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (accountId) query = query.eq('email_account_id', accountId);
  if (status) query = query.eq('status', status);

  const { data, error, count } = await query;
  if (error) return json(500, { error: error.message });

  return json(200, {
    threads: data || [],
    total: count || 0,
    page,
    totalPages: Math.ceil((count || 0) / limit),
  });
}

async function getThreadDetail(supabase: any, userId: string, threadId: string) {
  if (!threadId) return json(400, { error: 'threadId required' });

  const { data: thread } = await supabase
    .from('email_threads')
    .select('*, email_accounts(email_address, provider, settings), leads(first_name, last_name, email, phone)')
    .eq('id', threadId)
    .eq('user_id', userId)
    .single();

  if (!thread) return json(404, { error: 'Thread not found' });

  const { data: messages } = await supabase
    .from('email_messages')
    .select('*')
    .eq('thread_id', threadId)
    .order('received_at', { ascending: true });

  return json(200, { thread, messages: messages || [] });
}

async function getPendingDrafts(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from('email_messages')
    .select('*, email_threads!inner(subject, sender_email, sender_name, email_account_id)')
    .eq('user_id', userId)
    .eq('ai_draft_status', 'pending')
    .order('ai_draft_generated_at', { ascending: false });

  if (error) return json(500, { error: error.message });
  return json(200, { drafts: data || [] });
}

async function approveDraft(supabase: any, userId: string, body: any) {
  const { messageId, threadId } = body;
  if (!messageId) return json(400, { error: 'messageId required' });

  // Get the draft with thread + account info
  const { data: message } = await supabase
    .from('email_messages')
    .select('*, email_threads!inner(subject, email_account_id, email_accounts!inner(*))')
    .eq('id', messageId)
    .eq('user_id', userId)
    .single();

  if (!message || message.ai_draft_status !== 'pending') {
    return json(400, { error: 'No pending draft found' });
  }

  const account = message.email_threads?.email_accounts as EmailAccount;
  if (!account) return json(500, { error: 'Email account not found' });

  // Send via provider's native API (client's own inbox)
  const sendResult = await sendViaProvider(account, supabase, message.from_address,
    `Re: ${message.email_threads?.subject || '(no subject)'}`,
    message.ai_draft_text || '', message.ai_draft_html || '');

  if (!sendResult.success) {
    return json(500, { error: 'Failed to send email via provider' });
  }

  // Update draft status
  await supabase
    .from('email_messages')
    .update({ ai_draft_status: 'approved' })
    .eq('id', messageId)
    .eq('user_id', userId);

  // Insert outbound message record
  await supabase.from('email_messages').insert({
    thread_id: message.thread_id,
    user_id: userId,
    provider_message_id: sendResult.messageId || `approved_${Date.now()}`,
    direction: 'outbound',
    from_address: account.email_address,
    to_addresses: [message.from_address],
    subject: `Re: ${message.email_threads?.subject || '(no subject)'}`,
    body_text: message.ai_draft_text,
    body_html: message.ai_draft_html,
    sent_at: new Date().toISOString(),
    sent_via: account.provider === 'gmail' ? 'gmail_api' : 'outlook_api',
  });

  // Deduct send tokens
  await deductTokens(userId, 3, 'email_sent', `Email approved & sent via ${account.provider}`);

  // Update thread status
  const tid = threadId || message.thread_id;
  await supabase
    .from('email_threads')
    .update({ status: 'replied', updated_at: new Date().toISOString() })
    .eq('id', tid)
    .eq('user_id', userId);

  return json(200, { success: true });
}

async function rejectDraft(supabase: any, userId: string, messageId: string) {
  if (!messageId) return json(400, { error: 'messageId required' });

  const { error } = await supabase
    .from('email_messages')
    .update({ ai_draft_status: 'rejected' })
    .eq('id', messageId)
    .eq('user_id', userId);

  if (error) return json(500, { error: error.message });
  return json(200, { success: true });
}

async function editAndSend(supabase: any, userId: string, body: any) {
  const { messageId, threadId, editedText, editedHtml } = body;
  if (!messageId || (!editedText && !editedHtml)) {
    return json(400, { error: 'messageId and editedText/editedHtml required' });
  }

  // Get the original message with account info
  const { data: message } = await supabase
    .from('email_messages')
    .select('*, email_threads!inner(subject, email_account_id, email_accounts!inner(*))')
    .eq('id', messageId)
    .eq('user_id', userId)
    .single();

  if (!message) return json(404, { error: 'Message not found' });

  const account = message.email_threads?.email_accounts as EmailAccount;
  if (!account) return json(500, { error: 'Email account not found' });

  const finalText = editedText || message.ai_draft_text;
  const finalHtml = editedHtml || editedText?.split('\n\n').map((p: string) => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('') || message.ai_draft_html;

  // Send via provider's native API (client's own inbox)
  const sendResult = await sendViaProvider(account, supabase, message.from_address,
    `Re: ${message.email_threads?.subject || '(no subject)'}`, finalText, finalHtml);

  if (!sendResult.success) {
    return json(500, { error: 'Failed to send email via provider' });
  }

  // Update draft status
  await supabase
    .from('email_messages')
    .update({ ai_draft_status: 'edited' })
    .eq('id', messageId)
    .eq('user_id', userId);

  // Insert outbound message
  await supabase.from('email_messages').insert({
    thread_id: message.thread_id,
    user_id: userId,
    provider_message_id: sendResult.messageId || `edited_${Date.now()}`,
    direction: 'outbound',
    from_address: account.email_address,
    to_addresses: [message.from_address],
    subject: `Re: ${message.email_threads?.subject || '(no subject)'}`,
    body_text: finalText,
    body_html: finalHtml,
    sent_at: new Date().toISOString(),
    sent_via: account.provider === 'gmail' ? 'gmail_api' : 'outlook_api',
  });

  // Update thread status
  const tid = threadId || message.thread_id;
  await supabase
    .from('email_threads')
    .update({ status: 'replied', updated_at: new Date().toISOString() })
    .eq('id', tid)
    .eq('user_id', userId);

  return json(200, { success: true });
}

async function markThread(supabase: any, userId: string, threadId: string, status: string) {
  if (!threadId || !status) return json(400, { error: 'threadId and status required' });

  const validStatuses = ['open', 'replied', 'closed', 'ignored'];
  if (!validStatuses.includes(status)) {
    return json(400, { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
  }

  const { error } = await supabase
    .from('email_threads')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', threadId)
    .eq('user_id', userId);

  if (error) return json(500, { error: error.message });
  return json(200, { success: true });
}

async function getStats(supabase: any, userId: string) {
  // Get counts
  const { count: totalThreads } = await supabase
    .from('email_threads')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  const { count: openThreads } = await supabase
    .from('email_threads')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'open');

  const { count: pendingDrafts } = await supabase
    .from('email_messages')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('ai_draft_status', 'pending');

  const { count: sentToday } = await supabase
    .from('email_messages')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('direction', 'outbound')
    .gte('sent_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString());

  const { count: connectedAccounts } = await supabase
    .from('email_accounts')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_active', true);

  return json(200, {
    stats: {
      totalThreads: totalThreads || 0,
      openThreads: openThreads || 0,
      pendingDrafts: pendingDrafts || 0,
      sentToday: sentToday || 0,
      connectedAccounts: connectedAccounts || 0,
    },
  });
}

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
    // Gmail API: send as RFC 2822 base64url-encoded message
    const boundary = `boundary_${Date.now()}`;
    const rawEmail = [
      `From: ${account.email_address}`,
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

    const encoded = Buffer.from(rawEmail).toString('base64url');
    const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw: encoded }),
    });

    if (!res.ok) {
      console.error('Gmail send failed:', await res.text());
      return { success: false };
    }
    const data = await res.json();
    return { success: true, messageId: data.id };

  } else {
    // Outlook: Microsoft Graph sendMail
    const res = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: {
          subject,
          body: { contentType: 'HTML', content: bodyHtml },
          toRecipients: [{ emailAddress: { address: to } }],
        },
      }),
    });

    if (!res.ok) {
      console.error('Outlook send failed:', await res.text());
      return { success: false };
    }
    return { success: true, messageId: `outlook_${Date.now()}` };
  }
}

export const testHandler = handler;
export default withLegacyHandler(handler);
