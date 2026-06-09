import { Handler, schedule } from '@netlify/functions';
import { getSupabase } from './_shared/token-utils';
import { getValidAccessToken, shouldSkipSender, type EmailAccount } from './_shared/email-token-refresh';
import { authorizeRunner } from './_shared/agency-runner-auth';

/**
 * Email Inbox Poller — Cron function that runs every 3 minutes.
 *
 * For each active email_account:
 *   1. Refreshes access token if needed
 *   2. Fetches new messages via Gmail History API or Outlook Delta API
 *   3. Matches senders to leads table (creates new leads if no match)
 *   4. Stores threads + messages in Supabase
 *   5. Triggers AI draft generation for new inbound messages
 *
 * Processes max 20 accounts per invocation to stay within Netlify 10s timeout.
 */

const MAX_ACCOUNTS_PER_RUN = 20;
const MAX_MESSAGES_PER_ACCOUNT = 20;
const TIMEOUT_BUFFER_MS = 8000; // Stop processing at 8s to leave buffer

interface GmailMessage {
  id: string;
  threadId: string;
  payload: {
    headers: Array<{ name: string; value: string }>;
    body?: { data?: string };
    parts?: Array<{ mimeType: string; body?: { data?: string } }>;
  };
  internalDate: string;
  snippet: string;
}

// ─── Gmail Functions ────────────────────────────────────────────────────

async function pollGmailAccount(account: EmailAccount, accessToken: string, supabase: any): Promise<number> {
  let messagesProcessed = 0;

  if (!account.sync_cursor) {
    // First sync: fetch recent inbox messages
    messagesProcessed = await gmailInitialSync(account, accessToken, supabase);
  } else {
    // Incremental sync via history API
    messagesProcessed = await gmailIncrementalSync(account, accessToken, supabase);
  }

  return messagesProcessed;
}

async function gmailInitialSync(account: EmailAccount, accessToken: string, supabase: any): Promise<number> {
  // Fetch recent inbox messages (last 7 days)
  const listRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=is:inbox+newer_than:7d&maxResults=${MAX_MESSAGES_PER_ACCOUNT}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!listRes.ok) {
    console.error(`Gmail list failed for ${account.email_address}:`, await listRes.text());
    return 0;
  }

  const listData = await listRes.json();
  const messageIds: Array<{ id: string; threadId: string }> = listData.messages || [];

  let processed = 0;
  for (const msg of messageIds) {
    const result = await processGmailMessage(account, accessToken, msg.id, supabase);
    if (result) processed++;
  }

  // Update sync cursor to latest historyId
  try {
    const profileRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (profileRes.ok) {
      const profile = await profileRes.json();
      await supabase
        .from('email_accounts')
        .update({ sync_cursor: profile.historyId, last_synced_at: new Date().toISOString() })
        .eq('id', account.id);
    }
  } catch {
    // Non-fatal
  }

  return processed;
}

async function gmailIncrementalSync(account: EmailAccount, accessToken: string, supabase: any): Promise<number> {
  const historyRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/history?startHistoryId=${account.sync_cursor}&historyTypes=messageAdded&labelId=INBOX&maxResults=${MAX_MESSAGES_PER_ACCOUNT}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!historyRes.ok) {
    const errText = await historyRes.text();
    // historyId too old — fall back to initial sync
    if (historyRes.status === 404) {
      console.log(`History expired for ${account.email_address}, doing initial sync`);
      await supabase.from('email_accounts').update({ sync_cursor: null }).eq('id', account.id);
      return gmailInitialSync(account, accessToken, supabase);
    }
    console.error(`Gmail history failed for ${account.email_address}:`, errText);
    return 0;
  }

  const historyData = await historyRes.json();
  const newHistoryId = historyData.historyId;

  // Extract unique message IDs from history records
  const messageIds = new Set<string>();
  for (const record of historyData.history || []) {
    for (const added of record.messagesAdded || []) {
      messageIds.add(added.message.id);
    }
  }

  let processed = 0;
  for (const msgId of messageIds) {
    const result = await processGmailMessage(account, accessToken, msgId, supabase);
    if (result) processed++;
  }

  // Update cursor
  await supabase
    .from('email_accounts')
    .update({ sync_cursor: newHistoryId, last_synced_at: new Date().toISOString() })
    .eq('id', account.id);

  return processed;
}

