import { fileURLToPath } from 'node:url';

import { createClient } from '@supabase/supabase-js';

const DEFAULT_LOOKBACK_HOURS = 72;
const CANONICAL_FACEBOOK_SOURCE = 'facebook_lead_ad';

export function parseVerifyFacebookLeadArgs(argv) {
  const parsed = {
    founderUserId: '',
    leadgenId: '',
    pageId: '',
    lookbackHours: DEFAULT_LOOKBACK_HOURS,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--founder-user-id') {
      parsed.founderUserId = argv[++i] || '';
    } else if (arg === '--leadgen-id') {
      parsed.leadgenId = argv[++i] || '';
    } else if (arg === '--page-id') {
      parsed.pageId = argv[++i] || '';
    } else if (arg === '--lookback-hours') {
      const value = Number(argv[++i]);
      if (Number.isFinite(value) && value > 0) parsed.lookbackHours = value;
    }
  }

  return parsed;
}

export function verifyFacebookLeadRow(row, opts = {}) {
  if (!row) return { ok: false, reason: 'not_found' };

  if (opts.founderUserId && row.user_id !== opts.founderUserId) {
    return { ok: false, reason: 'wrong_founder' };
  }

  if (row.source !== CANONICAL_FACEBOOK_SOURCE) {
    return { ok: false, reason: 'wrong_source' };
  }

  if (opts.leadgenId && row.raw_data?.leadgen_id !== opts.leadgenId) {
    return { ok: false, reason: 'wrong_leadgen_id' };
  }

  if (opts.pageId && row.raw_data?.page_id !== opts.pageId) {
    return { ok: false, reason: 'wrong_page' };
  }

  if (!row.email && !row.phone) {
    return { ok: false, reason: 'missing_contact' };
  }

  return { ok: true, reason: 'matched' };
}

export function buildFacebookLeadSummary(row) {
  return {
    id: row.id,
    userId: row.user_id || null,
    source: row.source,
    status: row.status || null,
    leadgenId: row.raw_data?.leadgen_id || null,
    pageId: row.raw_data?.page_id || null,
    hasEmail: Boolean(row.email),
    hasPhone: Boolean(row.phone),
    createdAt: row.created_at || null,
  };
}

async function fetchCandidateLeads(admin, opts) {
  let query = admin
    .from('leads')
    .select('id,user_id,first_name,last_name,email,phone,source,status,raw_data,created_at')
    .eq('source', CANONICAL_FACEBOOK_SOURCE)
    .order('created_at', { ascending: false })
    .limit(10);

  if (opts.founderUserId) query = query.eq('user_id', opts.founderUserId);
  if (opts.leadgenId) query = query.filter('raw_data->>leadgen_id', 'eq', opts.leadgenId);
  if (opts.pageId) query = query.filter('raw_data->>page_id', 'eq', opts.pageId);
  if (!opts.leadgenId) {
    const since = new Date(Date.now() - opts.lookbackHours * 60 * 60 * 1000).toISOString();
    query = query.gte('created_at', since);
  }

  const { data, error } = await query;
  if (error) throw new Error(`leads query failed: ${error.message}`);
  return Array.isArray(data) ? data : [];
}

async function main() {
  const args = parseVerifyFacebookLeadArgs(process.argv.slice(2));
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const founderUserId = args.founderUserId || process.env.FOUNDER_UUID || '';

  if (!supabaseUrl || !serviceKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY are required.');
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const candidates = await fetchCandidateLeads(admin, {
    founderUserId,
    leadgenId: args.leadgenId,
    pageId: args.pageId,
    lookbackHours: args.lookbackHours,
  });

  for (const row of candidates) {
    const verification = verifyFacebookLeadRow(row, {
      founderUserId,
      leadgenId: args.leadgenId,
      pageId: args.pageId,
    });
    if (verification.ok) {
      return {
        status: 'passed',
        check: 'facebook_lead_ingestion',
        ...buildFacebookLeadSummary(row),
      };
    }
  }

  return {
    status: 'failed',
    check: 'facebook_lead_ingestion',
    reason: candidates.length ? 'no_matching_ready_lead' : 'not_found',
    founderUserId: founderUserId || null,
    leadgenId: args.leadgenId || null,
    pageId: args.pageId || null,
    lookbackHours: args.leadgenId ? null : args.lookbackHours,
    candidatesChecked: candidates.length,
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
