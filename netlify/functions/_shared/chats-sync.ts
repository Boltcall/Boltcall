import type { SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

export interface AppendChatMessageInput {
  userId: string;
  workspaceId: string | null;
  /** Stable per-thread identifier (e.g. the SMS thread_id or an email_threads.id). */
  sessionId: string;
  /** Maps to `chats.source` — drives channel inference in the unified inbox. */
  source: 'phone' | 'email' | 'website' | 'social' | 'app';
  leadId?: string | null;
  customerName?: string | null;
  primaryPhone?: string | null;
  customerEmail?: string | null;
  sender: 'customer' | 'agent' | 'system';
  content: string;
}

/**
 * Dual-write a message into the `chats` table so the unified inbox
 * (V2MessagesPage / saas-v2-messages) reflects live SMS/email activity.
 * Upserts by `chat_session_id` — append to chat_history if the thread
 * already exists, otherwise create it.
 */
export async function appendChatMessage(
  supabase: SupabaseClient,
  input: AppendChatMessageInput,
): Promise<void> {
  const { userId, workspaceId, sessionId, source, leadId, customerName, primaryPhone, customerEmail, sender, content } = input;
  if (!content) return;

  const timestamp = new Date().toISOString();
  const message = {
    id: randomUUID(),
    timestamp,
    sender,
    message_type: 'text' as const,
    content,
  };

  const { data: existing } = await supabase
    .from('chats')
    .select('id, chat_history, message_count')
    .eq('user_id', userId)
    .eq('chat_session_id', sessionId)
    .maybeSingle();

  if (existing) {
    const history = [...(existing.chat_history || []), message];
    await supabase
      .from('chats')
      .update({
        chat_history: history,
        message_count: history.length,
        last_message: content,
        last_message_at: timestamp,
        last_activity_at: timestamp,
        status: 'active',
        ...(leadId ? { lead_id: leadId } : {}),
      })
      .eq('id', existing.id);
    return;
  }

  await supabase.from('chats').insert({
    user_id: userId,
    workspace_id: workspaceId,
    lead_id: leadId || null,
    chat_session_id: sessionId,
    primary_phone: primaryPhone || '',
    customer_name: customerName || null,
    customer_email: customerEmail || null,
    chat_type: 'inbound',
    source,
    status: 'active',
    started_at: timestamp,
    last_activity_at: timestamp,
    last_message_at: timestamp,
    last_message: content,
    duration_seconds: 0,
    chat_history: [message],
    message_count: 1,
    follow_up_required: false,
  });
}
