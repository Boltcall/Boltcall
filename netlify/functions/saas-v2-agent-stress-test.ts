/**
 * POST /.netlify/functions/saas-v2-agent-stress-test
 * Body: { scenario_id: string }
 *
 * Runs ONE of 6 hardcoded stress-test scenarios against the workspace's current
 * Retell agent prompt. Unlike the agency-tier `agency-client-stress-test`
 * (which fires a Cekura simulation), this is a LIGHTER Sonnet-only judge:
 * we synthesize the caller's opening line + likely follow-ups, ask Sonnet to
 * predict the agent's response based on its prompt, then rubric-score the
 * predicted response on 4 dimensions (empathy, accuracy, intent_capture,
 * next_step). Round-trip ~10-15s vs ~60s for the Cekura path — appropriate
 * for the per-scenario "Run" button on /v2/agent.
 *
 * Auth: Bearer JWT only. Workspace derived server-side from JWT.
 *
 * Returns:
 *   {
 *     scenario_id: string,
 *     scenario_label: string,
 *     passed: boolean,                  // true iff every rubric dim >= 6
 *     verdict: string,                  // 1-2 sentence AI verdict, especially when failed
 *     rubric: { empathy, accuracy, intent_capture, next_step }, // 0-10 each
 *     hypothetical_response: string,    // what Sonnet predicted the agent would say
 *     ran_at: string,
 *   }
 *
 * Emits: saas_v2_agent_stress_test_run with { scenario_id, passed }.
 */

import type { Handler } from '@netlify/functions';

import { getServiceSupabase } from './_shared/token-utils';
import { emitAgencyEvent } from './_shared/emit-agency-event';
import { callClaude } from './_shared/agency-agents/run-agent';

const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
};

function jsonResponse(statusCode: number, body: Record<string, unknown>) {
  return { statusCode, headers: CORS, body: JSON.stringify(body) };
}

// ── 6 hardcoded scenarios (mirror brief spec) ──────────────────────────────
//
// The seed_prompt is what the caller actually says — verbatim opening line.
// Verticals shape the wording where helpful, but every scenario must work
// for ANY vertical; we keep them generic enough to apply across plumbing,
// dental, legal, med-spa, etc.

type ScenarioId =
  | 'caller-emergency'
  | 'caller-pricing-objection'
  | 'caller-wants-callback'
  | 'caller-asks-about-insurance'
  | 'caller-difficult-spelling'
  | 'caller-wrong-number';

interface Scenario {
  id: ScenarioId;
  label: string;
  caller_seed: string;
  caller_followup: string;
  what_we_check: string; // the rubric directive Sonnet uses to judge
}

const SCENARIOS: ReadonlyArray<Scenario> = [
  {
    id: 'caller-emergency',
    label: 'Emergency caller — stressed, needs help now',
    caller_seed:
      "Hi, this is an emergency. I need someone right now. Are you open and can someone come out tonight?",
    caller_followup:
      "It's really bad. I can't wait until tomorrow. Please tell me you can help.",
    what_we_check:
      'Agent should acknowledge urgency, NOT just say office hours, attempt to route to emergency contact or capture callback ASAP, and stay calm.',
  },
  {
    id: 'caller-pricing-objection',
    label: 'Pricing objection — caller says it costs too much',
    caller_seed:
      "Yeah, hi. Your competitor quoted me half that. Why would I go with you?",
    caller_followup:
      "I'm not paying double for the same thing. Convince me or I'm going with them.",
    what_we_check:
      'Agent should NOT match price reflexively. Should ask qualifying questions, restate value, offer to book a consult. Never insult competitor.',
  },
  {
    id: 'caller-wants-callback',
    label: 'Caller wants a callback later — needs callback number captured',
    caller_seed:
      "I can't really talk right now. Can someone call me back later today?",
    caller_followup:
      "I'm at work. Just need a quick call back in a couple hours.",
    what_we_check:
      'Agent MUST ask for callback number (even if Caller ID is present, confirm it). Should ask preferred callback time window. Should NOT try to push a booking through right now.',
  },
  {
    id: 'caller-asks-about-insurance',
    label: 'Insurance question — does it cover X?',
    caller_seed:
      "Quick question — do you take BlueCross? And does insurance cover this?",
    caller_followup:
      "I just want to know before I book so I don't get a surprise bill.",
    what_we_check:
      'Agent should NOT fabricate insurance coverage. Should either (a) cite confirmed accepted plans from KB, or (b) transfer to billing/say staff will confirm. Honesty > completion.',
  },
  {
    id: 'caller-difficult-spelling',
    label: 'Hard-to-spell name — captures correctly',
    caller_seed:
      "Hi, this is Siobhán Ní Mhaoileoin calling. I'd like to book an appointment.",
    caller_followup:
      "That's S-I-O-B-H-A-N, last name N-I, space, M-H-A-O-I-L-E-O-I-N.",
    what_we_check:
      'Agent should READ BACK the spelling for confirmation, not guess. Should be patient and explicit. Booking should succeed without the agent inventing easier spelling.',
  },
  {
    id: 'caller-wrong-number',
    label: 'Wrong number — caller misdialed',
    caller_seed:
      "Hi, is this the pharmacy on Main Street?",
    caller_followup:
      "Oh sorry, I must have the wrong number. Bye.",
    what_we_check:
      'Agent should briefly confirm what business this is, politely let caller go without scripted booking attempts, and NOT consume time trying to convert a misdial.',
  },
];

