import { fileURLToPath } from 'node:url';

export function resolvePayPalConfig(env = process.env) {
  const mode = env.PAYPAL_MODE === 'sandbox' ? 'sandbox' : 'live';
  const isSandbox = mode === 'sandbox';
  const clientId = isSandbox ? env.PAYPAL_SANDBOX_CLIENT_ID : env.PAYPAL_CLIENT_ID;
  const clientSecret = isSandbox ? env.PAYPAL_SANDBOX_CLIENT_SECRET : env.PAYPAL_CLIENT_SECRET;

  return {
    mode,
    apiBase: isSandbox ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com',
    clientId: clientId || '',
    clientSecret: clientSecret || '',
  };
}

export function summarizePayPalReadiness(config, tokenData = {}) {
  return {
    status: 'passed',
    check: 'paypal_api_readiness',
    mode: config.mode,
    apiBase: config.apiBase,
    hasClientId: Boolean(config.clientId),
    hasClientSecret: Boolean(config.clientSecret),
    tokenType: tokenData.token_type || null,
    expiresInSeconds: Number.isFinite(Number(tokenData.expires_in)) ? Number(tokenData.expires_in) : null,
  };
}

async function fetchPayPalToken(config) {
  if (!config.clientId || !config.clientSecret) {
    throw new Error(
      `PayPal credentials missing for mode=${config.mode}. ` +
        `Set ${config.mode === 'sandbox' ? 'PAYPAL_SANDBOX_CLIENT_ID/SECRET' : 'PAYPAL_CLIENT_ID/SECRET'}.`,
    );
  }
  if (config.clientId.includes('*') || config.clientSecret.includes('*')) {
    throw new Error(
      'PayPal credentials appear to be masked. Run the deployed paypal-readiness function ' +
        'with x-internal-secret to test Netlify runtime credentials.',
    );
  }

  const res = await fetch(`${config.apiBase}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  const data = await res.json().catch(async () => ({ error: await res.text().catch(() => '') }));
  if (!res.ok) {
    throw new Error(`PayPal auth failed (${res.status}): ${JSON.stringify(data)}`);
  }
  return data;
}

async function main() {
  const config = resolvePayPalConfig();
  const tokenData = await fetchPayPalToken(config);
  return summarizePayPalReadiness(config, tokenData);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main()
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
    })
    .catch((err) => {
      console.error(JSON.stringify({
        status: 'failed',
        check: 'paypal_api_readiness',
        error: err.message,
      }, null, 2));
      process.exitCode = 1;
    });
}
