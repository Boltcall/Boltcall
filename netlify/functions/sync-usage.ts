import { Handler } from '@netlify/functions';
import Retell from 'retell-sdk';
import { getSupabase, deductTokensBatch, TOKEN_COSTS } from './_shared/token-utils';
import { notifyError } from './_shared/notify';
import { requireInternalOrMatchingUser } from './_shared/user-auth';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

const TWILIO_API_BASE = 'https://api.twilio.com/2010-04-01';

// ── Retell sync ──

async function syncRetell(userId: string): Promise<{
  calls_synced: number;
  minutes_consumed: number;
  tokens_deducted: number;
  error?: string;
}> {
  const supabase = getSupabase();
  const apiKey = process.env.RETELL_API_KEY;
  if (!apiKey) {
    return { calls_synced: 0, minutes_consumed: 0, tokens_deducted: 0, error: 'RETELL_API_KEY not configured' };
  }

  const client = new Retell({ apiKey });

  // Get user's agent IDs — direct column primary, legacy JSONB fallback
  const { data: agents, error: agentError } = await supabase
    .from('agents')
    .select('retell_agent_id, api_keys')
    .eq('user_id', userId);

  if (agentError || !agents?.length) {
    return { calls_synced: 0, minutes_consumed: 0, tokens_deducted: 0, error: agentError?.message || 'No agents found' };
  }

  const agentIdSet = new Set<string>();
  for (const a of agents as any[]) {
    if (typeof a.retell_agent_id === 'string' && a.retell_agent_id) agentIdSet.add(a.retell_agent_id);
    if (typeof a.api_keys?.retell_agent_id === 'string' && a.api_keys.retell_agent_id) agentIdSet.add(a.api_keys.retell_agent_id);
  }
  const agentIds = Array.from(agentIdSet);

  // Find last sync timestamp: look at the most recent token_transaction for this user with category='ai_voice_minute'
  const { data: lastTx } = await supabase
    .from('token_transactions')
    .select('created_at')
    .eq('user_id', userId)
    .eq('category', 'ai_voice_minute')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  // Default to 24 hours ago if no previous sync
  const sinceTimestamp = lastTx?.created_at
    ? new Date(lastTx.created_at).getTime()
    : Date.now() - 24 * 60 * 60 * 1000;

  // Fetch calls from Retell since last sync
  const calls = await client.call.list({
    filter_criteria: {
      agent_id: agentIds,
      start_timestamp: {
        lower_threshold: sinceTimestamp,
      },
    },
    sort_order: 'ascending',
    limit: 200,
  } as unknown as Parameters<typeof client.call.list>[0]);

  const callList = Array.isArray(calls) ? calls : [];
  if (callList.length === 0) {
    return { calls_synced: 0, minutes_consumed: 0, tokens_deducted: 0 };
  }

  // Get already-logged call IDs to avoid double-counting
  const callIds = callList.map((c: any) => c.call_id).filter(Boolean);
  const { data: existingTxs } = await supabase
    .from('token_transactions')
    .select('description')
    .eq('user_id', userId)
    .eq('category', 'ai_voice_minute')
    .in('description', callIds.map((id: string) => `Retell call ${id}`));

  const alreadyLoggedIds = new Set(
    (existingTxs || []).map((tx) => tx.description.replace('Retell call ', ''))
  );

  // Calculate token deductions for new calls
  const items: Array<{
    cost: number;
    category: 'ai_voice_minute';
    description: string;
    metadata: Record<string, unknown>;
  }> = [];

  let totalMinutes = 0;

  for (const call of callList) {
    const c = call as any;
    if (!c.call_id || alreadyLoggedIds.has(c.call_id)) continue;

    const startMs = c.start_timestamp || 0;
    const endMs = c.end_timestamp || 0;
    if (!startMs || !endMs) continue;

    const durationSeconds = (endMs - startMs) / 1000;
    const minutes = Math.ceil(durationSeconds / 60); // Round up to nearest minute
    if (minutes <= 0) continue;

    const cost = minutes * TOKEN_COSTS.ai_voice_minute;
    totalMinutes += minutes;

    items.push({
      cost,
      category: 'ai_voice_minute',
      description: `Retell call ${c.call_id}`,
      metadata: {
        call_id: c.call_id,
        agent_id: c.agent_id,
        duration_seconds: durationSeconds,
        minutes_billed: minutes,
        call_status: c.call_status,
        direction: c.direction,
      },
    });
  }

  if (items.length === 0) {
    return { calls_synced: 0, minutes_consumed: 0, tokens_deducted: 0 };
  }

  const result = await deductTokensBatch(userId, items, supabase);

  if (!result.success) {
    await notifyError('sync-usage: Retell token deduction failed', result.error || 'Unknown', {
      userId, callsSynced: items.length, minutesConsumed: totalMinutes,
    });
    return {
      calls_synced: 0,
      minutes_consumed: totalMinutes,
      tokens_deducted: 0,
      error: result.error,
    };
  }

  return {
    calls_synced: items.length,
    minutes_consumed: totalMinutes,
    tokens_deducted: result.tokensDeducted,
  };
}