const SCENARIO_INDEX: Record<ScenarioId, Scenario> = SCENARIOS.reduce(
  (acc, s) => {
    acc[s.id] = s;
    return acc;
  },
  {} as Record<ScenarioId, Scenario>,
);

// ── Sonnet judge schema ────────────────────────────────────────────────────

interface RubricOutput {
  hypothetical_response: string;
  rubric: {
    empathy: number;
    accuracy: number;
    intent_capture: number;
    next_step: number;
  };
  passed: boolean;
  verdict: string;
  confidence: number;
  reasoning_trace: string[];
  alternatives_rejected: unknown[];
}

const RUBRIC_SCHEMA = {
  type: 'object' as const,
  properties: {
    hypothetical_response: {
      type: 'string',
      description:
        "Your best prediction of what the agent would actually say in response, based STRICTLY on its prompt. " +
        '2-4 sentences. If the prompt does not authorize an answer, say so.',
    },
    rubric: {
      type: 'object',
      description: '0-10 scores per dimension.',
      properties: {
        empathy: {
          type: 'number',
          minimum: 0,
          maximum: 10,
          description:
            'Tone-match for the caller emotional state. 10 = perfect, 0 = robotic or cold.',
        },
        accuracy: {
          type: 'number',
          minimum: 0,
          maximum: 10,
          description:
            'Truthfulness of the response based on the prompt + KB only. 10 = nothing invented, 0 = fabricated answer.',
        },
        intent_capture: {
          type: 'number',
          minimum: 0,
          maximum: 10,
          description:
            "Did the agent correctly identify what the caller wants? 10 = exact, 0 = missed entirely.",
        },
        next_step: {
          type: 'number',
          minimum: 0,
          maximum: 10,
          description:
            'Did the agent propose the right next step (book / transfer / capture callback / let caller go)? 10 = perfect, 0 = wrong action.',
        },
      },
      required: ['empathy', 'accuracy', 'intent_capture', 'next_step'],
      additionalProperties: false,
    },
    passed: {
      type: 'boolean',
      description:
        'TRUE iff every rubric dimension is >= 6. Otherwise FALSE.',
    },
    verdict: {
      type: 'string',
      description:
        "ONE sentence. If passed: 'Agent handled this well — <one concrete strength>'. " +
        "If failed: 'Agent failed to <specific thing it missed>'. " +
        'Past tense, plain English, no jargon.',
    },
  },
  required: ['hypothetical_response', 'rubric', 'passed', 'verdict'],
  additionalProperties: false,
};

async function judgeScenarioViaSonnet(
  workspaceId: string,
  scenario: Scenario,
  agentPrompt: string,
): Promise<RubricOutput | null> {
  try {
    const result = await callClaude<RubricOutput>({
      agent_name: 'saas-v2.agent-stress-test',
      client_id: workspaceId,
      tier: 'sonnet',
      max_tokens: 2048,
      system: [
        "You are an adversarial QA judge for a voice-AI receptionist agent.",
        'You will receive (1) the agent prompt verbatim, (2) a caller scenario.',
        'Your job: predict the agent response based STRICTLY on the prompt, then rubric-score it.',
        'STRICT rules:',
        '- Do NOT give the agent the benefit of the doubt. If the prompt does not authorize a behavior, the agent will not do it.',
        '- The 4 dimensions are independent. A high empathy score does not raise the accuracy score.',
        '- `passed` is mechanical: TRUE only if every dimension >= 6.',
        '- Verdict must reference a SPECIFIC behavior from the prompt or the gap therein.',
        '- No marketing language. No hedging. Direct and concrete.',
      ].join('\n'),
      user_messages: [
        {
          role: 'user',
          content: [
            '# Agent prompt (verbatim)',
            '```',
            agentPrompt.slice(0, 12000),
            '```',
            '',
            '# Scenario',
            `Scenario ID: ${scenario.id}`,
            `Label: ${scenario.label}`,
            `Caller's opening line: "${scenario.caller_seed}"`,
            `Caller's follow-up if agent responds: "${scenario.caller_followup}"`,
            '',
            '# What this scenario tests',
            scenario.what_we_check,
            '',
            '# Your task',
            'Predict the agent response and score it on the rubric. Use the emit_structured_output tool.',
          ].join('\n'),
        },
      ],
      output_schema: RUBRIC_SCHEMA,
    });
    return result.output;
  } catch (err) {
    console.error('[saas-v2-agent-stress-test] Sonnet judge failed', err);
    return null;
  }
}

