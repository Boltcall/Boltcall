import { Handler } from '@netlify/functions';
import { getServiceSupabase } from './_shared/token-utils';
import { withLegacyHandler } from './_shared/runtime-compat';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  const authHeader = event.headers['authorization'] || '';
  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };

  const supa = getServiceSupabase();

  // Verify caller's identity from their JWT
  const { data: { user }, error: authErr } = await supa.auth.getUser(token);
  if (authErr || !user?.email) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Invalid token' }) };
  }

  // Confirm they are a platform admin
  const { data: adminRow } = await supa
    .from('platform_admins')
    .select('id')
    .eq('email', user.email)
    .maybeSingle();

  if (!adminRow) {
    return { statusCode: 403, headers, body: JSON.stringify({ error: 'Forbidden — not a platform admin' }) };
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayIso = todayStart.toISOString();

  // Fetch everything in parallel — service role bypasses all RLS
  const [
    adminUsersResult,
    { data: workspaces },
    { data: agents },
    { data: leads },
    { data: winsToday },
    { data: healsToday },
    { data: recentWins },
    { data: recentHeals },
    { data: phoneNumbers },
    { data: businessProfiles },
  ] = await Promise.all([
    supa.auth.admin.listUsers({ perPage: 1000 }),
    supa.from('workspaces').select('id, name, user_id, created_at'),
    supa.from('agents').select('id, user_id, name, created_at'),
    supa.from('leads').select('id, user_id, created_at'),
    supa.from('conversation_wins').select('id, user_id, channel, outcome_type, created_at').gte('created_at', todayIso),
    supa.from('agent_self_heal_log').select('id, user_id, status, fix_pass_count, fix_total_runs, created_at').gte('created_at', todayIso),
    supa.from('conversation_wins').select('id, user_id, channel, outcome_type, summary, created_at').order('created_at', { ascending: false }).limit(20),
    supa.from('agent_self_heal_log').select('id, user_id, status, fix_pass_count, fix_total_runs, created_at').order('created_at', { ascending: false }).limit(20),
    supa.from('phone_numbers').select('id, user_id, phone_number'),
    supa.from('business_profiles').select('id, user_id, business_name, industry'),
  ]);

  const authUsers = adminUsersResult.data?.users || [];

  // Build per-user aggregation maps
  const agentsByUser: Record<string, number> = {};
  (agents || []).forEach(a => { agentsByUser[a.user_id] = (agentsByUser[a.user_id] || 0) + 1; });

  const leadsByUser: Record<string, number> = {};
  (leads || []).forEach(l => { leadsByUser[l.user_id] = (leadsByUser[l.user_id] || 0) + 1; });

  const winsByUser: Record<string, number> = {};
  (winsToday || []).forEach(w => { winsByUser[w.user_id] = (winsByUser[w.user_id] || 0) + 1; });

  const healsByUser: Record<string, number> = {};
  (healsToday || []).forEach(h => { healsByUser[h.user_id] = (healsByUser[h.user_id] || 0) + 1; });

  const phonesByUser: Record<string, number> = {};
  (phoneNumbers || []).forEach(p => { phonesByUser[p.user_id] = (phonesByUser[p.user_id] || 0) + 1; });

  const workspaceByUser: Record<string, string> = {};
  (workspaces || []).forEach(w => { if (w.user_id) workspaceByUser[w.user_id] = w.name; });

  const businessByUser: Record<string, { name: string; industry: string }> = {};
  (businessProfiles || []).forEach(b => {
    if (b.user_id) businessByUser[b.user_id] = { name: b.business_name, industry: b.industry };
  });

  // Build enriched user rows from real auth users
  const userRows = authUsers.map(u => ({
    user_id: u.id,
    email: u.email || 'unknown',
    workspace: workspaceByUser[u.id] || '—',
    business_name: businessByUser[u.id]?.name || '—',
    industry: businessByUser[u.id]?.industry || '—',
    agents: agentsByUser[u.id] || 0,
    leads: leadsByUser[u.id] || 0,
    wins_today: winsByUser[u.id] || 0,
    heals_today: healsByUser[u.id] || 0,
    phones: phonesByUser[u.id] || 0,
    joined: u.created_at,
    last_sign_in: u.last_sign_in_at || null,
  }));

  // Channel breakdown for today's wins
  const winsByChannel: Record<string, number> = {};
  (winsToday || []).forEach(w => {
    winsByChannel[w.channel] = (winsByChannel[w.channel] || 0) + 1;
  });

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      kpis: {
        total_users: authUsers.length,
        total_agents: (agents || []).length,
        total_leads: (leads || []).length,
        total_phones: (phoneNumbers || []).length,
        wins_today: (winsToday || []).length,
        heals_today: (healsToday || []).length,
        wins_by_channel: winsByChannel,
      },
      users: userRows,
      recent_wins: recentWins || [],
      recent_heals: recentHeals || [],
    }),
  };
};

export default withLegacyHandler(handler);
