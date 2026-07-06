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

  // 2) Cascade delete. Order: children first, then parents.
  //    Tables that CASCADE FK to workspaces/business_profiles/user are handled
  //    by Postgres; we only delete rows Postgres won't (or where we want to be
  //    explicit for auditability).
  const cascadeTables = [
    'subscriptions',
    'invoices',
    'agents',
    'workspace_members',
    'business_features',
    'paypal_payments',
    'notification_preferences',
    'api_keys',
    'user_integrations',
    'user_webhooks',
    'business_profiles',
    'workspaces',
  ];

  const cascadeErrors: Array<{ table: string; error: string }> = [];
  for (const table of cascadeTables) {
    const { error } = await sb.from(table).delete().eq('user_id', userId);
    if (error) cascadeErrors.push({ table, error: error.message });
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

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ success: true, warnings: cascadeErrors.length ? cascadeErrors : undefined }),
  };
};

export const testHandler = handler;
export default withLegacyHandler(handler);
