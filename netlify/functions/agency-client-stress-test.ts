import { withLegacyHandler } from './_shared/runtime-compat';
/**
 * agency-client-stress-test.ts — Boltcall Agency OS · Layer 8 · Client-portal
 * ───────────────────────────────────────────────────────────────────────────
 *
 * POST { client_id, scenario_id, persona_overrides? }
 *
 * Fires ONE Cekura-driven simulation against the client's currently-shipped
 * Retell agent. Powers the "Stress-test your agent" panel on /client/agent —
 * the client picks a pre-defined scenario (price shopper, after-hours
 * emergency, hostile caller, comparison shopper, non-English caller, low-info)
 * and gets back a full transcript + QA score within ~60s.
 *
 * Why per-scenario rather than the full fleet:
 *   The /client/agent panel is an interactive tool, not a fleet evaluation
 *   (that's /agency-cekura-test for the founder). Single-persona keeps the
 *   round-trip under 60s and lets the UI render a clean "ran this one, here's
 *   what your agent did" drawer instead of an aggregate report.
 *
 * Auth: client JWT (owns_client) or founder JWT.
 *
 * Output:
 *   {
 *     status: 'completed' | 'failed' | 'running',
 *     scenario_id: string,
 *     persona: Persona,                  // the persona we used (so the UI can label it)
 *     transcript: string,
 *     outcome: 'booked' | 'transferred' | 'lost' | 'hung_up' | 'unknown',
 *     qa_score: number,                  // 0-10 composite
 *     per_dim_scores: Record<string, number>,
 *     failure_modes: string[],
 *     duration_min: number,
 *     ran_at: string,
 *   }
 *
 * Pre-defined scenarios are vertical-aware — the persona seed text is shaped
 * to match the client's industry so the test is realistic, not generic.
 */

import type { Handler } from '@netlify/functions';

import {
  runSimulationBatch,
  type Persona,
  type SimulationCallResult,
} from './_shared/agency-adapters/cekura-adapter';
import { getServiceSupabase } from './_shared/token-utils';

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

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
  if (data.status === 'churned') return null;
  return data as ClientRow;
}

