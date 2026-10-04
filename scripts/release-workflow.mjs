import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { checkLiveCommit } from './check-live-commit.mjs';
import { materializeFunctionCache, withFreshFunctionCache } from './release-functions.mjs';
import { redactReleaseOutput } from './release-diagnostics.mjs';
import { DEPLOY_ID, fingerprint, assertProductionPointer, readDeploymentReceipt, saveDeploymentReceipt } from './release-upload.mjs';
import { REPOSITORY, SITE_ID, PRODUCTION_URL, SHA, HASH, sha256, assertOwnerGate,
  readApprovedManifest, verifyPreparation, inspectPullRequest, listAll, releaseMarker,
  assertNetlifySite, verifyLiveDeployment, selectApprovalReceipts } from './release-control.mjs';

export async function command(bin, args, options = {}) {
  try {
    const { stdout } = await promisify(execFile)(bin, args, { encoding: 'utf8', timeout: 1800000,
      maxBuffer: 16000000, windowsHide: true, ...options });
    return Buffer.isBuffer(stdout) ? stdout : stdout.trim();
  } catch (error) {
    const status = Number.isInteger(error.code) ? `exit ${error.code}` : /^[A-Z_0-9]+$/.test(error.code || '') ? error.code : 'unknown exit';
    // Child error.message includes the full command and arguments. Report only
    // bounded stdout/stderr after redaction, never the raw error or its cause.
    const detail = redactReleaseOutput(`${error.stdout || ''}\n${error.stderr || ''}`, options.env || process.env);
    throw Error(`${path.basename(bin)} failed (${status})${error.signal ? `; signal ${error.signal}` : ''}${detail ? `\n${detail}` : ''}\nInspect workflow receipts and production before recovery; do not replay the failed deployment request.`);
  }
}

export function githubApi(token = process.env.GH_TOKEN) {
  return async (endpoint, { method = 'GET', body, raw = false, upload = false, accept = 'application/vnd.github+json' } = {}) => {
    const url = upload ? endpoint : `https://api.github.com/${endpoint === 'graphql' ? endpoint : `repos/${REPOSITORY}/${endpoint}`}`;
    const response = await fetch(url, { method, headers: { Authorization: `Bearer ${token}`,
      Accept: accept, 'X-GitHub-Api-Version': '2022-11-28',
      ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: upload ? body : JSON.stringify(body) } : {}), signal: AbortSignal.timeout(180000) });
    if (!response.ok) throw Error(`GitHub release request failed (HTTP ${response.status})`);
    if (Number(response.headers.get('content-length')) > 350000000) throw Error('Release evidence exceeds download limit');
    if (raw) return Buffer.from(await response.arrayBuffer());
    if (response.status === 204) return null;
    const result = await response.json();
    if (result.errors?.length) throw Error('GitHub rejected the release operation');
    return result;
  };
}

function assertMain(env) {
  if (env.GITHUB_REPOSITORY !== REPOSITORY || env.GITHUB_REF !== 'refs/heads/main' ||
      env.GITHUB_EVENT_NAME !== 'workflow_dispatch' || !SHA.test(env.GITHUB_SHA || '')) throw Error('Release workflows must execute from canonical main');
}
async function summary(env, text) { if (env.GITHUB_STEP_SUMMARY) await fs.appendFile(env.GITHUB_STEP_SUMMARY, text); }
async function output(env, values) {
  if (env.GITHUB_OUTPUT) await fs.appendFile(env.GITHUB_OUTPUT, Object.entries(values).map(([key, value]) => `${key}=${value}\n`).join(''));
}
async function gate(api, name) {
  const environment = await api(`environments/${name}`);
  const policies = await listAll(api, `environments/${name}/deployment-branch-policies`, 'branch_policies');
  assertOwnerGate(environment, policies, name);
}
async function gates(api) { await gate(api, 'production'); await gate(api, 'production-verification'); }

