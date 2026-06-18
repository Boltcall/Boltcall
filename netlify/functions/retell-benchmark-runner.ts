import { Handler } from '@netlify/functions';
import { getSupabase } from './_shared/token-utils';
import { chatCompletion } from './_shared/azure-ai';
import { authorizeRunner } from './_shared/agency-runner-auth';
import { withLegacyHandler } from './_shared/runtime-compat';

/**
 * retell-benchmark-runner
 *
 * W2 — offline quality gate for proposed prompt versions.
 * Runs a proposed prompt against retell_eval_scenarios using an LLM
 * meta-judge (no real Retell calls). Compares against baseline and
 * promotes/rejects the proposed version.
 *
 * POST /.netlify/functions/retell-benchmark-runner
 * { prompt_version_id: string, dry_run?: boolean }
 *
 * Returns a structured report:
 * { pass, proposed_score, baseline_score, delta_pct, by_dim, scenarios_scored,
 *   fail_reasons, report_md }
 */

const HEADERS = { 'Content-Type': 'application/json' };

// Thresholds (mirror retell-agent-improvement.yml)
const MIN_IMPROVEMENT_PCT = 5;       // proposed must beat baseline by ≥5%
const MAX_REGRESSION_PCT  = 0;       // zero tolerance on any dim
const MIN_SCENARIOS       = 10;      // must score at least this many (20 is ideal, 10 is gate)
const HALLUCINATION_MIN   = 0.80;    // hallucination_bait scenarios: agent must score ≥0.8

const DIM_WEIGHTS: Record<string, number> = {
  booking_attempt:      0.25,
  objection_handling:   0.20,
  on_script:            0.10,
  caller_sentiment:     0.15,
  hallucination_free:   0.20,
  latency_ok:           0.10,
};

type DimScores = Record<string, { score: number; notes: string }>;

interface Scenario {
  id: string;
  persona: string;
  difficulty: string;
  category: string;
  opening_line: string;
  expected_outcome: string;
  must_say: string[] | null;
  must_not_say: string[] | null;
}

// ─── Meta-judge: score ONE scenario against ONE prompt ──────────────────────

const META_JUDGE_SYSTEM = `You are a senior voice AI quality evaluator for Boltcall.
Given an AI receptionist's system prompt and a call scenario, predict the agent's
performance on each scoring dimension. Base your scores ONLY on what the prompt
enables or prevents — do not assume capabilities beyond the prompt text.
Return ONLY valid JSON, no markdown, no commentary.`;

async function judgeScenario(
  promptText: string,
  scenario: Scenario
): Promise<DimScores> {
  const mustSay = (scenario.must_say || []).join(', ') || 'none specified';
  const mustNotSay = (scenario.must_not_say || []).join(', ') || 'none specified';

  const userMsg = `AGENT SYSTEM PROMPT (first 4000 chars):
${promptText.slice(0, 4000)}

CALL SCENARIO:
Persona: ${scenario.persona}
Difficulty: ${scenario.difficulty}
Category: ${scenario.category}
Caller opening line: "${scenario.opening_line}"
Expected outcome: ${scenario.expected_outcome}
Agent MUST include phrases like: ${mustSay}
Agent MUST NOT say: ${mustNotSay}

Predict scores 0.00–1.00 for each dimension. Consider:
- booking_attempt: Would this prompt guide the agent to attempt booking at the right moment?
  If category is 'edge' or expected_outcome is 'no_book_ok', score 0.5 (N/A).
- objection_handling: If category is 'objection', does the prompt have a script for this objection type?
  If no objections in scenario, score 0.5 (N/A).
- on_script: Does the prompt include required disclosures (AI identity) and compliance phrases?
- caller_sentiment: Would a caller with this persona end positively with this agent?
  Emergency/safety callers who get appropriate responses = 0.9. Frustrated callers who get dismissed = 0.1.
- hallucination_free: If category is 'hallucination_bait', does the prompt PREVENT the agent from
  inventing the requested information? A prompt with no pricing/hours data that doesn't explicitly
  instruct the agent to defer = 0.3. One that says "never invent data, defer to team" = 0.9.
- latency_ok: Would this prompt produce concise, natural responses? Verbose prompts with long
  required preambles score lower.

Return JSON:
{
  "booking_attempt":    { "score": 0.00, "notes": "one brief sentence" },
  "objection_handling": { "score": 0.00, "notes": "one brief sentence" },
  "on_script":          { "score": 0.00, "notes": "one brief sentence" },
  "caller_sentiment":   { "score": 0.00, "notes": "one brief sentence" },
  "hallucination_free": { "score": 0.00, "notes": "one brief sentence" },
  "latency_ok":         { "score": 0.00, "notes": "one brief sentence" }
}`;

  try {
    const text = await chatCompletion(META_JUDGE_SYSTEM, userMsg, { tier: 'light', maxTokens: 350 });
    return JSON.parse(text);
  } catch (err) {
    console.error(`[benchmark-runner] Judge failed for scenario ${scenario.id}:`, err);
    // Return a neutral 0.5 so one failed judge call doesn't corrupt the run
    return Object.fromEntries(
      Object.keys(DIM_WEIGHTS).map(d => [d, { score: 0.5, notes: 'judge_error' }])
    );
  }
}

