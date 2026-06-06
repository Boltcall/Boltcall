/**
 * Email Service — Frontend API layer for the AI Email Service.
 * Calls email-actions and email-ai-responder Netlify functions.
 */

import { authedFetch } from './authedFetch';

const BASE = '/.netlify/functions';

interface EmailAccount {
  id: string;
  provider: 'gmail' | 'outlook';
  email_address: string;
  is_active: boolean;
  settings: {
    auto_send: boolean;
    response_tone: 'professional' | 'friendly' | 'casual';
    excluded_senders: string[];
    daily_cap: number;
  };
  last_synced_at: string | null;
  created_at: string;
}

interface EmailThread {
  id: string;
  email_account_id: string;
  lead_id: string | null;
  provider_thread_id: string;
  subject: string;
  sender_email: string;
  sender_name: string;
  last_message_at: string;
  message_count: number;
  status: 'open' | 'replied' | 'closed' | 'ignored';
  leads?: { name: string; email: string; phone: string | null };
}

interface EmailMessage {
  id: string;
  thread_id: string;
  provider_message_id: string;
  direction: 'inbound' | 'outbound';
  from_address: string;
  to_addresses: string[];
  subject: string;
  body_text: string;
  body_html: string | null;
  ai_draft_text: string | null;
  ai_draft_html: string | null;
  ai_draft_status: 'pending' | 'approved' | 'rejected' | 'auto_sent' | 'edited' | null;
  ai_draft_generated_at: string | null;
  sent_at: string | null;
  received_at: string | null;
  created_at: string;
}

interface EmailStats {
  totalThreads: number;
  openThreads: number;
  pendingDrafts: number;
  sentToday: number;
  connectedAccounts: number;
}

interface ThreadsResponse {
  threads: EmailThread[];
  total: number;
  page: number;
  totalPages: number;
}

// ─── API Calls ──────────────────────────────────────────────────────────

async function callEmailActions(body: Record<string, unknown>) {
  const res = await authedFetch(`${BASE}/email-actions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`);
  return data;
}

// ─── Account Management ─────────────────────────────────────────────────

export async function getEmailAccounts(userId: string): Promise<EmailAccount[]> {
  const data = await callEmailActions({ action: 'list_accounts', userId });
  return data.accounts;
}

export async function disconnectEmailAccount(userId: string, accountId: string): Promise<void> {
  await callEmailActions({ action: 'disconnect', userId, accountId });
}

export async function updateEmailSettings(
  userId: string,
  accountId: string,
  settings: Partial<EmailAccount['settings']>
): Promise<EmailAccount['settings']> {
  const data = await callEmailActions({ action: 'update_settings', userId, accountId, settings });
  return data.settings;
}

// ─── OAuth Flows ────────────────────────────────────────────────────────

export async function startGmailAuth(userId: string): Promise<void> {
  const res = await authedFetch(`${BASE}/gmail-auth-start?user_id=${userId}`);
  const data = await res.json();
  if (data.url) {
    window.location.href = data.url;
  } else {
    throw new Error('Failed to get Gmail auth URL');
  }
}

export async function startOutlookAuth(userId: string): Promise<void> {
  const res = await authedFetch(`${BASE}/outlook-auth-start?user_id=${userId}`);
  const data = await res.json();
  if (data.url) {
    window.location.href = data.url;
  } else {
    throw new Error('Failed to get Outlook auth URL');
  }
}

// ─── Threads ────────────────────────────────────────────────────────────

export async function getEmailThreads(
  userId: string,
  options?: { accountId?: string; status?: string; page?: number; limit?: number }
): Promise<ThreadsResponse> {
  return callEmailActions({ action: 'get_threads', userId, ...options });
}

export async function getThreadDetail(
  userId: string,
  threadId: string
): Promise<{ thread: EmailThread; messages: EmailMessage[] }> {
  return callEmailActions({ action: 'get_thread_detail', userId, threadId });
}

export async function markThread(userId: string, threadId: string, status: string): Promise<void> {
  await callEmailActions({ action: 'mark_thread', userId, threadId, status });
}

// ─── Drafts ─────────────────────────────────────────────────────────────

export async function getPendingDrafts(userId: string): Promise<EmailMessage[]> {
  const data = await callEmailActions({ action: 'get_pending_drafts', userId });
  return data.drafts;
}

export async function approveDraft(userId: string, messageId: string, threadId: string): Promise<void> {
  await callEmailActions({ action: 'approve_draft', userId, messageId, threadId });
}

export async function rejectDraft(userId: string, messageId: string): Promise<void> {
  await callEmailActions({ action: 'reject_draft', userId, messageId });
}

export async function editAndSend(
  userId: string,
  messageId: string,
  threadId: string,
  editedText: string,
  editedHtml?: string
): Promise<void> {
  await callEmailActions({ action: 'edit_send', userId, messageId, threadId, editedText, editedHtml });
}

// ─── AI Generation ──────────────────────────────────────────────────────

export async function generateDraft(
  userId: string,
  threadId: string,
  accountId: string,
  action: 'generate' | 'regenerate' = 'generate'
): Promise<{ success: boolean; draftStatus: string; messageId: string }> {
  const res = await authedFetch(`${BASE}/email-ai-responder`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ threadId, userId, accountId, action }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'AI generation failed');
  return data;
}

// ─── Stats ──────────────────────────────────────────────────────────────

export async function getEmailStats(userId: string): Promise<EmailStats> {
  const data = await callEmailActions({ action: 'get_stats', userId });
  return data.stats;
}

// ─── Types Export ───────────────────────────────────────────────────────

export type { EmailAccount, EmailThread, EmailMessage, EmailStats, ThreadsResponse };
