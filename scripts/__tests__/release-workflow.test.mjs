import { describe, it, expect, vi } from 'vitest';
import { parse } from 'yaml';
import { readFileSync } from 'node:fs';
import { runIntegration, inspectPrepared, publishPrepared, deployPrepared, githubApi } from '../release-workflow.mjs';
import { sha256, SITE_ID, PRODUCTION_URL } from '../release-control.mjs';

const workflow = name => parse(readFileSync(`.github/workflows/${name}.yml`, 'utf8'));
const sha = 'a'.repeat(40);
const env = { GITHUB_REPOSITORY: 'Boltcall/Boltcall', GITHUB_REF: 'refs/heads/main', GITHUB_EVENT_NAME: 'workflow_dispatch',
  GITHUB_SHA: 'b'.repeat(40), GITHUB_RUN_ID: '987', GITHUB_JOB: 'merge', INTEGRATION_PHASE: 'merge', PR_NUMBER: '7', SOURCE_SHA: sha,
  REQUEST_ID: '11111111-1111-1111-1111-111111111111' };
const gate = { name: 'production', can_admins_bypass: false,
  deployment_branch_policy: { protected_branches: false, custom_branch_policies: true },
  protection_rules: [{ type: 'required_reviewers', reviewers: [{ type: 'User', reviewer: { id: 77395319 } }] }] };

describe('GitHub release transport', () => {
  it.each([
    { endpoint: 'actions/artifacts/456/zip', options: { raw: true }, accept: 'application/vnd.github+json' },
    { endpoint: 'releases/assets/99', options: { raw: true, accept: 'application/octet-stream' }, accept: 'application/octet-stream' },
  ])('downloads $endpoint bytes using its required request media type', async ({ endpoint, options, accept }) => {
    const bytes = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0xff]);
    const json = vi.fn();
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, headers: new Headers(),
      arrayBuffer: async () => Uint8Array.from(bytes).buffer, json });
    vi.stubGlobal('fetch', fetchMock);
    try {
      expect(await githubApi('test-token')(endpoint, options)).toEqual(bytes);
      expect(fetchMock).toHaveBeenCalledWith(`https://api.github.com/repos/Boltcall/Boltcall/${endpoint}`,
        expect.objectContaining({ headers: expect.objectContaining({ Accept: accept }) }));
      expect(json).not.toHaveBeenCalled();
    } finally { vi.unstubAllGlobals(); }
  });
});

