import { describe, expect, it } from 'vitest';

import { hydrateManualGateEnv } from '../_shared/manual-gate-env.mjs';

describe('manual gate env hydration', () => {
  it('keeps explicit env values and fills missing production gate values from Netlify', () => {
    const requested = [];
    const env = hydrateManualGateEnv(
      {
        SUPABASE_URL: 'https://explicit.supabase.co',
        SUPABASE_SERVICE_ROLE_KEY: 'explicit-service-role',
      },
      {
        getEnv: (key) => {
          requested.push(key);
          return {
            SUPABASE_SERVICE_KEY: 'netlify-service-key',
            FOUNDER_UUID: 'founder-1',
          }[key] || '';
        },
      },
    );

    expect(env.SUPABASE_URL).toBe('https://explicit.supabase.co');
    expect(env.SUPABASE_SERVICE_KEY).toBe('explicit-service-role');
    expect(env.FOUNDER_UUID).toBe('founder-1');
    expect(requested).toEqual(['FOUNDER_UUID']);
  });
});
