import { fileURLToPath } from 'node:url';

const REQUIRED_CLIENT_ENV = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'];

export function validateClientEnv(env = process.env) {
  const missing = REQUIRED_CLIENT_ENV.filter((name) => !String(env[name] || '').trim());
  const placeholder = REQUIRED_CLIENT_ENV.filter((name) =>
    /placeholder|your_supabase/i.test(String(env[name] || '')),
  );

  return {
    ok: missing.length === 0 && placeholder.length === 0,
    missing,
    placeholder,
  };
}

function main() {
  const result = validateClientEnv();
  if (result.ok) {
    console.log('assert-vite-env: browser Supabase env present');
    return;
  }

  const problems = [];
  if (result.missing.length > 0) {
    problems.push(`missing ${result.missing.join(', ')}`);
  }
  if (result.placeholder.length > 0) {
    problems.push(`placeholder values in ${result.placeholder.join(', ')}`);
  }

  console.error(`assert-vite-env: ${problems.join('; ')}`);
  console.error(
    'Load production env before building, for example: ' +
      '$env:VITE_SUPABASE_URL=(netlify env:get VITE_SUPABASE_URL --context production).Trim(); ' +
      '$env:VITE_SUPABASE_ANON_KEY=(netlify env:get VITE_SUPABASE_ANON_KEY --context production).Trim()',
  );
  process.exit(1);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
