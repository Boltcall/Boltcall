import { describe, it, expect } from 'vitest';
import { parse } from 'yaml';
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { checkLiveCommit } from '../check-live-commit.mjs';

describe('deployment agent', () => {
  it('skips a live duplicate, deploys newer main and never rolls production back', async () => {
    const root = mkdtempSync(path.join(tmpdir(), 'boltcall-deploy-order-'));
    const git = (...args) => execFileSync('git', ['-C', root, ...args], { encoding: 'utf8' }).trim();
    try {
      git('init', '-q', '-b', 'main');
      git('config', 'user.name', 'Deploy test'); git('config', 'user.email', 'test@example.invalid');
      writeFileSync(path.join(root, 'f'), '1'); git('add', 'f'); git('commit', '-qm', 'first');
      const first = git('rev-parse', 'HEAD');
      writeFileSync(path.join(root, 'f'), '2'); git('commit', '-qam', 'second');
      const second = git('rev-parse', 'HEAD');
      const check = (sha, live, force = false) => checkLiveCommit({ rootDir: root, sha, force,
        fetchImpl: async () => ({ ok: true, json: async () => ({ sha: live }) }) });
      expect((await check(second, first)).deploy).toBe(true);
      expect((await check(second, second)).deploy).toBe(false);
      expect((await check(second, second, true)).deploy).toBe(true);
      await expect(check(first, second)).rejects.toThrow(/older or divergent/);
      await expect(check(first, second, true)).rejects.toThrow(/older or divergent/);
      await expect(check(second, 'f'.repeat(40))).rejects.toThrow(/ancestor/);
      expect((await checkLiveCommit({ rootDir: root, sha: second, fetchImpl: async () => { throw new Error('offline'); } })).deploy).toBe(true);
      expect((await checkLiveCommit({ rootDir: root, sha: second, fetchImpl: async () => ({ ok: false, status: 404 }) })).deploy).toBe(true);
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  it('deploys every merge to main through the shared production lock', () => {
    const workflow = parse(readFileSync('.github/workflows/deploy-main.yml', 'utf8'));
    expect(Object.keys(workflow.on)).toEqual(['push', 'workflow_run', 'workflow_dispatch']);
    expect(workflow.on.push.branches).toEqual(['main']);
    const integrate = parse(readFileSync('.github/workflows/integrate-boltcall-pr.yml', 'utf8'));
    expect(workflow.on.workflow_run.workflows).toEqual([integrate.name]);
    const release = parse(readFileSync('.github/workflows/netlify-production-deploy.yml', 'utf8'));
    expect(workflow.concurrency).toEqual({ group: release.concurrency.group, 'cancel-in-progress': false });
    expect(workflow.jobs.deploy.if).toMatch(/workflow_run.conclusion == 'success'/);
    const steps = workflow.jobs.deploy.steps;
    const gate = steps.findIndex(s => s.run === 'node scripts/check-live-commit.mjs');
    const publish = steps.findIndex(s => /netlify deploy --prod/.test(s.run || ''));
    expect(gate).toBeGreaterThan(-1);
    expect(publish).toBeGreaterThan(gate);
    expect(steps[publish].if).toBe("steps.live.outputs.deploy == 'true'");
    expect(steps.find(s => s.uses?.startsWith('actions/checkout@')).with['fetch-depth']).toBe(0);
  });
});