describe('trusted integration command', () => {
  function fakeApi(head = sha) {
    return vi.fn(async (endpoint, options) => {
      if (endpoint.endsWith('deployment-branch-policies?per_page=100&page=1')) return { total_count: 1, branch_policies: [{ name: 'main', type: 'branch' }] };
      if (endpoint === 'environments/production') return gate;
      if (endpoint === 'pulls/7') return { head: { sha: head, ref: 'codex/test' }, base: { ref: 'main', repo: { full_name: 'Boltcall/Boltcall' } }, state: 'open', draft: false };
      if (endpoint.startsWith('actions/workflows')) return { total_count: 1, workflow_runs: [{ id: 1, head_sha: sha, head_branch: 'codex/test', path: '.github/workflows/pr-tests.yml', event: 'pull_request', pull_requests: [{ number: 7 }], status: 'completed', conclusion: 'success' }] };
      if (endpoint === `statuses/${sha}` && options.method === 'POST') return { id: 42 };
      if (endpoint === 'pulls/7/merge' && options.method === 'PUT') return { merged: true, sha: 'c'.repeat(40) };
      throw Error(`Unexpected API path ${endpoint}`);
    });
  }
  it('merges a CI-verified exact head without reading reviewer environments', async () => {
    const api = fakeApi();
    expect((await runIntegration({ env, api })).merged).toBe(true);
    expect(api.mock.calls.some(([path]) => path.startsWith('environments/'))).toBe(false);
    expect(api.mock.calls.at(-2)).toEqual([`statuses/${sha}`, { method: 'POST', body: {
      state: 'success', context: 'atlas-owner-integration', description: 'Exact PR head verified against latest successful CI',
      target_url: 'https://github.com/Boltcall/Boltcall/actions/runs/987',
    } }]);
    expect(api).toHaveBeenLastCalledWith('pulls/7/merge', { method: 'PUT', body: { sha, merge_method: 'merge' } });
    const changed = fakeApi('d'.repeat(40));
    await expect(runIntegration({ env, api: changed })).rejects.toThrow(/changed/);
    expect(changed.mock.calls.some(([path]) => path.endsWith('/merge'))).toBe(false);
    expect(changed.mock.calls.some(([path]) => path.startsWith('statuses/'))).toBe(false);
  });
  it('refuses branch execution before any remote mutation', async () => {
    const api = fakeApi();
    await expect(runIntegration({ env: { ...env, GITHUB_REF: 'refs/heads/codex/other' }, api })).rejects.toThrow(/main/);
    expect(api).not.toHaveBeenCalled();
  });
  it('does not publish approval status while only inspecting the PR', async () => {
    const api = fakeApi();
    await runIntegration({ env: { ...env, GITHUB_JOB: 'inspect', INTEGRATION_PHASE: 'inspect' }, api });
    expect(api.mock.calls.some(([, options]) => options?.method)).toBe(false);
  });
  it.each(['latest CI'])('does not publish integration status when %s fails', async reason => {
    const base = fakeApi();
    const api = vi.fn(async (endpoint, options) => {
      const result = await base(endpoint, options);
      if (reason === 'latest CI' && endpoint.startsWith('actions/workflows')) return { ...result,
        workflow_runs: result.workflow_runs.map(run => ({ ...run, status: 'in_progress', conclusion: null })) };
      return result;
    });
    await expect(runIntegration({ env, api })).rejects.toThrow();
    expect(api.mock.calls.some(([, options]) => options?.method)).toBe(false);
  });
  it('rejects an invalid receipt run identity before remote operations', async () => {
    const api = fakeApi();
    await expect(runIntegration({ env: { ...env, GITHUB_RUN_ID: '../other' }, api })).rejects.toThrow(/run identity/);
    expect(api).not.toHaveBeenCalled();
  });
  it('does not merge if publishing the exact-head status fails or its response is lost', async () => {
    const base = fakeApi();
    const api = vi.fn(async (endpoint, options) => {
      if (endpoint.startsWith('statuses/')) throw Error('Status response lost');
      return base(endpoint, options);
    });
    await expect(runIntegration({ env, api })).rejects.toThrow('Status response lost');
    expect(api.mock.calls.some(([path]) => path.endsWith('/merge'))).toBe(false);
  });
  it('makes a draft ready before status publication and merges only after it', async () => {
    const base = fakeApi();
    const api = vi.fn(async (endpoint, options) => {
      if (endpoint === 'graphql') return {};
      const result = await base(endpoint, options);
      return endpoint === 'pulls/7' ? { ...result, draft: true, node_id: 'PR_node' } : result;
    });
    await runIntegration({ env, api });
    expect(api.mock.calls.filter(([, options]) => options?.method).map(([path]) => path)).toEqual(['graphql', `statuses/${sha}`, 'pulls/7/merge']);
  });
  it('recovers an already merged PR without creating another approval status or merge', async () => {
    const base = fakeApi();
    const api = vi.fn(async (endpoint, options) => {
      const result = await base(endpoint, options);
      return endpoint === 'pulls/7' ? { ...result, merged: true, merge_commit_sha: 'c'.repeat(40) } : result;
    });
    expect((await runIntegration({ env, api })).merged).toBe(true);
    expect(api.mock.calls.some(([, options]) => options?.method)).toBe(false);
  });
  it('rejects invalid manifest selection before downloading evidence', async () => {
    const api = vi.fn();
    await expect(inspectPrepared({ env: { ...env, RELEASE_ID: '../other' }, api })).rejects.toThrow(/selection/);
    expect(api).not.toHaveBeenCalled();
  });
});

