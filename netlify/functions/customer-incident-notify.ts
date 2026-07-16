import { Handler } from '@netlify/functions';
import { getServiceSupabase } from './_shared/token-utils';
import { sendBrevoEmail } from './send-email';
import { wrapCronWithAlert } from './_shared/agency-cron-alert';
import { withLegacyHandler } from './_shared/runtime-compat';

/**
 * Customer-facing incident notification (Legal Shield Phase 5).
 *
 * Existing failure alerting (_shared/notify.ts) only reaches the owner via
 * Telegram. If a customer's agent is technically failing, they find out only
 * when they check the dashboard themselves — "you knew and hid it" is the
 * scenario a liability claim is built on. This closes that gap: when a
 * workspace's agent racks up repeated technical failures in an hour, email
 * the account owner, and log an activity_logs row as the evidence trail.
 *
 * Runs hourly via netlify.toml. Looks back one hour for retell_calls rows
 * where the Retell payload reports call_status 'error' — a technical
 * failure, not a routine after-hours miss.
 */

const LOOKBACK_MS = 60 * 60 * 1000;
const ERROR_THRESHOLD = 3; // errors within the lookback window to count as an incident
const RENOTIFY_COOLDOWN_MS = 6 * 60 * 60 * 1000; // don't re-email the same workspace more than once per 6h

const inner: Handler = async () => {
  const supabase = getServiceSupabase();
  const since = new Date(Date.now() - LOOKBACK_MS).toISOString();

  const { data: calls, error } = await supabase
    .from('retell_calls')
    .select('workspace_id, retell_payload')
    .gte('started_at', since)
    .filter('retell_payload->>call_status', 'eq', 'error');

  if (error) {
    throw new Error(`retell_calls query failed: ${error.message}`);
  }

  const errorCountByWorkspace = new Map<string, number>();
  for (const call of calls || []) {
    if (!call.workspace_id) continue;
    errorCountByWorkspace.set(call.workspace_id, (errorCountByWorkspace.get(call.workspace_id) || 0) + 1);
  }

  const incidentWorkspaces = [...errorCountByWorkspace.entries()].filter(([, count]) => count >= ERROR_THRESHOLD);
  let notified = 0;

  for (const [workspaceId, count] of incidentWorkspaces) {
    const cooldownSince = new Date(Date.now() - RENOTIFY_COOLDOWN_MS).toISOString();
    const { data: recentNotice } = await supabase
      .from('activity_logs')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('action', 'incident_notified')
      .gte('created_at', cooldownSince)
      .limit(1)
      .maybeSingle();

    if (recentNotice) continue;

    const { data: userData, error: userErr } = await supabase.auth.admin.getUserById(workspaceId);
    const email = userData?.user?.email;
    if (userErr || !email) continue;

    const result = await sendBrevoEmail({
      to: email,
      subject: 'Boltcall: your AI agent is having technical trouble',
      textContent:
        `We detected ${count} failed calls on your Boltcall agent in the last hour. ` +
        `We're looking into it now. If callers report trouble reaching you, please check your dashboard ` +
        `or contact support@boltcall.org — we want to make sure no leads are lost while this is resolved.`,
      metadata: { workspace_id: workspaceId, error_count: count },
    });

    if ('error' in result) continue;

    await supabase.from('activity_logs').insert({
      workspace_id: workspaceId,
      user_id: workspaceId,
      action: 'incident_notified',
      details: `Notified customer of ${count} failed calls in the last hour`,
      metadata: { error_count: count },
    });

    notified++;
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ incidentWorkspaces: incidentWorkspaces.length, notified }),
  };
};

const handler = wrapCronWithAlert('customer-incident-notify', inner);

export const testHandler = inner;
export default withLegacyHandler(handler);
