import { execFileSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PRODUCTION_URL } from './release-control.mjs';

const SHA = /^[a-f0-9]{40}$/;

// Reads the commit boltcall.org is serving from its /release.json marker (written by
// both the auto-deploy and the prepared-release paths) and decides whether `sha` may
// replace it: skip a duplicate, refuse anything that does not contain the live commit.
export async function checkLiveCommit({ sha, rootDir = process.cwd(), force = false, fetchImpl = fetch }) {
  if (!SHA.test(sha || '')) throw new Error('Exact deployment SHA required');
  let live;
  try {
    const response = await fetchImpl(`${PRODUCTION_URL}/release.json?check=${Date.now()}`, { cache: 'no-store', signal: AbortSignal.timeout(15000) });
    if (response.ok) live = (await response.json())?.sha;
  } catch { /* No marker yet (first deploy, or an older manual deploy) must stay deployable. */ }
  if (!SHA.test(live || '')) return { deploy: true, live: null, reason: 'Production commit unknown; deploying' };
  if (live === sha) return { deploy: force, live, reason: force ? 'Explicit same-commit redeploy' : 'Commit is already live; duplicate skipped' };
  try {
    execFileSync('git', ['-C', rootDir, 'merge-base', '--is-ancestor', live, sha], { stdio: 'pipe' });
  } catch {
    throw new Error(`Refusing older or divergent deployment ${sha}: production ${live} must be an ancestor. Merge main and deploy the newer commit instead.`);
  }
  return { deploy: true, live, reason: `Deployment includes the current production commit ${live}` };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const result = await checkLiveCommit({ sha: process.env.GITHUB_SHA, force: process.env.FORCE_REDEPLOY === 'true' });
    console.log(result.reason);
    if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `deploy=${result.deploy}\n`);
    if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${result.reason}\n`);
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
