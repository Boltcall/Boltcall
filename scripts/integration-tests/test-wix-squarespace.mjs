#!/usr/bin/env node
// Integration test: POSTs to prod /lead-webhook with the exact JSON shapes
// a Wix Automation and a Squarespace form (JS-injected + Zapier bridge) would send.
//
// Reads BOLTCALL_TEST_API_KEY from env. Provision one against a test workspace
// (see api_keys table). Uses BOLTCALL_TEST_PHONE if set, else a burner E.164.
//
// Run: node scripts/integration-tests/test-wix-squarespace.mjs

const ENDPOINT = process.env.BOLTCALL_ENDPOINT || 'https://boltcall.org/.netlify/functions/lead-webhook';
const KEY = process.env.BOLTCALL_TEST_API_KEY;
const PHONE = process.env.BOLTCALL_TEST_PHONE || '+15005550006'; // Twilio magic non-billable
const USER_ID = process.env.BOLTCALL_TEST_USER_ID; // optional override when auth-fix not yet deployed

if (!KEY) {
  console.error('Missing BOLTCALL_TEST_API_KEY');
  process.exit(2);
}

function withUserId(payload) {
  return USER_ID ? { ...payload, user_id: USER_ID } : payload;
}

const stamp = new Date().toISOString().replace(/[:.]/g, '-');

// ─── Payload shapes ────────────────────────────────────────────────────────

// 1. Wix Automation "Send via Webhook" — user maps form fields in the body editor.
//    The user builds this JSON themselves in the Wix Automation UI, so we test
//    the recommended shape from our install docs.
const wixPayload = {
  name: `Wix Test ${stamp}`,
  email: `wix+${stamp}@boltcall-test.dev`,
  phone: PHONE,
  source: 'wix_form',
  notes: 'Sent from Wix Contact Form via Wix Automation → HTTP Request',
  page: 'https://demo-boltcall.wixsite.com/plumber/contact',
};

// 2. Squarespace via JS Code Injection — user overrides form submit and fetch()s us.
//    Same shape as Wix, different source tag.
const squarespaceJsPayload = {
  name: `Squarespace JS Test ${stamp}`,
  email: `sqsp-js+${stamp}@boltcall-test.dev`,
  phone: PHONE,
  source: 'squarespace_form',
  notes: 'Sent from Squarespace Form via injected fetch()',
  page: 'https://demo-boltcall.squarespace.com/contact',
};

// 3. Squarespace via Zapier bridge — Zapier "Send Lead to Boltcall" action
//    sends whatever field map the user set. Test recommended default map.
const squarespaceZapierPayload = {
  name: `Squarespace Zapier Test ${stamp}`,
  email: `sqsp-zap+${stamp}@boltcall-test.dev`,
  phone: PHONE,
  source: 'squarespace_zapier',
  notes: 'Field-name Split from Squarespace form via Zapier',
};

// 4. Sanity: minimal (phone only)
const minimalPayload = {
  phone: PHONE,
  source: 'minimal_probe',
};

// 5. Negative: no email or phone → must 400
const negativePayload = {
  name: 'No Contact Info',
  source: 'negative_test',
};

// ─── Runner ────────────────────────────────────────────────────────────────

async function post(label, body, expectedStatus) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${KEY}`,
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let parsed;
  try { parsed = JSON.parse(text); } catch { parsed = text; }
  const pass = res.status === expectedStatus;
  console.log(`${pass ? 'PASS' : 'FAIL'} [${res.status} exp ${expectedStatus}] ${label}`);
  if (!pass) console.log('  body:', typeof parsed === 'string' ? parsed.slice(0, 400) : JSON.stringify(parsed).slice(0, 400));
  else if (parsed?.lead?.id) console.log(`  lead_id=${parsed.lead.id} source=${parsed.lead.source}`);
  return { label, status: res.status, pass, response: parsed };
}

const cases = [
  ['Wix Automation → HTTP Request',       withUserId(wixPayload),               201],
  ['Squarespace JS Code Injection',       withUserId(squarespaceJsPayload),     201],
  ['Squarespace via Zapier bridge',       withUserId(squarespaceZapierPayload), 201],
  ['Minimal phone-only probe',            withUserId(minimalPayload),           201],
  ['Negative: no contact info → 400',     negativePayload,                      400],
];

console.log(`\nEndpoint: ${ENDPOINT}`);
console.log(`Auth: Bearer ${KEY.slice(0, 11)}...\n`);

const results = [];
for (const [label, body, expected] of cases) {
  results.push(await post(label, body, expected));
}

const passed = results.filter(r => r.pass).length;
console.log(`\n${passed}/${results.length} passed`);
process.exit(passed === results.length ? 0 : 1);
