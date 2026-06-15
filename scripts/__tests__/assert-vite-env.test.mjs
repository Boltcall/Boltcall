import assert from 'node:assert/strict';

import { validateClientEnv } from '../assert-vite-env.mjs';

assert.deepEqual(
  validateClientEnv({
    VITE_SUPABASE_URL: 'https://hbwogktdajorojljkjwg.supabase.co',
    VITE_SUPABASE_ANON_KEY: 'test-anon-key',
  }),
  { ok: true, missing: [], placeholder: [] },
);

assert.deepEqual(
  validateClientEnv({
    VITE_SUPABASE_ANON_KEY: 'test-anon-key',
  }),
  { ok: false, missing: ['VITE_SUPABASE_URL'], placeholder: [] },
);

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

console.log('assert vite env tests passed');
