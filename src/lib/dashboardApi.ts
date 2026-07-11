// Dashboard API client — fetches real data from Netlify function + Supabase

import { supabase } from './supabase';
import { FUNCTIONS_BASE } from './api';

export interface DashboardStats {
  timestamp: string;
  retell: {
    calls_today: number;
    calls_7d: number;
    avg_duration_seconds: number;
    total_talk_minutes_today: number;
    successful_calls_today: number;
    missed_calls_today: number;
    success_rate: number;
    active_agents: number;
  } | null;
  twilio: {
    sms_sent_today: number;
    sms_received_today: number;
    total_phone_numbers: number;
    phone_numbers: Array<{ number: string; friendly_name: string }>;
  } | null;
  supabase: {
    callbacks_total: number;
    callbacks_pending: number;
    chats_active: number;
    chats_total: number;
    total_leads: number;
    total_workspaces: number;
    latest_metrics: any;
  };
  summary: {
    ai_calls_today: number;
    ai_calls_7d: number;
    missed_calls_today: number;
    sms_sent_today: number;
    total_leads: number;
    active_chats: number;
    pending_callbacks: number;
    active_agents: number;
    phone_numbers: number;
  };
}

/**
 * Fetch aggregated dashboard stats from all APIs.
 * Returns null when the caller lacks access (401/403) — this endpoint exposes
 * admin-only global aggregates, so a non-admin 403 is "not for you", not an
 * error. Real outages (5xx / network / timeout) still throw.
 */
export async function fetchDashboardStats(): Promise<DashboardStats | null> {
  const { data: { session } } = await supabase.auth.getSession();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(`${FUNCTIONS_BASE}/dashboard-stats`, {
      headers: {
        ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
      },
      signal: controller.signal,
    });
    if (response.status === 401 || response.status === 403) {
      return null;
    }
    if (!response.ok) {
      throw new Error(`Dashboard stats failed: ${response.status}`);
    }
    return response.json();
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('Dashboard stats request timed out. Please try again.');
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Fetch daily metrics from Supabase (for charts)
 * Supports both a simple `days` count and explicit date range.
 */
export async function fetchDailyMetrics(
  days: number = 30,
  range?: { start: string; end: string }
) {
  let query = supabase
    .from('daily_metrics')
    .select('*')
    .order('date', { ascending: false });

  if (range) {
    query = query.gte('date', range.start).lte('date', range.end);
  } else {
    query = query.limit(days);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching daily metrics:', error);
    return [];
  }

  return data || [];
}

/**
 * Fetch business health summary
 */
export async function fetchBusinessHealth() {
  const { data, error } = await supabase.rpc('get_business_health');
  if (error) {
    console.error('Error fetching business health:', error);
    return null;
  }
  return data;
}

/**
 * Fetch callback stats
 */
export async function fetchCallbackStats() {
  const { data, error } = await supabase
    .from('callbacks')
    .select('status');

  if (error) {
    console.error('Error fetching callback stats:', error);
    return { total: 0, pending: 0, scheduled: 0, completed: 0 };
  }

  const callbacks = data || [];
  return {
    total: callbacks.length,
    pending: callbacks.filter(c => c.status === 'pending').length,
    scheduled: callbacks.filter(c => c.status === 'scheduled').length,
    completed: callbacks.filter(c => c.status === 'completed').length,
    no_answer: callbacks.filter(c => c.status === 'no_answer').length,
  };
}

/**
 * Fetch chat stats
 */
export async function fetchChatStats() {
  const { data, error } = await supabase
    .from('chats')
    .select('status, priority, chat_type, customer_sentiment');

  if (error) {
    console.error('Error fetching chat stats:', error);
    return { total: 0, active: 0, closed: 0 };
  }

  const chats = data || [];
  return {
    total: chats.length,
    active: chats.filter(c => c.status === 'active').length,
    paused: chats.filter(c => c.status === 'paused').length,
    closed: chats.filter(c => c.status === 'closed').length,
    transferred: chats.filter(c => c.status === 'transferred').length,
  };
}

/**
 * Fetch leads from Supabase with optional filtering
 */
export async function fetchLeads(params?: {
  status?: string;
  source?: string;
  limit?: number;
  offset?: number;
}) {
  let query = supabase
    .from('callbacks')
    .select('*')
    .order('created_at', { ascending: false });

  if (params?.status) {
    query = query.eq('status', params.status);
  }
  if (params?.source) {
    query = query.eq('source', params.source);
  }
  if (params?.limit) {
    query = query.limit(params.limit);
  }
  if (params?.offset) {
    query = query.range(params.offset, params.offset + (params.limit || 50) - 1);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching leads:', error);
    return [];
  }
  return data || [];
}
