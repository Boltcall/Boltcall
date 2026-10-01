import { afterEach, describe, expect, it, vi } from 'vitest';
import ids from '../_shared/paypal-ids.json';

async function load(env: Record<string, string>) {
  vi.resetModules();
  for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v);
  return import('../_shared/paypal-client');
}

describe('paypalPlanId', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('reads the committed live plan id when no env var is set', async () => {
    const { paypalPlanId } = await load({ PAYPAL_MODE: 'live', PAYPAL_PLAN_PRO_MONTHLY: '', PAYPAL_PLAN_PRO_YEARLY: '' });
    expect(paypalPlanId('pro', 'monthly')).toBe(ids.live.plans.pro_monthly);
    expect(paypalPlanId('pro', 'monthly')).toMatch(/^P-/);
    expect(paypalPlanId('pro', 'yearly')).toBeUndefined();
  });

  it('lets an env var override, and sandbox mode reads sandbox ids', async () => {
    const live = await load({ PAYPAL_MODE: 'live', PAYPAL_PLAN_STARTER_MONTHLY: 'P-OVERRIDE' });
    expect(live.paypalPlanId('starter', 'monthly')).toBe('P-OVERRIDE');

    const sandbox = await load({ PAYPAL_MODE: 'sandbox', PAYPAL_PLAN_STARTER_MONTHLY_SANDBOX: '' });
    expect(sandbox.paypalPlanId('starter', 'monthly')).toBe(ids.sandbox.plans.starter_monthly);
  });
});
