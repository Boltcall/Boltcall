import { fileURLToPath } from 'node:url';

import { createClient } from '@supabase/supabase-js';

const DEFAULT_TEST_AMOUNT = 2;
const DEFAULT_TEST_CURRENCY = 'USD';
const DEFAULT_LOOKBACK_HOURS = 72;

export function parseVerifyPayPalArgs(argv) {
  const parsed = {
    orderId: '',
    founderUserId: '',
    lookbackHours: DEFAULT_LOOKBACK_HOURS,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--order-id') {
      parsed.orderId = argv[++i] || '';
    } else if (arg === '--founder-user-id') {
      parsed.founderUserId = argv[++i] || '';
    } else if (arg === '--lookback-hours') {
      const value = Number(argv[++i]);
      if (Number.isFinite(value) && value > 0) parsed.lookbackHours = value;
    }
  }

  return parsed;
}

function firstCaptureId(rawEvent) {
  const units = Array.isArray(rawEvent?.purchase_units) ? rawEvent.purchase_units : [];
  for (const unit of units) {
    const captures = unit?.payments?.captures;
    if (!Array.isArray(captures)) continue;
    const capture = captures.find((item) => item?.id);
    if (capture?.id) return capture.id;
  }
  return null;
}

export function verifyPayPalPaymentRow(row, opts = {}) {
  if (!row) return { ok: false, reason: 'not_found' };

  const amount = Number(row.amount);
  if (Number.isFinite(amount) ? amount !== DEFAULT_TEST_AMOUNT : true) {
    return { ok: false, reason: 'wrong_amount' };
  }
  if (String(row.currency || '').toUpperCase() !== DEFAULT_TEST_CURRENCY) {
    return { ok: false, reason: 'wrong_currency' };
  }
  if (String(row.status || '').toLowerCase() !== 'completed') {
    return { ok: false, reason: 'not_completed' };
  }
  if (opts.founderUserId && row.user_id !== opts.founderUserId) {
    return { ok: false, reason: 'wrong_founder' };
  }

  return {
    ok: true,
    reason: 'matched',
    captureId: firstCaptureId(row.raw_event),
  };
}

export function buildPayPalPaymentSummary(row, verification) {
  return {
    orderId: row.order_id,
    captureId: verification.captureId || firstCaptureId(row.raw_event),
    userId: row.user_id,
    amount: Number(row.amount),
    currency: String(row.currency || '').toUpperCase(),
    status: String(row.status || '').toLowerCase(),
    hasPayerEmail: Boolean(row.payer_email),
    createdAt: row.created_at || null,
  };
}

async function fetchCandidatePayment(admin, opts) {
  let query = admin
    .from('paypal_payments')
    .select('order_id,user_id,amount,currency,status,payer_email,created_at,raw_event')
    .eq('amount', DEFAULT_TEST_AMOUNT)
    .eq('currency', DEFAULT_TEST_CURRENCY)
    .order('created_at', { ascending: false })
    .limit(5);

  if (opts.orderId) {
    query = query.eq('order_id', opts.orderId);
  } else {
    const since = new Date(Date.now() - opts.lookbackHours * 60 * 60 * 1000).toISOString();
    query = query.gte('created_at', since);
  }

  const { data, error } = await query;
  if (error) throw new Error(`paypal_payments query failed: ${error.message}`);
  return Array.isArray(data) ? data : [];
}

async function main() {
  const args = parseVerifyPayPalArgs(process.argv.slice(2));
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const founderUserId = args.founderUserId || process.env.FOUNDER_UUID || '';

  if (!supabaseUrl || !serviceKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY are required.');
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const candidates = await fetchCandidatePayment(admin, args);

  for (const row of candidates) {
    const verification = verifyPayPalPaymentRow(row, { founderUserId });
    if (verification.ok) {
      return {
        status: 'passed',
        check: 'paypal_live_test_payment',
        ...buildPayPalPaymentSummary(row, verification),
      };
    }
  }

  return {
    status: 'failed',
    check: 'paypal_live_test_payment',
    reason: candidates.length ? 'no_matching_completed_founder_payment' : 'not_found',
    orderId: args.orderId || null,
    founderUserId: founderUserId || null,
    lookbackHours: args.orderId ? null : args.lookbackHours,
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
