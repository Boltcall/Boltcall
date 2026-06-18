import { withLegacyHandler } from './_shared/runtime-compat';
/**
 * agency-deploy-agent — POST. Founder-only.
 *
 * Ship handler for type='agent_prompt' (and 'prompt_revision') artifact
 * approvals. Reads the artifact's content envelope, locates or creates the
 * Retell agent for the client, and either:
 *
 *   (a) CREATE — when this is the client's first agent_prompt. Calls
 *       retell-adapter.createAgentFromArtifact with the prompt + KB.
 *
 *   (b) UPDATE — when an agent already exists. Calls
 *       retell-adapter.updateAgentPrompt with the new prompt and the
 *       artifact's parent linkage for the prompt_revised event trail.
 *
 * Writes ship_result with ONLY whitelisted Retell ids (agent_id, llm_id,
 * created_at). NEVER stringifies the raw SDK response — that's the security
 * concern #6 mitigation.
 *
 * Updates the artifact row:
 *   status='shipped'
 *   shipped_at=now()
 *   ship_target='retell_agent'
 *   ship_result={...whitelisted ids only}
 *   ship_window_ends_at=now()+72h  (post-ship critic watches 50 calls or 72h,
 *                                   whichever comes first — 72h is the soft cap)
 *
 * Emits agent_deployed (already done by retell-adapter; we do not double-emit).
 *
 * Idempotency: if the artifact is already shipped, returns 200 with the
 * existing ship_result (don't re-deploy). The founder may legitimately
 * re-trigger after a transient adapter error.
 */

import type { Handler } from '@netlify/functions';
import { type SupabaseClient } from '@supabase/supabase-js';
import { getServiceSupabase } from './_shared/token-utils';
import {
  createAgentFromArtifact,
  updateAgentPrompt,
} from './_shared/agency-adapters/retell-adapter';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

// Post-ship critic watches a prompt for 72 hours OR 50 calls (whichever ends
// first; the shipped_artifact_watcher cron handles call counting). We set the
// timestamp cap here; the watcher updates ship_window_ends_at downward if
// 50 calls hit before 72h.
const PROMPT_SHIP_WATCH_HOURS = 72;

interface DeployBody {
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
  business_name: string | null;
  vertical: string | null;
  secrets: Record<string, unknown> | null;
}

interface DeploymentEnvelope {
  prompt: string | null;
  knowledge_base: unknown;
  voice_id: string | null;
  language: string | null;
  transfer_number: string | null;
  agent_version: string | null;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value;
  }
  return null;
}

function extractDeploymentEnvelope(content: Record<string, unknown>): DeploymentEnvelope {
  const payload = asRecord(content.payload);
  return {
    prompt: firstString(content.prompt, content.agent_prompt, payload.prompt, payload.agent_prompt),
    knowledge_base: content.knowledge_base ?? payload.knowledge_base ?? null,
    voice_id: firstString(content.voice_id, payload.voice_id),
    language: firstString(content.language, payload.language),
    transfer_number: firstString(content.transfer_number, payload.transfer_number),
    agent_version: firstString(content.agent_version, payload.agent_version),
  };
}

