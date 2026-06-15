/**
 * Build a unified agent + KB context for any inbound channel (SMS, email, WhatsApp).
 *
 * Pulls the user's primary active agent and its linked knowledge base so all
 * channels share the same business knowledge — instead of each responder
 * inventing its own system prompt from `business_profiles` alone.
 *
 * Use:
 *   const ctx = await buildAgentContext(userId, inboundMessage);
 *   const systemPrompt = `${ctx.kbPromptBlock}\n\n${ctx.kbSearchBlock}\n\n${channelRules}`;
 *
 * Returns empty strings (not null) when nothing applies, so callers can always
 * concatenate without conditional logic.
 */

import { getSupabase } from './token-utils';
import { generateEmbedding } from './azure-ai';

export interface AgentContext {
  /** Active agent linked to this user, or null if no agent is configured. */
  agent: { id: string; name: string; agent_type: string; retell_agent_id: string | null } | null;
  /** Canonical system prompt mirrored from Retell. Empty string if not synced yet. */
  systemPrompt: string;
  /** Tier-1 KB ("prompt"): always-injected business knowledge wrapped in <knowledge_base>. Empty if none. */
  kbPromptBlock: string;
  /** Tier-2 KB ("search"): top vector matches against the inbound message, formatted as bullets. Empty if no message or no matches. */
  kbSearchBlock: string;
}

const EMPTY: AgentContext = {
  agent: null,
  systemPrompt: '',
  kbPromptBlock: '',
  kbSearchBlock: '',
};

/**
 * Build context for a user. Pass `inboundMessage` to enable Tier-2 vector search.
 * Failures (DB error, embedding error) degrade gracefully to partial context — never throws.
 */
export async function buildAgentContext(
  userId: string,
  inboundMessage?: string,
  preferredType?: 'inbound' | 'outbound' | 'speed_to_lead',
): Promise<AgentContext> {
  if (!userId) return EMPTY;

  const supabase = getSupabase();

  // 1. Find the user's primary active agent. When a preferred type is given
  //    (e.g. WhatsApp prefers inbound because messages are customer-initiated),
  //    pick that type first; fall back to most-recently-updated active agent.
  //    Without preference, "most recently updated wins" — but that can pick a
  //    Hebrew-flavoured outbound prompt for what should be an English inbound
  //    reply, so callers should be explicit when they know the channel.
  const PREFERRED_TYPE_MAP: Record<string, string[]> = {
    inbound: ['inbound'],
    outbound: ['speed_to_lead', 'outbound_speed_to_lead', 'outbound'],
    speed_to_lead: ['speed_to_lead', 'outbound_speed_to_lead'],
  };
  const typeFilter = preferredType ? PREFERRED_TYPE_MAP[preferredType] : null;

  let agent: { id?: string; name?: string; agent_type?: string; retell_agent_id?: string; system_prompt?: string } | null = null;
  if (typeFilter) {
    const { data } = await supabase
      .from('agents')
      .select('id, name, agent_type, retell_agent_id, system_prompt')
      .eq('user_id', userId)
      .eq('status', 'active')
      .in('agent_type', typeFilter)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    agent = data;
  }
  if (!agent?.id) {
    const { data } = await supabase
      .from('agents')
      .select('id, name, agent_type, retell_agent_id, system_prompt')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    agent = data;
  }

  if (!agent?.id) {
    return EMPTY;
  }

  // 2. Find KB folders linked to this agent.
  const { data: links } = await supabase
    .from('agent_kb_folders')
    .select('kb_folder_id')
    .eq('agent_id', agent.id);

  const folderIds = (links || []).map((l: any) => l.kb_folder_id);

  // 3. Fetch Tier-1 (prompt) KB entries scoped to those folders. If no folders
  //    are linked yet, fall back to ALL of the user's tier='prompt' entries.
  let promptQuery = supabase
    .from('knowledge_base')
    .select('title, content, category')
    .eq('user_id', userId)
    .eq('tier', 'prompt')
    .eq('status', 'active');

  if (folderIds.length > 0) {
    promptQuery = promptQuery.in('kb_folder_id', folderIds);
  }

  const { data: promptEntries } = await promptQuery
    .order('category', { ascending: true })
    .limit(50);

  const kbPromptBlock = formatPromptBlock(promptEntries || []);

  // 4. Tier-2 (search) — vector similarity against inbound message.
  let kbSearchBlock = '';
  if (inboundMessage && inboundMessage.trim().length >= 3) {
    try {
      const embedding = await generateEmbedding(inboundMessage);
      const { data: matches } = await supabase.rpc('search_kb', {
        query_embedding: JSON.stringify(embedding),
        match_user_id: userId,
        match_count: 3,
        match_threshold: 0.55,
      });
      if (Array.isArray(matches) && matches.length > 0) {
        kbSearchBlock = formatSearchBlock(matches);
      }
    } catch (err) {
      // Silent degrade — embedding or RPC failure shouldn't block the reply.
      console.warn('[agent-context] tier-2 KB search failed:', err instanceof Error ? err.message : err);
    }
  }

  return {
    agent: {
      id: agent.id ?? '',
      name: agent.name ?? '',
      agent_type: agent.agent_type ?? '',
      retell_agent_id: agent.retell_agent_id ?? null,
    },
    systemPrompt: agent.system_prompt || '',
    kbPromptBlock,
    kbSearchBlock,
  };
}

function formatPromptBlock(entries: Array<{ title: string; content: string; category: string }>): string {
  if (entries.length === 0) return '';
  const docs = entries
    .map((e, i) => {
      const safeTitle = (e.title || '').replace(/"/g, '&quot;');
      // If the user already wrote XML in content, pass through; else wrap it.
      if ((e.content || '').includes('<document')) return e.content;
      return `<document index="${i + 1}" title="${safeTitle}" category="${e.category || 'general'}">
Q: ${e.title}
A: ${e.content}
</document>`;
    })
    .join('\n');
  return `<knowledge_base>\n${docs}\n</knowledge_base>`;
}

function formatSearchBlock(matches: Array<{ title: string; content: string; similarity: number }>): string {
  const lines = matches.map((m) => `- **${m.title}**: ${m.content}`);
  return `RELEVANT BUSINESS INFO (matched to this message):\n${lines.join('\n')}`;
}
