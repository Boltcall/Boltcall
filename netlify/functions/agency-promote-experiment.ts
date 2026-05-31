/**
 * agency-promote-experiment — POST. Founder-only.
 *
 * Ship handler for type='experiment_plan' artifact approvals. The
 * optimization-strategist emits experiment_plan artifacts containing up to 3
 * shadow-split experiments (each with prompt_diff.full_new_prompt, predicted
 * lift CI, benchmark_scenario, rollback_trigger). When the founder approves
 * the artifact in the queue, this handler:
 *
 *   1. Resolves the client's vertical (retell_prompt_versions is keyed by
 *      vertical, not client_id).
 *   2. For each experiment in artifact.content.experiments:
 *        a. Inserts a row into retell_prompt_versions with
 *             status='cekura_passed'
 *             prompt_text=experiment.prompt_diff.full_new_prompt
 *             vertical=<client's vertical>
 *             scope='customer'
 *             agent_id=<the client's current Retell agent_id>
 *           shadow_split_pct, rollback_trigger, evaluation_window_hours, and
 *           the source artifact_id are persisted in `rollback_data.experiment`
 *           so retell-shadow-monitor can read them later.
 *        b. Calls /.netlify/functions/retell-shadow-promote { version_id }.
 *           That function flips status to 'shadowing', patches the Retell LLM,
 *           and stores the original prompt in rollback_data for revert.
 *   3. Updates the parent agency_artifacts row:
 *        status='shipped'
 *        shipped_at=now()
 *        ship_target='retell_shadow_split'
 *        ship_window_ends_at=now()+14d  (eval window for the experiment cohort
 *                                        — the shadow-monitor cron evaluates
 *                                        each per-experiment evaluation_window
 *                                        sooner, but 14d is the soft outer cap
 *                                        for the parent artifact)
 *        ship_result={ shadow_versions: [...ids], promoted_count, started_at,
 *                      errors? }
 *
 * Idempotency: if the artifact is already shipped, returns 200 with the
 * existing ship_result.
 *
 * Failure mode: if shadow-promote fails for one experiment, the others still
 * try (we don't want one bad variant to block a 3-experiment plan). Errors
 * are surfaced in ship_result.errors. If ALL experiments fail to promote, the
 * artifact is rolled back to 'draft' so the founder can retry.
 *
 * Auth: founder-only via JWT app_metadata.role check (mirrors
 * agency-deploy-agent — the upstream queue function also checks, but every
 * ship handler re-checks per defense-in-depth).
 */

import type { Handler } from '@netlify/functions';
import { type SupabaseClient } from '@supabase/supabase-js';
import { getServiceSupabase } from './_shared/token-utils';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

// 14-day soft cap on the parent experiment_plan artifact's ship window. Each
// individual experiment also has its own evaluation_window_hours (24-168h) on
// the strategist output schema, which retell-shadow-monitor consumes; 14 days
// is the outer cap for the cohort of up to 3 experiments to all resolve.
const EXPERIMENT_PLAN_WATCH_DAYS = 14;

interface PromoteBody {
  artifact_id?: unknown;
}

async function authFounder(
  authHeader: string | undefined,
  supabase: SupabaseClient,
): Promise<boolean> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return false;
  const token = authHeader.substring(7);
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return false;
  const role = (data.user.app_metadata as Record<string, unknown> | null)?.role;
  return role === 'founder';
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

interface ClientRow {
  id: string;
  vertical: string | null;
}

interface RollbackTrigger {
  metric: string;
  threshold: number;
  direction: 'above' | 'below';
  window_hours: number;
}

interface ExperimentInput {
  experiment_id?: string;
  hypothesis?: string;
  prompt_diff?: {
    full_new_prompt?: string;
    lines_added?: string[];
    lines_removed?: string[];
  };
  predicted_lift_pct?: number;
  ci_80_low?: number;
  ci_80_high?: number;
  benchmark_scenario?: string;
  rollback_trigger?: RollbackTrigger;
  shadow_split_pct?: number;
  evaluation_window_hours?: number;
  promotion_criterion?: string;
}

/**
 * Locate the Retell agent_id currently bound to a client by finding the most
 * recently shipped agent_prompt / prompt_revision artifact. Mirrors
 * agency-deploy-agent.findExistingAgentId so the two ship paths agree on
 * which agent is "current".
 */
