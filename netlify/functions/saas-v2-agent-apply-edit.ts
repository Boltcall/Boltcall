import { withLegacyHandler } from './_shared/runtime-compat';
/**
 * POST /.netlify/functions/saas-v2-agent-apply-edit
 *
 * Applies one suggestion from saas-v2-agent-suggest-edits to the workspace's
 * agent prompt. Powers the Apply button in the /v2/agent suggestions drawer.
 *
 * Body: { title: string, body: string }  — the suggestion being applied.
 *
 * The edit is appended as a dated "## OWNER EDIT" section (mirrors the
 * AUTO-FIX convention in agent-self-heal.ts) so every applied suggestion is
 * visible and reviewable in the raw prompt, then synced:
 *   1. Retell LLM (PATCH /update-retell-llm) when the agent runs on a
 *      retell-llm response engine.
 *   2. agents.system_prompt + system_prompt_synced_at (the mirror the
 *      custom-llm responders and /v2/agent read).
 *
 * Retell is updated BEFORE the DB mirror so a Retell failure never leaves the
 * mirror claiming an edit that isn't live.
 *
 * Auth: Bearer JWT only. Workspace derived server-side from JWT.
 *
 * Returns: { success: true, prompt_length: number, synced_to_retell: boolean }
 * Emits: saas_v2_agent_edit_applied with { workspace_id, agent_id, title }.
 */

import type { Handler } from '@netlify/functions';

import { getServiceSupabase } from './_shared/token-utils';
import { emitAgencyEvent } from './_shared/emit-agency-event';
import { getV2CorsHeaders, getRequestOrigin } from './_shared/cors-v2';

const RETELL_API = 'https://api.retellai.com';
const RETELL_KEY = process.env.RETELL_API_KEY || '';
const MAX_PROMPT_CHARS = 60000;

interface AgentRow {
  id: string;
  system_prompt: string | null;
  retell_agent_id: string | null;
  api_keys: Record<string, unknown> | null;
}

async function retellFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${RETELL_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${RETELL_KEY}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => 'Unknown error');
    throw new Error(`Retell API ${path} failed (${res.status}): ${errText}`);
  }
  return res.json();
}