async function processGmailMessage(account: EmailAccount, accessToken: string, messageId: string, supabase: any): Promise<boolean> {
  // Fetch full message
  const msgRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!msgRes.ok) return false;
  const msg: GmailMessage = await msgRes.json();

  // Extract headers
  const getHeader = (name: string) => msg.payload.headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';
  const from = getHeader('From');
  const to = getHeader('To');
  const subject = getHeader('Subject');
  const date = getHeader('Date');

  // Parse sender email from "Name <email>" format
  const fromEmail = extractEmail(from);
  const fromName = extractName(from);

  // Skip if it's from the account owner (outbound)
  if (fromEmail.toLowerCase() === account.email_address.toLowerCase()) {
    return false;
  }

  // Skip newsletters, noreply, etc.
  if (shouldSkipSender(fromEmail, account.settings.excluded_senders)) {
    return false;
  }

  // Extract body text
  const bodyText = extractGmailBody(msg);

  // Parse to addresses
  const toAddresses = to.split(',').map(t => extractEmail(t.trim())).filter(Boolean);

  return await storeMessage(supabase, account, {
    providerThreadId: msg.threadId,
    providerMessageId: msg.id,
    fromAddress: fromEmail,
    fromName,
    toAddresses,
    subject,
    bodyText,
    receivedAt: new Date(parseInt(msg.internalDate)).toISOString(),
  });
}

function extractGmailBody(msg: GmailMessage): string {
  // Try to find text/plain part
  if (msg.payload.parts) {
    const textPart = msg.payload.parts.find(p => p.mimeType === 'text/plain');
    if (textPart?.body?.data) {
      return Buffer.from(textPart.body.data, 'base64url').toString('utf-8');
    }
    // Fall back to text/html
    const htmlPart = msg.payload.parts.find(p => p.mimeType === 'text/html');
    if (htmlPart?.body?.data) {
      const html = Buffer.from(htmlPart.body.data, 'base64url').toString('utf-8');
      return stripHtml(html);
    }
  }

  // Simple message body
  if (msg.payload.body?.data) {
    return Buffer.from(msg.payload.body.data, 'base64url').toString('utf-8');
  }

  return msg.snippet || '';
}

// ─── Outlook Functions ──────────────────────────────────────────────────

async function pollOutlookAccount(account: EmailAccount, accessToken: string, supabase: any): Promise<number> {
  let url: string;

  if (account.sync_cursor) {
    // Incremental sync via delta link
    url = account.sync_cursor;
  } else {
    // First sync: last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    url = `https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages/delta?$filter=receivedDateTime ge ${sevenDaysAgo}&$top=${MAX_MESSAGES_PER_ACCOUNT}&$select=id,conversationId,subject,from,toRecipients,ccRecipients,body,receivedDateTime`;
  }

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const errText = await res.text();
    // Delta token expired — reset and do initial sync
    if (res.status === 410) {
      console.log(`Delta expired for ${account.email_address}, resetting`);
      await supabase.from('email_accounts').update({ sync_cursor: null }).eq('id', account.id);
      return pollOutlookAccount({ ...account, sync_cursor: null }, accessToken, supabase);
    }
    console.error(`Outlook fetch failed for ${account.email_address}:`, errText);
    return 0;
  }

  const data = await res.json();
  const messages = data.value || [];
  let processed = 0;

  for (const msg of messages) {
    const fromEmail = msg.from?.emailAddress?.address || '';
    const fromName = msg.from?.emailAddress?.name || '';

    // Skip outbound
    if (fromEmail.toLowerCase() === account.email_address.toLowerCase()) continue;

    // Skip newsletters etc.
    if (shouldSkipSender(fromEmail, account.settings.excluded_senders)) continue;

    const toAddresses = (msg.toRecipients || []).map((r: any) => r.emailAddress?.address).filter(Boolean);
    const bodyText = msg.body?.contentType === 'text' ? msg.body.content : stripHtml(msg.body?.content || '');

    const result = await storeMessage(supabase, account, {
      providerThreadId: msg.conversationId || msg.id,
      providerMessageId: msg.id,
      fromAddress: fromEmail,
      fromName,
      toAddresses,
      subject: msg.subject || '',
      bodyText,
      receivedAt: msg.receivedDateTime || new Date().toISOString(),
    });

    if (result) processed++;
  }

  // Store delta link for next sync
  const deltaLink = data['@odata.deltaLink'];
  const nextLink = data['@odata.nextLink'];
  const newCursor = deltaLink || nextLink || account.sync_cursor;

  await supabase
    .from('email_accounts')
    .update({ sync_cursor: newCursor, last_synced_at: new Date().toISOString() })
    .eq('id', account.id);

  return processed;
}

// ─── Shared Functions ───────────────────────────────────────────────────

interface ParsedMessage {
  providerThreadId: string;
  providerMessageId: string;
  fromAddress: string;
  fromName: string;
  toAddresses: string[];
  subject: string;
  bodyText: string;
  receivedAt: string;
}

