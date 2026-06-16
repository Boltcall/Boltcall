import { spawnSync } from 'node:child_process';

const PRODUCTION_ENV_KEYS = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_KEY',
  'FOUNDER_UUID',
];

function netlifyEnvGet(key, cwd = process.cwd()) {
  const result = spawnSync('netlify', ['env:get', key, '--context', 'production'], {
    cwd,
    shell: process.platform === 'win32',
    encoding: 'utf8',
    windowsHide: true,
  });
  if (result.status !== 0) return '';
  return String(result.stdout || '').trim();
}

export function hydrateManualGateEnv(inputEnv = process.env, opts = {}) {
  const env = { ...inputEnv };
  const getEnv = opts.getEnv || ((key) => netlifyEnvGet(key, opts.cwd || process.cwd()));

  if (!env.SUPABASE_URL && env.VITE_SUPABASE_URL) {
    env.SUPABASE_URL = env.VITE_SUPABASE_URL;
  }
  if (!env.SUPABASE_SERVICE_KEY && env.SUPABASE_SERVICE_ROLE_KEY) {
    env.SUPABASE_SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
  }

  for (const key of PRODUCTION_ENV_KEYS) {
    if (env[key]) continue;
    const value = getEnv(key);
    if (value) env[key] = value;
  }

  return env;
}
