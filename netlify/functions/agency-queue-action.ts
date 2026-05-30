/**
 * agency-queue-action — POST. Founder-only.
 *
 * Body: { artifact_id, action: 'approve'|'reject'|'defer'|'edit', reason?, note?, edited_content? }
 *
 * On approve:
 *   - UPDATE agency_artifacts SET status='approved', reviewed_at=now()
 *   - Dispatch to the right ship handler based on artifact.type:
 *       agent_prompt / prompt_revision → /.netlify/functions/agency-deploy-agent
 *       ad_creative / ad_copy          → /.netlify/functions/agency-push-creative
 *       (other types stay as approved-no-ship; the founder consumed it directly)
 *   - Return { status: 'approved', ship_result?: {...} }
 *
 * On reject:
 *   - UPDATE status='rejected', reviewed_at=now()
 *   - Emit a domain-appropriate agency_event with severity='warn' carrying the
 *     reason in the payload. The loop-monitor consumes rejection reasons to
 *     learn which prompts produce founder-rejected output and proposes prompt
 *     rewrites.
 *
 * On defer:
 *   - UPDATE status='deferred', reviewed_at=now()
 *   - Track defer count via a content.defer_count field on the artifact.
 *   - On the third defer: emit a slack-adapter notification so Atlas surfaces
 *     it in the morning briefing as a stuck decision.
 *
 * On edit:
 *   - UPDATE content with edited_content (if provided) + status='draft' +
 *     reviewed_at=now(). The post-edit draft re-enters the queue. If only a
 *     note is provided (no edited_content), append it to content.notes[]
 *     without changing status.
 *
 * Auth: founder-only via JWT app_metadata.role check.
 */

import type { Handler } from '@netlify/functions';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getServiceSupabase } from './_shared/token-utils';
import { emitAgencyEvent } from './_shared/emit-agency-event';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

const SHIP_HANDLER_FOR_TYPE: Record<string, string | null> = {
  agent_prompt: '/.netlify/functions/agency-deploy-agent',
  prompt_revision: '/.netlify/functions/agency-deploy-agent',
  ad_creative: '/.netlify/functions/agency-push-creative',
  ad_copy: '/.netlify/functions/agency-push-creative',
  // These types have no automated ship path — they're either consumed by the
  // founder directly (weekly_report) or shipped by a different scheduled
  // workflow (client_outreach goes via email-adapter, optimization_brief is
  // consumed by the next scheduled experiment_plan run).
  weekly_report: null,
  optimization_brief: null,
  client_outreach: null,
  escalation_action: null,
  knowledge_base: null,
  digital_twin_seed: null,
  experiment_plan: '/.netlify/functions/agency-promote-experiment',
  expansion_pitch: null,
};

interface ActionBody {
  artifact_id?: unknown;
  action?: unknown;
  reason?: unknown;
  note?: unknown;
  edited_content?: unknown;
}

async function authFounder(
  authHeader: string | undefined,
  supabase: SupabaseClient,
): Promise<{ userId: string; email: string | null } | null> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.substring(7);
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  const role = (data.user.app_metadata as Record<string, unknown> | null)?.role;
  if (role !== 'founder') return null;
  return { userId: data.user.id, email: data.user.email ?? null };
}

interface ArtifactRow {
  id: string;
  client_id: string;
  type: string;
  status: string;
  content: Record<string, unknown>;
  parent_artifact_id: string | null;
  ship_target: string | null;
  predicted_impact: unknown;
}

/**
 * Call a local Netlify function from inside another function. Netlify routes
 * `/.netlify/functions/<name>` to the deployed function URL; in dev we fall
 * back to URL/DEPLOY_URL/SITE_URL. Auth header is forwarded so the downstream
 * function performs its own founder check.
 */