export async function runIntegration({ env = process.env, api = githubApi() } = {}) {
  assertMain(env);
  const phase = env.INTEGRATION_PHASE;
  const runId = env.GITHUB_RUN_ID;
  if (!['inspect', 'merge'].includes(phase) || env.GITHUB_JOB !== phase || !/^[a-f0-9-]{36}$/.test(env.REQUEST_ID || '') ||
      !/^[1-9]\d*$/.test(runId || '')) throw Error('Invalid integration workflow phase, request or run identity');
  const number = Number(env.PR_NUMBER);
  const result = await inspectPullRequest(api, number, env.SOURCE_SHA);
  await summary(env, `## CI-verified Boltcall integration\n\nPR: https://github.com/${REPOSITORY}/pull/${number}\n\nHead: ${env.SOURCE_SHA}\n\nRequest: ${env.REQUEST_ID}\n\nLatest CI: ${result.run?.html_url || 'Already merged'}\n\nThe exact head is merged after successful CI, without a manual review. Main deployment runs automatically.\n`);
  if (phase === 'merge' && !result.merged) {
    if (result.pr.draft) await api('graphql', { method: 'POST', body: { query: 'mutation($id:ID!){markPullRequestReadyForReview(input:{pullRequestId:$id}){pullRequest{id}}}', variables: { id: result.pr.node_id } } });
    // The protected-main rule binds this context to the GitHub Actions App.
    // Only this trusted-main job may attest to the freshly rechecked CI head.
    await api(`statuses/${env.SOURCE_SHA}`, { method: 'POST', body: { state: 'success', context: 'atlas-owner-integration',
      description: 'Exact PR head verified against latest successful CI', target_url: `https://github.com/${REPOSITORY}/actions/runs/${runId}` } });
    const merged = await api(`pulls/${number}/merge`, { method: 'PUT', body: { sha: env.SOURCE_SHA, merge_method: 'merge' } });
    if (!merged.merged || !SHA.test(merged.sha || '')) throw Error('GitHub did not merge the selected PR');
    await summary(env, `\nMerged source: ${merged.sha}\n`);
    return merged;
  }
  return result;
}

export async function publishPrepared({ env = process.env, api = githubApi(), run = command } = {}) {
  assertMain(env);
  const source = env.SOURCE_SHA, runId = Number(env.GITHUB_RUN_ID), attempt = Number(env.GITHUB_RUN_ATTEMPT);
  if (env.GITHUB_JOB !== 'publish' || !SHA.test(source || '')) throw Error('Invalid preparation phase');
  await run('git', ['fetch', 'origin', 'main']);
  await run('git', ['merge-base', '--is-ancestor', source, 'origin/main']);
  const releaseId = `boltcall-${source.slice(0, 12)}-${runId}-${attempt}`;
  const artifact = await api(`actions/artifacts/${Number(env.PAYLOAD_ARTIFACT_ID)}`);
  if (artifact.name !== `boltcall-payload-${runId}-${attempt}` || artifact.expired !== false ||
      artifact.workflow_run?.id !== runId || artifact.workflow_run?.head_sha !== env.GITHUB_SHA ||
      artifact.digest !== env.PAYLOAD_ARTIFACT_DIGEST) throw Error('Preparation artifact identity changed');
  const jobs = await listAll(api, `actions/runs/${runId}/attempts/${attempt}/jobs`, 'jobs');
  if (!jobs.some(job => job.name === 'validate' && job.run_id === runId && job.run_attempt === attempt && job.conclusion === 'success')) throw Error('Required validation has not passed');
  const manifest = { schema_version: 1, project_id: 'boltcall', repository: REPOSITORY, release_id: releaseId,
    source_sha: source, created_at: new Date().toISOString(),
    preparation: { run_id: runId, run_attempt: attempt, workflow_sha: env.GITHUB_SHA, path: '.github/workflows/prepare-boltcall-release.yml' },
    artifact: { id: artifact.id, name: artifact.name, digest: artifact.digest, payload_sha256: env.PAYLOAD_SHA256 },
    target: { provider: 'netlify', site_id: SITE_ID, production_url: PRODUCTION_URL },
    checks: { typecheck: true, tests: true, build: true, functions: true } };
  const bytes = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`), hash = sha256(bytes);
  readApprovedManifest(bytes, releaseId, hash);
  const existing = await listAll(api, 'releases');
  if (existing.some(release => release.tag_name === releaseId)) throw Error('Release identity already exists; prepared evidence is write-once');
  const release = await api('releases', { method: 'POST', body: { tag_name: releaseId, target_commitish: source,
    name: releaseId, draft: true, body: `Prepared source: ${source}\nManifest SHA256: ${hash}\nPreparation: https://github.com/${REPOSITORY}/actions/runs/${runId}\nProduction is not deployed by preparation.` } });
  const asset = await api(`https://uploads.github.com/repos/${REPOSITORY}/releases/${release.id}/assets?name=release-manifest.json`, { method: 'POST', body: bytes, upload: true });
  if (!Number.isSafeInteger(asset?.id) || asset.id < 1 || asset.name !== 'release-manifest.json' ||
      asset.state !== 'uploaded' || asset.size !== bytes.length) throw Error('Prepared manifest upload is incomplete');
  readApprovedManifest(await api(`releases/assets/${asset.id}`, { raw: true, accept: 'application/octet-stream' }), releaseId, hash);
  // Drafts are invisible to contents:read callers. Publish only the verified
  // evidence as a prerelease; the separate owner gates still control deployment.
  const published = await api(`releases/${release.id}`, { method: 'PATCH', body: { draft: false, prerelease: true, make_latest: 'false' } });
  if (published?.id !== release.id || published.tag_name !== releaseId || published.draft !== false || published.prerelease !== true) {
    throw Error('Prepared manifest release is not published');
  }
  await summary(env, `## Prepared Boltcall release\n\nRelease: ${releaseId}\n\nSource: ${source}\n\nManifest SHA256: ${hash}\n\nPayload SHA256: ${manifest.artifact.payload_sha256}\n\nRetained artifact: ${artifact.id}\n\nDeployment requires the exact release ID/hash and owner approval.\n`);
  return manifest;
}