async function loadProductionAgentConfig(
  supa: ReturnType<typeof getServiceSupabase>,
  clientId: string,
): Promise<{ prompt: string; voice_id?: string; kb: unknown } | null> {
  const { data } = await supa
    .from('agency_artifacts')
    .select('content')
    .eq('client_id', clientId)
    .in('type', ['agent_prompt', 'prompt_revision'])
    .eq('status', 'shipped')
    .order('shipped_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  const content = (data.content ?? {}) as Record<string, unknown>;
  const prompt = typeof content.prompt === 'string' ? content.prompt : null;
  if (!prompt) return null;
  return {
    prompt,
    voice_id: typeof content.voice_id === 'string' ? content.voice_id : undefined,
    kb: content.knowledge_base ?? null,
  };
}

// ── Pre-defined scenarios ──────────────────────────────────────────────────
//
// 6 scenarios per vertical. The dialog seeds are deliberately vertical-flavored
// so the simulated caller sounds like a real prospect for THIS business, not
// a generic test. Keep these short and conversational — Cekura uses them
// verbatim as the persona's opening line.

type ScenarioId =
  | 'price_shopper'
  | 'emergency'
  | 'hostile_caller'
  | 'comparison_shopper'
  | 'non_english'
  | 'low_info';

const SCENARIO_LABELS: Record<ScenarioId, string> = {
  price_shopper: 'Price shopper — asks for a quote on the first sentence',
  emergency: 'After-hours emergency — caller is stressed and wants help now',
  hostile_caller: 'Hostile caller — frustrated, distrusts the AI immediately',
  comparison_shopper: 'Comparison shopper — naming a competitor',
  non_english: 'Non-English-first caller — heavy accent, switches languages mid-sentence',
  low_info: 'Low-info caller — vague request, gives almost no detail',
};

function buildPersona(scenarioId: ScenarioId, vertical: string | null, overrides?: Partial<Persona>): Persona {
  const v = (vertical || '').toLowerCase();
  const isHvac = v.includes('hvac') || v.includes('plumb') || v.includes('roof') || v.includes('electric');
  const isMedical = v.includes('dental') || v.includes('med') || v.includes('vet') || v.includes('chiro');
  const isLegal = v.includes('law') || v.includes('attorney') || v.includes('legal');
  const isMedSpa = v.includes('med spa') || v.includes('medspa') || v.includes('aesthetic') || v.includes('salon');

  let seed = `Hi, I'm calling about your services.`;
  let intent = 'info_only';
  let objection = 'none';

  switch (scenarioId) {
    case 'price_shopper':
      intent = 'price_shopper';
      objection = 'always_asks_for_discount';
      if (isHvac) seed = `Hey, how much does it cost to fix a leaking pipe? Just need a ballpark.`;
      else if (isMedical) seed = `What does a cleaning run? I'm comparing a few offices.`;
      else if (isLegal) seed = `What do you charge for a consultation? I don't want to waste time if you're way out of my budget.`;
      else if (isMedSpa) seed = `How much is a Botox treatment? I saw a Groupon for $99 down the street.`;
      else seed = `Yeah hi, can you tell me what your prices are before I drive over there?`;
      break;
    case 'emergency':
      intent = 'emergency_repair';
      objection = 'wants_to_speak_to_human';
      if (isHvac) seed = `My basement's flooding right now. I need someone here tonight. Are you 24-hour?`;
      else if (isMedical) seed = `My tooth just cracked and it's killing me. Can someone see me today?`;
      else if (isLegal) seed = `I was just arrested and I'm calling from the station. I need an attorney now.`;
      else if (isMedSpa) seed = `I had a treatment yesterday and my face is swollen and red. Is this normal? Can you get me in today?`;
      else seed = `This is an emergency. I need help right now. Can someone come out tonight?`;
      break;
    case 'hostile_caller':
      intent = 'ready_to_book';
      objection = 'distrusts_ai';
      seed = `Wait, am I talking to a robot? I want a real person. This is ridiculous.`;
      break;
    case 'comparison_shopper':
      intent = 'comparison_shopper';
      objection = 'compares_to_competitor';
      if (isHvac) seed = `I got a quote from ABC Plumbing for $400. Can you beat that?`;
      else if (isMedical) seed = `My current dentist charges $150 less. Why should I switch?`;
      else if (isLegal) seed = `I'm interviewing a few firms. What makes you different from the others?`;
      else if (isMedSpa) seed = `The spa across town offers the same treatment for half the price. What's the catch with yours?`;
      else seed = `I've called two other places already. What makes you different?`;
      break;
    case 'non_english':
      intent = 'ready_to_book';
      objection = 'none';
      seed = `Hola, perdón, hablo poquito inglés. Eh, I need... an appointment? For — uh — el problema, you know?`;
      break;
    case 'low_info':
      intent = 'info_only';
      objection = 'none';
      seed = `Yeah, hi. I just... I had a question.`;
      break;
  }

  const base: Persona = {
    persona_id: `client-test-${scenarioId}-${Date.now().toString(36)}`,
    intent,
    objection_pattern: objection,
    accent_profile: scenarioId === 'non_english' ? 'spanish_l2_english' : 'standard_us',
    sample_dialog_seed: seed,
    demographic: '40s_female_owner',
    time_of_day: scenarioId === 'emergency' ? 'midnight_emergency' : 'weekday_afternoon',
    difficulty: scenarioId === 'hostile_caller' || scenarioId === 'non_english' ? 'hard' : 'medium',
  };

  return { ...base, ...(overrides || {}) };
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

  let body: { client_id?: string; scenario_id?: string; persona_overrides?: Partial<Persona> };
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return jsonResponse(400, { error: 'Invalid JSON body' });
  }
  const clientId = body.client_id;
  const scenarioId = body.scenario_id as ScenarioId | undefined;
  if (!isUuid(clientId)) return jsonResponse(400, { error: 'client_id (uuid) is required' });
  if (!scenarioId || !(scenarioId in SCENARIO_LABELS)) {
    return jsonResponse(400, { error: `scenario_id must be one of: ${Object.keys(SCENARIO_LABELS).join(', ')}` });
  }

  const client = await ownsClient(supa, jwtUserId, clientId, isFounder);
  if (!client) return jsonResponse(403, { error: 'Forbidden — client not visible to this user' });

  const config = await loadProductionAgentConfig(supa, clientId);
  if (!config) {
    return jsonResponse(409, {
      error: 'No shipped agent yet — wait until your agent goes live to stress-test it.',
    });
  }

  const persona = buildPersona(scenarioId, client.vertical, body.persona_overrides);

  let result: { results: SimulationCallResult[]; duration_min: number };
  try {
    const batch = await runSimulationBatch({
      ad_hoc_personas: [persona],
      against_agent_config: {
        prompt: config.prompt,
        kb: config.kb,
        ...(config.voice_id ? { voice_id: config.voice_id } : {}),
      },
      n_calls_per_persona: 1,
      timeout_min: 5, // keep under the Netlify function timeout window
    });
    result = { results: batch.results, duration_min: batch.duration_min };
  } catch (err) {
    console.error('[client-stress-test] runSimulationBatch failed', err);
    return jsonResponse(502, {
      status: 'failed',
      scenario_id: scenarioId,
      error: 'Stress test could not complete; please retry.',
      detail: (err as Error).message.slice(0, 240),
    });
  }

  const first = result.results[0];
  if (!first) {
    return jsonResponse(502, {
      status: 'failed',
      scenario_id: scenarioId,
      error: 'Simulator returned no results',
    });
  }

  // outcome ∈ 'booked'|'transferred'|'lost'|'hung_up' per cekura-adapter typing
  const outcome = (first.outcome as string) || 'unknown';

  return jsonResponse(200, {
    status: 'completed',
    scenario_id: scenarioId,
    scenario_label: SCENARIO_LABELS[scenarioId],
    persona,
    transcript: first.transcript || '',
    outcome,
    qa_score: typeof first.qa_score === 'number' ? first.qa_score : 0,
    per_dim_scores: first.dim_scores || {},
    failure_modes: first.failure_modes || [],
    duration_min: Number(result.duration_min.toFixed(2)),
    ran_at: new Date().toISOString(),
  });
};

export const __test__ = {
  buildPersona,
  SCENARIO_LABELS,
};

export const testHandler = handler;
export default withLegacyHandler(handler);
