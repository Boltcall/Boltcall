import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const DEFAULT_SITE_URL = 'https://boltcall.org';

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

async function hydrateEnv(inputEnv = process.env, opts = {}) {
  const env = {
    ...inputEnv,
    SITE_URL: inputEnv.SITE_URL || DEFAULT_SITE_URL,
  };
  const getEnv = opts.getEnv || ((key) => netlifyEnvGet(key, opts.cwd || process.cwd()));
  if (!env.INTERNAL_API_SECRET) {
    const value = getEnv('INTERNAL_API_SECRET');
    if (value) env.INTERNAL_API_SECRET = value;
  }
  return env;
}

export function buildApprovalLinkEndpoint(siteUrl = DEFAULT_SITE_URL) {
  return new URL('/.netlify/functions/create-paypal-test-approval-link', siteUrl).toString();
}

export async function createPayPalTestApprovalLink(env = process.env, opts = {}) {
  const hydrated = await hydrateEnv(env, opts);
  const internalSecret = hydrated.INTERNAL_API_SECRET;
  const siteUrl = String(hydrated.SITE_URL || DEFAULT_SITE_URL).replace(/\/+$/, '');
  if (!internalSecret) throw new Error('INTERNAL_API_SECRET is required.');

  const response = await fetch(buildApprovalLinkEndpoint(siteUrl), {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-internal-secret': internalSecret,
    },
    body: '{}',
  });
  const body = await response.json().catch(async () => ({ error: await response.text() }));
  if (!response.ok) {
    throw new Error(body.error || `approval-link endpoint failed (${response.status})`);
  }
  return body;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  createPayPalTestApprovalLink()
    .then((result) => console.log(JSON.stringify(result, null, 2)))
    .catch((error) => {
      console.error(JSON.stringify({
        status: 'failed',
        check: 'paypal_test_approval_link',
        error: error instanceof Error ? error.message : String(error),
      }, null, 2));
      process.exitCode = 1;
    });
}
