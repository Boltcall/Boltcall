import { withLegacyHandler } from './_shared/runtime-compat';
/**
 * saas-v2-toggle — POST endpoint to flip workspaces.v2_enabled for the
 * currently-authenticated workspace owner.
 *
 * This is the kernel write that gates whether a user sees the V1 dashboard or
 * the V2 dashboard. It's deliberately a single endpoint (not a generic settings
 * update) so the audit trail in the function log is unambiguous: every flip
 * is one line.
 *
 * Auth: Bearer JWT only. The caller must be the OWNER of the workspace they're
 *   toggling. Membership (workspace_members) is not enough — only the owner
 *   may opt the whole workspace into a new dashboard surface.
 *
 * Body: { enabled: boolean }
 * Returns: { workspace_id, v2_enabled }
 *
 * Event emission: We attempt to emit an agency_event of type
 * 'subscription_changed' (closest fit on the AgencyEventType union — the toggle
 * IS a subscription-level surface change). If the user has no agency_clients
 * row (most self-serve users), the event emit is skipped silently with a
 * console log — the kernel only logs events scoped to managed clients.
 */

import type { Handler } from '@netlify/functions';

import { getServiceSupabase } from './_shared/token-utils';
import { emitAgencyEvent } from './_shared/emit-agency-event';


import { getV2CorsHeaders, getRequestOrigin } from './_shared/cors-v2';
interface ToggleBody {
  enabled: boolean;
}




export const handler: Handler = async (event) => {
  const v2cors = getV2CorsHeaders(
    getRequestOrigin(event.headers as Record<string, string>),
    { methods: 'POST' },
  );
  const cors = v2cors.headers;

  function badRequest(message: string) {

    return {

      statusCode: 400,

      headers: cors,

      body: JSON.stringify({ error: message }),

    };

  }

  function unauthorized(message: string) {

    return {

      statusCode: 401,

      headers: cors,

      body: JSON.stringify({ error: message }),

    };

  }

  function serverError(message: string) {

    return {

      statusCode: 500,

      headers: cors,

      body: JSON.stringify({ error: message }),

    };

  }
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: cors, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: cors,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  // ─── 1. JWT extract → getUser ────────────────────────────────────────────
  const authHeader =
    event.headers['authorization'] || event.headers['Authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    return unauthorized('Missing bearer token');
  }

  const supa = getServiceSupabase();
  const { data: userResult, error: authErr } = await supa.auth.getUser(token);
  if (authErr || !userResult?.user) {
    return unauthorized('Invalid or expired token');
  }
  const userId = userResult.user.id;

  // ─── 2. Body parse ───────────────────────────────────────────────────────
  let parsed: ToggleBody;
  try {
    parsed = JSON.parse(event.body || '{}') as ToggleBody;
  } catch {
    return badRequest('Invalid JSON body');
  }
  if (typeof parsed.enabled !== 'boolean') {
    return badRequest('Body must include { enabled: boolean }');
  }
  const enabled = parsed.enabled;

  // ─── 3. Owner-of-workspace check + update ────────────────────────────────
  // Scope the UPDATE to (user_id = userId) so a non-owner with a stolen JWT
  // can't toggle someone else's workspace. The .eq() is the security barrier;
  // RLS is the second line. We use returning='representation' to confirm the
  // update actually matched a row.
  const { data: updatedRows, error: updateErr } = await supa
    .from('workspaces')
    .update({ v2_enabled: enabled, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .select('id, v2_enabled');

  if (updateErr) {
    console.warn(
      `[saas-v2-toggle] update failed user=${userId} err=${updateErr.message}`,
    );
    return serverError('Failed to update workspace');
  }

  if (!updatedRows || updatedRows.length === 0) {
    // Either the user owns no workspace (shouldn't happen — auto-trigger
    // creates one on signup) OR the v2_enabled column doesn't exist yet in
    // this environment. Surface the second case explicitly so the deploy
    // operator notices the missing migration.
    return {
      statusCode: 404,
      headers: cors,
      body: JSON.stringify({
        error:
          'No workspace owned by this user, or v2_enabled column missing. ' +
          'Run the V2 migration before flipping the toggle.',
      }),
    };
  }

  const row = updatedRows[0] as { id: string; v2_enabled: boolean };

  // ─── 4. Best-effort event emit ───────────────────────────────────────────
  // The user MAY also be an agency client (some founders dogfood as clients).
  // Look up their client_id; if they don't have one, skip the emit — the
  // agency_events table is per-managed-client and not the right place to log
  // a self-serve user's preference flip.
  try {
    const { data: clientRow } = await supa
      .from('agency_clients')
      .select('id')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();

    if (clientRow?.id) {
      await emitAgencyEvent({
        client_id: clientRow.id as string,
        agent_name: 'saas-v2-toggle',
        type: 'subscription_changed',
        severity: 'info',
        payload: {
          op: 'v2_dashboard_toggle',
          status: enabled ? 'v2_enabled' : 'v2_disabled',
          updated_at: new Date().toISOString(),
        },
        why_explanation: enabled
          ? 'User opted in to the V2 dashboard surface.'
          : 'User switched back from V2 to the classic dashboard.',
      });
    } else {
      // Self-serve user — not a managed client. Just log locally; this is not
      // an error condition.
      console.log(
        `[saas-v2-toggle] user=${userId} workspace=${row.id} v2_enabled=${enabled} ` +
          `(self-serve, no agency_clients row — event emit skipped)`,
      );
    }
  } catch (emitErr) {
    // Never let event emission failures block the primary write. The toggle
    // already succeeded; the event is observability, not state.
    console.warn(
      `[saas-v2-toggle] event emit failed user=${userId} err=${
        emitErr instanceof Error ? emitErr.message : String(emitErr)
      }`,
    );
  }

  return {
    statusCode: 200,
    headers: cors,
    body: JSON.stringify({
      workspace_id: row.id,
      v2_enabled: row.v2_enabled,
    }),
  };
};

export default withLegacyHandler(handler);
