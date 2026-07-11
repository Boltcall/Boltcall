import { Handler } from '@netlify/functions';
import { getSupabase } from './_shared/token-utils';
import { authorizeRunner } from './_shared/agency-runner-auth';
import { withLegacyHandler } from './_shared/runtime-compat';

/**
 * retell-ab-start — batch-2 task 6: true per-call A/B testing.
 *
 * Takes a cekura_passed prompt version pinned to one agent and starts a
 * concurrent traffic-split experiment:
 *   1. Clones the base agent's LLM with the variant prompt_text.
 *   2. Creates a variant Retell agent (same voice/language/webhook), tagged
 *      metadata.variant_of + metadata.prompt_version_id. The variant lives
 *      only in Retell — no agents-table row, so it never appears in user UI.
 *   3. Flips the version to status 'ab_testing' and stores the experiment
 *      wiring in rollback_data.experiment.
 *
 * Traffic split happens at call creation (retell-agents create_web_call);
 * retell-shadow-monitor compares confirmed book rates per arm and promotes
 * the winner / deletes the variant.
 * ponytail: phone calls stay time-split (shadow flow) — Retell routes a number
 * to one inbound agent; revisit if Retell adds per-call agent override.
 *
 * POST { version_id: string, split_pct?: number, evaluation_window_hours?: number }
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
  let split_pct = 50;
  let evaluation_window_hours = 48;
  try {
    const body = JSON.parse(event.body || '{}');
    version_id = body.version_id;
    if (Number(body.split_pct) > 0 && Number(body.split_pct) < 100) split_pct = Number(body.split_pct);
    if (Number(body.evaluation_window_hours) > 0) evaluation_window_hours = Number(body.evaluation_window_hours);
  } catch {
    return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }
  if (!version_id) {
    return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'version_id required' }) };
  }

  const supabase = getSupabase();

  const { data: version, error: verErr } = await supabase
    .from('retell_prompt_versions')
    .select('id, vertical, agent_id, prompt_text, status, rollback_data')
    .eq('id', version_id)
    .eq('status', 'cekura_passed')
    .maybeSingle();
  if (verErr || !version) {
    return { statusCode: 404, headers: HEADERS, body: JSON.stringify({ error: 'Version not found or not cekura_passed', detail: verErr?.message }) };
  }
  if (!version.agent_id) {
    return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'A/B testing requires a version pinned to one agent (agent_id)' }) };
  }

  const { data: agentRow } = await supabase
    .from('agents')
    .select('id, name, retell_agent_id')
    .eq('id', version.agent_id)
    .maybeSingle();
  if (!agentRow?.retell_agent_id) {
    return { statusCode: 404, headers: HEADERS, body: JSON.stringify({ error: 'Agent row or retell_agent_id not found' }) };
  }

  // Clone base agent config → variant LLM + variant agent
  const baseAgent = await retellFetch(`/v2/agent/${agentRow.retell_agent_id}`);
  const baseLlmId: string | undefined = baseAgent?.response_engine?.llm_id;
  if (!baseLlmId) {
    return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'Base agent has no retell-llm response engine' }) };
  }
  const baseLlm = await retellFetch(`/v2/retell-llm/${baseLlmId}`);

  const variantLlm = await retellFetch('/create-retell-llm', {
    method: 'POST',
    body: JSON.stringify({
      model: baseLlm?.model || 'gpt-4o-mini',
      general_prompt: version.prompt_text,
      general_tools: baseLlm?.general_tools || undefined,
      begin_message: baseLlm?.begin_message || undefined,
    }),
  });
  if (!variantLlm?.llm_id) {
    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ error: 'Variant LLM creation failed' }) };
  }

  let variantAgent: any;
  try {
    variantAgent = await retellFetch('/create-agent', {
      method: 'POST',
      body: JSON.stringify({
        response_engine: { type: 'retell-llm', llm_id: variantLlm.llm_id },
        voice_id: baseAgent.voice_id,
        agent_name: `${baseAgent.agent_name || agentRow.name} [ab-variant]`,
        language: baseAgent.language || undefined,
        webhook_url: baseAgent.webhook_url || undefined,
        metadata: { variant_of: agentRow.retell_agent_id, prompt_version_id: version.id },
      }),
    });
  } catch (err) {
    // Don't leak the orphan LLM
    await retellFetch(`/delete-retell-llm/${variantLlm.llm_id}`, { method: 'DELETE' }).catch(() => {});
    throw err;
  }

  const rollbackData = {
    ...(version.rollback_data || {}),
    experiment: {
      ...((version.rollback_data as any)?.experiment || {}),
      shadow_split_pct: split_pct,
      evaluation_window_hours,
      base_retell_agent_id: agentRow.retell_agent_id,
      base_llm_id: baseLlmId,
      variant_retell_agent_id: variantAgent.agent_id,
      variant_llm_id: variantLlm.llm_id,
    },
  };

  const startedAt = new Date().toISOString();
  const { error: updErr } = await supabase
    .from('retell_prompt_versions')
    .update({
      status: 'ab_testing',
      shadow_started_at: startedAt,
      shadow_agent_ids: [variantAgent.agent_id],
      rollback_data: rollbackData,
    })
    .eq('id', version_id);
  if (updErr) {
    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ error: 'DB update failed', detail: updErr.message }) };
  }

  supabase.from('aios_event_log').insert({
    event_type: 'retell_ab_started',
    channel: 'voice',
    subject_id: version_id,
    sentiment: 'neutral',
    payload: {
      version_id,
      vertical: version.vertical,
      base_agent: agentRow.retell_agent_id,
      variant_agent: variantAgent.agent_id,
      split_pct,
    },
    ts: startedAt,
  }).then(({ error }) => {
    if (error) console.error('[retell-ab-start] aios_event_log write failed:', error);
  });

  console.log(`[retell-ab-start] AB started for version ${version_id} | base=${agentRow.retell_agent_id} variant=${variantAgent.agent_id} split=${split_pct}%`);

  return {
    statusCode: 200,
    headers: HEADERS,
    body: JSON.stringify({
      ok: true,
      version_id,
      base_agent_id: agentRow.retell_agent_id,
      variant_agent_id: variantAgent.agent_id,
      split_pct,
      evaluation_window_hours,
    }),
  };
};

export const testHandler = handler;
export default withLegacyHandler(handler);
