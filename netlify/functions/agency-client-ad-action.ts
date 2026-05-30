/**
 * agency-client-ad-action.ts — Client-side approval action for queued ad_creative artifacts.
 * ==========================================================================================
 *
 * POST /.netlify/functions/agency-client-ad-action
 * Body: { artifact_id: string, action: 'approve' | 'reject' | 'swap', reason?: string }
 *
 * Auth:  Client JWT (Supabase). Verifies the artifact belongs to the calling
 *        user's agency_clients row (defense in depth alongside RLS).
 *
 * Client approval is the SECOND gate. The founder always reviews first via
 * /dashboard/agency/queue. When agency_os_config.client_approval_required is
 * TRUE for a given client, the artifact stays in status='draft' even after
 * founder approval and waits for the client. When it's FALSE (default), the
 * founder's approval ships the artifact directly and this endpoint is a no-op
 * (returns 409 conflict if the artifact has already shipped).
 *
 * Action semantics:
 *   - 'approve' → set status='approved' (founder ship handler will pick it up
 *                  on next n8n workflow tick OR call agency-push-creative
 *                  directly if env.AGENCY_AUTO_PUSH_ON_APPROVE=true).
 *   - 'reject'  → set status='rejected', persist the reason in
 *                  content.payload.client_rejection_reason.
 *   - 'swap'    → like 'reject' but emits a `creative_swap_requested` agency
 *                  event so the next creative-foundry run prioritizes a fresh
 *                  variant of the same angle.
 *
 * Idempotency: each transition is conditional on the current status. If the
 * artifact has already moved, return 409 with the current status so the UI can
 * refetch and show the truth.
 */

import type { Handler, HandlerEvent } from '@netlify/functions';

import { getServiceSupabase } from './_shared/token-utils';
import { emitAgencyEvent } from './_shared/emit-agency-event';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

type Action = 'approve' | 'reject' | 'swap';
const VALID_ACTIONS: Action[] = ['approve', 'reject', 'swap'];

export const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let body: { artifact_id?: string; action?: string; reason?: string };
  try {
    body = event.body ? JSON.parse(event.body) : {};
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  const artifact_id = body.artifact_id;
  const action = (body.action ?? '') as Action;
  const reason = typeof body.reason === 'string' ? body.reason.slice(0, 500) : '';

  if (!artifact_id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(artifact_id)) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'artifact_id (uuid) is required' }) };
  }
  if (!VALID_ACTIONS.includes(action)) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: `action must be one of ${VALID_ACTIONS.join('|')}` }) };
  }

  const supabase = getServiceSupabase();

  // 1. JWT → user_id
  const authHeader = event.headers['authorization'] || event.headers['Authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized — bearer token required' }) };
  }
  const { data: userResult, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !userResult?.user) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Invalid token' }) };
  }
  const user_id = userResult.user.id;

  // 2. Resolve the artifact + verify ownership via agency_clients.user_id.
  const { data: artifactRow, error: artErr } = await supabase
    .from('agency_artifacts')
    .select('id, client_id, type, status, content')
    .eq('id', artifact_id)
    .maybeSingle();
  if (artErr) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Lookup failed', detail: artErr.message }) };
  }
  if (!artifactRow) {
    return { statusCode: 404, headers, body: JSON.stringify({ error: 'Artifact not found' }) };
  }
  if (artifactRow.type !== 'ad_creative') {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'This endpoint only handles ad_creative artifacts' }) };
  }

  const { data: clientRow, error: clientErr } = await supabase
    .from('agency_clients')
    .select('id, user_id, sku, status')
    .eq('id', artifactRow.client_id)
    .maybeSingle();
  if (clientErr || !clientRow) {
    return { statusCode: 404, headers, body: JSON.stringify({ error: 'Client not found for artifact' }) };
  }
  if (clientRow.user_id !== user_id) {
    // Don't leak that the artifact exists.
    return { statusCode: 404, headers, body: JSON.stringify({ error: 'Artifact not found' }) };
  }
  if (clientRow.sku !== 'bolt_system') {
    return { statusCode: 403, headers, body: JSON.stringify({ error: 'bolt_system_required' }) };
  }

  // 3. Only act on artifacts in draft. Anything else → 409 + current status.
  if (artifactRow.status !== 'draft') {
    return {
      statusCode: 409,
      headers,
      body: JSON.stringify({
        error: 'artifact_already_transitioned',
        current_status: artifactRow.status,
      }),
    };
  }

  // 4. Compute the new status + content patch + event payload.
  const now = new Date().toISOString();
  let newStatus: 'approved' | 'rejected';
  let contentPatch: Record<string, unknown> = {};
  const existingPayload =
    ((artifactRow.content ?? {}) as { payload?: Record<string, unknown> }).payload ?? {};

  if (action === 'approve') {
    newStatus = 'approved';
    contentPatch = {
      payload: {
        ...existingPayload,
        client_approval: {
          decided_at: now,
          decided_by: user_id,
        },
      },
    };
  } else {
    // 'reject' or 'swap' both move the artifact to rejected; only the event
    // emission differs.
    newStatus = 'rejected';
    contentPatch = {
      payload: {
        ...existingPayload,
        client_rejection: {
          decided_at: now,
          decided_by: user_id,
          action,
          reason: reason || null,
        },
      },
    };
  }

  // 5. Conditional update.
  const { error: updErr, data: updated } = await supabase
    .from('agency_artifacts')
    .update({ status: newStatus, content: contentPatch })
    .eq('id', artifact_id)
    .eq('status', 'draft')
    .select('id, status')
    .maybeSingle();

  if (updErr) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Update failed', detail: updErr.message }) };
  }
  if (!updated) {
    // Lost the race; somebody else moved it.
    const { data: latest } = await supabase
      .from('agency_artifacts')
      .select('status')
      .eq('id', artifact_id)
      .maybeSingle();
    return {
      statusCode: 409,
      headers,
      body: JSON.stringify({
        error: 'artifact_already_transitioned',
        current_status: latest?.status ?? 'unknown',
      }),
    };
  }

  // 6. Emit kernel events. We use approvals/changes events that are
  // whitelisted in the emit-agency-event schema; for the swap-specific case
  // we surface it as a notification_sent (the n8n workflow picks it up and
  // surfaces it to the founder + the next creative-foundry run uses it as
  // input). If notification_sent payload validation rejects the shape, we
  // log + continue — the status transition is the source of truth.
  try {
    if (action === 'approve') {
      await emitAgencyEvent({
        client_id: artifactRow.client_id,
        agent_name: 'client-portal',
        type: 'creative_published',
        severity: 'info',
        payload: {
          artifact_id,
          platform: 'other',
        },
        why_explanation: `Client approved ad_creative ${artifact_id} from the portal; awaiting ship to Meta.`,
      });
    } else {
      await emitAgencyEvent({
        client_id: artifactRow.client_id,
        agent_name: 'client-portal',
        type: 'creative_paused',
        severity: 'info',
        payload: {
          artifact_id,
          reason: action === 'swap' ? 'client_requested_swap' : 'client_rejected',
        },
        why_explanation:
          action === 'swap'
            ? `Client requested a swap on ad_creative ${artifact_id}. Next creative-foundry run will prioritize a fresh take.`
            : `Client rejected ad_creative ${artifact_id}${reason ? ` — reason: ${reason}` : ''}.`,
      });
    }
  } catch (err) {
    console.warn('[agency-client-ad-action] event emit failed (non-fatal):', err);
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      ok: true,
      artifact_id,
      status: updated.status,
      action,
    }),
  };
};
