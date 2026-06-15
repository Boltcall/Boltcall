import { describe, expect, it } from 'vitest';

import {
  classifyReadinessCheck,
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
});