async function callShipHandler(
  path: string,
  authHeader: string,
  body: Record<string, unknown>,
): Promise<{ ok: boolean; status: number; body: unknown }> {
  const base =
    process.env.URL ||
    process.env.DEPLOY_URL ||
    process.env.SITE_URL ||
    'https://boltcall.org';
  const url = `${base}${path}`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      body: JSON.stringify(body),
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
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let supabase: SupabaseClient;
  try {
    supabase = getServiceSupabase();
  } catch (err) {
    console.error('[agency-queue-action] service supabase init failed', err);
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

  // ── Parse + validate body ────────────────────────────────────────────────
  let body: ActionBody;
  try {
    body = JSON.parse(event.body || '{}') as ActionBody;
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }
  const artifact_id = typeof body.artifact_id === 'string' ? body.artifact_id : null;
  const action = typeof body.action === 'string' ? body.action : null;
  if (!artifact_id || !action) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'artifact_id + action required' }) };
  }
  if (!['approve', 'reject', 'defer', 'edit'].includes(action)) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'invalid action' }) };
  }

  // ── Fetch artifact ───────────────────────────────────────────────────────
  const { data: artifact, error: fetchErr } = await supabase
    .from('agency_artifacts')
    .select('id, client_id, type, status, content, parent_artifact_id, ship_target, predicted_impact')
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

  const now = new Date().toISOString();

  try {
    if (action === 'approve') {
      // Mark approved first so the ship handler can see the new status.
      const { error: updErr } = await supabase
        .from('agency_artifacts')
        .update({ status: 'approved', reviewed_at: now })
        .eq('id', artifact_id);
      if (updErr) throw updErr;

      const handlerPath = SHIP_HANDLER_FOR_TYPE[row.type];
      let ship_result: unknown = null;
      let ship_status: number | null = null;
      if (handlerPath) {
        const res = await callShipHandler(handlerPath, authHeader!, {
          artifact_id,
        });
        ship_result = res.body;
        ship_status = res.status;
        if (!res.ok) {
          // Roll back the approved state so the founder can retry.
          await supabase
            .from('agency_artifacts')
            .update({ status: 'draft', reviewed_at: null })
            .eq('id', artifact_id);
          return {
            statusCode: 502,
            headers,
            body: JSON.stringify({
              error: 'Ship handler failed',
              ship_status,
              ship_result,
            }),
          };
        }
      }
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          status: 'approved',
          ship_target: handlerPath,
          ship_result,
          ship_status,
        }),
      };
    }

    if (action === 'reject') {
      const reason = typeof body.reason === 'string' ? body.reason : 'no reason provided';
      const { error: updErr } = await supabase
        .from('agency_artifacts')
        .update({ status: 'rejected', reviewed_at: now })
        .eq('id', artifact_id);
      if (updErr) throw updErr;

      // Emit an escalation_action_drafted event so the loop-monitor can mine
      // rejection reasons. We deliberately use escalation_action_drafted
      // rather than inventing a new event type — the kernel's event schema
      // map is already enumerated, and a rejection IS the founder taking a
      // rollback-class action on a draft.
      try {
        await emitAgencyEvent({
          client_id: row.client_id,
          agent_name: 'queue',
          type: 'escalation_action_drafted',
          severity: 'warn',
          payload: {
            artifact_id,
            action_type: 'rollback',
            reversible: true,
          },
          why_explanation: `Founder rejected ${row.type} from ${row.client_id.slice(0, 8)}: ${reason.slice(0, 200)}`,
        });
      } catch (emitErr) {
        // Don't fail the reject if the event emit failed — the status change
        // is the source of truth. Log it so we notice if the bus is broken.
        console.warn('[agency-queue-action] reject event emit failed', emitErr);
      }
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ status: 'rejected', reason }),
      };
    }

    if (action === 'defer') {
      // Track defer count in content.defer_count so we can escalate on the
      // third defer. We do this rather than adding a column because the
      // counter is a queue-policy artifact, not kernel state, and the kernel
      // migration is frozen.
      const existing = (row.content ?? {}) as Record<string, unknown>;
      const prevCount = typeof existing.defer_count === 'number' ? existing.defer_count : 0;
      const nextCount = prevCount + 1;
      const newContent = {
        ...existing,
        defer_count: nextCount,
        last_deferred_at: now,
      };
      const { error: updErr } = await supabase
        .from('agency_artifacts')
        .update({ status: 'deferred', reviewed_at: now, content: newContent })
        .eq('id', artifact_id);
      if (updErr) throw updErr;

      if (nextCount >= 3) {
        try {
          // Escalate via slack-adapter → Atlas Telegram tier. We import lazily
          // to avoid loading the adapter on every approve/reject hot path. The
          // adapter falls back to queued email if the client has no Slack
          // webhook configured, so this always lands somewhere visible.
          const { sendDirectNotification } = await import(
            './_shared/agency-adapters/slack-adapter'
          );
          await sendDirectNotification({
            client_id: row.client_id,
            channel: 'critical',
            message:
              `Stuck decision — artifact ${artifact_id} (${row.type}) ` +
              `deferred ${nextCount}× in queue. Atlas should surface this in ` +
              `the next morning briefing.`,
          });
        } catch (notifyErr) {
          // Non-fatal. Slack-adapter failures already emit their own
          // notification_failed events; we don't double-emit here.
          console.warn('[agency-queue-action] defer escalation send failed', notifyErr);
        }
      }
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ status: 'deferred', defer_count: nextCount }),
      };
    }

    if (action === 'edit') {
      // Two modes:
      //   (a) edited_content provided → replace content, reset status to draft
      //   (b) note-only → append to content.notes[] without status change
      const note = typeof body.note === 'string' ? body.note : null;
      const editedContent = body.edited_content;

      if (editedContent !== undefined && editedContent !== null) {
        if (typeof editedContent !== 'object') {
          return { statusCode: 400, headers, body: JSON.stringify({ error: 'edited_content must be an object' }) };
        }
        const merged = { ...(editedContent as Record<string, unknown>) };
        // Preserve queue-policy fields the edit shouldn't blow away.
        const existing = (row.content ?? {}) as Record<string, unknown>;
        if (existing.notes) merged.notes = existing.notes;
        if (existing.defer_count) merged.defer_count = existing.defer_count;
        const { error: updErr } = await supabase
          .from('agency_artifacts')
          .update({
            content: merged,
            // Reset to draft so the re-bench / re-critic loop can pick it up.
            // Whichever loop owns this artifact type is responsible for the
            // re-benchmark — the queue function does not call BENCHMARK.md
            // gates directly (separation of concerns).
            status: 'draft',
            reviewed_at: now,
            eval_score: null,
          })
          .eq('id', artifact_id);
        if (updErr) throw updErr;
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ status: 'draft', edited: true }),
        };
      }

      if (note) {
        const existing = (row.content ?? {}) as Record<string, unknown>;
        const notes = Array.isArray(existing.notes) ? existing.notes : [];
        const merged = {
          ...existing,
          notes: [...notes, { author_id: auth.userId, at: now, text: note }],
        };
        const { error: updErr } = await supabase
          .from('agency_artifacts')
          .update({ content: merged })
          .eq('id', artifact_id);
        if (updErr) throw updErr;
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ status: row.status, noted: true }),
        };
      }

      return { statusCode: 400, headers, body: JSON.stringify({ error: 'edit requires edited_content or note' }) };
    }

    return { statusCode: 400, headers, body: JSON.stringify({ error: 'unhandled action' }) };
  } catch (err) {
    console.error('[agency-queue-action] error', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal error',
        details: err instanceof Error ? err.message : 'unknown',
      }),
    };
  }
};
