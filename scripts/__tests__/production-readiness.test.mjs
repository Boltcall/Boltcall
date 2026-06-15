import { describe, expect, it } from 'vitest';

import {
  classifyReadinessCheck,
  hydrateProductionEnv,
  sanitizeSpawnEnv,
  summarizeProductionReadiness,
} from '../production-readiness.mjs';

describe('production-readiness helpers', () => {
  it('classifies live verifiers that need a real external event as action_required', () => {
    expect(
      classifyReadinessCheck({
        name: 'facebook_lead_ingestion',
        requiredAction: 'Submit a real/test Facebook Lead Ad.',
        result: {
          status: 'failed',
          check: 'facebook_lead_ingestion',
          reason: 'not_found',
        },
      }),
    ).toMatchObject({
      status: 'action_required',
      requiredAction: 'Submit a real/test Facebook Lead Ad.',
    });
  });

  it('keeps runtime readiness failures as failed', () => {
    expect(
      classifyReadinessCheck({
        name: 'paypal_runtime',
        result: {
          status: 'failed',
          check: 'paypal_api_readiness',
          error: 'PayPal auth failed',
        },
      }),
    ).toMatchObject({
      status: 'failed',
      reason: 'PayPal auth failed',
    });
  });

  it('summarizes mixed readiness without treating action-required checks as product failures', () => {
    expect(
      summarizeProductionReadiness([
        { name: 'production_smoke', status: 'passed' },
        { name: 'retell_runtime', status: 'passed' },
        { name: 'retell_phase_e', status: 'action_required' },
      ]),
    ).toEqual({
      status: 'action_required',
      passed: 2,
      failed: 0,
      actionRequired: 1,
      total: 3,
    });
  });

  it('summarizes any real failure as failed', () => {
    expect(
      summarizeProductionReadiness([
        { name: 'production_smoke', status: 'passed' },
        { name: 'paypal_runtime', status: 'failed' },
        { name: 'retell_phase_e', status: 'action_required' },
      ]),
    ).toMatchObject({
      status: 'failed',
      failed: 1,
      actionRequired: 1,
    });
  });

  it('removes Windows pseudo env keys that cannot be spawned', () => {
    expect(
      sanitizeSpawnEnv({
        '=C:': 'C:\\Users\\Asus\\Desktop\\Boltcall_website\\Boltcall',
        PATH: 'C:\\Windows',
        SITE_URL: 'https://boltcall.org',
      }),
    ).toEqual({
      PATH: 'C:\\Windows',
      SITE_URL: 'https://boltcall.org',
    });
  });

  it('hydrates missing production env from Netlify without replacing caller-provided values', async () => {
    const requested = [];
    const env = await hydrateProductionEnv(
      {
        SUPABASE_URL: 'existing-supabase-url',
        RETELL_API_KEY: 'existing-retell-key',
      },
      {
        fetchNetlifyEnvValue: async (key) => {
          requested.push(key);
          return `netlify-${key}`;
        },
      },
    );

    expect(env.SITE_URL).toBe('https://boltcall.org');
    expect(env.SUPABASE_URL).toBe('existing-supabase-url');
    expect(env.RETELL_API_KEY).toBe('existing-retell-key');
    expect(env.SUPABASE_SERVICE_KEY).toBe('netlify-SUPABASE_SERVICE_KEY');
    expect(env.VITE_SUPABASE_ANON_KEY).toBe('netlify-VITE_SUPABASE_ANON_KEY');
    expect(requested).not.toContain('SUPABASE_URL');
    expect(requested).not.toContain('RETELL_API_KEY');
  });

  it('does not set a missing env key when Netlify cannot return a value', async () => {
    const env = await hydrateProductionEnv(
      {},
      {
        fetchNetlifyEnvValue: async (key) => (key === 'INTERNAL_API_SECRET' ? '' : `netlify-${key}`),
      },
    );

    expect(env.INTERNAL_API_SECRET).toBeUndefined();
  });
});
