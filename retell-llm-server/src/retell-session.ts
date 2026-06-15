import { createClient, SupabaseClient } from '@supabase/supabase-js';
import WebSocket from 'ws';

export interface SessionData {
  systemPrompt: string;
  beginMessage: string;
}

// callId → session data, cleared on WebSocket close
const cache = new Map<string, SessionData>();

let supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
  if (!supabase) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;
    if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
    supabase = createClient(url, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      realtime: {
        transport: WebSocket as any,
      },
    });
  }
  return supabase;
}

const FALLBACK: SessionData = {
  systemPrompt:
    'You are a professional AI receptionist. Help callers with scheduling, questions, and information about the business. Be concise, friendly, and helpful. Keep responses short — under 2 sentences when possible.',
  beginMessage: "Hi, thanks for calling! How can I help you today?",
};

export async function loadSession(callId: string, agentId: string): Promise<SessionData> {
  const cached = cache.get(callId);
  if (cached) return cached;

  try {
    const sb = getSupabase();
    const { data, error } = await sb
      .from('agents')
      .select('system_prompt, begin_message')
      .eq('retell_agent_id', agentId)
      .single();

    if (error || !data?.system_prompt) {
      console.warn(`[retell-session] No prompt found for agent ${agentId}, using fallback`);
      cache.set(callId, FALLBACK);
      return FALLBACK;
    }

    const session: SessionData = {
      systemPrompt: data.system_prompt,
      beginMessage: data.begin_message || FALLBACK.beginMessage,
    };
    cache.set(callId, session);
    return session;
  } catch (err) {
    console.error('[retell-session] Supabase lookup failed:', err);
    cache.set(callId, FALLBACK);
    return FALLBACK;
  }
}

export function getSession(callId: string): SessionData | undefined {
  return cache.get(callId);
}

export function clearSession(callId: string): void {
  cache.delete(callId);
}
