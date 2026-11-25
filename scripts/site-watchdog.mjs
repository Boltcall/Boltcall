import { appendFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { PRODUCTION_URL, REPOSITORY, SHA, SITE_ID, assertNetlifySite } from './release-control.mjs';
import { DEPLOY_ID, assertProductionPointer } from './release-upload.mjs';

const HOLD = 'boltcall/outage-rollback';
const sourcePattern = /^Auto-deploy main ([a-f0-9]{40}) run ([1-9]\d*) attempt ([1-9]\d*) prior ([a-f0-9]{24}) ([a-f0-9]{40})$/;
const immutable = id => 'https://' + id + '--boltcall.netlify.app';
const positive = value => Number.isSafeInteger(value) && value > 0;
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

async function publicResponse(base, path) {
  return fetch(new URL(path + '?watchdog=' + Date.now(), base), {
    headers: { 'Cache-Control': 'no-cache' }, signal: AbortSignal.timeout(10000), redirect: 'error',
  });
}

export async function probeHomepage(base) {
  try {
    const response = await publicResponse(base, '/');
    return response.status === 200 && /<title>[^<]*Boltcall[^<]*<\/title>/i.test(await response.text());
  } catch {
    return false;
  }
}

async function readMarker(base) {
  try {
    const response = await publicResponse(base, '/release.json');
    if (response.status === 200 && (response.headers.get('content-type') || '').includes('application/json')) {
      const marker = await response.json();
      if (marker.project_id === 'boltcall' && SHA.test(marker.sha || '')) return marker.sha;
    }
  } catch { /* An unreadable marker cannot establish a deploy identity. */ }
  return null;
}

async function request(base, endpoint, token, { method = 'GET', body } = {}) {
  if (!token) throw Error('Required workflow credential is unavailable');
  const response = await fetch(base + endpoint, {
    method, headers: { Authorization: 'Bearer ' + token, Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined, redirect: 'error', signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw Error(method + ' ' + endpoint + ' returned HTTP ' + response.status);
  return response.json();
}

const netlifyRequest = (endpoint, method) => request('https://api.netlify.com/api/v1/', endpoint, process.env.NETLIFY_AUTH_TOKEN, { method });
const githubRequest = (endpoint, body) => request('https://api.github.com/repos/' + REPOSITORY + '/', endpoint, process.env.GH_TOKEN, {
  method: body ? 'POST' : 'GET', body,
});

async function sitePointer(netlify) {
  const site = await netlify('sites/' + SITE_ID);
  assertNetlifySite(site);
  return site;
}

async function publishedDeploy(netlify, id) {
  if (!DEPLOY_ID.test(id || '')) return null;
  const deploy = await netlify('deploys/' + id);
  return deploy?.id === id && deploy.site_id === SITE_ID && deploy.context === 'production' &&
    deploy.state === 'ready' && Date.parse(deploy.published_at) > 0 &&
    deploy.deploy_ssl_url === immutable(id) ? deploy : null;
}

async function readOutageHold(github, sha) {
  for (let page = 1; page <= 10; page++) {
    const statuses = await github('commits/' + sha + '/statuses', undefined, page);
    if (!Array.isArray(statuses)) throw Error('Release hold status is unavailable');
    if (statuses.some(status => status.context === HOLD && status.state === 'failure')) return true;
    if (statuses.length < 100) return false;
  }
  throw Error('Release hold status history exceeds reconciliation bounds');
}

export async function assertNoOutageHold(sha, github = paginatedGithub) {
  if (!SHA.test(sha || '')) throw Error('Missing exact release SHA');
  if (await readOutageHold(github, sha)) throw Error('Production outage hold on this SHA');
}

export async function capturePreviousDeploy({ netlify = netlifyRequest, marker = readMarker, probe = probeHomepage } = {}) {
  const site = await sitePointer(netlify);
  const id = site.published_deploy?.id;
  const deploy = await publishedDeploy(netlify, id);
  if (!deploy) return null;
  const [publicSha, immutableSha, publicOk, immutableOk] = await Promise.all([
    marker(PRODUCTION_URL), marker(immutable(id)), probe(PRODUCTION_URL), probe(immutable(id)),
  ]);
  if (!SHA.test(publicSha || '') || publicSha !== immutableSha || !publicOk || !immutableOk) return null;
  assertProductionPointer(await sitePointer(netlify), id);
  return { id, sha: publicSha };
}

export async function restoreFromWatchdog({
  netlify = netlifyRequest, github = paginatedGithub, probe = probeHomepage,
  marker = readMarker, enabled = false, sleep = pause,
} = {}) {
  if (await probe(PRODUCTION_URL)) return { outcome: 'already_healthy' };
  const site = await sitePointer(netlify);
  const currentId = site.published_deploy?.id;
  const current = await publishedDeploy(netlify, currentId);
  const title = current?.title?.match(sourcePattern);
  if (!title) return { outcome: 'untracked_release' };
  const [, sha, run, attempt, previousId, previousSha] = title;
  if (currentId === previousId || sha === previousSha || !positive(Number(run)) || !positive(Number(attempt))) {
    return { outcome: 'invalid_predecessor' };
  }
  if (await probe(immutable(currentId))) return { outcome: 'custom_domain_down' };
  const previous = await publishedDeploy(netlify, previousId);
  if (!previous || Date.parse(previous.published_at) >= Date.parse(current.published_at) ||
      !await probe(immutable(previousId)) || await marker(immutable(previousId)) !== previousSha) {
    return { outcome: 'no_healthy_predecessor' };
  }
  const source = await github('actions/runs/' + run);
  if (source.path !== '.github/workflows/deploy-main.yml' || source.head_branch !== 'main' ||
      source.head_sha !== sha || source.id !== Number(run) || source.run_attempt !== Number(attempt)) {
    return { outcome: 'unverified_release' };
  }
  if (await readOutageHold(github, sha)) return { outcome: 'already_attempted' };
  if (!enabled) return { outcome: 'would_restore', previousId, sha };
  if (await probe(PRODUCTION_URL)) return { outcome: 'already_healthy' };
  assertProductionPointer(await sitePointer(netlify), currentId);
  const hold = await github('statuses/' + sha, {
    state: 'failure', context: HOLD, description: 'Confirmed outage. This release is held from republishing.',
  });
  if (hold?.state !== 'failure' || hold.context !== HOLD) throw Error('Release hold was not confirmed');
  assertProductionPointer(await sitePointer(netlify), currentId);
  const restored = await netlify('sites/' + SITE_ID + '/deploys/' + previousId + '/restore', 'POST');
  if (restored?.id !== previousId || restored.site_id !== SITE_ID) throw Error('Restore response is uncertain');
  for (let attempt = 0; attempt < 6; attempt++) {
    assertProductionPointer(await sitePointer(netlify), previousId);
    if (await probe(PRODUCTION_URL) && await marker(PRODUCTION_URL) === previousSha) {
      return { outcome: 'restored', previousId, sha };
    }
    await sleep(5000);
  }
  return { outcome: 'restored_unverified', previousId, sha };
}

function paginatedGithub(endpoint, body, page) {
  return githubRequest(page ? endpoint + '?per_page=100&page=' + page : endpoint, body);
}

async function run() {
  const command = process.argv[2];
  if (command === 'capture') {
    let previous;
    try { previous = await capturePreviousDeploy(); }
    catch (error) { console.warn('Previous deploy could not be verified: ' + error.message); }
    if (previous) appendFileSync(process.env.GITHUB_OUTPUT, 'previous_id=' + previous.id + '\nprevious_sha=' + previous.sha + '\n');
  } else if (command === 'check-hold') {
    await assertNoOutageHold(process.env.GITHUB_SHA);
  } else if (command === 'restore') {
    const result = await restoreFromWatchdog({ enabled: process.env.BOLTCALL_WATCHDOG_AUTO_RESTORE === 'true' });
    const summary = 'Boltcall watchdog recovery outcome: ' + result.outcome + '\n';
    console.log(summary.trim());
    if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
    if (result.outcome === 'restored_unverified') process.exitCode = 1;
  } else {
    throw Error('Unknown Boltcall watchdog command');
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run().catch(error => { console.error(error.message); process.exitCode = 1; });
}
