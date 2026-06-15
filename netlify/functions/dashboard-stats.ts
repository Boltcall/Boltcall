import { Handler } from '@netlify/functions';
import Retell from 'retell-sdk';
import { getSupabase } from './_shared/token-utils';
import { buildRetellStartTimestampFilter, normalizeRetellCallList } from './_shared/retell-call-list';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json',
};

const TWILIO_API_BASE = 'https://api.twilio.com/2010-04-01';

async function getRetellStats(apiKey: string) {
  try {
    const client = new Retell({ apiKey });

    // Get calls from last 24h
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    const [recentCalls, weekCalls, agents] = await Promise.all([
      client.call.list({
        filter_criteria: {
          start_timestamp: buildRetellStartTimestampFilter({ lower: oneDayAgo }),
        },
        limit: 100,
      } as unknown as Parameters<typeof client.call.list>[0]),
      client.call.list({
        filter_criteria: {
          start_timestamp: buildRetellStartTimestampFilter({ lower: sevenDaysAgo }),
        },
        limit: 500,
      } as unknown as Parameters<typeof client.call.list>[0]),
      client.agent.list(),
    ]);

    const recentCallsList = normalizeRetellCallList<any>(recentCalls);
    const weekCallsList = normalizeRetellCallList<any>(weekCalls);

    // Calculate stats
    const totalDurationMs = recentCallsList.reduce((sum: number, c: any) => sum + (c.duration_ms || 0), 0);
    const avgDuration = recentCallsList.length > 0 ? totalDurationMs / recentCallsList.length : 0;
    const successfulCalls = recentCallsList.filter((c: any) =>
      c.call_analysis?.call_successful === true
    ).length;

    // Missed calls: disconnected before meaningful conversation (not connected or very short)
    const missedCalls = recentCallsList.filter((c: any) => {
      const status = c.call_status || c.status || '';
      const durationMs = c.duration_ms || 0;
      return status === 'error' || status === 'not_connected' || durationMs < 5000;
    }).length;

    return {
      calls_today: recentCallsList.length,
      calls_7d: weekCallsList.length,
      avg_duration_seconds: Math.round(avgDuration / 1000),
      total_talk_minutes_today: Math.round(totalDurationMs / 60000),
      successful_calls_today: successfulCalls,
      missed_calls_today: missedCalls,
      success_rate: recentCallsList.length > 0
        ? Math.round((successfulCalls / recentCallsList.length) * 100)
        : 0,
      active_agents: Array.isArray(agents) ? agents.length : 0,
    };
  } catch (error) {
    console.error('Retell stats error:', error);
    return {
      calls_today: 0, calls_7d: 0, avg_duration_seconds: 0,
      total_talk_minutes_today: 0, successful_calls_today: 0,
      missed_calls_today: 0, success_rate: 0, active_agents: 0,
    };
  }
}

async function getTwilioStats(accountSid: string, authToken: string) {
  try {
    const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
    const today = new Date().toISOString().split('T')[0];

    // Get today's messages
    const msgUrl = `${TWILIO_API_BASE}/Accounts/${accountSid}/Messages.json?DateSent=${today}&PageSize=1000`;
    const msgResponse = await fetch(msgUrl, {
      headers: { 'Authorization': `Basic ${auth}` },
    });
    const msgData = await msgResponse.json();
    const messages = msgData.messages || [];

    // Get phone numbers
    const numUrl = `${TWILIO_API_BASE}/Accounts/${accountSid}/IncomingPhoneNumbers.json`;
    const numResponse = await fetch(numUrl, {
      headers: { 'Authorization': `Basic ${auth}` },
    });
    const numData = await numResponse.json();

    return {
      sms_sent_today: messages.filter((m: any) => m.direction === 'outbound-api').length,
      sms_received_today: messages.filter((m: any) => m.direction === 'inbound').length,
      total_phone_numbers: (numData.incoming_phone_numbers || []).length,
      phone_numbers: (numData.incoming_phone_numbers || []).map((n: any) => ({
        number: n.phone_number,
        friendly_name: n.friendly_name,
      })),
    };
  } catch (error) {
    console.error('Twilio stats error:', error);
    return {
      sms_sent_today: 0, sms_received_today: 0,
      total_phone_numbers: 0, phone_numbers: [],
    };
  }
}

