import { withLegacyHandler } from './_shared/runtime-compat';
/**
 * agency-rollback — POST. Founder-only.
 *
 * One-click undo for a SHIPPED artifact. Works for:
 *
 *   - agent_prompt / prompt_revision  → retell-adapter.revertAgentPrompt to
 *                                       the parent artifact's prompt.
 *   - ad_creative / ad_copy           → meta-ads-adapter.pauseAd for each
 *                                       successful ad_id in ship_result.
 *
 * Side effects:
 *   1. The artifact being rolled back is marked status='reverted',
 *      reviewed_at=now().
 *   2. A NEW agency_artifacts row is inserted of type='prompt_revision' (for
 *      prompts) or 'ad_creative' (for ads) with:
 *        - parent_artifact_id = the artifact being reverted (audit trail)
 *        - status = 'shipped'
 *        - generated_by = 'queue-rollback'
 *        - content carries the why + revert target ids
 *        - ship_result has the adapter response (whitelisted)
 *   3. retell-adapter / meta-ads-adapter emit their own prompt_reverted /
 *      creative_paused events — we do NOT double-emit from here.
 *
 * Auth: founder-only.
 *
 * Important caveat: rollback requires a parent artifact to revert TO. For
 * prompt rollbacks, we walk parent_artifact_id back to the most recent shipped
 * predecessor and read its content.prompt. For ad rollbacks, we just pause
 * the live ads — there is no "revert to previous creative" semantic on Meta
 * since each creative is independent.
 */

import type { Handler } from '@netlify/functions';
import { type SupabaseClient } from '@supabase/supabase-js';
import { getServiceSupabase } from './_shared/token-utils';
import { revertAgentPrompt } from './_shared/agency-adapters/retell-adapter';
import { pauseAd } from './_shared/agency-adapters/meta-ads-adapter';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

interface RollbackBody {
  artifact_id?: unknown;
  reason?: unknown;
}

async function authFounder(
  authHeader: string | undefined,
  supabase: SupabaseClient,
): Promise<{ userId: string } | null> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.substring(7);
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  const role = (data.user.app_metadata as Record<string, unknown> | null)?.role;
  if (role !== 'founder') return null;
  return { userId: data.user.id };
}

interface ArtifactRow {
  id: string;
  client_id: string;
  type: string;
  status: string;
  content: Record<string, unknown>;
  parent_artifact_id: string | null;
  ship_result: Record<string, unknown> | null;
}

/**
 * Walk the parent_artifact_id chain back to the most recent shipped artifact
 * of the same type for the same client. Returns null if there is no shipped
 * ancestor — that means there is nothing to revert TO.
 *
 * Bounded at 10 hops to defend against accidental cycles (the kernel does not
 * enforce acyclicity on the self-FK; if a cycle is ever created we won't loop
 * forever).
 */
async function findRevertTarget(
  supabase: SupabaseClient,
  artifact: ArtifactRow,
): Promise<ArtifactRow | null> {
  let parentId = artifact.parent_artifact_id;
  let hops = 0;
  while (parentId && hops < 10) {
    const { data } = await supabase
      .from('agency_artifacts')
      .select('id, client_id, type, status, content, parent_artifact_id, ship_result')
      .eq('id', parentId)
      .maybeSingle();
    if (!data) return null;
    const candidate = data as ArtifactRow;
    if (
      candidate.status === 'shipped' &&
      candidate.type === artifact.type &&
      candidate.client_id === artifact.client_id
    ) {
      return candidate;
    }
    parentId = candidate.parent_artifact_id;
    hops += 1;
  }
  return null;
}