/**
 * Find the Retell agent_id currently bound to a client. We look at the most
 * recently shipped agent_prompt / prompt_revision artifact and use the
 * agent_id from its ship_result. If none exists, returns null → caller does
 * a CREATE path.
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
    console.error('[agency-deploy-agent] service supabase init failed', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server misconfigured' }) };
  }

  const authHeader = event.headers.authorization || event.headers.Authorization;
  if (!(await authFounder(authHeader, supabase))) {
    return {
      statusCode: authHeader ? 403 : 401,
      headers,
      body: JSON.stringify({ error: authHeader ? 'Founder only' : 'Authentication required' }),
    };
  }

  let body: DeployBody;
  try {
    body = JSON.parse(event.body || '{}') as DeployBody;
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }
  const artifact_id = typeof body.artifact_id === 'string' ? body.artifact_id : null;
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
  if (!['agent_prompt', 'prompt_revision'].includes(row.type)) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: `wrong artifact type for this handler: ${row.type}` }),
    };
  }
  // Idempotency — if already shipped, return existing ship_result.
  if (row.status === 'shipped' && row.ship_result) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ status: 'shipped', ship_result: row.ship_result, already: true }),
    };
  }
  if (!['draft', 'approved'].includes(row.status)) {
    return {
      statusCode: 409,
      headers,
      body: JSON.stringify({ error: `cannot deploy artifact in status ${row.status}` }),
    };
  }

  // ── Pull client for vertical + voice/transfer config ───────────────────────
  const { data: client, error: clientErr } = await supabase
    .from('agency_clients')
    .select('id, business_name, vertical, secrets')
    .eq('id', row.client_id)
    .single();
  if (clientErr || !client) {
    return { statusCode: 404, headers, body: JSON.stringify({ error: 'client not found' }) };
  }
  const clientRow = client as ClientRow;

  // ── Pull required fields from artifact content ─────────────────────────────
  const content = row.content ?? {};
  const envelope = extractDeploymentEnvelope(content);
  const prompt = envelope.prompt;
  if (!prompt) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        error: 'artifact content must include prompt or payload.agent_prompt for agent deployment',
      }),
    };
  }
  const knowledge_base = envelope.knowledge_base;
  const voice_id =
    envelope.voice_id
      ? envelope.voice_id
      : typeof (clientRow.secrets as Record<string, unknown> | null)?.retell_voice_id === 'string'
      ? ((clientRow.secrets as Record<string, unknown>).retell_voice_id as string)
      : process.env.RETELL_DEFAULT_VOICE_ID || '11labs-Adrian';
  const language = envelope.language ?? 'en-US';
  const transfer_number = envelope.transfer_number ?? undefined;
  const agent_version = envelope.agent_version ?? '1';

  try {
    const existingAgentId = await findExistingAgentId(supabase, row.client_id);

    let agent_id: string;
    let llm_id: string | null = null;
    let mode: 'create' | 'update';
    let retell_knowledge_base_ids: string[] = [];

    if (existingAgentId) {
      mode = 'update';
      const result = await updateAgentPrompt({
        agent_id: existingAgentId,
        prompt,
        client_id: row.client_id,
        vertical: clientRow.vertical ?? undefined,
        knowledge_base,
        artifact_id: row.id,
        parent_artifact_id: row.parent_artifact_id ?? undefined,
        reason: 'founder approved in queue',
        source: 'founder',
      });
      agent_id = existingAgentId;
      retell_knowledge_base_ids = result.knowledge_base_ids ?? [];
    } else {
      mode = 'create';
      const result = await createAgentFromArtifact({
        client_id: row.client_id,
        artifact_id: row.id,
        agent_version,
        vertical: clientRow.vertical ?? undefined,
        prompt,
        knowledge_base,
        voice_id,
        transfer_number,
        language,
      });
      agent_id = result.agent_id;
      llm_id = result.llm_id;
      retell_knowledge_base_ids = result.knowledge_base_ids ?? [];
    }

    // WHITELISTED ship_result — never spread the Retell SDK response.
    const ship_result = {
      agent_id,
      llm_id,
      mode,
      voice_id,
      language,
      ...(retell_knowledge_base_ids.length ? { retell_knowledge_base_ids } : {}),
      deployed_at: new Date().toISOString(),
    };

    const ship_window_ends_at = new Date(
      Date.now() + PROMPT_SHIP_WATCH_HOURS * 3_600_000,
    ).toISOString();

    const { error: updErr } = await supabase
      .from('agency_artifacts')
      .update({
        status: 'shipped',
        shipped_at: new Date().toISOString(),
        ship_target: 'retell_agent',
        ship_result,
        ship_window_ends_at,
      })
      .eq('id', row.id);
    if (updErr) {
      // The agent IS deployed; the metadata write failed. Surface loudly so
      // the founder retries — the retry path is idempotent (updateAgentPrompt
      // is a no-op on identical prompts).
      console.error('[agency-deploy-agent] post-ship update failed', updErr.message);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Agent deployed but artifact row update failed',
          ship_result,
        }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        status: 'shipped',
        ship_result,
        ship_window_ends_at,
      }),
    };
  } catch (err) {
    console.error('[agency-deploy-agent] error', err);
    return {
      statusCode: 502,
      headers,
      body: JSON.stringify({
        error: 'Deploy failed',
        details: err instanceof Error ? err.message : 'unknown',
      }),
    };
  }
};

export const testHandler = handler;
export default withLegacyHandler(handler);
