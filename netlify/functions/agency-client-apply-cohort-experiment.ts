/**
 * agency-client-apply-cohort-experiment — POST. Client-authenticated.
 *
 * Body: { peer_artifact_id: string }
 *
 * "Apply" a cohort peer's shipped experiment_plan to the caller's own agent:
 *   1. Resolve the calling user → their agency_clients row (defence-in-depth).
 *   2. Load the peer artifact, verify it is (a) type='experiment_plan',
 *      (b) status='shipped', (c) owned by a *peer in the same cohort* as the
 *      caller (this is the authorization gate — you can only adopt
 *      experiments from people in your own circle).
 *   3. Clone the experiment's prompt_diff / hypothesis against the caller's
 *      current agent prompt, attribute the source, and insert a NEW
 *      agency_artifacts row owned by the caller with:
 *         - type = 'experiment_plan'
 *         - status = 'draft'              (lands in /client/approvals)
 *         - parent_artifact_id = peer's id   (audit trail)
 *         - content.adopted_from_cohort = true
 *         - generated_by = 'cohort_adoption'
 *
 * Emits an `experiment_adopted` agency_event tagged with both the peer and
 * the caller client_ids so the cohort-intelligence loop can measure adoption
 * rates per win.
 */

import type { Handler } from '@netlify/functions';
import { getServiceSupabase } from './_shared/token-utils';

const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface ResolvedClient {
  user_id: string;
  client_id: string;
}