// ─── Weighted aggregate score ────────────────────────────────────────────────

function weightedScore(dimMap: Record<string, number>): number {
  return Object.entries(DIM_WEIGHTS).reduce(
    (acc, [dim, w]) => acc + (dimMap[dim] ?? 0.5) * w,
    0
  );
}

// ─── Run a batch of scenarios in parallel (max concurrency = 6) ─────────────

async function runBatch<T>(
  items: T[],
  fn: (item: T) => Promise<any>,
  concurrency = 6
): Promise<any[]> {
  const results: any[] = [];
  for (let i = 0; i < items.length; i += concurrency) {
    const chunk = items.slice(i, i + concurrency);
    results.push(...await Promise.all(chunk.map(fn)));
  }
  return results;
}

// ─── Fetch baseline score for a version ─────────────────────────────────────
// Returns avg per-dim score from existing retell_eval_runs, or null if no data.

async function fetchExistingRunScores(
  supabase: any,
  promptVersionId: string
): Promise<Record<string, number> | null> {
  const { data } = await supabase
    .from('retell_eval_runs')
    .select('dim_scores, passed')
    .eq('prompt_version_id', promptVersionId)
    .eq('source', 'local_benchmark');

  if (!data || data.length === 0) return null;

  // Average each dim across all scenarios
  const totals: Record<string, number> = {};
  const counts: Record<string, number> = {};

  for (const row of data) {
    const dims = row.dim_scores as Record<string, number> | null;
    if (!dims) continue;
    for (const [dim, score] of Object.entries(dims)) {
      totals[dim] = (totals[dim] || 0) + (score as number);
      counts[dim] = (counts[dim] || 0) + 1;
    }
  }

  const avgs: Record<string, number> = {};
  for (const dim of Object.keys(DIM_WEIGHTS)) {
    avgs[dim] = counts[dim] ? totals[dim] / counts[dim] : 0.5;
  }
  return avgs;
}

// ─── Handler ────────────────────────────────────────────────────────────────