// ── Twilio sync ──

async function syncTwilio(userId: string): Promise<{
  sms_synced: number;
  tokens_deducted: number;
  error?: string;
}> {
  const supabase = getSupabase();
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    return { sms_synced: 0, tokens_deducted: 0, error: 'Twilio credentials not configured' };
  }

  // Get user's phone numbers from Supabase
  const { data: phones } = await supabase
    .from('phone_numbers')
    .select('phone_number')
    .eq('user_id', userId);

  if (!phones?.length) {
    return { sms_synced: 0, tokens_deducted: 0, error: 'No phone numbers found for user' };
  }

  // Find last sync timestamp for SMS
  const { data: lastTx } = await supabase
    .from('token_transactions')
    .select('created_at')
    .eq('user_id', userId)
    .eq('category', 'sms_sent')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  const sinceDate = lastTx?.created_at
    ? new Date(lastTx.created_at).toISOString().split('T')[0]
    : new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
  const items: Array<{
    cost: number;
    category: 'sms_sent';
    description: string;
    metadata: Record<string, unknown>;
  }> = [];

  // Fetch sent messages for each phone number
  for (const phone of phones) {
    const params = new URLSearchParams({
      From: phone.phone_number,
      'DateSent>': sinceDate,
      PageSize: '200',
    });

    const url = `${TWILIO_API_BASE}/Accounts/${accountSid}/Messages.json?${params.toString()}`;
    const response = await fetch(url, {
      headers: { Authorization: `Basic ${auth}` },
    });

    if (!response.ok) continue;

    const data = await response.json();
    const messages = data.messages || [];

    // Check already-logged message SIDs
    const messageSids = messages.map((m: any) => m.sid).filter(Boolean);
    if (messageSids.length === 0) continue;

    const { data: existingTxs } = await supabase
      .from('token_transactions')
      .select('description')
      .eq('user_id', userId)
      .eq('category', 'sms_sent')
      .in('description', messageSids.map((sid: string) => `SMS ${sid}`));

    const alreadyLoggedSids = new Set(
      (existingTxs || []).map((tx) => tx.description.replace('SMS ', ''))
    );

    for (const msg of messages) {
      if (!msg.sid || alreadyLoggedSids.has(msg.sid)) continue;
      // Only count outbound messages
      if (msg.direction !== 'outbound-api' && msg.direction !== 'outbound-call' && msg.direction !== 'outbound-reply') continue;

      items.push({
        cost: TOKEN_COSTS.sms_sent,
        category: 'sms_sent',
        description: `SMS ${msg.sid}`,
        metadata: {
          message_sid: msg.sid,
          from: msg.from,
          to: msg.to,
          direction: msg.direction,
          date_sent: msg.date_sent,
        },
      });
    }
  }

  if (items.length === 0) {
    return { sms_synced: 0, tokens_deducted: 0 };
  }

  const result = await deductTokensBatch(userId, items, supabase);

  if (!result.success) {
    await notifyError('sync-usage: Twilio token deduction failed', result.error || 'Unknown', {
      userId, smsSynced: items.length,
    });
    return { sms_synced: 0, tokens_deducted: 0, error: result.error };
  }

  return {
    sms_synced: items.length,
    tokens_deducted: result.tokensDeducted,
  };
}

// ── Handler ──

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { user_id, action } = body;

    if (!user_id) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'user_id is required' }) };
    }

    const auth = await requireInternalOrMatchingUser(event, user_id, headers);
    if (!auth.ok) return auth.response;

    if (!action || !['sync_retell', 'sync_twilio', 'sync_all'].includes(action)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'action must be sync_retell, sync_twilio, or sync_all' }),
      };
    }

    const results: Record<string, unknown> = {};
    let totalTokensConsumed = 0;

    if (action === 'sync_retell' || action === 'sync_all') {
      const retellResult = await syncRetell(user_id);
      results.retell = retellResult;
      totalTokensConsumed += retellResult.tokens_deducted;
    }

    if (action === 'sync_twilio' || action === 'sync_all') {
      const twilioResult = await syncTwilio(user_id);
      results.twilio = twilioResult;
      totalTokensConsumed += twilioResult.tokens_deducted;
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        total_tokens_consumed: totalTokensConsumed,
        ...results,
      }),
    };
  } catch (error) {
    console.error('sync-usage error:', error);
    await notifyError('sync-usage: Unhandled exception', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Usage sync failed. Our team has been notified.',
      }),
    };
  }
};