const handler: Handler = async (event) => {
  const v2cors = getV2CorsHeaders(
    getRequestOrigin(event.headers as Record<string, string>),
    { methods: 'POST' },
  );
  const cors = v2cors.headers;

  function jsonResponse(statusCode: number, body: Record<string, unknown>) {
    return { statusCode, headers: cors, body: JSON.stringify(body) };
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: cors, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' });
  }

  // Defense-in-depth: this endpoint mutates the live agent prompt — refuse
  // browser calls from origins outside the allowlist.
  const requestOrigin = getRequestOrigin(event.headers as Record<string, string>);
  if (requestOrigin && !v2cors.allowed) {
    return jsonResponse(403, { error: 'Origin not allowed' });
  }

  // ── 1. Auth ──────────────────────────────────────────────────────────────
  const authHeader =
    event.headers['authorization'] || event.headers['Authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) return jsonResponse(401, { error: 'Missing bearer token' });

  const supa = getServiceSupabase();
  const { data: userResult, error: authErr } = await supa.auth.getUser(token);
  if (authErr || !userResult?.user) {
    return jsonResponse(401, { error: 'Invalid or expired token' });
  }
  const userId = userResult.user.id;

  // ── 2. Body ──────────────────────────────────────────────────────────────
  let body: { title?: unknown; body?: unknown };
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return jsonResponse(400, { error: 'Invalid JSON' });
  }
  const title = typeof body.title === 'string' ? body.title.trim().slice(0, 120) : '';
  const patch = typeof body.body === 'string' ? body.body.trim().slice(0, 600) : '';
  if (!title || !patch) {
    return jsonResponse(400, { error: 'title and body are required' });
  }

  // ── 3. Workspace resolution ──────────────────────────────────────────────
  const { data: workspaceRow, error: wsErr } = await supa
    .from('workspaces')
    .select('id')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();
  if (wsErr) return jsonResponse(500, { error: 'Workspace lookup failed' });
  if (!workspaceRow) {
    return jsonResponse(404, { error: 'No workspace found for this user' });
  }
  const workspaceId = (workspaceRow as { id: string }).id;

  // ── 4. Load the agent (same row suggest-edits grounded on) ───────────────
  const { data: agentRow, error: agentErr } = await supa
    .from('agents')
    .select('id, system_prompt, retell_agent_id, api_keys')
    .eq('workspace_id', workspaceId)
    .order('system_prompt_synced_at', { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();
  if (agentErr) return jsonResponse(500, { error: 'Agent lookup failed' });

  const agent = agentRow as AgentRow | null;
  const currentPrompt = (agent?.system_prompt || '').trim();
  if (!agent || !currentPrompt) {
    return jsonResponse(409, {
      error: 'No agent prompt configured yet — finish setup first.',
      code: 'cold_start',
    });
  }

  // Idempotence: re-applying the same suggestion is a no-op, not a duplicate
  // section. The drawer disables the button, but a retried request or a second
  // tab must not stack the edit twice.
  if (currentPrompt.includes(patch)) {
    return jsonResponse(200, {
      success: true,
      already_applied: true,
      prompt_length: currentPrompt.length,
      synced_to_retell: false,
    });
  }

  const stamp = new Date().toISOString().split('T')[0];
  const newPrompt = `${currentPrompt}\n\n## OWNER EDIT (${stamp}) — ${title}\n${patch}`;
  if (newPrompt.length > MAX_PROMPT_CHARS) {
    return jsonResponse(422, {
      error: 'Prompt is too long to accept more edits — trim old sections first.',
      code: 'prompt_too_long',
    });
  }

  // ── 5. Sync Retell first, then the DB mirror ─────────────────────────────
  const retellAgentId =
    agent.retell_agent_id ||
    (typeof agent.api_keys?.retell_agent_id === 'string'
      ? (agent.api_keys.retell_agent_id as string)
      : null);

  let syncedToRetell = false;
  if (retellAgentId && RETELL_KEY) {
    try {
      const voiceAgent = await retellFetch(`/get-agent/${retellAgentId}`);
      const llmId = voiceAgent?.response_engine?.llm_id;
      if (llmId) {
        await retellFetch(`/update-retell-llm/${llmId}`, {
          method: 'PATCH',
          body: JSON.stringify({ general_prompt: newPrompt }),
        });
        syncedToRetell = true;
      }
      // custom-llm engines read the mirrored system_prompt — DB update below
      // is the live sync for them.
    } catch (err) {
      console.error('[saas-v2-agent-apply-edit] Retell sync failed', err);
      return jsonResponse(502, {
        error: 'Could not update the live agent — nothing was changed. Please retry.',
      });
    }
  }

  const { error: updateErr } = await supa
    .from('agents')
    .update({
      system_prompt: newPrompt,
      system_prompt_synced_at: new Date().toISOString(),
    })
    .eq('id', agent.id)
    .eq('workspace_id', workspaceId);
  if (updateErr) {
    console.error('[saas-v2-agent-apply-edit] mirror update failed', updateErr);
    return jsonResponse(500, {
      error: syncedToRetell
        ? 'Edit is live on the agent but the dashboard copy failed to save — refresh to re-sync.'
        : 'Failed to save the edit.',
    });
  }

  // ── 6. Telemetry (best-effort) ───────────────────────────────────────────
  try {
    await emitAgencyEvent({
      client_id: workspaceId,
      agent_name: 'saas-v2-agent-apply-edit',
      type: 'saas_v2_agent_edit_applied',
      severity: 'info',
      payload: {
        workspace_id: workspaceId,
        agent_id: agent.id,
        retell_agent_id: retellAgentId,
        title,
        synced_to_retell: syncedToRetell,
        prompt_length: newPrompt.length,
      },
      why_explanation: `Owner applied suggested prompt edit "${title}" from the /v2/agent drawer.`,
    });
  } catch (emitErr) {
    console.warn('[saas-v2-agent-apply-edit] event emit failed (non-fatal)', emitErr);
  }

  return jsonResponse(200, {
    success: true,
    prompt_length: newPrompt.length,
    synced_to_retell: syncedToRetell,
  });
};

export const testHandler = handler;
export default withLegacyHandler(handler);