async function storeMessage(supabase: any, account: EmailAccount, msg: ParsedMessage): Promise<boolean> {
  // Check daily cap
  const { data: dailyCount } = await supabase.rpc('get_email_daily_count', { p_account_id: account.id });
  if (dailyCount && dailyCount >= account.settings.daily_cap) {
    return false;
  }

  // Match sender to leads table
  let leadId: string | null = null;
  const { data: existingLead } = await supabase
    .from('leads')
    .select('id')
    .eq('email', msg.fromAddress)
    .eq('user_id', account.user_id)
    .maybeSingle();

  if (existingLead) {
    leadId = existingLead.id;
  } else {
    // Create new lead
    const nameParts = (msg.fromName || msg.fromAddress.split('@')[0]).split(' ');
    const { data: newLead } = await supabase
      .from('leads')
      .insert({
        user_id: account.user_id,
        first_name: nameParts[0] || msg.fromAddress.split('@')[0],
        last_name: nameParts.slice(1).join(' ') || '',
        email: msg.fromAddress,
        source: 'email',
        status: 'new',
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    leadId = newLead?.id || null;
  }

  // Upsert thread
  const { data: thread, error: threadError } = await supabase
    .from('email_threads')
    .upsert(
      {
        email_account_id: account.id,
        user_id: account.user_id,
        lead_id: leadId,
        provider_thread_id: msg.providerThreadId,
        subject: msg.subject,
        sender_email: msg.fromAddress,
        sender_name: msg.fromName,
        last_message_at: msg.receivedAt,
        status: 'open',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'email_account_id,provider_thread_id' }
    )
    .select('id, message_count')
    .single();

  if (threadError || !thread) {
    console.error('Failed to upsert thread:', threadError?.message);
    return false;
  }

  // Insert message (ON CONFLICT DO NOTHING via unique index)
  const { error: msgError } = await supabase
    .from('email_messages')
    .upsert(
      {
        thread_id: thread.id,
        user_id: account.user_id,
        provider_message_id: msg.providerMessageId,
        direction: 'inbound',
        from_address: msg.fromAddress,
        to_addresses: msg.toAddresses,
        subject: msg.subject,
        body_text: msg.bodyText.substring(0, 50000), // Cap at 50K chars
        received_at: msg.receivedAt,
      },
      { onConflict: 'thread_id,provider_message_id', ignoreDuplicates: true }
    );

  if (msgError) {
    console.error('Failed to insert message:', msgError.message);
    return false;
  }

  // Update thread message count
  await supabase
    .from('email_threads')
    .update({ message_count: (thread.message_count || 0) + 1 })
    .eq('id', thread.id);

  // Trigger AI draft generation (fire-and-forget via internal function call)
  try {
    const baseUrl = process.env.URL || process.env.DEPLOY_URL || 'https://boltcall.org';
    await fetch(`${baseUrl}/.netlify/functions/email-ai-responder`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.CRON_SECRET ? { 'x-cron-secret': process.env.CRON_SECRET } : {}),
      },
      body: JSON.stringify({
        threadId: thread.id,
        userId: account.user_id,
        accountId: account.id,
        action: 'generate',
      }),
    });
  } catch {
    // Non-fatal: AI draft will be generated on next poll or manual trigger
  }

  return true;
}

// ─── Utilities ──────────────────────────────────────────────────────────

function extractEmail(str: string): string {
  const match = str.match(/<([^>]+)>/);
  return match ? match[1] : str.trim();
}

function extractName(str: string): string {
  const match = str.match(/^"?([^"<]+)"?\s*</);
  return match ? match[1].trim() : '';
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ─── Main Handler ───────────────────────────────────────────────────────

const emailPoller: Handler = async (event) => {
  const authz = await authorizeRunner(event);
  if (!authz.ok) {
    return { statusCode: authz.status, body: JSON.stringify({ error: authz.message }) };
  }

  const startTime = Date.now();
  const supabase = getSupabase();

  // Fetch active accounts, oldest-polled first
  const { data: accounts, error } = await supabase
    .from('email_accounts')
    .select('*')
    .eq('is_active', true)
    .order('last_synced_at', { ascending: true, nullsFirst: true })
    .limit(MAX_ACCOUNTS_PER_RUN);

  if (error || !accounts || accounts.length === 0) {
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'No active email accounts to poll', error: error?.message }),
    };
  }

  let totalProcessed = 0;
  let accountsPolled = 0;

  for (const account of accounts as EmailAccount[]) {
    // Check timeout buffer
    if (Date.now() - startTime > TIMEOUT_BUFFER_MS) {
      console.log(`Timeout buffer reached after ${accountsPolled} accounts`);
      break;
    }

    try {
      const accessToken = await getValidAccessToken(account, supabase);
      let processed = 0;

      if (account.provider === 'gmail') {
        processed = await pollGmailAccount(account, accessToken, supabase);
      } else {
        processed = await pollOutlookAccount(account, accessToken, supabase);
      }

      totalProcessed += processed;
      accountsPolled++;
    } catch (err) {
      console.error(`Failed to poll ${account.provider} account ${account.email_address}:`, err);
      // Update last_synced_at to avoid retrying immediately
      await supabase
        .from('email_accounts')
        .update({ last_synced_at: new Date().toISOString() })
        .eq('id', account.id);
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      accountsPolled,
      totalProcessed,
      durationMs: Date.now() - startTime,
    }),
  };
};

// Run every 3 minutes
export const handler = schedule('*/3 * * * *', emailPoller);