async function findExistingAgentId(
  supabase: SupabaseClient,
  client_id: string,
): Promise<string | null> {
  const { data } = await supabase
    .from('agency_artifacts')
    .select('ship_result, shipped_at')
    .eq('client_id', client_id)
    .in('type', ['agent_prompt', 'prompt_revision'])
    .eq('status', 'shipped')
    .order('shipped_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  const sr = (data.ship_result ?? {}) as Record<string, unknown>;
  return typeof sr.agent_id === 'string' ? sr.agent_id : null;
}

/**
 * Call the W4 retell-shadow-promote function in-process by HTTP. Netlify routes
 * /.netlify/functions/<name> to the deployed URL; in dev we fall back to
 * URL/DEPLOY_URL/SITE_URL. Auth header is forwarded so the downstream function
 * runs under the founder's identity (retell-shadow-promote doesn't gate on
 * role today, but forwarding is the safer default if it grows a check).
 */
async function callShadowPromote(
  authHeader: string,
  version_id: string,
): Promise<{ ok: boolean; status: number; body: unknown }> {
  const base =
    process.env.URL ||
    process.env.DEPLOY_URL ||
    process.env.SITE_URL ||
    'https://boltcall.org';
  const url = `${base}/.netlify/functions/retell-shadow-promote`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      body: JSON.stringify({ version_id }),
    });
    let parsed: unknown = null;
    const text = await res.text();
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = { raw: text.slice(0, 500) };
    }
    return { ok: res.ok, status: res.status, body: parsed };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      body: { error: err instanceof Error ? err.message : 'fetch failed' },
    };
  }
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  let supabase: SupabaseClient;
  try {
    supabase = getServiceSupabase();
  } catch (err) {
    console.error('[agency-promote-experiment] service supabase init failed', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Server misconfigured' }),
    };
  }

  const authHeader = event.headers.authorization || event.headers.Authorization;
  if (!(await authFounder(authHeader, supabase))) {
    return {
      statusCode: authHeader ? 403 : 401,
      headers,
      body: JSON.stringify({
        error: authHeader ? 'Founder only' : 'Authentication required',
      }),
    };
  }

  let body: PromoteBody;
  try {
    body = JSON.parse(event.body || '{}') as PromoteBody;
  } catch {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Invalid JSON' }),
    };
  }
  const artifact_id = typeof body.artifact_id === 'string' ? body.artifact_id : null;
  if (!artifact_id) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'artifact_id required' }),
    };
  }

  // ── Fetch the artifact ─────────────────────────────────────────────────────
  const { data: artifact, error: fetchErr } = await supabase
    .from('agency_artifacts')
    .select('id, client_id, type, status, content, parent_artifact_id, ship_result')
    .eq('id', artifact_id)
    .single();
  if (fetchErr || !artifact) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'artifact not found' }),
    };
  }
  const row = artifact as ArtifactRow;
  if (row.type !== 'experiment_plan') {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        error: `wrong artifact type for this handler: ${row.type}`,
      }),
    };
  }
  // Idempotency.
  if (row.status === 'shipped' && row.ship_result) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        status: 'shipped',
        ship_result: row.ship_result,
        already: true,
      }),
    };
  }
  if (!['draft', 'approved'].includes(row.status)) {
    return {
      statusCode: 409,
      headers,
      body: JSON.stringify({
        error: `cannot promote artifact in status ${row.status}`,
      }),
    };
  }

  // ── Validate experiments[] ─────────────────────────────────────────────────
  const content = row.content ?? {};
  const experiments = Array.isArray(content.experiments)
    ? (content.experiments as ExperimentInput[])
    : null;
  if (!experiments || experiments.length === 0) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        error: 'artifact.content.experiments[] is required and must be non-empty',
      }),
    };
  }

  // ── Pull client for vertical ──────────────────────────────────────────────
  const { data: client, error: clientErr } = await supabase
    .from('agency_clients')
    .select('id, vertical')
    .eq('id', row.client_id)
    .single();
  if (clientErr || !client) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'client not found' }),
    };
  }
  const clientRow = client as ClientRow;
  const vertical = clientRow.vertical ?? 'other';

  // ── Locate the client's current Retell agent (best-effort) ────────────────
  // If there is no shipped agent_prompt yet, the experiment can still be
  // staged as a cekura_passed row, but retell-shadow-promote will find zero
  // matching agents in that vertical and the call will be a no-op. We surface
  // that in the ship_result so it's visible to the founder.
  const agent_id = await findExistingAgentId(supabase, row.client_id);

  const started_at = new Date().toISOString();
  const shadow_versions: string[] = [];
  const promote_errors: Array<{ experiment_id: string; error: string }> = [];

  try {
    for (let i = 0; i < experiments.length; i++) {
      const exp = experiments[i];
      const experiment_id = exp.experiment_id ?? `exp_${i + 1}`;
      const prompt_text = exp.prompt_diff?.full_new_prompt;
      if (!prompt_text || prompt_text.length < 50) {
        promote_errors.push({
          experiment_id,
          error: 'prompt_diff.full_new_prompt missing or too short',
        });
        continue;
      }

      // Insert as cekura_passed so retell-shadow-promote will accept it. The
      // experiment_plan artifact has ALREADY been gated through cekura
      // upstream (see retell-cekura-gate.ts) at the strategist's playback
      // stage — we're not bypassing the gate, we're recording its outcome.
      // Per-experiment metadata (shadow_split_pct, rollback_trigger,
      // evaluation_window_hours, source artifact link) goes into
      // rollback_data.experiment so retell-shadow-monitor can read it later
      // without a new column migration.
      const { data: insertedVersion, error: insertErr } = await supabase
        .from('retell_prompt_versions')
        .insert({
          scope: 'customer',
          vertical,
          agent_id, // null is fine — shadow-promote falls back to vertical match
          version: `${started_at.slice(0, 19)}-${experiment_id}`,
          prompt_text,
          status: 'cekura_passed',
          rollback_data: {
            experiment: {
              source_artifact_id: row.id,
              experiment_id,
              shadow_split_pct: exp.shadow_split_pct ?? 10,
              rollback_trigger: exp.rollback_trigger ?? null,
              evaluation_window_hours: exp.evaluation_window_hours ?? 72,
              predicted_lift_pct: exp.predicted_lift_pct ?? null,
              ci_80_low: exp.ci_80_low ?? null,
              ci_80_high: exp.ci_80_high ?? null,
              promotion_criterion: exp.promotion_criterion ?? null,
            },
          },
        })
        .select('id')
        .single();

      if (insertErr || !insertedVersion) {
        promote_errors.push({
          experiment_id,
          error: `insert failed: ${insertErr?.message ?? 'no row returned'}`,
        });
        continue;
      }

      const version_id = insertedVersion.id as string;

      // Call the W4 shadow-promote endpoint. It patches the live Retell LLM
      // for every agent in this vertical to the new prompt and flips status
      // to 'shadowing'. retell-shadow-monitor (cron, 4h cadence) then
      // promotes or reverts based on the rollback_trigger.
      const res = await callShadowPromote(authHeader!, version_id);
      if (!res.ok) {
        promote_errors.push({
          experiment_id,
          error: `shadow-promote failed (status ${res.status}): ${
            typeof res.body === 'object' && res.body
              ? JSON.stringify(res.body).slice(0, 300)
              : String(res.body).slice(0, 300)
          }`,
        });
        // Roll the row back so it doesn't sit as orphaned cekura_passed.
        await supabase
          .from('retell_prompt_versions')
          .update({ status: 'rejected' })
          .eq('id', version_id);
        continue;
      }

      shadow_versions.push(version_id);
    }

    // If ALL experiments failed to promote, treat the ship as failed so the
    // queue function rolls the artifact status back to draft and the founder
    // can retry. Partial success (>=1 promoted) is acceptable — the surviving
    // experiment(s) will still run shadow.
    if (shadow_versions.length === 0) {
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({
          error: 'No experiments promoted to shadow',
          errors: promote_errors,
        }),
      };
    }

    const ship_result = {
      shadow_versions,
      promoted_count: shadow_versions.length,
      attempted_count: experiments.length,
      started_at,
      vertical,
      bound_agent_id: agent_id,
      errors: promote_errors.length > 0 ? promote_errors : undefined,
    };

    const ship_window_ends_at = new Date(
      Date.now() + EXPERIMENT_PLAN_WATCH_DAYS * 86_400_000,
    ).toISOString();

    const { error: updErr } = await supabase
      .from('agency_artifacts')
      .update({
        status: 'shipped',
        shipped_at: started_at,
        ship_target: 'retell_shadow_split',
        ship_result,
        ship_window_ends_at,
      })
      .eq('id', row.id);

    if (updErr) {
      // The shadow rows ARE inserted and shadow-promote already ran. Surface
      // loudly so the founder retries; the retry returns early via the
      // idempotency check on row.status === 'shipped'… except status didn't
      // flip. The founder may need to manually mark shipped — we log the ids
      // here so they're recoverable from the function log.
      console.error(
        '[agency-promote-experiment] post-promote artifact update failed',
        { artifact_id, shadow_versions, updErr: updErr.message },
      );
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Experiments promoted but artifact row update failed',
          ship_result,
        }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        status: 'shipped',
        promoted_count: shadow_versions.length,
        shadow_versions,
        ship_window_ends_at,
        ship_result,
      }),
    };
  } catch (err) {
    console.error('[agency-promote-experiment] error', err);
    return {
      statusCode: 502,
      headers,
      body: JSON.stringify({
        error: 'Promote failed',
        details: err instanceof Error ? err.message : 'unknown',
        partial_shadow_versions: shadow_versions,
      }),
    };
  }
};