describe('release workflow boundaries', () => {
  it('keeps status publication in the trusted merge job without a manual reviewer gate', () => {
    const integration = workflow('integrate-boltcall-pr');
    expect(integration.permissions.statuses).toBeUndefined();
    expect(integration.jobs.inspect.permissions?.statuses).toBeUndefined();
    expect(integration.jobs.merge.environment).toBeUndefined();
    expect(integration.jobs.merge.permissions.statuses).toBe('write');
    for (const job of Object.values(integration.jobs)) expect(job.steps[0].with['persist-credentials']).toBe(false);
  });
  it('runs PR tests without secrets, persisted credentials or privileged events', () => {
    const ci = workflow('pr-tests');
    expect(Object.keys(ci.on)).toEqual(['pull_request']);
    expect(ci.permissions).toEqual({ contents: 'read' });
    expect(ci.jobs.test.steps[0].with['persist-credentials']).toBe(false);
    expect(ci.jobs.test.steps.filter(step => step.run).map(step => step.run)).toEqual(['npm ci', 'npm run typecheck', 'npm run test:run', 'npm run build:fast']);
    expect(JSON.stringify(ci)).not.toContain('secrets.');
  });
  it('separates preparation and owner-gated production deployment and acceptance', () => {
    const prepare = workflow('prepare-boltcall-release'), deploy = workflow('netlify-production-deploy');
    expect(Object.keys(prepare.on)).toEqual(['workflow_dispatch']);
    expect(Object.keys(deploy.on)).toEqual(['workflow_dispatch']);
    expect(deploy.concurrency['cancel-in-progress']).toBe(false);
    expect(deploy.jobs['owner-review'].environment.name).toBe('production');
    expect(deploy.jobs.deploy.needs).toContain('owner-review');
    expect(deploy.jobs['owner-verification'].environment.name).toBe('production-verification');
    expect(deploy.jobs['final-verification'].needs).toContain('owner-verification');
    expect(JSON.stringify(prepare.jobs.validate)).not.toContain('secrets.');
    expect(prepare.jobs.publish.permissions.contents).toBe('write');
    expect(deploy.permissions).toEqual({ contents: 'read', actions: 'read' });
    expect(Object.values(deploy.jobs).some(job => job.permissions?.contents === 'write')).toBe(false);
    expect(prepare.jobs.publish.steps[0].with.ref).toBeUndefined();
    expect(JSON.stringify(prepare.jobs.validate)).toContain('release-functions.mjs bundle');
    expect(JSON.stringify(prepare.jobs.validate)).toContain('release-functions.integration.mjs');
    expect(JSON.stringify(prepare.jobs.validate)).toContain('netlify-cli@26.2.0');
    expect(deploy.jobs['final-verification'].steps.at(-1).with.path).toBe('verification-receipt.json');
    expect(deploy.jobs.deploy.steps.at(-1).if).toBe('always()');
  });
});

