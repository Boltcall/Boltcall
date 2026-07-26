import { Handler } from '@netlify/functions';
import { notifyError, notifyInfo } from './_shared/notify';

/**
 * content-deploy-trigger.ts
 *
 * Daily 07:00 (between daily-seo-aeo-runner @06:30 and seo-coverage-monitor @07:12).
 *
 * The problem: daily-seo-aeo-runner commits new AEO markdown to origin/main,
 * but repo has no GitHub App -> Netlify webhook. New content sits dark until
 * someone manually runs `npm run build:prerender && netlify deploy`.
 *
 * This closes the loop: check if origin/main HEAD differs from last-deployed
 * commit_ref; if yes, POST to Netlify build API to trigger a new deploy.
 * Idempotent — if nothing new, does nothing.
 *
 * Requires env: NETLIFY_AUTH_TOKEN, NETLIFY_SITE_ID (set in Netlify UI).
 * Missing token = warns via Telegram + noop (does NOT crash the schedule).
 */

const SITE_ID = process.env.NETLIFY_SITE_ID || '8ec31e2a-c9cf-42e7-9b3d-7b7c04ed2613';
const REPO = 'Boltcall/Boltcall';
const BRANCH = 'main';

async function githubMainSha(): Promise<string> {
  const res = await fetch(`https://api.github.com/repos/${REPO}/commits/${BRANCH}`, {
    headers: { Accept: 'application/vnd.github+json' },
    signal: AbortSignal.timeout(6000),
  });
  if (!res.ok) throw new Error(`github api ${res.status}`);
  const data = (await res.json()) as { sha: string };
  return data.sha;
}

async function netlifyLastDeployedSha(token: string): Promise<string | null> {
  const res = await fetch(
    `https://api.netlify.com/api/v1/sites/${SITE_ID}/deploys?per_page=5&state=ready`,
    { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(8000) },
  );
  if (!res.ok) throw new Error(`netlify deploys api ${res.status}`);
  const deploys = (await res.json()) as Array<{ commit_ref: string | null; context: string }>;
  const prod = deploys.find((d) => d.context === 'production' && d.commit_ref);
  return prod?.commit_ref ?? null;
}

async function triggerNetlifyBuild(token: string): Promise<void> {
  const res = await fetch(`https://api.netlify.com/api/v1/sites/${SITE_ID}/builds`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ clear_cache: false }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`netlify build trigger ${res.status}: ${await res.text()}`);
}

export const handler: Handler = async () => {
  const token = process.env.NETLIFY_AUTH_TOKEN;
  if (!token) {
    await notifyError(
      'content-deploy-trigger',
      new Error('NETLIFY_AUTH_TOKEN missing in Netlify env — auto-deploy disabled. Set it in Site settings → Environment variables.'),
    );
    return { statusCode: 500, body: 'missing NETLIFY_AUTH_TOKEN' };
  }

  try {
    const [originSha, deployedSha] = await Promise.all([
      githubMainSha(),
      netlifyLastDeployedSha(token),
    ]);

    if (deployedSha && originSha.startsWith(deployedSha.slice(0, 8))) {
      return { statusCode: 200, body: `no new commits (deployed=${deployedSha.slice(0, 8)})` };
    }

    await triggerNetlifyBuild(token);
    const msg = `🚀 Auto-deploy triggered: origin/main=${originSha.slice(0, 8)} (was deployed=${deployedSha?.slice(0, 8) ?? 'none'})`;
    await notifyInfo(msg);
    return { statusCode: 200, body: msg };
  } catch (e: unknown) {
    await notifyError('content-deploy-trigger', e);
    return { statusCode: 500, body: e instanceof Error ? e.message : String(e) };
  }
};