const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let supabase: SupabaseClient;
  try {
    supabase = getServiceSupabase();
  } catch (err) {
    console.error('[agency-rollback] service supabase init failed', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server misconfigured' }) };
  }

  const authHeader = event.headers.authorization || event.headers.Authorization;
  const auth = await authFounder(authHeader, supabase);
  if (!auth) {
    return {
      statusCode: authHeader ? 403 : 401,
      headers,
      body: JSON.stringify({ error: authHeader ? 'Founder only' : 'Authentication required' }),
    };
  }

  let body: RollbackBody;
  try {
    body = JSON.parse(event.body || '{}') as RollbackBody;
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }
  const artifact_id = typeof body.artifact_id === 'string' ? body.artifact_id : null;
  const reason = typeof body.reason === 'string' ? body.reason : 'founder rollback';
  if (!artifact_id) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'artifact_id required' }) };
  }

  const { data: artifact, error: fetchErr } = await supabase
    .from('agency_artifacts')
    .select('id, client_id, type, status, content, parent_artifact_id, ship_result')
    .eq('id', artifact_id)
    .single();
  if (fetchErr || !artifact) {
    return { statusCode: 404, headers, body: JSON.stringify({ error: 'artifact not found' }) };
  }
  const row = artifact as ArtifactRow;
  if (row.status !== 'shipped') {
    return {
      statusCode: 409,
      headers,
      body: JSON.stringify({ error: `cannot rollback artifact in status ${row.status}` }),
    };
  }

  const now = new Date().toISOString();

  try {
    // ── Prompt rollback ────────────────────────────────────────────────────
    if (['agent_prompt', 'prompt_revision'].includes(row.type)) {
      const target = await findRevertTarget(supabase, row);
      if (!target) {
        return {
          statusCode: 422,
          headers,
          body: JSON.stringify({
            error: 'no shipped predecessor — nothing to revert to',
          }),
        };
      }
      const previous_prompt =
        typeof target.content?.prompt === 'string' ? (target.content.prompt as string) : null;
      const ship = (row.ship_result ?? {}) as Record<string, unknown>;
      const agent_id = typeof ship.agent_id === 'string' ? ship.agent_id : null;
      if (!previous_prompt || !agent_id) {
        return {
          statusCode: 422,
          headers,
          body: JSON.stringify({
            error: 'missing previous_prompt or agent_id — cannot revert',
          }),
        };
      }
      const revertResult = await revertAgentPrompt({
        agent_id,
        previous_prompt,
        client_id: row.client_id,
        artifact_id: row.id,
        reverted_to_artifact_id: target.id,
        reason,
        triggered_by: 'founder',
      });

      // Insert the new prompt_revision artifact representing the revert.
      const { data: inserted, error: insErr } = await supabase
        .from('agency_artifacts')
        .insert({
          client_id: row.client_id,
          type: 'prompt_revision',
          status: 'shipped',
          generated_by: 'queue-rollback',
          model: null,
          content: {
            prompt: previous_prompt,
            why: reason,
            reverted_from_artifact_id: row.id,
            reverted_to_artifact_id: target.id,
          },
          ship_target: 'retell_agent',
          ship_result: {
            agent_id,
            reverted_to_artifact_id: target.id,
            reverted_at: revertResult.reverted_at,
          },
          parent_artifact_id: row.id,
          shipped_at: now,
        })
        .select('id')
        .single();
      if (insErr || !inserted) {
        console.error('[agency-rollback] revert artifact insert failed', insErr?.message);
      }

      // Mark the old artifact as reverted.
      await supabase
        .from('agency_artifacts')
        .update({
          status: 'reverted',
          reviewed_at: now,
        })
        .eq('id', row.id);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          status: 'reverted',
          revert_artifact_id: inserted?.id ?? null,
          reverted_to_artifact_id: target.id,
        }),
      };
    }

    // ── Ad creative rollback ───────────────────────────────────────────────
    if (['ad_creative', 'ad_copy'].includes(row.type)) {
      const ship = (row.ship_result ?? {}) as Record<string, unknown>;
      const variants = Array.isArray(ship.variants)
        ? (ship.variants as Array<{ ok?: boolean; ad_id?: string }>)
        : [];
      const liveAdIds = variants
        .filter((v) => v.ok && typeof v.ad_id === 'string')
        .map((v) => v.ad_id as string);
      if (liveAdIds.length === 0) {
        return {
          statusCode: 422,
          headers,
          body: JSON.stringify({ error: 'no live ad_ids in ship_result — nothing to pause' }),
        };
      }
      const pauseResults: Array<{ ad_id: string; ok: boolean; paused_at?: string; error?: string }> = [];
      for (const ad_id of liveAdIds) {
        try {
          const r = await pauseAd({ ad_id, client_id: row.client_id });
          pauseResults.push({ ad_id, ok: true, paused_at: r.paused_at });
        } catch (err) {
          pauseResults.push({
            ad_id,
            ok: false,
            error: err instanceof Error ? err.message : 'pause failed',
          });
        }
      }

      // Insert the new ad_creative artifact representing the pause action.
      const { data: inserted } = await supabase
        .from('agency_artifacts')
        .insert({
          client_id: row.client_id,
          type: 'ad_creative',
          status: 'shipped',
          generated_by: 'queue-rollback',
          model: null,
          content: {
            why: reason,
            action: 'pause_all',
            reverted_from_artifact_id: row.id,
          },
          ship_target: 'meta_ads',
          ship_result: {
            paused_ads: pauseResults,
            paused_at: now,
          },
          parent_artifact_id: row.id,
          shipped_at: now,
        })
        .select('id')
        .single();

      await supabase
        .from('agency_artifacts')
        .update({ status: 'reverted', reviewed_at: now })
        .eq('id', row.id);

      const allPaused = pauseResults.every((r) => r.ok);
      return {
        statusCode: allPaused ? 200 : 207,
        headers,
        body: JSON.stringify({
          status: 'reverted',
          revert_artifact_id: inserted?.id ?? null,
          paused_ads: pauseResults,
        }),
      };
    }

    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        error: `rollback not supported for artifact type ${row.type}`,
      }),
    };
  } catch (err) {
    console.error('[agency-rollback] error', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Rollback failed',
        details: err instanceof Error ? err.message : 'unknown',
      }),
    };
  }
};

export const testHandler = handler;
export default withLegacyHandler(handler);