describe('preparation provenance at the workflow command boundary', () => {
  const artifact = { id: 456, name: 'boltcall-payload-123-1', digest: `sha256:${'c'.repeat(64)}`, expired: false,
    workflow_run: { id: 123, head_sha: env.GITHUB_SHA } };
  const manifest = { schema_version: 1, project_id: 'boltcall', repository: 'Boltcall/Boltcall', release_id: 'boltcall-aaaaaaaaaaaa-123-1',
    source_sha: sha, created_at: '2026-09-08T00:00:00Z', preparation: { run_id: 123, run_attempt: 1, workflow_sha: env.GITHUB_SHA, path: '.github/workflows/prepare-boltcall-release.yml' },
    artifact: { id: artifact.id, name: artifact.name, digest: artifact.digest, payload_sha256: 'd'.repeat(64) },
    target: { provider: 'netlify', site_id: SITE_ID, production_url: PRODUCTION_URL }, checks: { typecheck: true, tests: true, build: true, functions: true } };
  const bytes = Buffer.from(JSON.stringify(manifest));
  const selected = { ...env, GITHUB_JOB: 'inspect', GITHUB_RUN_ID: '789', GITHUB_RUN_ATTEMPT: '1', RELEASE_ID: manifest.release_id, MANIFEST_HASH: sha256(bytes) };
  function evidenceApi(replacement = bytes) {
    return vi.fn(async endpoint => {
      if (endpoint.startsWith('releases?')) return [{ tag_name: manifest.release_id, assets: [{ id: 99, name: 'release-manifest.json', size: bytes.length }] }];
      if (endpoint === 'releases/assets/99') return replacement;
      if (endpoint === 'actions/runs/123/attempts/1') return { id: 123, run_attempt: 1, head_sha: env.GITHUB_SHA, head_branch: 'main', event: 'workflow_dispatch', path: manifest.preparation.path, display_title: `Prepare ${sha}`, status: 'completed', conclusion: 'success' };
      if (endpoint.startsWith('actions/runs/123/attempts/1/jobs?')) return { total_count: 2, jobs: ['validate', 'publish'].map(name => ({ name, run_id: 123, run_attempt: 1, status: 'completed', conclusion: 'success' })) };
      if (endpoint === 'actions/artifacts/456') return artifact;
      if (endpoint.includes('/deployment-branch-policies?')) return { total_count: 1, branch_policies: [{ name: 'main', type: 'branch' }] };
      if (endpoint.startsWith('environments/')) return { ...gate, name: endpoint.split('/')[1] };
      throw Error(`Unexpected evidence API path ${endpoint}`);
    });
  }
  it('rechecks frozen asset bytes, exact preparation run and main ancestry', async () => {
    const run = vi.fn().mockResolvedValue('');
    expect(await inspectPrepared({ env: selected, api: evidenceApi(), run })).toEqual(manifest);
    expect(run).toHaveBeenLastCalledWith('git', ['merge-base', '--is-ancestor', sha, 'origin/main']);
    const changed = Buffer.from(JSON.stringify({ ...manifest, source_sha: 'e'.repeat(40) }));
    await expect(inspectPrepared({ env: selected, api: evidenceApi(changed), run })).rejects.toThrow(/changed/);
  });
  it('refuses to replace a prepared release or publish from an unsuccessful validation attempt', async () => {
    const publishEnv = { ...env, GITHUB_JOB: 'publish', GITHUB_RUN_ID: '123', GITHUB_RUN_ATTEMPT: '1', PAYLOAD_ARTIFACT_ID: '456',
      PAYLOAD_ARTIFACT_DIGEST: artifact.digest, PAYLOAD_SHA256: manifest.artifact.payload_sha256 };
    const api = evidenceApi();
    await expect(publishPrepared({ env: publishEnv, api, run: vi.fn().mockResolvedValue('') })).rejects.toThrow(/write-once/);
    expect(api.mock.calls.some(([, options]) => options?.method === 'POST')).toBe(false);
    const missingValidation = vi.fn(async endpoint => endpoint.includes('/jobs?') ? { total_count: 0, jobs: [] } : artifact);
    await expect(publishPrepared({ env: publishEnv, api: missingValidation, run: vi.fn().mockResolvedValue('') })).rejects.toThrow(/validation/);
  });

  function publicationApi(failure) {
    const base = evidenceApi();
    let uploaded;
    return vi.fn(async (endpoint, options) => {
      if (endpoint.startsWith('releases?')) return [];
      if (endpoint === 'releases' && options?.method === 'POST') return { id: 88, tag_name: manifest.release_id, draft: true };
      if (endpoint.startsWith('https://uploads.github.com/')) {
        if (failure === 'upload failed') throw Error('Upload failed');
        uploaded = options.body;
        return { id: 99, name: 'release-manifest.json', state: failure === 'incomplete upload' ? 'starter' : 'uploaded', size: uploaded.length };
      }
      if (endpoint === 'releases/assets/99') return failure === 'changed bytes' ? Buffer.from('{}') : uploaded;
      if (endpoint === 'releases/88' && options?.method === 'PATCH') {
        if (failure === 'publication failed') throw Error('Publication failed');
        return { id: 88, tag_name: manifest.release_id, draft: failure === 'still draft', prerelease: true };
      }
      return base(endpoint, options);
    });
  }
  const publishEnv = { ...env, GITHUB_JOB: 'publish', GITHUB_RUN_ID: '123', GITHUB_RUN_ATTEMPT: '1', PAYLOAD_ARTIFACT_ID: '456',
    PAYLOAD_ARTIFACT_DIGEST: artifact.digest, PAYLOAD_SHA256: manifest.artifact.payload_sha256 };

  it('makes verified preparation evidence readable without granting consumers write access', async () => {
    const api = publicationApi();
    const prepared = await publishPrepared({ env: publishEnv, api, run: vi.fn().mockResolvedValue('') });
    const upload = api.mock.calls.find(([endpoint]) => endpoint.startsWith('https://uploads.github.com/'));
    expect(JSON.parse(upload[1].body)).toEqual(prepared);
    expect(api.mock.calls.slice(-2)).toEqual([
      ['releases/assets/99', { raw: true, accept: 'application/octet-stream' }],
      ['releases/88', { method: 'PATCH', body: { draft: false, prerelease: true, make_latest: 'false' } }],
    ]);
  });

  it.each(['upload failed', 'incomplete upload', 'changed bytes'])('keeps evidence private when %s', async failure => {
    const api = publicationApi(failure);
    await expect(publishPrepared({ env: publishEnv, api, run: vi.fn().mockResolvedValue('') })).rejects.toThrow();
    expect(api.mock.calls.some(([, options]) => options?.method === 'PATCH')).toBe(false);
  });

  it.each(['publication failed', 'still draft'])('does not report prepared evidence as available when %s', async failure => {
    await expect(publishPrepared({ env: publishEnv, api: publicationApi(failure), run: vi.fn().mockResolvedValue('') })).rejects.toThrow();
  });

  it.each([
    { label: 'same-run retry after Netlify succeeded but smoke failed', previousRun: 789, attempt: 2, deployConclusion: 'failure', hasReceipt: true },
    { label: 'duplicate dispatch after owner acceptance or final verification failed', previousRun: 788, attempt: 1, deployConclusion: 'success', hasReceipt: true },
    { label: 'same-run retry with uncertain deployment and missing receipt', previousRun: 789, attempt: 2, deployConclusion: 'failure', hasReceipt: false },
  ])('refuses $label before executing Netlify again', async ({ previousRun, attempt, deployConclusion, hasReceipt }) => {
    const selectedEnv = { ...selected, GITHUB_JOB: 'deploy', GITHUB_RUN_ATTEMPT: String(attempt) };
    const baseApi = evidenceApi();
    const title = `Release ${selectedEnv.RELEASE_ID} request ${selectedEnv.REQUEST_ID} manifest ${selectedEnv.MANIFEST_HASH}`;
    const api = vi.fn(async (endpoint, options) => {
      if (endpoint.startsWith('actions/workflows/netlify-production-deploy.yml/runs?')) return { total_count: 1, workflow_runs: [{ id: previousRun, run_attempt: 1,
        display_title: title, head_branch: 'main', path: '.github/workflows/netlify-production-deploy.yml', event: 'workflow_dispatch', status: 'completed', conclusion: 'failure' }] };
      if (endpoint.startsWith(`actions/runs/${previousRun}/artifacts?`)) return { total_count: hasReceipt ? 1 : 0,
        artifacts: hasReceipt ? [{ name: `boltcall-deployment-${previousRun}-1`, expired: false }] : [] };
      if (endpoint.startsWith(`actions/runs/${previousRun}/attempts/1/jobs?`)) return { total_count: 1, jobs: [{ name: 'deploy', run_id: previousRun, run_attempt: 1,
        started_at: '2026-09-08T00:00:00Z', status: 'completed', conclusion: deployConclusion }] };
      return baseApi(endpoint, options);
    });
    const run = vi.fn().mockResolvedValue('');
    await expect(deployPrepared({ env: selectedEnv, api, run })).rejects.toThrow(/prior deployment|previous deployment/);
    expect(run.mock.calls.some(([bin]) => bin === 'netlify')).toBe(false);
  });

  it.each([1, 2])('permits Netlify preflight for attempt %i when no prior deploy started', async attempt => {
    const baseApi = evidenceApi();
    const api = async (endpoint, options) => {
      if (endpoint.startsWith('actions/workflows/netlify-production-deploy.yml/runs?')) return { total_count: 0, workflow_runs: [] };
      if (endpoint.startsWith('actions/runs/789/artifacts?')) return { total_count: 0, artifacts: [] };
      if (endpoint.startsWith('actions/runs/789/attempts/1/jobs?')) return { total_count: 1, jobs: [{ name: 'deploy', run_id: 789,
        run_attempt: 1, status: 'completed', conclusion: 'skipped', started_at: '2026-09-08T00:00:00Z' }] };
      return baseApi(endpoint, options);
    };
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: SITE_ID, ssl_url: PRODUCTION_URL, build_settings: { stop_builds: false } }) });
    vi.stubGlobal('fetch', fetchMock);
    try {
      await expect(deployPrepared({ env: { ...selected, GITHUB_JOB: 'deploy', GITHUB_RUN_ATTEMPT: String(attempt) }, api,
        run: vi.fn().mockResolvedValue('') })).rejects.toThrow(/Netlify Git builds/);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock.mock.calls[0][0]).toBe(`https://api.netlify.com/api/v1/sites/${SITE_ID}`);
    } finally { vi.unstubAllGlobals(); }
  });
});
