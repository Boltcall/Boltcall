import { Handler } from '@netlify/functions';
import { getSupabase } from './_shared/token-utils';
import { inferVertical } from './_shared/vertical-utils';
import { authorizeRunner } from './_shared/agency-runner-auth';
import { withLegacyHandler } from './_shared/runtime-compat';

/**
 * retell-shadow-promote
 *
 * W4 — Activates a cekura_passed prompt version as a shadow rollout.
 * Pushes the proposed prompt_text to every live Retell agent in the target
 * vertical, saves the original prompts for rollback, and flips the version
 * status to 'shadowing'.
 *
 * retell-shadow-monitor.ts runs every 4 h on a cron and evaluates the shadow
 * after 48 h, either promoting to 'live' or reverting via rollback_data.
 *
 * POST { version_id: string, dry_run?: boolean }
 */

const HEADERS = { 'Content-Type': 'application/json' };
const RETELL_API = 'https://api.retellai.com';

async function retellFetch(path: string, options: RequestInit = {}) {
  const key = process.env.RETELL_API_KEY;
  if (!key) throw new Error('RETELL_API_KEY not configured');
  const res = await fetch(`${RETELL_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  if (res.status === 204) return null;
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || data?.error || `Retell API error ${res.status}`);
  return data;
}

const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: HEADERS, body: JSON.stringify({ error: 'Method not allowed' }) };
  }
  const authz = await authorizeRunner(event);
  if (!authz.ok) {
    return { statusCode: authz.status, headers: HEADERS, body: JSON.stringify({ error: authz.message }) };
  }

  let version_id: string;
  let dry_run = false;
  try {
    const body = JSON.parse(event.body || '{}');
    version_id = body.version_id;
    dry_run = body.dry_run === true;
  } catch {
    return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  if (!version_id) {
    return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'version_id required' }) };
  }

  const supabase = getSupabase();

  // Load the version — must exist and be cekura_passed
  const { data: version, error: verErr } = await supabase
    .from('retell_prompt_versions')
    .select('id, vertical, prompt_text, status')
    .eq('id', version_id)
    .eq('status', 'cekura_passed')
    .maybeSingle();

  if (verErr || !version) {
    return {
      statusCode: 404,
      headers: HEADERS,
      body: JSON.stringify({ error: 'Version not found or not in cekura_passed status', detail: verErr?.message }),
    };
  }

  // Find all Boltcall agents that have a retell_agent_id and match this vertical
  const { data: allAgents } = await supabase
    .from('agents')
    .select('id, retell_agent_id, name, description')
    .not('retell_agent_id', 'is', null);

  const targetAgents = (allAgents || []).filter(a =>
    inferVertical([a.name, a.description].filter(Boolean).join(' ')) === version.vertical
  );

  if (targetAgents.length === 0) {
    console.log(`[shadow-promote] No agents found for vertical=${version.vertical}`);
    return {
      statusCode: 200,
      headers: HEADERS,
      body: JSON.stringify({ ok: true, agents_updated: 0, message: 'No agents found for vertical' }),
    };
  }

  console.log(`[shadow-promote] Promoting version ${version_id} (${version.vertical}) to ${targetAgents.length} agents. dry_run=${dry_run}`);

  // Per-agent: get LLM ID + backup current prompt, then patch with new prompt
  const rollbackData: Record<string, { llm_id: string; original_prompt: string }> = {};
  const updatedAgentIds: string[] = [];
  const errors: string[] = [];

  for (const agent of targetAgents) {
    try {
      const retellAgent = await retellFetch(`/v2/agent/${agent.retell_agent_id}`);
      const llmId: string | undefined = retellAgent?.response_engine?.llm_id || retellAgent?.llm_id;
      if (!llmId) {
        console.warn(`[shadow-promote] No LLM ID for agent ${agent.retell_agent_id}, skipping`);
        continue;
      }

      const currentLlm = await retellFetch(`/v2/retell-llm/${llmId}`);
      const originalPrompt: string = currentLlm?.general_prompt || '';

      rollbackData[agent.retell_agent_id] = { llm_id: llmId, original_prompt: originalPrompt };

      if (!dry_run) {
        await retellFetch(`/v2/retell-llm/${llmId}`, {
          method: 'PATCH',
          body: JSON.stringify({ general_prompt: version.prompt_text }),
        });
      }

      updatedAgentIds.push(agent.retell_agent_id);
    } catch (err: any) {
      const msg = `agent ${agent.retell_agent_id}: ${err?.message || err}`;
      console.error(`[shadow-promote] Failed to update ${msg}`);
      errors.push(msg);
    }
  }

  if (updatedAgentIds.length === 0) {
    return {
      statusCode: 500,
      headers: HEADERS,
      body: JSON.stringify({ error: 'Failed to update any agent', errors }),
    };
  }

  // Persist shadow metadata
  if (!dry_run) {
    const { error: updateErr } = await supabase
      .from('retell_prompt_versions')
      .update({
        status: 'shadowing',
        shadow_started_at: new Date().toISOString(),
        shadow_agent_ids: updatedAgentIds,
        rollback_data: rollbackData,
      })
      .eq('id', version_id);

    if (updateErr) {
      console.error('[shadow-promote] Failed to update version status:', updateErr);
      return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ error: 'DB update failed', detail: updateErr.message }) };
    }

    // Emit event (best-effort)
    supabase.from('aios_event_log').insert({
      event_type: 'retell_shadow_started',
      channel: 'voice',
      subject_id: version_id,
      sentiment: 'neutral',
      payload: {
        version_id,
        vertical: version.vertical,
        agents_updated: updatedAgentIds.length,
        errors_count: errors.length,
      },
      ts: new Date().toISOString(),
    }).then(({ error }) => {
      if (error) console.error('[shadow-promote] aios_event_log write failed:', error);
    });
  }

  console.log(`[shadow-promote] Shadow started for version ${version_id} | vertical=${version.vertical} agents=${updatedAgentIds.length} errors=${errors.length} dry_run=${dry_run}`);

  return {
    statusCode: 200,
    headers: HEADERS,
    body: JSON.stringify({
      ok: true,
      dry_run,
      version_id,
      vertical: version.vertical,
      agents_updated: updatedAgentIds.length,
      errors_count: errors.length,
      errors: errors.length ? errors : undefined,
    }),
  };
};

export const testHandler = handler;
export default withLegacyHandler(handler);
