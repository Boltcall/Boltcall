import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const DEFAULT_SITE_URL = 'https://boltcall.org';
const PRODUCTION_ENV_KEYS = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_KEY',
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'FOUNDER_UUID',
  'INTERNAL_API_SECRET',
  'RETELL_API_KEY',
];
const ACTION_REQUIRED_REASONS = new Set([
  'not_found',
  'no_recent_calls',
]);

function netlifyCommand() {
  return 'netlify';
}

export function parseJsonOutput(output) {
  const text = String(output || '').trim();
  let start = -1;
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === '{') {
      if (depth === 0) start = i;
      depth += 1;
      continue;
    }
    if (char === '}' && depth > 0) {
      depth -= 1;
      if (depth === 0 && start !== -1) {
        try {
          return JSON.parse(text.slice(start, i + 1));
        } catch {
          start = -1;
        }
      }
    }
  }
  return null;
}

export function sanitizeSpawnEnv(env = process.env) {
  return Object.fromEntries(
    Object.entries(env).filter(([key, value]) => key && !key.startsWith('=') && value !== undefined),
  );
}

function runProcess(command, args, opts = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: opts.cwd || process.cwd(),
      env: sanitizeSpawnEnv(opts.env || process.env),
      shell: opts.shell === true,
      windowsHide: true,
    });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', (error) => {
      resolve({
        exitCode: 1,
        stdout,
        stderr: `${stderr}${error.message}`,
      });
    });
    child.on('close', (exitCode) => {
      resolve({ exitCode, stdout, stderr });
    });
  });
}

async function runJsonCommand(command, args, opts = {}) {
  const output = await runProcess(command, args, opts);
  const parsed = parseJsonOutput(output.stdout) || parseJsonOutput(output.stderr);
  if (parsed) return parsed;
  return {
    status: 'failed',
    error: output.stderr.trim() || output.stdout.trim() || `Command exited ${output.exitCode}`,
  };
}

async function fetchNetlifyProductionEnvValue(key, opts = {}) {
  const output = await runProcess(
    netlifyCommand(),
    ['env:get', key, '--context', 'production'],
    {
      cwd: opts.cwd || process.cwd(),
      env: opts.env || process.env,
      shell: process.platform === 'win32',
    },
  );
  if (output.exitCode !== 0) return '';
  return String(output.stdout || '').trim();
}

export async function hydrateProductionEnv(inputEnv = process.env, opts = {}) {
  const env = {
    ...inputEnv,
    SITE_URL: inputEnv.SITE_URL || DEFAULT_SITE_URL,
  };
  const fetchEnvValue = opts.fetchNetlifyEnvValue || ((key) =>
    fetchNetlifyProductionEnvValue(key, { cwd: opts.cwd, env }));

  for (const key of PRODUCTION_ENV_KEYS) {
    if (env[key]) continue;
    const value = await fetchEnvValue(key);
    if (value) env[key] = value;
  }

  return env;
}

