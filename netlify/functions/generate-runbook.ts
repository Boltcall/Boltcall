import { Handler } from '@netlify/functions';
import { getServiceSupabase } from './_shared/token-utils';
import { chatCompletion } from './_shared/azure-ai';
import { requireInternalOrMatchingUser } from './_shared/user-auth';
import { withLegacyHandler } from './_shared/runtime-compat';
import { buildRunbookSystemPrompt, buildRunbookUserPrompt, type RunbookInputs } from '../../src/prompts/runbookPrompt';

/**
 * Generate Runbook — the "amnesia handbook" per Allie K Miller video insight
 * (2026-08-13). Assembles a customer's business config + recent calls + recent
 * leads and produces one Markdown SOP the receptionist should follow.
 *
 * Async design: POST enqueues (status='generating'), work runs, row updates
 * to status='ready' or 'failed'. Keeps the Netlify function thin — 502
 * lessons from the law-v1 ship (36 functions crashed on cold start).
 *
 * POST /.netlify/functions/generate-runbook
 *   { userId }         -> creates a pending row, kicks off generation
 *
 * GET /.netlify/functions/generate-runbook?userId=...
 *   -> latest runbook for that user
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Content-Type': 'application/json',
};

async function collectInputs(supabase: any, userId: string): Promise<RunbookInputs> {
  const { data: biz } = await supabase
    .from('business_profiles')
    .select('business_name, website_url, main_category, service_areas, opening_hours, languages')
    .eq('user_id', userId).maybeSingle();

  // Retell agent system prompt (if wired).
  const { data: agent } = await supabase
    .from('agents')
    .select('retell_system_prompt, services')
    .eq('user_id', userId).maybeSingle();

  // Sample recent calls — summaries only, capped.
  const { data: calls } = await supabase
    .from('call_logs')
    .select('call_summary, from_number, ended_at')
    .eq('user_id', userId)
    .order('ended_at', { ascending: false })
    .limit(20);

  // Sample recent leads.
  const { data: leads } = await supabase
    .from('leads')
    .select('name, source, status, tags, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);

  return {
    businessName: biz?.business_name || 'Business',
    industry: biz?.main_category || null,
    services: Array.isArray(agent?.services) ? agent.services : null,
    hours: biz?.opening_hours || null,
    serviceAreas: Array.isArray(biz?.service_areas) ? biz.service_areas : null,
    languages: Array.isArray(biz?.languages) ? biz.languages : null,
    retellSystemPrompt: agent?.retell_system_prompt || null,
    recentCallSummaries: (calls || [])
      .map((c: any) => c.call_summary || '')
      .filter(Boolean),
    recentLeadSummaries: (leads || [])
      .map((l: any) => `${l.name || '(unnamed)'} via ${l.source || '?'} - status ${l.status || '?'}`)
      .filter(Boolean),
  };
}

async function runGenerationInBackground(userId: string, rowId: string) {
  const supabase = getServiceSupabase();
  try {
    const inputs = await collectInputs(supabase, userId);
    const system = buildRunbookSystemPrompt();
    const user = buildRunbookUserPrompt(inputs);
    const md = await chatCompletion(system, user, { maxTokens: 2048, heavy: true });
    await supabase.from('customer_runbooks').update({
      status: 'ready',
      content_md: md,
      generated_at: new Date().toISOString(),
      source_snapshot: {
        retell_prompt_present: Boolean(inputs.retellSystemPrompt),
        calls_sampled: inputs.recentCallSummaries.length,
        leads_sampled: inputs.recentLeadSummaries.length,
        industry: inputs.industry,
      },
    }).eq('id', rowId);
  } catch (e: any) {
    await supabase.from('customer_runbooks').update({
      status: 'failed',
      error: String(e?.message || e).slice(0, 500),
    }).eq('id', rowId);
  }
}

const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS_HEADERS, body: '' };

  if (event.httpMethod === 'GET') {
    const userId = event.queryStringParameters?.userId;
    if (!userId) return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'userId required' }) };
    const auth = await requireInternalOrMatchingUser(event, userId, CORS_HEADERS);
    if (!auth.ok) return auth.response;
    const supabase = getServiceSupabase();
    const { data, error } = await supabase.from('customer_runbooks')
      .select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (error) return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ error: error.message }) };
    return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ runbook: data }) };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let body: any = {};
  try { body = JSON.parse(event.body || '{}'); } catch {
    return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }
  const { userId, workspaceId } = body;
  if (!userId) {
    return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'userId required' }) };
  }
  const auth = await requireInternalOrMatchingUser(event, userId, CORS_HEADERS);
  if (!auth.ok) return auth.response;

  const supabase = getServiceSupabase();
  const { data: row, error } = await supabase.from('customer_runbooks').insert({
    user_id: userId,
    workspace_id: workspaceId || null,
    status: 'generating',
  }).select('id').single();
  if (error) return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ error: error.message }) };

  // Fire-and-forget background generation. ponytail: no queue infra — the
  // function's process stays warm long enough for a ~30s LLM call in normal
  // usage. If we hit timeouts, promote to a Supabase Edge Function job.
  runGenerationInBackground(userId, row.id).catch(err => {
    console.error('[generate-runbook] background job failed:', err);
  });

  return {
    statusCode: 202,
    headers: CORS_HEADERS,
    body: JSON.stringify({ id: row.id, status: 'generating' }),
  };
};

export { handler };
export default withLegacyHandler(handler, { strictCors: true });
