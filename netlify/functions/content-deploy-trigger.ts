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

interface NetlifyDeploy {
  commit_ref: string | null;
  context: string;
  state: string;
  published_at: string | null;
  created_at: string;
}

async function netlifyRecentProdDeploys(token: string): Promise<NetlifyDeploy[]> {
  const res = await fetch(
    `https://api.netlify.com/api/v1/sites/${SITE_ID}/deploys?per_page=20`,
    { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(8000) },
  );
  if (!res.ok) throw new Error(`netlify deploys api ${res.status}`);
  const deploys = (await res.json()) as NetlifyDeploy[];
  return deploys.filter((d) => d.context === 'production');
}

const HEALTHY_STATES = new Set(['ready', 'building', 'uploading', 'processing', 'enqueued', 'new']);

function shouldSkipTrigger(deploys: NetlifyDeploy[], originSha: string): { skip: boolean; reason: string } {
  // 1. Any HEALTHY deploy already targeting origin's sha -> skip.
  //    A prior 'error' deploy for this sha means the last attempt FAILED; we
  //    should NOT skip on that. Retriggering the same build would just fail
  //    again (build code is the same), so also don't retry — just alert and
  //    let the operator fix the build. That's what monitor/notifyError does.
  const targeting = deploys.find(
    (d) => d.commit_ref && originSha.startsWith(d.commit_ref.slice(0, 8)),
  );
  if (targeting && HEALTHY_STATES.has(targeting.state)) {
    return { skip: true, reason: `deploy ${targeting.state} for ${originSha.slice(0, 8)} already exists` };
  }
  if (targeting && targeting.state === 'error') {
    return {
      skip: true,
      reason: `last build for ${originSha.slice(0, 8)} errored — not retrying (would fail again). Fix build first.`,
    };
  }
  // 2. Recency fallback: if ANY deploy touched prod in the last 22h with a
  //    healthy state (typical case: user did a manual CLI `netlify deploy`,
  //    which leaves commit_ref=null). Skip so we don't retrigger daily.
  const RECENT_MS = 22 * 60 * 60 * 1000;
  const latestHealthy = deploys.find((d) => HEALTHY_STATES.has(d.state));
  const ts = latestHealthy?.published_at || latestHealthy?.created_at;
  if (ts && Date.now() - new Date(ts).getTime() < RECENT_MS) {
    return { skip: true, reason: `last healthy deploy at ${ts} (<22h ago) — assuming it shipped current content` };
  }
  return { skip: false, reason: '' };
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

export default async () => {
  const token = process.env.NETLIFY_AUTH_TOKEN;
  if (!token) {
    await notifyError(
      'content-deploy-trigger',
      new Error('NETLIFY_AUTH_TOKEN missing in Netlify env — auto-deploy disabled. Set it in Site settings → Environment variables.'),
    );
    return new Response('missing NETLIFY_AUTH_TOKEN', { status: 500 });
  }

  try {
    const [originSha, deploys] = await Promise.all([
      githubMainSha(),
      netlifyRecentProdDeploys(token),
    ]);

    const decision = shouldSkipTrigger(deploys, originSha);
    if (decision.skip) {
      return new Response(`skip: ${decision.reason}`, { status: 200 });
    }

    await triggerNetlifyBuild(token);
    const msg = `🚀 Auto-deploy triggered: origin/main=${originSha.slice(0, 8)}`;
    await notifyInfo(msg);
    return new Response(msg, { status: 200 });
  } catch (e: unknown) {
    await notifyError('content-deploy-trigger', e);
    return new Response(e instanceof Error ? e.message : String(e), { status: 500 });
  }
};