async function postInternalReadiness(siteUrl, functionName, internalSecret) {
  if (!internalSecret) {
    return {
      status: 'failed',
      check: functionName,
      error: 'INTERNAL_API_SECRET is required for internal readiness checks.',
    };
  }

  const res = await fetch(`${siteUrl}/.netlify/functions/${functionName}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-internal-secret': internalSecret,
    },
    body: '{}',
  });
  const body = await res.json().catch(async () => ({
    status: 'failed',
    error: await res.text().catch(() => `HTTP ${res.status}`),
  }));
  return body;
}

export function classifyReadinessCheck(check) {
  const result = check.result || {};
  const status = result.status === 'passed' ? 'passed' : 'failed';
  const reason = result.reason || result.error || null;

  if (status === 'passed') {
    return {
      name: check.name,
      status: 'passed',
      check: result.check || check.name,
      result,
    };
  }

  if (check.requiredAction && ACTION_REQUIRED_REASONS.has(String(reason))) {
    return {
      name: check.name,
      status: 'action_required',
      check: result.check || check.name,
      reason,
      requiredAction: check.requiredAction,
      result,
    };
  }

  return {
    name: check.name,
    status: 'failed',
    check: result.check || check.name,
    reason: reason || 'failed',
    result,
  };
}

export function summarizeProductionReadiness(checks) {
  const passed = checks.filter((check) => check.status === 'passed').length;
  const failed = checks.filter((check) => check.status === 'failed').length;
  const actionRequired = checks.filter((check) => check.status === 'action_required').length;

  return {
    status: failed > 0 ? 'failed' : actionRequired > 0 ? 'action_required' : 'passed',
    passed,
    failed,
    actionRequired,
    total: checks.length,
  };
}

function buildVerifierEnv(env = process.env) {
  const sinceIso = env.RETELL_PHASE_E_SINCE_ISO ||
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  return {
    ...env,
    SITE_URL: env.SITE_URL || DEFAULT_SITE_URL,
    RETELL_PHASE_E_SINCE_ISO: sinceIso,
  };
}

export async function runProductionReadiness(opts = {}) {
  const cwd = opts.cwd || process.cwd();
  const hydratedEnv = await hydrateProductionEnv(opts.env || process.env, {
    cwd,
    fetchNetlifyEnvValue: opts.fetchNetlifyEnvValue,
  });
  const env = buildVerifierEnv(hydratedEnv);
  const siteUrl = env.SITE_URL || DEFAULT_SITE_URL;
  const internalSecret = env.INTERNAL_API_SECRET || env.INTERNAL_WEBHOOK_SECRET || '';
  const runJson = opts.runJsonCommand || runJsonCommand;
  const postInternal = opts.postInternalReadiness || postInternalReadiness;

  const rawChecks = [];

  rawChecks.push({
    name: 'production_smoke',
    result: await runJson(process.execPath, ['scripts/smoke-production.mjs'], { cwd, env }),
  });
  rawChecks.push({
    name: 'support_kb_coverage',
    result: await runJson(process.execPath, ['scripts/audit-support-kb-coverage.mjs'], { cwd, env }),
  });
  rawChecks.push({
    name: 'support_agent_live',
    result: await runJson(process.execPath, ['scripts/smoke-v2-help-live.mjs'], { cwd, env }),
  });
  rawChecks.push({
    name: 'support_agent_topic_coverage_live',
    result: await runJson(process.execPath, ['scripts/smoke-v2-help-topics-live.mjs'], { cwd, env }),
  });

  for (const [name, functionName] of [
    ['facebook_runtime', 'facebook-readiness'],
    ['paypal_runtime', 'paypal-readiness'],
    ['retell_runtime', 'retell-readiness'],
  ]) {
    rawChecks.push({
      name,
      result: await postInternal(siteUrl, functionName, internalSecret),
    });
  }

  rawChecks.push({
    name: 'facebook_page_connection',
    requiredAction: 'Connect the founder Facebook Page in the Boltcall dashboard.',
    result: await runJson(process.execPath, ['scripts/verify-facebook-page-connection.mjs'], { cwd, env }),
  });
  rawChecks.push({
    name: 'facebook_lead_ingestion',
    requiredAction: 'Submit a real/test Facebook Lead Ad after the Page is connected.',
    result: await runJson(process.execPath, ['scripts/verify-facebook-lead-ingestion.mjs', '--lookback-hours', '168'], { cwd, env }),
  });
  rawChecks.push({
    name: 'paypal_live_test_payment',
    requiredAction: 'Approve and capture the real $2 PayPal test payment from Boltcall billing.',
    result: await runJson(process.execPath, ['scripts/verify-paypal-test-payment.mjs', '--lookback-hours', '168'], { cwd, env }),
  });
  rawChecks.push({
    name: 'retell_phase_e',
    requiredAction: 'Call the QA Retell number and complete a 30-60 second Rapid Rooter QA conversation.',
    result: await runJson(process.execPath, ['scripts/verify-retell-phase-e.mjs'], { cwd, env }),
  });

  const checks = rawChecks.map(classifyReadinessCheck);
  return {
    ...summarizeProductionReadiness(checks),
    siteUrl,
    generatedAt: new Date().toISOString(),
    checks,
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  runProductionReadiness()
    .then((summary) => {
      console.log(JSON.stringify(summary, null, 2));
      if (summary.status === 'failed') process.exitCode = 1;
    })
    .catch((error) => {
      console.error(JSON.stringify({
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
      }, null, 2));
      process.exitCode = 1;
    });
}
