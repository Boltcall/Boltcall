import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  buildRetellAgentFilter,
  buildRetellEnumInFilter,
  buildRetellStartTimestampFilter,
  listRetellVoiceAgents,
  normalizeRetellCallList,
} from '../_shared/retell-call-list';

describe('Retell call list v5 filters', () => {
  it('uses a Retell SDK build with versioned list endpoints', () => {
    const testsDir = path.dirname(fileURLToPath(import.meta.url));
    const repoRoot = path.resolve(testsDir, '..', '..', '..');
    const lockPath = path.join(repoRoot, 'package-lock.json');
    const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8')) as {
      packages?: Record<string, { version?: string }>;
    };

    expect(lock.packages?.['node_modules/retell-sdk']?.version).toBe('5.40.0');

    const sdkResourcesDir = path.join(repoRoot, 'node_modules', 'retell-sdk', 'resources');
    if (!fs.existsSync(sdkResourcesDir)) return;

    const callResource = fs.readFileSync(path.join(sdkResourcesDir, 'call.js'), 'utf8');
    const phoneNumberResource = fs.readFileSync(
      path.join(sdkResourcesDir, 'phone-number.js'),
      'utf8',
    );

    expect(callResource).toContain('/v3/list-calls');
    expect(callResource).not.toContain('/v2/list-calls');
    expect(phoneNumberResource).toContain('/v2/list-phone-numbers');
    expect(phoneNumberResource).not.toContain("'/list-phone-numbers'");
    expect(phoneNumberResource).not.toContain('"/list-phone-numbers"');
  });

  it('builds typed agent and timestamp filters accepted by Retell v5', () => {
    expect(buildRetellAgentFilter(['agent_a', 'agent_b'])).toEqual([
      { agent_id: 'agent_a' },
      { agent_id: 'agent_b' },
    ]);
    expect(buildRetellStartTimestampFilter({ lower: 1710000000000 })).toEqual({
      op: 'ge',
      type: 'number',
      value: 1710000000000,
    });
    expect(buildRetellStartTimestampFilter({ lower: 1710000000000, upper: 1710001000000 }))
      .toEqual({
        op: 'bt',
        type: 'range',
        value: [1710000000000, 1710001000000],
      });
    expect(buildRetellEnumInFilter(['inbound', 'outbound'])).toEqual({
      op: 'in',
      type: 'enum',
      value: ['inbound', 'outbound'],
    });
  });

  it('normalizes old bare-array and current paginated response shapes', () => {
    const calls = [{ call_id: 'call_1' }];
    expect(normalizeRetellCallList(calls)).toEqual(calls);
    expect(normalizeRetellCallList({ calls })).toEqual(calls);
    expect(normalizeRetellCallList({ items: calls, has_more: false })).toEqual(calls);
  });

  it('lists agents through the current Retell v2 endpoint', async () => {
    const requests: Array<{ url: string; init: RequestInit }> = [];
    const fetchMock = async (url: string | URL | Request, init?: RequestInit) => {
      requests.push({ url: String(url), init: init || {} });
      return {
        ok: true,
        status: 200,
        json: async () => ({ items: [{ agent_id: 'agent_1' }], has_more: false }),
      } as Response;
    };

    await expect(listRetellVoiceAgents('test-key', fetchMock as typeof fetch)).resolves.toEqual([
      { agent_id: 'agent_1' },
    ]);

    expect(requests[0].url).toBe('https://api.retellai.com/v2/list-agents');
    expect(requests[0].init.method).toBe('POST');
    expect(JSON.parse(String(requests[0].init.body))).toMatchObject({
      filter_criteria: { channel: { type: 'string', op: 'eq', value: 'voice' } },
    });
  });

  it('does not leave old Retell list-call filter keys in production functions', () => {
    const testsDir = path.dirname(fileURLToPath(import.meta.url));
    const functionsDir = path.resolve(testsDir, '..');
    const offenders: Array<{ file: string; line: number; source: string }> = [];
    const patterns = [
      /\blower_threshold\b/,
      /\bupper_threshold\b/,
      /\bafter_start_timestamp\b/,
      /filter_criteria:\s*\{\s*agent_id\b/,
      /\bclient\.agent\.list\(/,
      /https:\/\/api\.retellai\.com\/list-agents/,
    ];

    function scanDir(dir: string) {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === '__tests__') continue;
        const absolute = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          scanDir(absolute);
          continue;
        }
        if (!entry.name.endsWith('.ts')) continue;
        const source = fs.readFileSync(absolute, 'utf8');
        source.split(/\r?\n/).forEach((line, index) => {
          if (patterns.some((pattern) => pattern.test(line))) {
            offenders.push({
              file: path.relative(functionsDir, absolute),
              line: index + 1,
              source: line.trim(),
            });
          }
        });
      }
    }

    scanDir(functionsDir);

    expect(offenders).toEqual([]);
  });
});