async function getSupabaseStats(supabase: any) {
  try {
    const [
      { count: callbacksTotal },
      { count: callbacksPending },
      { count: chatsActive },
      { count: chatsTotal },
      { count: leadsTotal },
      { data: workspaces },
      { data: dailyMetrics },
    ] = await Promise.all([
      supabase.from('callbacks').select('*', { count: 'exact', head: true }),
      supabase.from('callbacks').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('chats').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('chats').select('*', { count: 'exact', head: true }),
      supabase.from('leads').select('*', { count: 'exact', head: true }),
      supabase.from('workspaces').select('id'),
      supabase.from('daily_metrics').select('*').order('date', { ascending: false }).limit(1),
    ]);

    return {
      callbacks_total: callbacksTotal || 0,
      callbacks_pending: callbacksPending || 0,
      chats_active: chatsActive || 0,
      chats_total: chatsTotal || 0,
      total_leads: leadsTotal || 0,
      total_workspaces: workspaces?.length || 0,
      latest_metrics: dailyMetrics?.[0] || null,
    };
  } catch (error) {
    console.error('Supabase stats error:', error);
    return {
      callbacks_total: 0, callbacks_pending: 0,
      chats_active: 0, chats_total: 0,
      total_leads: 0, total_workspaces: 0, latest_metrics: null,
    };
  }
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  // Verify authentication
  const authHeader = event.headers.authorization || event.headers.Authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Authentication required' }) };
  }

  try {
    const supabase = getSupabase();
    const token = authHeader.substring(7);
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authUser) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Invalid or expired token' }) };
    }

    // This endpoint exposes Boltcall-wide stats (global Retell call counts,
    // global Twilio numbers, total leads/workspaces across all tenants), so
    // gate it behind the admin email. Any non-admin caller would otherwise
    // see cross-tenant aggregate data.
    const adminEmails = (process.env.ADMIN_EMAILS || 'noamyakoby6@gmail.com')
      .split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
    if (!authUser.email || !adminEmails.includes(authUser.email.toLowerCase())) {
      return { statusCode: 403, headers, body: JSON.stringify({ error: 'Admin only' }) };
    }

    const retellApiKey = process.env.RETELL_API_KEY || '';
    const twilioSid = process.env.TWILIO_ACCOUNT_SID || '';
    const twilioToken = process.env.TWILIO_AUTH_TOKEN || '';

    // Fetch all stats in parallel
    const [retellStats, twilioStats, supabaseStats] = await Promise.all([
      retellApiKey ? getRetellStats(retellApiKey) : Promise.resolve(null),
      twilioSid && twilioToken ? getTwilioStats(twilioSid, twilioToken) : Promise.resolve(null),
      getSupabaseStats(supabase),
    ]);

    const dashboard = {
      timestamp: new Date().toISOString(),
      retell: retellStats,
      twilio: twilioStats,
      supabase: supabaseStats,
      summary: {
        ai_calls_today: retellStats?.calls_today || 0,
        ai_calls_7d: retellStats?.calls_7d || 0,
        missed_calls_today: retellStats?.missed_calls_today || 0,
        sms_sent_today: twilioStats?.sms_sent_today || 0,
        total_leads: supabaseStats.total_leads,
        active_chats: supabaseStats.chats_active,
        pending_callbacks: supabaseStats.callbacks_pending,
        active_agents: retellStats?.active_agents || 0,
        phone_numbers: twilioStats?.total_phone_numbers || 0,
      },
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(dashboard),
    };
  } catch (error) {
    console.error('dashboard-stats error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to fetch dashboard stats',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