export async function inspectPrepared({ env = process.env, api = githubApi(), run = command } = {}) {
  assertMain(env);
  if (!/^boltcall-[a-f0-9]{12}-\d+-[1-9]\d*$/.test(env.RELEASE_ID || '') || !HASH.test(env.MANIFEST_HASH || '')) throw Error('Invalid release selection');
  const releases = await listAll(api, 'releases');
  const release = releases.find(item => item.tag_name === env.RELEASE_ID);
  const assets = release?.assets?.filter(asset => asset.name === 'release-manifest.json');
  if (assets?.length !== 1 || assets[0].size > 200000) throw Error('Prepared manifest asset is unavailable');
  // Asset API returns JSON by default. The authenticated octet-stream request
  // downloads published evidence using the consumer's read-only token.
  const bytes = await api(`releases/assets/${assets[0].id}`, { raw: true, accept: 'application/octet-stream' });
  const manifest = readApprovedManifest(bytes, env.RELEASE_ID, env.MANIFEST_HASH);
  await run('git', ['fetch', 'origin', 'main']);
  await run('git', ['merge-base', '--is-ancestor', manifest.source_sha, 'origin/main']);
  const p = manifest.preparation;
  const prepRun = await api(`actions/runs/${p.run_id}/attempts/${p.run_attempt}`);
  const jobs = await listAll(api, `actions/runs/${p.run_id}/attempts/${p.run_attempt}/jobs`, 'jobs');
  const artifact = await api(`actions/artifacts/${manifest.artifact.id}`);
  verifyPreparation(manifest, { run: prepRun, jobs, artifact, mainContains: true });
  await gates(api);
  releaseMarker(manifest, env.MANIFEST_HASH, { requestId: env.REQUEST_ID, runId: Number(env.GITHUB_RUN_ID), runAttempt: Number(env.GITHUB_RUN_ATTEMPT) });
  await summary(env, `## Review prepared Boltcall release\n\nRelease: ${manifest.release_id}\n\nSource: ${manifest.source_sha}\n\nManifest SHA256: ${env.MANIFEST_HASH}\n\nPayload SHA256: ${manifest.artifact.payload_sha256}\n\nNetlify site: ${SITE_ID}\n\nProduction: ${PRODUCTION_URL}\n\nRequest: ${env.REQUEST_ID}\n\nApproval covers a verified preview followed by one identical production upload, with one restoration of the captured previous deployment if immediate production verification fails.\n\nBrowser acceptance remains required after deployment.\n`);
  await output(env, { source_sha: manifest.source_sha, release_url: `https://github.com/${REPOSITORY}/releases` });
  return manifest;
}

