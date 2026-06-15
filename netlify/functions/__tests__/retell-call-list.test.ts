import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  buildRetellAgentFilter,
  buildRetellEnumInFilter,
  buildRetellStartTimestampFilter,
  normalizeRetellCallList,
} from '../_shared/retell-call-list';

describe('Retell call list v5 filters', () => {
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

  it('does not leave old Retell list-call filter keys in production functions', () => {
    const testsDir = path.dirname(fileURLToPath(import.meta.url));
    const functionsDir = path.resolve(testsDir, '..');
    const offenders: Array<{ file: string; line: number; source: string }> = [];
    const patterns = [
      /\blower_threshold\b/,
      /\bupper_threshold\b/,
      /\bafter_start_timestamp\b/,
      /filter_criteria:\s*\{\s*agent_id\b/,
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
