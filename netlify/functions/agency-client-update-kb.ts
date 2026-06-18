import { withLegacyHandler } from './_shared/runtime-compat';
/**
 * agency-client-update-kb.ts — Boltcall Agency OS · Layer 8 · Client-portal
 * ─────────────────────────────────────────────────────────────────────────
 *
 * POST { client_id, kind, content_patch }
 *
 * The client edited a field in their Business Brief on /client/agent. We:
 *   1. Insert a NEW versioned row into agency_knowledge (never UPDATE in place
 *      — provenance and rollback both require append-only KB writes).
 *   2. Queue a 'prompt_revision' artifact (status='draft') pointed at the
 *      agent-architect agent so the next architect cycle picks up the edit
 *      and re-trains the prompt against it.
 *   3. Emit a kernel event so the founder queue surfaces this change.
 *
 * Auth: client JWT only (owns_client). Founders use the architect surface
 * directly — this endpoint is intentionally client-facing.
 *
 * Validation:
 *   - kind ∈ { 'service', 'faq', 'policy', 'case_study', 'call_pattern' }
 *     (matches agency_knowledge.kind enum from the migration)
 *   - content_patch is an object — we never accept raw strings, since
 *     downstream consumers expect structured JSON.
 *
 * Output:
 *   {
 *     status: 'queued',
 *     knowledge_id: string,
 *     prompt_revision_artifact_id: string,
 *     version: number,                  // the new KB row's version
 *   }
 *
 * NOTE: this endpoint does NOT call agent-architect synchronously. The
 * architect runs on its own queue/cron — the artifact entry we create here
 * is what cues that pipeline. The client's UX is "queued for your agent's
 * next training cycle", not "live in 30s".
 */

import type { Handler } from '@netlify/functions';

import { emitAgencyEvent } from './_shared/emit-agency-event';
import { getServiceSupabase } from './_shared/token-utils';

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

const ALLOWED_KINDS = ['service', 'faq', 'policy', 'case_study', 'call_pattern'] as const;
type KbKind = (typeof ALLOWED_KINDS)[number];

const AGENT_NAME = 'client-kb-editor';
const REVISION_ARTIFACT_TYPE = 'prompt_revision' as const;

function jsonResponse(statusCode: number, body: Record<string, unknown>) {
  return { statusCode, headers: CORS_HEADERS, body: JSON.stringify(body) };
}

