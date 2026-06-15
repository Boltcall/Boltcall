import assert from 'node:assert/strict';
import { describe, it } from 'vitest';

import {
  buildCleanupChecks,
  verifySupportSmokeCleanup,
} from '../support-smoke-cleanup.mjs';

function adminWithCounts(countsByKey) {
  return {
    from(table) {
      return {
        select(_columns, _opts) {
          return {
            eq(column, value) {
              const key = `${table}.${column}.${value}`;
              return Promise.resolve({
                count: countsByKey[key] ?? 0,
                error: null,
              });
            },
          };
        },
      };
    },
  };
}

describe('support-smoke-cleanup helpers', () => {
  it('builds cleanup checks for every temporary resource id that exists', () => {
    assert.deepEqual(
      buildCleanupChecks({
        userId: 'user-1',
        workspaceId: 'workspace-1',
        profileId: 'profile-1',
        agentId: 'agent-1',
        phoneId: 'phone-1',
        leadId: 'lead-1',
        messageId: 'message-1',
      }).map((check) => `${check.table}.${check.column}.${check.value}`),
      [
        'workspaces.id.workspace-1',
        'business_profiles.id.profile-1',
        'agents.id.agent-1',
        'phone_numbers.id.phone-1',
        'leads.id.lead-1',
        'scheduled_messages.id.message-1',
        'saas_v2_support_tickets.workspace_id.workspace-1',
        'saas_v2_support_tickets.user_id.user-1',
      ],
    );
  });

  it('passes when no temporary rows remain', async () => {
    const result = await verifySupportSmokeCleanup(
      adminWithCounts({}),
      {
        userId: 'user-1',
        workspaceId: 'workspace-1',
      },
    );

    assert.equal(result.status, 'passed');
    assert.equal(result.remainingRows, 0);
    assert.equal(result.checks.length, 3);
  });

  it('fails when a temporary row remains after cleanup', async () => {
    const result = await verifySupportSmokeCleanup(
      adminWithCounts({
        'saas_v2_support_tickets.workspace_id.workspace-1': 1,
      }),
      {
        userId: 'user-1',
        workspaceId: 'workspace-1',
      },
    );

    assert.equal(result.status, 'failed');
    assert.equal(result.remainingRows, 1);
    assert.deepEqual(result.remaining.map((item) => item.table), ['saas_v2_support_tickets']);
  });
});
