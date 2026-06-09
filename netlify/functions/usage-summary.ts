import { Handler } from '@netlify/functions';
import { getServiceSupabase } from './_shared/token-utils';
import { requireMatchingUser } from './_shared/user-auth';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json',
};

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'GET' && event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    let userId: string | null = null;

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      userId = body.user_id;
    } else {
      userId = event.queryStringParameters?.user_id || null;
    }

    if (!userId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'user_id is required' }) };
    }

    const auth = await requireMatchingUser(event, userId, headers);
    if (!auth.ok) return auth.response;
    userId = auth.userId;

    const supabase = getServiceSupabase();

    // Fetch current period summary
    const { data: summary, error: summaryError } = await supabase
      .from('usage_summary')
      .select('*')
      .eq('user_id', userId);

    if (summaryError) {
      console.error('usage_summary query error:', summaryError);
    }

    // Fetch daily breakdown for trend chart
    const { data: daily, error: dailyError } = await supabase
      .from('usage_daily_summary')
      .select('*')
      .eq('user_id', userId)
      .order('usage_date', { ascending: true });

    if (dailyError) {
      console.error('usage_daily_summary query error:', dailyError);
    }

    // Fetch user's subscription for plan info
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('plan_level, plan_limits, current_period_end, status')
      .eq('user_id', userId)
      .in('status', ['active', 'trialing'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Get static counts (phone numbers, team members)
    const { count: phoneCount } = await supabase
      .from('phone_numbers')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);

    const { count: memberCount } = await supabase
      .from('workspace_members')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', userId)
      .eq('status', 'active');

    // Build aggregated response
    const usageMap: Record<string, number> = {};
    if (summary) {
      for (const row of summary) {
        usageMap[row.resource_type] = Number(row.total_used) || 0;
      }
    }

    // Add static counts
    usageMap.phone_numbers = phoneCount || 0;
    usageMap.team_members = memberCount || 1;

    // Build daily trend
    const trendMap = new Map<string, Record<string, number>>();
    if (daily) {
      for (const row of daily) {
        const dateKey = row.usage_date;
        if (!trendMap.has(dateKey)) {
          trendMap.set(dateKey, { ai_voice_minutes: 0, ai_chat_messages: 0, sms_sent: 0 });
        }
        const point = trendMap.get(dateKey)!;
        point[row.resource_type] = Number(row.total_used) || 0;
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        usage: usageMap,
        trend: Array.from(trendMap.entries()).map(([date, values]) => ({
          date,
          ...values,
        })),
        plan: {
          level: subscription?.plan_level || 'free',
          limits: subscription?.plan_limits || {},
          period_end: subscription?.current_period_end || null,
          status: subscription?.status || 'none',
        },
      }),
    };
  } catch (error) {
    console.error('usage-summary error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