function isUuid(s: string | undefined | null): s is string {
  return !!s && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

interface ClientRow {
  id: string;
  user_id: string | null;
  business_name: string | null;
  vertical: string | null;
  status: string;
}

async function ownsClient(
  supa: ReturnType<typeof getServiceSupabase>,
  jwtUserId: string,
  clientId: string,
  isFounder: boolean,
): Promise<ClientRow | null> {
  const { data } = await supa
    .from('agency_clients')
    .select('id,user_id,business_name,vertical,status')
    .eq('id', clientId)
    .maybeSingle();
  if (!data) return null;
  if (isFounder) return data as ClientRow;
  if (data.user_id !== jwtUserId) return null;
  if (data.status === 'churned' || data.status === 'paused') return null;
  return data as ClientRow;
}

const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' });
  }

  const authHeader = event.headers['authorization'] || event.headers['Authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) return jsonResponse(401, { error: 'Unauthorized — missing bearer token' });

  const supa = getServiceSupabase();
  const { data: userRes, error: authErr } = await supa.auth.getUser(token);
  if (authErr || !userRes?.user) return jsonResponse(401, { error: 'Invalid token' });
  const jwtUserId = userRes.user.id;
  const isFounder = ((userRes.user.app_metadata as { role?: string } | undefined)?.role ?? null) === 'founder';

  let body: {
    client_id?: string;
    kind?: string;
    content_patch?: Record<string, unknown>;
    field_path?: string;       // optional — UI sends this so the architect knows what changed
    field_label?: string;      // optional — human label for the field, used in the event why_explanation
  };
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return jsonResponse(400, { error: 'Invalid JSON body' });
  }
  const clientId = body.client_id;
  const kind = body.kind as KbKind | undefined;
  const patch = body.content_patch;

  if (!isUuid(clientId)) return jsonResponse(400, { error: 'client_id (uuid) is required' });
  if (!kind || !ALLOWED_KINDS.includes(kind)) {
    return jsonResponse(400, { error: `kind must be one of: ${ALLOWED_KINDS.join(', ')}` });
  }
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
    return jsonResponse(400, { error: 'content_patch must be a non-array JSON object' });
  }
  // Soft cap on payload size — defense against giant pastes that would inflate
  // the agency_knowledge row beyond what embedding-3-small can handle.
  const patchSize = JSON.stringify(patch).length;
  if (patchSize > 32_000) {
    return jsonResponse(413, { error: 'content_patch too large; trim to under 32k characters' });
  }

  const client = await ownsClient(supa, jwtUserId, clientId, isFounder);
  if (!client) return jsonResponse(403, { error: 'Forbidden — client not visible to this user' });

  // 1. Figure out the next version number for this (client, kind). We
  //    increment the global max version for the kind so the architect can
  //    walk "latest version per kind" easily.
  const { data: existing } = await supa
    .from('agency_knowledge')
    .select('version')
    .eq('client_id', clientId)
    .eq('kind', kind)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextVersion = ((existing?.version as number | undefined) ?? 0) + 1;

  // 2. Insert new KB row. embedding intentionally NULL — the embedding
  //    pipeline (agency-knowledge writer cron / agent-architect) populates
  //    it on next pickup. We don't block the client edit on Azure OpenAI.
  const { data: kbRow, error: kbErr } = await supa
    .from('agency_knowledge')
    .insert({
      client_id: clientId,
      kind,
      content: {
        ...patch,
        // Provenance metadata that the architect uses to know what changed.
        _source: 'client_portal_edit',
        _edited_by_user_id: jwtUserId,
        _field_path: body.field_path || null,
        _field_label: body.field_label || null,
      },
      version: nextVersion,
      // source_artifact_id stays NULL — this edit originated from the client
      // UI, not from an agent-emitted artifact. The architect can still
      // walk lineage via _edited_by_user_id + the new artifact below.
    })
    .select('id')
    .single();
  if (kbErr || !kbRow) {
    console.error('[client-update-kb] agency_knowledge insert failed', kbErr);
    return jsonResponse(500, { error: 'Failed to persist knowledge edit', detail: kbErr?.message });
  }

  // 3. Queue a prompt_revision artifact. status='draft' so the architect's
  //    next pickup picks it up; ship_target='retell_agent' so the deploy
  //    handler knows where it goes once approved. content carries the
  //    referenced KB row so the architect can avoid a second DB hit.
  const { data: artifactRow, error: artifactErr } = await supa
    .from('agency_artifacts')
    .insert({
      client_id: clientId,
      type: REVISION_ARTIFACT_TYPE,
      status: 'draft',
      generated_by: AGENT_NAME,
      model: null,
      content: {
        trigger: 'client_kb_edit',
        knowledge_id: kbRow.id,
        kind,
        version: nextVersion,
        field_path: body.field_path || null,
        field_label: body.field_label || null,
        patch_summary: Object.keys(patch).slice(0, 8), // keys only — values may be PII
        // The architect will read agency_knowledge directly to get the new
        // content; we deliberately don't duplicate the full patch into the
        // artifact content (kept compact for queue scans).
      },
      ship_target: 'retell_agent',
      client_facing_note: body.field_label
        ? `You updated "${body.field_label}". We'll retrain your agent in the next cycle.`
        : `You edited your Business Brief. We'll retrain your agent in the next cycle.`,
      // Confidence is the architect's job to set after it processes; for the
      // queued draft we leave it null so the queue surfaces it as "needs work".
    })
    .select('id')
    .single();
  if (artifactErr || !artifactRow) {
    // KB row already landed — log + return success on the KB write, surface
    // the artifact failure so the founder can fix it without losing the edit.
    console.error('[client-update-kb] agency_artifacts queue failed', artifactErr);
    return jsonResponse(207, {
      status: 'partial',
      knowledge_id: kbRow.id,
      prompt_revision_artifact_id: null,
      version: nextVersion,
      warning: 'KB updated, but the agent-retrain artifact could not be queued. The team has been notified.',
    });
  }

  // 4. Emit a kernel event so this shows up in the founder's queue feed and
  //    in the client's own agency_events_client_view stream.
  try {
    await emitAgencyEvent({
      client_id: clientId,
      agent_name: AGENT_NAME,
      type: 'prompt_revised',
      severity: 'info',
      payload: {
        artifact_id: artifactRow.id as string,
        reason: body.field_label
          ? `Client edited "${body.field_label}" in Business Brief`
          : 'Client edited Business Brief',
        source: 'founder', // closest enum option for "human in the loop"
      },
      why_explanation: body.field_label
        ? `${client.business_name || 'Client'} updated "${body.field_label}" — agent retrain queued.`
        : `${client.business_name || 'Client'} updated their Business Brief — agent retrain queued.`,
    });
  } catch (err) {
    // Telemetry never blocks the write.
    console.warn('[client-update-kb] emitAgencyEvent failed (non-blocking):', (err as Error).message);
  }

  return jsonResponse(200, {
    status: 'queued',
    knowledge_id: kbRow.id,
    prompt_revision_artifact_id: artifactRow.id,
    version: nextVersion,
  });
};

export const testHandler = handler;
export default withLegacyHandler(handler);
