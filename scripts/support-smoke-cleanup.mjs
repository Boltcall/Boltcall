const RESOURCE_CHECKS = [
  { key: 'workspaceId', table: 'workspaces', column: 'id' },
  { key: 'profileId', table: 'business_profiles', column: 'id' },
  { key: 'agentId', table: 'agents', column: 'id' },
  { key: 'phoneId', table: 'phone_numbers', column: 'id' },
  { key: 'leadId', table: 'leads', column: 'id' },
  { key: 'messageId', table: 'scheduled_messages', column: 'id' },
];

export function buildCleanupChecks(ids = {}) {
  const checks = [];
  for (const check of RESOURCE_CHECKS) {
    if (ids[check.key]) {
      checks.push({
        table: check.table,
        column: check.column,
        value: ids[check.key],
      });
    }
  }

  if (ids.workspaceId) {
    checks.push({
      table: 'saas_v2_support_tickets',
      column: 'workspace_id',
      value: ids.workspaceId,
    });
  }
  if (ids.userId) {
    checks.push({
      table: 'saas_v2_support_tickets',
      column: 'user_id',
      value: ids.userId,
    });
  }

  return checks;
}

async function countRemaining(admin, check) {
  const { count, error } = await admin
    .from(check.table)
    .select('id', { count: 'exact', head: true })
    .eq(check.column, check.value);
  if (error) {
    return {
      ...check,
      status: 'error',
      count: null,
      error: error.message,
    };
  }
  return {
    ...check,
    status: Number(count || 0) === 0 ? 'passed' : 'remaining',
    count: Number(count || 0),
  };
}

export async function verifySupportSmokeCleanup(admin, ids = {}) {
  const checks = buildCleanupChecks(ids);
  const results = [];

  for (const check of checks) {
    results.push(await countRemaining(admin, check));
  }

  const remaining = results.filter((result) => result.status === 'remaining');
  const errors = results.filter((result) => result.status === 'error');
  const remainingRows = remaining.reduce((sum, result) => sum + Number(result.count || 0), 0);

  return {
    status: remaining.length === 0 && errors.length === 0 ? 'passed' : 'failed',
    check: 'support_smoke_cleanup',
    checks,
    remainingRows,
    remaining,
    errors,
  };
}