async function resolveClient(
  authHeader: string | undefined,
): Promise<ResolvedClient | null> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.substring(7);
  const supabase = getServiceSupabase();
  const { data: userResult, error } = await supabase.auth.getUser(token);
  if (error || !userResult?.user) return null;
  const user_id = userResult.user.id;

  const { data: rows } = await supabase
    .from('agency_clients')
    .select('id')
    .eq('user_id', user_id)
    .not('status', 'in', '("churned","paused")')
    .order('signed_up_at', { ascending: true })
    .limit(1);
  const client = rows?.[0];
  if (!client) return null;
  return { user_id, client_id: client.id as string };
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: CORS,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  const authHeader =
    event.headers['authorization'] || event.headers['Authorization'];
  const me = await resolveClient(authHeader);
  if (!me) {
    return {
      statusCode: 401,
      headers: CORS,
      body: JSON.stringify({ error: 'Authentication required' }),
    };
  }

  let parsed: { peer_artifact_id?: unknown };
  try {
    parsed = JSON.parse(event.body || '{}');
  } catch {
    return {
      statusCode: 400,
      headers: CORS,
      body: JSON.stringify({ error: 'Invalid JSON body' }),
    };
  }

  const peerArtifactId =
    typeof parsed.peer_artifact_id === 'string'
      ? parsed.peer_artifact_id
      : '';
  if (!UUID_RE.test(peerArtifactId)) {
    return {
      statusCode: 400,
      headers: CORS,
      body: JSON.stringify({ error: 'peer_artifact_id must be a uuid' }),
    };
  }

  const supabase = getServiceSupabase();

  // 1. Pull the peer artifact.
  const { data: peer, error: peerErr } = await supabase
    .from('agency_artifacts')
    .select(
      'id, client_id, type, status, content, generated_by, model, predicted_impact',
    )
    .eq('id', peerArtifactId)
    .maybeSingle();

  if (peerErr || !peer) {
    return {
      statusCode: 404,
      headers: CORS,
      body: JSON.stringify({ error: 'Peer artifact not found' }),
    };
  }
  if (peer.type !== 'experiment_plan') {
    return {
      statusCode: 400,
      headers: CORS,
      body: JSON.stringify({
        error: 'Only experiment_plan artifacts can be adopted',
      }),
    };
  }
  if (peer.status !== 'shipped') {
    return {
      statusCode: 400,
      headers: CORS,
      body: JSON.stringify({
        error: 'Peer experiment has not shipped yet',
      }),
    };
  }
  if (peer.client_id === me.client_id) {
    return {
      statusCode: 400,
      headers: CORS,
      body: JSON.stringify({ error: 'Cannot adopt your own experiment' }),
    };
  }

  // 2. Authorize — peer must be in the same cohort as me.
  const { data: myMembership } = await supabase
    .from('agency_cohort_members')
    .select('cohort_channel_id')
    .eq('client_id', me.client_id);
  const myCohorts = new Set(
    (myMembership ?? []).map((m) => m.cohort_channel_id as string),
  );
  if (myCohorts.size === 0) {
    return {
      statusCode: 403,
      headers: CORS,
      body: JSON.stringify({ error: 'You are not in any cohort yet' }),
    };
  }
  const { data: peerMembership } = await supabase
    .from('agency_cohort_members')
    .select('cohort_channel_id')
    .eq('client_id', peer.client_id as string);
  const peerCohorts = new Set(
    (peerMembership ?? []).map((m) => m.cohort_channel_id as string),
  );
  const sharedCohort = [...myCohorts].find((c) => peerCohorts.has(c));
  if (!sharedCohort) {
    return {
      statusCode: 403,
      headers: CORS,
      body: JSON.stringify({ error: 'Peer is not in your cohort' }),
    };
  }

  // 3. Build the cloned experiment_plan owned by me.
  // We carry over the hypothesis + prompt_diff, attribute the source, and
  // set adopted_from_cohort so the queue can render the right plain-language
  // diff ("Adopted from Med Spa peer in TX — they saw +7% bookings").
  const peerContent = (peer.content ?? {}) as Record<string, unknown>;

  const clonedContent: Record<string, unknown> = {
    ...peerContent,
    adopted_from_cohort: true,
    adopted_from_artifact_id: peer.id,
    adopted_at: new Date().toISOString(),
    // Preserve original hypothesis but namespace the diff so the deploy step
    // re-merges it against THIS client's current prompt, not the peer's.
    source_prompt_diff: peerContent.prompt_diff ?? null,
    // notes[] will be appended to as the founder reviews the queue.
    notes: Array.isArray(peerContent.notes) ? peerContent.notes : [],
  };

  // Don't ship as our own without a fresh review — that's the whole point
  // of putting it back into /client/approvals.
  const { data: inserted, error: insertErr } = await supabase
    .from('agency_artifacts')
    .insert({
      client_id: me.client_id,
      type: 'experiment_plan',
      status: 'draft',
      generated_by: 'cohort_adoption',
      model: peer.model ?? null,
      content: clonedContent,
      parent_artifact_id: peer.id,
      predicted_impact: peer.predicted_impact ?? null,
      // confidence is intentionally NULL — the cohort-adoption job is
      // attribution-only; the founder / scoring agent will recompute it
      // against this client's baseline before any auto-apply.
    })
    .select('id')
    .single();

  if (insertErr || !inserted) {
    console.error(
      '[agency-client-apply-cohort-experiment] insert failed',
      insertErr,
    );
    return {
      statusCode: 500,
      headers: CORS,
      body: JSON.stringify({ error: 'Could not queue experiment' }),
    };
  }

  // Adoption audit — log to Netlify drain. `experiment_adopted` isn't an
  // allowlisted agency_events type (the schema is intentionally strict), and
  // the adoption itself is already recorded structurally as the new artifact's
  // parent_artifact_id + content.adopted_from_cohort. Future cohort
  // intelligence loops should query agency_artifacts where
  // generated_by='cohort_adoption' rather than reading an event row.
  console.log('[agency-client-apply-cohort-experiment] adopted', {
    client_id: me.client_id,
    adopted_artifact_id: inserted.id,
    source_artifact_id: peer.id,
    source_client_id: peer.client_id,
    cohort_channel_id: sharedCohort,
  });

  return {
    statusCode: 200,
    headers: CORS,
    body: JSON.stringify({
      artifact_id: inserted.id,
      status: 'draft',
      message:
        'Queued in your approvals — review the plain-language diff and approve.',
    }),
  };
};