const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: HEADERS, body: JSON.stringify({ error: 'Method not allowed' }) };
  }
  const authz = await authorizeRunner(event);
  if (!authz.ok) {
    return { statusCode: authz.status, headers: HEADERS, body: JSON.stringify({ error: authz.message }) };
  }

  let body: any;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const { prompt_version_id, dry_run = false } = body;
  if (!prompt_version_id) {
    return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'prompt_version_id required' }) };
  }

  const supabase = getSupabase();

  // ── 1. Fetch the proposed version ────────────────────────────────────────
  const { data: proposed, error: pvErr } = await supabase
    .from('retell_prompt_versions')
    .select('id, scope, vertical, agent_id, version, prompt_text, parent_id, status')
    .eq('id', prompt_version_id)
    .single();

  if (pvErr || !proposed) {
    return { statusCode: 404, headers: HEADERS, body: JSON.stringify({ error: 'Prompt version not found' }) };
  }

  if (proposed.status !== 'proposed' && !dry_run) {
    return {
      statusCode: 400,
      headers: HEADERS,
      body: JSON.stringify({ error: `Version is already '${proposed.status}' — only 'proposed' versions can be benchmarked` }),
    };
  }

  // ── 2. Fetch eval scenarios ───────────────────────────────────────────────
  const { data: scenarios, error: scenErr } = await supabase
    .from('retell_eval_scenarios')
    .select('id, persona, difficulty, category, opening_line, expected_outcome, must_say, must_not_say')
    .eq('vertical', proposed.vertical)
    .eq('enabled', true);

  if (scenErr || !scenarios || scenarios.length === 0) {
    return {
      statusCode: 422,
      headers: HEADERS,
      body: JSON.stringify({ error: `No eval scenarios found for vertical '${proposed.vertical}'` }),
    };
  }

  if (scenarios.length < MIN_SCENARIOS) {
    return {
      statusCode: 422,
      headers: HEADERS,
      body: JSON.stringify({
        error: `Need at least ${MIN_SCENARIOS} scenarios, found ${scenarios.length} for vertical '${proposed.vertical}'`,
      }),
    };
  }

  // ── 3. Get baseline scores ────────────────────────────────────────────────
  // Priority: (a) parent version eval_runs, (b) live version eval_runs,
  // (c) real call averages, (d) default 0.65
  let baselineScores: Record<string, number> | null = null;
  let baselineSource = 'default';

  if (proposed.parent_id) {
    baselineScores = await fetchExistingRunScores(supabase, proposed.parent_id);
    if (baselineScores) baselineSource = 'parent_eval_runs';
  }

  if (!baselineScores) {
    // Try to find the current live version for same scope+vertical+(agent_id if customer)
    let liveQuery = supabase
      .from('retell_prompt_versions')
      .select('id')
      .eq('vertical', proposed.vertical)
      .eq('scope', proposed.scope)
      .eq('status', 'live');

    if (proposed.scope === 'customer' && proposed.agent_id) {
      liveQuery = liveQuery.eq('agent_id', proposed.agent_id);
    }

    const { data: liveVersions } = await liveQuery.limit(1).maybeSingle();
    if (liveVersions?.id) {
      baselineScores = await fetchExistingRunScores(supabase, liveVersions.id);
      if (baselineScores) baselineSource = 'live_version_eval_runs';
    }
  }

  if (!baselineScores) {
    // Fall back to real call score averages from the past 30d for this vertical
    const { data: scoreRows } = await supabase.rpc('avg_call_scores_by_vertical', {
      p_vertical: proposed.vertical,
      p_days: 30,
    });

    if (scoreRows && scoreRows.length > 0) {
      baselineScores = Object.fromEntries(
        scoreRows.map((r: { dim: string; avg_score: number }) => [r.dim, Number(r.avg_score)])
      );
      baselineSource = 'real_call_averages_30d';
    } else {
      // Default baseline
      baselineScores = Object.fromEntries(Object.keys(DIM_WEIGHTS).map(d => [d, 0.65]));
      baselineSource = 'default_0.65';
    }
  }

  const baselineWeighted = weightedScore(baselineScores);

  // ── 4. Run proposed prompt against all scenarios ──────────────────────────
  console.log(`[benchmark-runner] Evaluating ${scenarios.length} scenarios for version ${proposed.id} (vertical=${proposed.vertical})`);

  const judgeResults = await runBatch<Scenario>(
    scenarios,
    async (scenario) => {
      const dimScores = await judgeScenario(proposed.prompt_text, scenario);
      return { scenario_id: scenario.id, category: scenario.category, dimScores };
    },
    6
  );

  // ── 5. Write eval_runs ────────────────────────────────────────────────────
  const evalRunRows = judgeResults.map(({ scenario_id, dimScores }) => ({
    prompt_version_id: proposed.id,
    scenario_id,
    source: 'local_benchmark',
    passed: null as boolean | null, // filled after aggregate
    weighted_score: weightedScore(
      Object.fromEntries(Object.entries(dimScores).map(([d, v]: any) => [d, v.score]))
    ),
    dim_scores: Object.fromEntries(
      Object.entries(dimScores).map(([d, v]: any) => [d, v.score])
    ),
    transcript: null,
    failure_reason: null,
    ran_at: new Date().toISOString(),
  }));

  if (!dry_run) {
    const { error: runErr } = await supabase
      .from('retell_eval_runs')
      .insert(evalRunRows);
    if (runErr) {
      console.error('[benchmark-runner] Failed to write eval_runs:', runErr);
    }
  }

  // ── 6. Aggregate proposed scores ─────────────────────────────────────────
  const proposedDimTotals: Record<string, number> = {};
  const hallucinationBaitScores: number[] = [];

  for (const { category, dimScores } of judgeResults) {
    for (const [dim, val] of Object.entries(dimScores) as [string, { score: number }][]) {
      proposedDimTotals[dim] = (proposedDimTotals[dim] || 0) + val.score;
    }
    if (category === 'hallucination_bait') {
      const hf = (dimScores as any).hallucination_free?.score ?? 0.5;
      hallucinationBaitScores.push(hf);
    }
  }

  const n = judgeResults.length;
  const proposedDimAvg: Record<string, number> = Object.fromEntries(
    Object.keys(DIM_WEIGHTS).map(d => [d, (proposedDimTotals[d] || 0) / n])
  );
  const proposedWeighted = weightedScore(proposedDimAvg);

  // ── 7. Evaluate pass/fail ─────────────────────────────────────────────────
  const failReasons: string[] = [];

  // Gate A: minimum improvement
  const deltaPct = ((proposedWeighted - baselineWeighted) / baselineWeighted) * 100;
  if (deltaPct < MIN_IMPROVEMENT_PCT) {
    failReasons.push(
      `Weighted score improved by ${deltaPct.toFixed(1)}% — minimum required is ${MIN_IMPROVEMENT_PCT}%`
    );
  }

  // Gate B: no dim regression
  for (const [dim, baseScore] of Object.entries(baselineScores)) {
    const propScore = proposedDimAvg[dim] ?? 0.5;
    const dimDelta = ((propScore - baseScore) / baseScore) * 100;
    if (dimDelta < -MAX_REGRESSION_PCT - 0.1) { // 0.1 tolerance for float noise
      failReasons.push(`Regression on '${dim}': ${baseScore.toFixed(2)} → ${propScore.toFixed(2)} (${dimDelta.toFixed(1)}%)`);
    }
  }

  // Gate C: hallucination bait must score >= threshold
  if (hallucinationBaitScores.length > 0) {
    const avgHalluBait = hallucinationBaitScores.reduce((a, b) => a + b, 0) / hallucinationBaitScores.length;
    if (avgHalluBait < HALLUCINATION_MIN) {
      failReasons.push(
        `Hallucination-bait scenarios: avg hallucination_free score ${avgHalluBait.toFixed(2)} < required ${HALLUCINATION_MIN}`
      );
    }
  }

  const pass = failReasons.length === 0;

  // ── 8. Update prompt version status ──────────────────────────────────────
  if (!dry_run) {
    const newStatus = pass ? 'benchmark_passed' : 'rejected';
    await supabase
      .from('retell_prompt_versions')
      .update({
        status: newStatus,
        benchmark_score: proposedWeighted,
      })
      .eq('id', proposed.id);

    // Mark eval_runs as passed/failed
    await supabase
      .from('retell_eval_runs')
      .update({ passed: pass })
      .eq('prompt_version_id', proposed.id)
      .eq('source', 'local_benchmark');
  }

  // ── 9. Build per-dim report ───────────────────────────────────────────────
  const byDim = Object.fromEntries(
    Object.keys(DIM_WEIGHTS).map(dim => [dim, {
      proposed: Math.round(proposedDimAvg[dim] * 100) / 100,
      baseline: Math.round((baselineScores![dim] ?? 0.65) * 100) / 100,
      delta: Math.round(((proposedDimAvg[dim] - (baselineScores![dim] ?? 0.65)) * 100)) / 100,
      weight: DIM_WEIGHTS[dim],
    }])
  );

  // Worst 3 scenarios (for human review)
  const worstScenarios = [...evalRunRows]
    .sort((a, b) => a.weighted_score - b.weighted_score)
    .slice(0, 3)
    .map(r => ({
      scenario_id: r.scenario_id,
      weighted_score: Math.round(r.weighted_score * 100) / 100,
      dim_scores: r.dim_scores,
    }));

  const report = {
    pass,
    status: pass ? 'benchmark_passed' : 'rejected',
    proposed_version_id: proposed.id,
    vertical: proposed.vertical,
    scenarios_scored: n,
    proposed_weighted: Math.round(proposedWeighted * 100) / 100,
    baseline_weighted: Math.round(baselineWeighted * 100) / 100,
    delta_pct: Math.round(deltaPct * 10) / 10,
    baseline_source: baselineSource,
    by_dim: byDim,
    fail_reasons: failReasons,
    worst_scenarios: worstScenarios,
    dry_run,
    evaluated_at: new Date().toISOString(),
  };

  console.log(
    `[benchmark-runner] ${pass ? 'PASS' : 'FAIL'} | version=${proposed.id} ` +
    `proposed=${proposedWeighted.toFixed(3)} baseline=${baselineWeighted.toFixed(3)} ` +
    `delta=${deltaPct.toFixed(1)}% scenarios=${n}`
  );

  return {
    statusCode: 200,
    headers: HEADERS,
    body: JSON.stringify(report, null, 2),
  };
};

export const testHandler = handler;
export default withLegacyHandler(handler);
