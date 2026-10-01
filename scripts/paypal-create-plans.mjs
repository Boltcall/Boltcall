// Create (or reuse) the Boltcall PayPal product + the 4 monthly plans at
// canonical prices, print the IDs, and write them into
// netlify/functions/_shared/paypal-ids.json (what checkout + webhook read).
// Idempotent: an ACTIVE plan with the same name AND price is reused.
//
// Usage:
//   PAYPAL_MODE=sandbox node scripts/paypal-create-plans.mjs
//   PAYPAL_MODE=live    node scripts/paypal-create-plans.mjs
// Credentials: PAYPAL_CLIENT_ID/SECRET (live) or PAYPAL_SANDBOX_CLIENT_ID/SECRET
// (sandbox), from env or the repo .env (see scripts/paypal/_client.mjs).
// Then commit paypal-ids.json and deploy. No PAYPAL_PLAN_* env vars needed.

import { readFileSync, writeFileSync } from 'fs';
import { paypal, banner, fail, MODE } from './paypal/_client.mjs';

// Canonical monthly USD — keep in sync with PLAN_INFO in src/lib/stripe.ts.
const PRICES = { starter: 549, pro: 897, ultimate: 4997, enterprise: 997 };
const PRODUCT_NAME = 'Boltcall — Speed-to-Lead Platform';
const IDS_PATH = new URL('../netlify/functions/_shared/paypal-ids.json', import.meta.url);

async function listAll(path, key) {
  const out = [];
  for (let page = 1; ; page++) {
    const sep = path.includes('?') ? '&' : '?';
    const data = await paypal('GET', `${path}${sep}page_size=20&page=${page}`);
    out.push(...(data[key] || []));
    if ((data[key] || []).length < 20) return out;
  }
}

banner('Create/reuse Boltcall product + monthly plans');

try {
  let product = (await listAll('/v1/catalogs/products', 'products')).find((p) => p.name === PRODUCT_NAME);
  if (product) {
    console.log(`\n= product reused  ${product.id}`);
  } else {
    product = await paypal('POST', '/v1/catalogs/products', {
      name: PRODUCT_NAME,
      description: 'Speed-to-lead platform for local service businesses. Every inbound lead responded to instantly and booked on the calendar.',
      type: 'SERVICE',
      category: 'SOFTWARE',
      home_url: 'https://boltcall.org',
    });
    console.log(`\n+ product created ${product.id}`);
  }

  const existing = [];
  for (const p of await listAll(`/v1/billing/plans?product_id=${product.id}`, 'plans')) {
    if (p.status === 'ACTIVE') existing.push(await paypal('GET', `/v1/billing/plans/${p.id}`));
  }

  const ids = JSON.parse(readFileSync(IDS_PATH, 'utf8'));
  ids[MODE].product_id = product.id;

  for (const [tier, price] of Object.entries(PRICES)) {
    const name = `Boltcall ${tier[0].toUpperCase()}${tier.slice(1)} (Monthly)`;
    let plan = existing.find((p) => {
      const cycle = p.billing_cycles?.find((c) => c.tenure_type === 'REGULAR');
      return p.name === name
        && cycle?.frequency?.interval_unit === 'MONTH'
        && Number(cycle?.pricing_scheme?.fixed_price?.value) === price;
    });
    if (plan) {
      console.log(`= ${tier.padEnd(10)} $${price}/mo  reused   ${plan.id}`);
    } else {
      plan = await paypal('POST', '/v1/billing/plans', {
        product_id: product.id,
        name,
        description: `Boltcall ${tier} plan, billed monthly.`,
        status: 'ACTIVE',
        billing_cycles: [{
          frequency: { interval_unit: 'MONTH', interval_count: 1 },
          tenure_type: 'REGULAR',
          sequence: 1,
          total_cycles: 0, // 0 = until cancelled
          pricing_scheme: { fixed_price: { value: price.toFixed(2), currency_code: 'USD' } },
        }],
        payment_preferences: {
          auto_bill_outstanding: true,
          setup_fee: { value: '0', currency_code: 'USD' },
          setup_fee_failure_action: 'CONTINUE',
          payment_failure_threshold: 3,
        },
        taxes: { percentage: '0', inclusive: false },
      });
      console.log(`+ ${tier.padEnd(10)} $${price}/mo  created  ${plan.id}`);
    }
    ids[MODE].plans[`${tier}_monthly`] = plan.id;
  }

  writeFileSync(IDS_PATH, `${JSON.stringify(ids, null, 2)}\n`);
  console.log(`\nWrote ${MODE} IDs to netlify/functions/_shared/paypal-ids.json. Commit + deploy it.\n`);
} catch (err) {
  fail(err);
}
