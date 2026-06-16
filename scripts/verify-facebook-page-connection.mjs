import { fileURLToPath } from 'node:url';

import { createClient } from '@supabase/supabase-js';

export function parseVerifyFacebookArgs(argv) {
  const parsed = {
    founderUserId: '',
    pageId: '',
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--founder-user-id') {
      parsed.founderUserId = argv[++i] || '';
    } else if (arg === '--page-id') {
      parsed.pageId = argv[++i] || '';
    }
  }

  return parsed;
}

export function verifyFacebookConnectionRow(row, opts = {}) {
  if (!row) return { ok: false, reason: 'not_found' };

  if (opts.founderUserId) {
    const belongsToFounder =
      row.user_id === opts.founderUserId || row.workspace_id === opts.founderUserId;
    if (!belongsToFounder) return { ok: false, reason: 'wrong_founder' };
  }

  if (opts.pageId && row.page_id !== opts.pageId) {
    return { ok: false, reason: 'wrong_page' };
  }

  if (!row.access_token || typeof row.access_token !== 'string') {
    return { ok: false, reason: 'missing_access_token' };
  }

  return { ok: true, reason: 'matched' };
}

export function buildFacebookConnectionSummary(row) {
  return {
    id: row.id || null,
    pageId: row.page_id,
    pageName: row.page_name || null,
    userId: row.user_id || null,
    workspaceId: row.workspace_id || null,
    hasAccessToken: Boolean(row.access_token),
    createdAt: row.created_at || null,
  };
}

export function buildFacebookPageConnectionActionRequired(opts = {}) {
  const verifyCommand = opts.pageId
    ? `node scripts/verify-facebook-page-connection.mjs --page-id ${opts.pageId}`
    : 'node scripts/verify-facebook-page-connection.mjs';
  return {
    dashboardUrl: 'https://boltcall.org/dashboard/ad-instant-response',
    verifyCommand,
    founderUserId: opts.founderUserId || null,
  };
}

async function fetchCandidateConnections(admin, opts) {
  let query = admin
    .from('facebook_page_connections')
    .select('id,page_id,page_name,user_id,workspace_id,access_token,created_at')
    .order('created_at', { ascending: false })
    .limit(10);

  if (opts.pageId) query = query.eq('page_id', opts.pageId);
  if (opts.founderUserId) {
    query = query.or(`user_id.eq.${opts.founderUserId},workspace_id.eq.${opts.founderUserId}`);
  }

  const { data, error } = await query;
  if (error) throw new Error(`facebook_page_connections query failed: ${error.message}`);
  return Array.isArray(data) ? data : [];
}

async function main() {
  const args = parseVerifyFacebookArgs(process.argv.slice(2));
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const founderUserId = args.founderUserId || process.env.FOUNDER_UUID || '';

  if (!supabaseUrl || !serviceKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY are required.');
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const candidates = await fetchCandidateConnections(admin, {
    founderUserId,
    pageId: args.pageId,
  });

  for (const row of candidates) {
    const verification = verifyFacebookConnectionRow(row, {
      founderUserId,
      pageId: args.pageId,
    });
    if (verification.ok) {
      return {
        status: 'passed',
        check: 'facebook_page_connection',
        ...buildFacebookConnectionSummary(row),
      };
    }
  }

  return {
    status: 'failed',
    check: 'facebook_page_connection',
    reason: candidates.length ? 'no_matching_ready_connection' : 'not_found',
    founderUserId: founderUserId || null,
    pageId: args.pageId || null,
    candidatesChecked: candidates.length,
    action: buildFacebookPageConnectionActionRequired({
      founderUserId,
      pageId: args.pageId,
    }),
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main()
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
      if (result.status !== 'passed') process.exitCode = 1;
    })
    .catch((err) => {
      console.error(JSON.stringify({ status: 'failed', error: err.message }, null, 2));
      process.exitCode = 1;
    });
}