async function downloadArtifact(api, artifact, directory, expectedFile) {
  // Actions requires the JSON API media type before redirecting to ZIP bytes.
  const bytes = await api(`actions/artifacts/${artifact.id}/zip`, { raw: true });
  if (`sha256:${sha256(bytes)}` !== artifact.digest) throw Error('Downloaded artifact digest changed');
  await fs.mkdir(directory, { recursive: true });
  const archive = path.resolve(directory, 'artifact.zip');
  await fs.writeFile(archive, bytes);
  const entries = (await command('unzip', ['-Z1', archive])).split(/\r?\n/);
  if (entries.length !== 1 || entries[0] !== expectedFile) throw Error('Release artifact contains unexpected files');
  await command('unzip', ['-q', archive, '-d', directory]);
  return path.resolve(directory, expectedFile);
}
async function netlify(endpoint, { method = 'GET' } = {}) {
  const response = await fetch(`https://api.netlify.com/api/v1/${endpoint}`, { method, headers: { Authorization: `Bearer ${process.env.NETLIFY_AUTH_TOKEN}` }, signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw Error(`Netlify inspection failed (HTTP ${response.status})`);
  return response.json();
}
async function liveCheck(manifest, env, receipt) {
  const expected = releaseMarker(manifest, env.MANIFEST_HASH, { requestId: env.REQUEST_ID,
    runId: Number(env.GITHUB_RUN_ID), runAttempt: receipt.run_attempt });
  const response = await fetch(`${PRODUCTION_URL}/release.json?release=${encodeURIComponent(env.RELEASE_ID)}&check=${Date.now()}`, { cache: 'no-store', signal: AbortSignal.timeout(30000) });
  if (!response.ok || !(response.headers.get('content-type') || '').includes('application/json')) throw Error('Public release marker is unavailable');
  const marker = await response.json();
  const site = await netlify(`sites/${SITE_ID}`);
  const deploy = await netlify(`deploys/${receipt.deploy_id}`);
  verifyLiveDeployment({ expected, marker, receipt, site, deploy });
  await smokeFunctions(PRODUCTION_URL);
  return expected;
}

async function smokeFunctions(baseUrl, fetchResponse = fetch) {
  for (const name of ['saas-v2-leads', 'saas-v2-calls', 'retell-agents']) {
    const response = await fetchResponse(`${baseUrl}/.netlify/functions/${name}`, { redirect: 'error', signal: AbortSignal.timeout(30000) });
    if (response.status !== 401) throw Error(`Function smoke failed: ${name} returned HTTP ${response.status}`);
    await response.body?.cancel?.();
  }
}

export async function uploadPreparedPayload({ directory, message, checkoutDirectory = process.cwd(), run = command, mode = 'preview', cachePath }) {
  directory = path.resolve(directory);
  if (directory === path.resolve(checkoutDirectory)) throw Error('Prepared payload must be separate from the CLI process directory');
  if (!['preview', 'production'].includes(mode)) throw Error('Invalid upload mode');
  if (mode === 'preview') cachePath = await materializeFunctionCache(directory);
  else if (cachePath !== path.join(directory, '.netlify/functions/manifest.json')) throw Error('Production must reuse the verified function cache');
  const functionManifest = JSON.parse(await fs.readFile(cachePath));
  const functions = await Promise.all(functionManifest.functions.map(async fn => ({ name: fn.name, digest: sha256(await fs.readFile(fn.path)),
    runtime: fn.runtimeVersion, invocationMode: fn.invocationMode, buildData: fn.buildData, schedule: fn.schedule })));
  const result = JSON.parse(await withFreshFunctionCache(cachePath, signal => run(process.execPath, [fileURLToPath(new URL('./netlify-draft.mjs', import.meta.url)), 'deploy', mode === 'preview' ? '--draft' : '--prod', '--no-build',
    `--cwd=${directory}`, '--dir=dist', '--functions=.netlify-fn-build', '--timeout=600', '--json', '--message', message],
  { cwd: checkoutDirectory, env: { ...process.env, NETLIFY_SITE_ID: SITE_ID, CONTEXT: 'production', BOLTCALL_RELEASE_MODE: mode,
    BOLTCALL_RELEASE_STATE: path.resolve(checkoutDirectory, 'deployment-receipt.json') }, signal })));
  if (result.site_id !== SITE_ID || !/^[a-f0-9]{24}$/.test(result.deploy_id || '')) throw Error('Netlify returned an invalid draft receipt');
  return { result, functions, cachePath };
}

export function assertPreparedDeployMetadata(deploy, receipt, functions, context = 'production') {
  if (deploy?.id !== receipt.deploy_id || deploy.site_id !== SITE_ID || deploy.state !== 'ready' || deploy.context !== context) throw Error('Prepared deployment identity changed');
  const actual = deploy.available_functions;
  if (!Array.isArray(actual) || actual.length !== functions.length || new Set(actual.map(fn => fn.n)).size !== functions.length) throw Error('Prepared function inventory changed');
  for (const fn of functions) {
    const observed = actual.find(item => item.n === fn.name);
    if (!observed || observed.d !== fn.digest || (fn.runtime && observed.r !== fn.runtime) ||
        (observed.im || null) !== (fn.invocationMode || null) ||
        !Object.entries(fn.buildData).every(([key, value]) => observed.bd?.[key] === value)) throw Error(`Prepared function metadata changed: ${fn.name}`);
  }
  const schedules = functions.filter(fn => fn.schedule).map(fn => ({ name: fn.name, cron: fn.schedule }));
  const sorted = list => [...list].sort((a, b) => a.name.localeCompare(b.name));
  if (!Array.isArray(deploy.function_schedules) || JSON.stringify(sorted(deploy.function_schedules)) !== JSON.stringify(sorted(schedules))) throw Error('Prepared function schedules changed');
}

async function verifyMarker(baseUrl, receipt, fetchResponse) {
  const response = await fetchResponse(`${baseUrl}/release.json`, { redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(30000) });
  if (!response.ok || !(response.headers.get('content-type') || '').includes('application/json')) throw Error('Release marker is unavailable');
  const marker = await response.json();
  for (const key of ['schema_version', 'project_id', 'sha', 'release_id', 'manifest_hash', 'request_id', 'run_id', 'run_attempt', 'site_id']) {
    if (marker[key] !== receipt[key]) throw Error('Release marker changed');
  }
}

const runtimeIdentity = deploy => fingerprint({ available_functions: [...deploy.available_functions].sort((a, b) => a.n.localeCompare(b.n)),
  function_schedules: [...(deploy.function_schedules || [])].sort((a, b) => a.name.localeCompare(b.name)) });
async function markerSnapshot(fetchResponse) {
  const response = await fetchResponse(`${PRODUCTION_URL}/release.json`, { redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(30000) });
  if (response.status >= 500) throw Error('Known production marker is unavailable');
  return response.ok && (response.headers.get('content-type') || '').includes('application/json')
    ? { json: await response.json() } : { status: response.status, json: null };
}
function assertReadyProduction(deploy, id) {
  if (deploy?.id !== id || deploy.site_id !== SITE_ID || deploy.state !== 'ready' || deploy.context !== 'production' || !deploy.published_at ||
      !Array.isArray(deploy.available_functions) || !deploy.available_functions.length) throw Error('Known production identity is unavailable');
}

async function recoverProduction(receipt, previous, previousMarker, { api, fetchResponse, saveReceipt }) {
  receipt = { ...receipt, failure_stage: receipt.stage, stage: 'production_uncertain' };
  await saveReceipt(receipt);
  let site = await api(`sites/${SITE_ID}`);
  assertNetlifySite(site);
  if (site.published_deploy?.id === receipt.previous_deploy_id && DEPLOY_ID.test(receipt.production_deploy_id || '')) {
    const candidate = await api(`deploys/${receipt.production_deploy_id}`);
    if (candidate?.id !== receipt.production_deploy_id || candidate.site_id !== SITE_ID || candidate.context !== 'production') throw Error('Production candidate identity is uncertain');
    // CLI cancellation is best-effort; an accepted candidate can still publish later.
    site = await api(`sites/${SITE_ID}`);
    assertNetlifySite(site);
    if (site.published_deploy?.id === receipt.previous_deploy_id) {
      if (candidate.state === 'error' && candidate.published_at === null) await saveReceipt({ ...receipt, stage: 'production_failed' });
      return;
    }
  }
  if (!DEPLOY_ID.test(receipt.production_deploy_id || '') || site.published_deploy?.id !== receipt.production_deploy_id) {
    await saveReceipt({ ...receipt, stage: 'production_uncertain' });
    return;
  }
  assertProductionPointer(site, receipt.production_deploy_id);
  const recovery = { ...receipt, stage: 'restoration_requested' };
  await saveReceipt(recovery);
  // Exactly one restore, and only while this request's production ID is current.
  const restored = await api(`sites/${SITE_ID}/deploys/${receipt.previous_deploy_id}/restore`, { method: 'POST' });
  if (restored?.id !== receipt.previous_deploy_id || restored.site_id !== SITE_ID) throw Error('Restoration response is uncertain');
  assertProductionPointer(await api(`sites/${SITE_ID}`), receipt.previous_deploy_id);
  const deploy = await api(`deploys/${receipt.previous_deploy_id}`);
  assertReadyProduction(deploy, receipt.previous_deploy_id);
  if (runtimeIdentity(deploy) !== runtimeIdentity(previous)) throw Error('Restored function metadata changed');
  if (fingerprint(await markerSnapshot(fetchResponse)) !== fingerprint(previousMarker)) throw Error('Restored release marker changed');
  await smokeFunctions(PRODUCTION_URL, fetchResponse);
  await saveReceipt({ ...recovery, stage: 'restored' });
}

export async function runVerifiedRelease({ receipt, previousDeployId, directory, message = 'Prepared release', api = netlify, fetchResponse = fetch,
  upload = uploadPreparedPayload, run = command, saveReceipt = saveDeploymentReceipt, loadReceipt = readDeploymentReceipt }) {
  if (receipt.stage !== undefined || receipt.site_id !== SITE_ID || !DEPLOY_ID.test(previousDeployId || '')) throw Error('Existing or invalid release receipt');
  assertProductionPointer(await api(`sites/${SITE_ID}`), previousDeployId);
  const previous = await api(`deploys/${previousDeployId}`);
  assertReadyProduction(previous, previousDeployId);
  await smokeFunctions(PRODUCTION_URL, fetchResponse);
  const previousMarker = await markerSnapshot(fetchResponse);
  await saveReceipt({ ...receipt, previous_deploy_id: previousDeployId, stage: 'preview_requested' });
  const preview = await upload({ directory, message, mode: 'preview', run });
  let state = await loadReceipt();
  if (state.stage !== 'preview_finalizing' || state.preview_deploy_id !== preview.result.deploy_id || !/^[a-f0-9]{64}$/.test(state.upload_fingerprint || '')) throw Error('Preview upload receipt changed');
  const previewUrl = `https://${state.preview_deploy_id}--boltcall.netlify.app`;
  const draft = await api(`deploys/${state.preview_deploy_id}`);
  assertPreparedDeployMetadata(draft, { ...receipt, deploy_id: state.preview_deploy_id }, preview.functions, 'deploy-preview');
  if (draft.published_at || draft.deploy_ssl_url !== previewUrl) throw Error('Preview is not an unpublished immutable deploy');
  await verifyMarker(previewUrl, receipt, fetchResponse);
  await smokeFunctions(previewUrl, fetchResponse);
  assertProductionPointer(await api(`sites/${SITE_ID}`), previousDeployId);
  state = { ...state, stage: 'preview_verified', preview_verified_at: new Date().toISOString(),
    preview_receipt: { deploy_id: state.preview_deploy_id, context: 'deploy-preview', upload_fingerprint: state.upload_fingerprint } };
  await saveReceipt(state);
  await saveReceipt({ ...state, stage: 'production_requested' });
  const previewFingerprint = state.upload_fingerprint;
  try {
    const production = await upload({ directory, message, mode: 'production', cachePath: preview.cachePath, run });
    state = await loadReceipt();
    if (state.stage !== 'production_finalizing' || state.production_deploy_id !== production.result.deploy_id || state.upload_fingerprint !== previewFingerprint ||
        state.production_deploy_id === state.preview_deploy_id || state.production_deploy_id === previousDeployId) throw Error('Production upload receipt changed');
    state = { ...state, stage: 'production_uploaded', deploy_id: state.production_deploy_id };
    await saveReceipt(state);
    assertProductionPointer(await api(`sites/${SITE_ID}`), state.deploy_id);
    const deploy = await api(`deploys/${state.deploy_id}`);
    assertReadyProduction(deploy, state.deploy_id);
    assertPreparedDeployMetadata(deploy, state, preview.functions);
    await verifyMarker(PRODUCTION_URL, receipt, fetchResponse);
    await smokeFunctions(PRODUCTION_URL, fetchResponse);
    assertProductionPointer(await api(`sites/${SITE_ID}`), state.deploy_id);
    const published = { ...state, stage: 'published', production_receipt: { deploy_id: state.deploy_id, context: 'production',
      upload_fingerprint: state.upload_fingerprint, verified_at: new Date().toISOString() } };
    await saveReceipt(published);
    return published;
  } catch (error) {
    try { await recoverProduction(await loadReceipt(), previous, previousMarker, { api, fetchResponse, saveReceipt }); }
    catch (recoveryError) { throw Error(`${error.message}\nProduction recovery is uncertain: ${recoveryError.message}`); }
    throw error;
  }
}

async function assertNoPriorDeployment(api, env) {
  const currentId = Number(env.GITHUB_RUN_ID), currentAttempt = Number(env.GITHUB_RUN_ATTEMPT);
  const runs = await listAll(api, 'actions/workflows/netlify-production-deploy.yml/runs?event=workflow_dispatch', 'workflow_runs');
  const title = `Release ${env.RELEASE_ID} request ${env.REQUEST_ID} manifest ${env.MANIFEST_HASH}`;
  const matches = runs.filter(run => run.display_title === title && run.head_branch === 'main' &&
    run.path === '.github/workflows/netlify-production-deploy.yml' && run.event === 'workflow_dispatch' && run.id !== currentId);
  if (matches.some(run => run.conclusion === 'success' || (run.id < currentId && run.status !== 'completed'))) {
    throw Error('A prior deployment request is active or complete; reconcile it instead of deploying again');
  }
  // Always inspect earlier attempts of this run, even if the list endpoint has
  // not yet returned it. A failed workflow can already have changed production.
  matches.push({ id: currentId, run_attempt: currentAttempt - 1 });
  for (const prior of matches) {
    if (!Number.isSafeInteger(prior.run_attempt) || prior.run_attempt < 0 || prior.run_attempt > 20) throw Error('Prior deployment history cannot be reconciled safely');
    if (!prior.run_attempt) continue;
    const artifacts = await listAll(api, `actions/runs/${prior.id}/artifacts`, 'artifacts');
    if (artifacts.some(a => a.name?.startsWith(`boltcall-deployment-${prior.id}-`))) {
      throw Error('A previous deployment receipt exists; inspect production, prepare a fresh release, and obtain owner approval for its recovery request');
    }
    for (let attempt = 1; attempt <= prior.run_attempt; attempt++) {
      const jobs = await listAll(api, `actions/runs/${prior.id}/attempts/${attempt}/jobs`, 'jobs');
      if (jobs.some(job => job.name === 'deploy' && job.conclusion !== 'skipped' &&
          (job.started_at || ['in_progress', 'completed'].includes(job.status)))) {
        throw Error('A prior deployment job already started; its side effects may be uncertain. Inspect production, prepare a fresh release, and obtain owner approval for recovery');
      }
    }
  }
}

export async function deployPrepared({ env = process.env, api = githubApi(), run = command } = {}) {
  if (env.GITHUB_JOB !== 'deploy') throw Error('Deployment must run in the protected workflow deploy phase');
  const manifest = await inspectPrepared({ env, api, run });
  await assertNoPriorDeployment(api, env);
  const previousSite = await netlify(`sites/${SITE_ID}`);
  assertNetlifySite(previousSite);
  // Main auto-deploys on every merge, so production may already be ahead of this
  // approved release. Never roll it back over other sessions' merged work.
  await checkLiveCommit({ sha: manifest.source_sha, force: true });
  const previousDeployId = previousSite.published_deploy?.id;
  if (!/^[a-f0-9]{24}$/.test(previousDeployId || '')) throw Error('Current production deployment is unavailable');
  const artifact = await api(`actions/artifacts/${manifest.artifact.id}`);
  const payload = await downloadArtifact(api, artifact, 'release-download', 'payload.tar.gz');
  if (sha256(await fs.readFile(payload)) !== manifest.artifact.payload_sha256) throw Error('Prepared payload changed');
  await fs.mkdir('release-payload', { recursive: true });
  const entries = (await command('tar', ['-tzf', payload])).split(/\r?\n/);
  if (!entries.every(entry => !entry.split('/').includes('..') && /^(dist\/|\.netlify-fn-build\/|netlify\.toml$)/.test(entry))) throw Error('Prepared payload has unexpected paths');
  await command('tar', ['-xzf', payload, '-C', 'release-payload']);
  const marker = releaseMarker(manifest, env.MANIFEST_HASH, { requestId: env.REQUEST_ID, runId: Number(env.GITHUB_RUN_ID), runAttempt: Number(env.GITHUB_RUN_ATTEMPT) });
  await fs.writeFile('release-payload/dist/release.json', `${JSON.stringify(marker)}\n`);
  await fs.appendFile('release-payload/dist/_headers', '\n/release.json\n  Cache-Control: no-store, max-age=0\n  Content-Type: application/json\n');
  // Payload digest was verified before extraction; only cache paths/time change.
  const receipt = await runVerifiedRelease({ directory: path.resolve('release-payload'),
    message: `Release ${manifest.release_id} request ${env.REQUEST_ID} manifest ${env.MANIFEST_HASH}`, run,
    receipt: { ...marker, production_url: PRODUCTION_URL }, previousDeployId });
  await summary(env, `\nPublished deploy: ${receipt.deploy_id}\n\nBrowser-test ${PRODUCTION_URL} before accepting production-verification.\n`);
  return receipt;
}

export async function finalVerification({ env = process.env, api = githubApi() } = {}) {
  if (env.GITHUB_JOB !== 'final-verification') throw Error('Invalid final verification phase');
  const manifest = await inspectPrepared({ env, api });
  const runId = Number(env.GITHUB_RUN_ID), attempt = Number(env.GITHUB_RUN_ATTEMPT);
  const receipts = [];
  if (attempt > 20) throw Error('Too many workflow attempts to reconcile safely');
  for (let number = 1; number <= attempt; number++) {
    const jobs = await listAll(api, `actions/runs/${runId}/attempts/${number}/jobs`, 'jobs');
    receipts.push(...jobs.filter(job => job.run_attempt === number));
  }
  const { deploymentAttempt } = selectApprovalReceipts(receipts, runId, attempt);
  const artifacts = await listAll(api, `actions/runs/${runId}/artifacts`, 'artifacts');
  const artifactsForDeploy = artifacts.filter(a => a.name === `boltcall-deployment-${runId}-${deploymentAttempt}` && !a.expired &&
    a.workflow_run?.id === runId && a.workflow_run?.head_sha === env.GITHUB_SHA);
  if (artifactsForDeploy.length !== 1) throw Error('Exact deployment receipt is unavailable');
  const file = await downloadArtifact(api, artifactsForDeploy[0], 'deployment-evidence', 'deployment-receipt.json');
  const receipt = JSON.parse(await fs.readFile(file, 'utf8'));
  if (receipt.run_attempt !== deploymentAttempt) throw Error('Deployment attempt receipt changed');
  await liveCheck(manifest, env, receipt);
  const verified = { ...receipt, verification_attempt: attempt, verified_at: new Date().toISOString(), owner_accepted: true };
  await fs.writeFile('verification-receipt.json', `${JSON.stringify(verified, null, 2)}\n`);
  await summary(env, `\nOwner acceptance and final runtime verification passed for deploy ${receipt.deploy_id}.\n`);
  return verified;
}

if (process.argv[1]?.replaceAll('\\', '/').endsWith('/release-workflow.mjs')) {
  const operations = { integrate: runIntegration, publish: publishPrepared, inspect: inspectPrepared, deploy: deployPrepared, verify: finalVerification };
  const operation = operations[process.argv[2]];
  if (!operation) throw Error('Unknown release workflow operation');
  await operation();
}
