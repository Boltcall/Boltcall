import assert from 'node:assert/strict';
import { test } from 'vitest';
import { restoreFromWatchdog } from '../site-watchdog.mjs';
import { evaluateRound, recordDeliveries } from '../site-watchdog-n8n.mjs';
import { PRODUCTION_URL, SITE_ID } from '../release-control.mjs';

const current = 'a'.repeat(24);
const previous = 'b'.repeat(24);
const currentSha = 'c'.repeat(40);
const previousSha = 'd'.repeat(40);
const title = `Auto-deploy main ${currentSha} run 123 attempt 1 prior ${previous} ${previousSha}`;
const immutable = id => `https://${id}--boltcall.netlify.app`;

test('restores only the recorded healthy predecessor and verifies the public site', async () => {
  let published = current;
  const actions = [];
  const result = await restoreFromWatchdog({
    netlify: async (path, method) => {
      if (method === 'POST') {
        assert.equal(path, `sites/${SITE_ID}/deploys/${previous}/restore`);
        actions.push('restore');
        published = previous;
        return { id: previous, site_id: SITE_ID };
      }
      if (path === `sites/${SITE_ID}`) {
        return { id: SITE_ID, ssl_url: PRODUCTION_URL, build_settings: { stop_builds: true },
          published_deploy: { id: published } };
      }
      const id = path.split('/')[1];
      return { id, site_id: SITE_ID, context: 'production', state: 'ready',
        published_at: id === current ? '2026-11-25T09:01:00Z' : '2026-11-25T09:00:00Z', deploy_ssl_url: immutable(id), title: id === current ? title : null };
    },
    github: async (path, body) => {
      if (path === 'actions/runs/123') {
        return { id: 123, run_attempt: 1, path: '.github/workflows/deploy-main.yml', head_branch: 'main', head_sha: currentSha };
      }
      assert.equal(path, body ? `statuses/${currentSha}` : `commits/${currentSha}/statuses`);
      if (body) {
        actions.push('hold');
        return body;
      }
      return [];
    },
    probe: async url => url === immutable(previous) || (url === PRODUCTION_URL && published === previous),
    marker: async url => url === immutable(previous) || published === previous ? previousSha : currentSha,
    enabled: true,
  });
  assert.deepEqual(actions, ['hold', 'restore']);
  assert.equal(result.outcome, 'restored');
});

test('site DNS failure leaves a healthy immutable deploy alone', async () => {
  const result = await restoreFromWatchdog({ enabled: true, probe: async url => url !== PRODUCTION_URL,
    netlify: async (path, method) => {
      assert.notEqual(method, 'POST');
      if (path === 'sites/' + SITE_ID) return { id: SITE_ID, ssl_url: PRODUCTION_URL,
        build_settings: { stop_builds: true }, published_deploy: { id: current } };
      return { id: current, site_id: SITE_ID, context: 'production', state: 'ready',
        published_at: '2026-11-25T09:01:00Z', deploy_ssl_url: immutable(current), title };
    },
    github: () => assert.fail('must not place a deploy hold for DNS failure'),
  });
  assert.equal(result.outcome, 'custom_domain_down');
});

test('two fresh two-region failures page once even when Atlas is unavailable', () => {
  const status = {};
  const now = Date.parse('2026-11-25T10:00:00Z');
  assert.equal(evaluateRound(status, { us: false, eu: null, now }), null);
  assert.equal(evaluateRound(status, { us: false, eu: false, now: now + 60_000 }), null);
  const down = evaluateRound(status, { us: false, eu: false, now: now + 120_000 });
  assert.equal(down.state, 'open');
  assert.ok(down.atlas && down.telegram && down.rollback);
  recordDeliveries(status, down, { telegram: true, atlas: false, rollback: true });
  const retry = evaluateRound(status, { us: false, eu: false, now: now + 180_000 });
  assert.ok(retry.atlas);
  assert.ok(!retry.telegram && !retry.rollback);
  const up = evaluateRound(status, { us: true, eu: true, now: now + 240_000 });
  assert.equal(up.telegramState, 'recovered');
  assert.equal(up.atlasState, 'open');
  assert.ok(up.telegram && up.atlas && !up.rollback);
});
