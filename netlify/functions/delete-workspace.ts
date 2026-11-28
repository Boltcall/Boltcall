import type { Handler } from '@netlify/functions';
import { getServiceSupabase } from './_shared/token-utils';
import { requireUser } from './_shared/user-auth';
import { withLegacyHandler } from './_shared/runtime-compat';
import { paypalFetch } from './_shared/paypal-client';

/**
 * delete-workspace: single server-side path for irreversibly deleting a user's
 * workspace + all dependent rows AND cancelling any active PayPal subscription
 * so they stop being charged.
 *
 * Prior state: two divergent client-side delete buttons (GeneralPage +
 * WorkspacePage) that removed only `business_profiles` + `workspaces` and left
 * subscriptions + PayPal billing intact. See Phase 2 P0.
 */

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

async function cancelPayPalSubscription(paypalSubscriptionId: string, reason: string): Promise<void> {
  const res = await paypalFetch(`/v1/billing/subscriptions/${paypalSubscriptionId}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
  // 204 = success, 422 UNPROCESSABLE typically means already cancelled/expired — safe to ignore.
  if (!res.ok && res.status !== 422) {
    const text = await res.text();
    throw new Error(`PayPal cancel failed (${res.status}): ${text}`);
  }
}

const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const auth = await requireUser(event, headers);
  if (!auth.ok) return auth.response;
  const userId = auth.userId;

  const body = (() => { try { return JSON.parse(event.body || '{}'); } catch { return {}; } })();
  if (body.confirm !== 'DELETE') {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing confirmation. Send {"confirm":"DELETE"}' }) };
  }

  const sb = getServiceSupabase();

  // 1) Cancel any active PayPal subscription for this user BEFORE deleting DB rows.
  //    If the cancel API call fails we abort — better to leave a workspace in place
  //    than delete the account while PayPal keeps charging.
  try {
    const { data: activeSubs } = await sb
      .from('subscriptions')
      .select('id, paypal_subscription_id, status')
      .eq('user_id', userId)
      .eq('payment_provider', 'paypal')
      .in('status', ['active', 'past_due']);

    for (const sub of activeSubs || []) {
      if (!sub.paypal_subscription_id) continue;
      try {
        await cancelPayPalSubscription(sub.paypal_subscription_id, 'User deleted workspace');
      } catch (e) {
        console.error('[delete-workspace] PayPal cancel failed:', e);
        return {
          statusCode: 502,
          headers,
          body: JSON.stringify({
            error: 'Could not cancel your PayPal subscription. Please cancel it in PayPal first, then retry deletion.',
            code: 'paypal_cancel_failed',
          }),
        };
      }
    }
  } catch (e) {
    console.error('[delete-workspace] subscription lookup failed:', e);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Subscription lookup failed' }) };
  }

  // 2) Cascade delete every tenant-owned row.
  //    The DPA promises erasure within 7 business days, so this list has to be
  //    exhaustive rather than "whatever the two old client-side delete buttons
  //    happened to remove". Children first, then parents, then the auth user.
  //    Per-table errors are collected, never fatal: a table that does not exist
  //    in this environment must not strand the rest of the cascade.
  const cascadeErrors: Array<{ table: string; error: string }> = [];

  const deleteWhere = async (table: string, column: string, values: string | string[]) => {
    if (Array.isArray(values)) {
      if (values.length === 0) return;
      const { error } = await sb.from(table).delete().in(column, values);
      if (error) cascadeErrors.push({ table, error: error.message });
      return;
    }
    const { error } = await sb.from(table).delete().eq(column, values);
    if (error) cascadeErrors.push({ table, error: error.message });
  };

  // Resolve the non-user_id scopes before their parents are gone.
  const { data: workspaceRows } = await sb.from('workspaces').select('id').eq('user_id', userId);
  const workspaceIds = (workspaceRows || []).map((w: { id: string }) => w.id);
  const { data: profileRows } = await sb.from('business_profiles').select('id').eq('user_id', userId);
  const businessProfileIds = (profileRows || []).map((p: { id: string }) => p.id);

  // Ordered children -> parents. Every table here is scoped by user_id.
  const userScopedTables = [
    // messaging + conversation children
    'email_messages',
    'email_threads',
    'email_outbox',
    'email_accounts',
    'scheduled_messages',
    'sms_conversations',
    'sms_settings',
    'whatsapp_conversations',
    'whatsapp_settings',
    'messages',
    'notification_logs',
    // lead + call surface
    'callbacks',
    'appointments',
    'conversation_wins',
    'qa_reviews',
    'calls',
    'chats',
    'leads',
    'followup_enrollments',
    'followup_sequences',
    // agent surface
    'transfer_rules',
    'agent_test_runs',
    'agent_self_heal_log',
    'cloned_voices',
    'agents',
    'retell_agents',
    'retell_llms',
    // knowledge base
    'knowledge_base',
    'kb_folders',
    // telephony
    'phone_numbers',
    'twilio_numbers',
    'acs_numbers',
    'provisioning_locks',
    // billing + usage
    'token_transactions',
    'token_rewards_claimed',
    'token_balances',
    'usage_daily_summary',
    'usage_summary',
    'invoices', // before subscriptions: invoices.subscription_id FK has no ON DELETE
    'subscriptions',
    'paypal_payments',
    // integrations + settings
    'user_oauth_tokens',
    'calcom_integrations',
    'facebook_page_connections',
    'integration_sync_history',
    'customer_runbooks',
    'services',
    'user_integrations',
    'user_webhooks',
    'api_keys',
    'notification_preferences',
    'business_features',
    // tenancy roots
    'workspace_members',
    'business_profiles',
    'workspaces',
  ];

  // Scoped by something other than user_id — delete before their parents above.
  await deleteWhere('locations', 'business_profile_id', businessProfileIds);
  await deleteWhere('retell_calls', 'workspace_id', workspaceIds);
  // retell_calls.workspace_id is ON DELETE SET NULL and leads has no FK: delete explicitly.
  await deleteWhere('leads', 'workspace_id', workspaceIds);
  await deleteWhere('retell_call_scores', 'workspace_id', workspaceIds);
  await deleteWhere('activity_logs', 'workspace_id', workspaceIds);

  for (const table of userScopedTables) {
    await deleteWhere(table, 'user_id', userId);
  }

  // 3) Delete knowledge-base storage files
  try {
    const { data: files } = await sb.storage.from('knowledge-base').list(userId);
    if (files?.length) {
      const paths = files.map((f) => `${userId}/${f.name}`);
      await sb.storage.from('knowledge-base').remove(paths);
    }
  } catch (e) {
    console.error('[delete-workspace] storage cleanup failed:', e);
  }

  if (cascadeErrors.length) {
    // We continue rather than fail — the PayPal sub is already cancelled and
    // workspace root is gone. Leftover rows are cleanup, not a blocking bug.
    console.error('[delete-workspace] cascade errors:', cascadeErrors);
  }

  // 4) Delete the auth user LAST. Until this runs the account still exists and
  //    can sign back in, so "workspace deleted" was never actually erasure.
  const { error: authDeleteError } = await sb.auth.admin.deleteUser(userId);
  if (authDeleteError) {
    console.error('[delete-workspace] auth user delete failed:', authDeleteError.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Workspace data was deleted but the account could not be removed. Contact support.',
        code: 'auth_delete_failed',
        warnings: cascadeErrors.length ? cascadeErrors : undefined,
      }),
    };
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ success: true, warnings: cascadeErrors.length ? cascadeErrors : undefined }),
  };
};

export const testHandler = handler;
export default withLegacyHandler(handler, { strictCors: true });
