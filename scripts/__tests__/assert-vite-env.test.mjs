import assert from 'node:assert/strict';
import { describe, it } from 'vitest';

import { validateClientEnv } from '../assert-vite-env.mjs';

describe('assert-vite-env', () => {
  it('accepts real-looking Supabase browser env', () => {
    assert.deepEqual(
      validateClientEnv({
        VITE_SUPABASE_URL: 'https://hbwogktdajorojljkjwg.supabase.co',
        VITE_SUPABASE_ANON_KEY: 'test-anon-key',
      }),
      { ok: true, missing: [], placeholder: [] },
    );
  });

  it('reports missing required browser env', () => {
    assert.deepEqual(
      validateClientEnv({
        VITE_SUPABASE_ANON_KEY: 'test-anon-key',
      }),
      { ok: true, missing: ['VITE_SUPABASE_URL'], placeholder: [] },
    );
  });

  it('rejects placeholder browser env', () => {
    assert.deepEqual(
      validateClientEnv({
        VITE_SUPABASE_URL: 'https://placeholder.supabase.co',
        VITE_SUPABASE_ANON_KEY: 'placeholder-anon-key',
      }),
      {
        ok: false,
        missing: [],
        placeholder: ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'],
      },
    );
  });
});