async function loadAgentPrompt(
  supa: ReturnType<typeof getServiceSupabase>,
  userId: string,
): Promise<{ prompt: string; agent_id: string | null }> {
  try {
    const { data } = await supa
      .from('agents')
      .select('id, system_prompt')
      .eq('user_id', userId)
      .order('system_prompt_synced_at', { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();
    if (data && typeof data.system_prompt === 'string' && data.system_prompt.trim()) {
      return { prompt: data.system_prompt.trim(), agent_id: (data.id as string) || null };
    }
  } catch (err) {
    console.warn('[saas-v2-agent-stress-test] agents lookup failed', err);
  }
  return { prompt: '', agent_id: null };
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' });
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

  // ── 2. Body parse + scenario validation ─────────────────────────────────
  let body: { scenario_id?: string };
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return jsonResponse(400, { error: 'Invalid JSON body' });
  }
  const scenarioId = body.scenario_id as ScenarioId | undefined;
  if (!scenarioId || !(scenarioId in SCENARIO_INDEX)) {
    return jsonResponse(400, {
      error: `scenario_id must be one of: ${Object.keys(SCENARIO_INDEX).join(', ')}`,
    });
  }
  const scenario = SCENARIO_INDEX[scenarioId];

  // ── 3. Workspace + prompt ───────────────────────────────────────────────
  const { data: workspaceRow, error: wsErr } = await supa
    .from('workspaces')
    .select('id')
    .eq('owner_id', userId)
    .limit(1)
    .maybeSingle();
  if (wsErr) {
    return jsonResponse(500, { error: 'Workspace lookup failed' });
  }
  if (!workspaceRow) {
    return jsonResponse(404, { error: 'No workspace found for this user' });
  }
  const workspaceId = (workspaceRow as { id: string }).id;

  const { prompt: agentPrompt } = await loadAgentPrompt(supa, userId);
  if (!agentPrompt) {
    return jsonResponse(409, {
      error:
        'No agent prompt configured yet. Set up your agent before running stress tests.',
    });
  }

  // ── 4. Sonnet judge ─────────────────────────────────────────────────────
  const t0 = Date.now();
  const judged = await judgeScenarioViaSonnet(workspaceId, scenario, agentPrompt);
  const durationMin = (Date.now() - t0) / 60000;

  if (!judged) {
    return jsonResponse(502, {
      scenario_id: scenarioId,
      scenario_label: scenario.label,
      passed: false,
      verdict:
        'Stress test could not complete — the judge model failed. Please retry in a moment.',
      rubric: { empathy: 0, accuracy: 0, intent_capture: 0, next_step: 0 },
      hypothetical_response: '',
      ran_at: new Date().toISOString(),
    });
  }

  // Defensive: re-compute passed from the rubric so a malformed LLM `passed`
  // field can never disagree with the scores it returned.
  const rubric = judged.rubric;
  const passed =
    rubric.empathy >= 6 &&
    rubric.accuracy >= 6 &&
    rubric.intent_capture >= 6 &&
    rubric.next_step >= 6;

  const qaComposite =
    (rubric.empathy + rubric.accuracy + rubric.intent_capture + rubric.next_step) / 4;

  // ── 5. Emit telemetry ───────────────────────────────────────────────────
  try {
    await emitAgencyEvent({
      client_id: workspaceId,
      agent_name: 'saas-v2-agent-stress-test',
      type: 'saas_v2_agent_stress_test_run',
      severity: passed ? 'info' : 'warn',
      payload: {
        workspace_id: workspaceId,
        scenario_id: scenarioId,
        passed,
        qa_score: Number(qaComposite.toFixed(2)),
        duration_min: Number(durationMin.toFixed(2)),
      },
      why_explanation: passed
        ? `Stress test passed: ${scenario.label}.`
        : `Stress test failed: ${scenario.label} — agent did not meet rubric floor of 6/10 on every dimension.`,
    });
  } catch (emitErr) {
    console.warn('[saas-v2-agent-stress-test] event emit failed (non-fatal)', emitErr);
  }

  return jsonResponse(200, {
    scenario_id: scenarioId,
    scenario_label: scenario.label,
    passed,
    verdict: (judged.verdict || '').trim(),
    rubric: {
      empathy: rubric.empathy,
      accuracy: rubric.accuracy,
      intent_capture: rubric.intent_capture,
      next_step: rubric.next_step,
    },
    hypothetical_response: (judged.hypothetical_response || '').trim(),
    ran_at: new Date().toISOString(),
  });
};

export const __test__ = {
  SCENARIOS,
  SCENARIO_INDEX,
};
