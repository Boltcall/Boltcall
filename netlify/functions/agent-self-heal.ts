import { Handler } from '@netlify/functions';
import { notifyError, notifyInfo } from './_shared/notify';
import { deductTokens, getServiceSupabase, TOKEN_COSTS } from './_shared/token-utils';
import { chatCompletion } from './_shared/azure-ai';
import { requireInternalOrMatchingUser, requireUser } from './_shared/user-auth';

/**
 * Agent Self-Healing Pipeline
 *
 * Triggered after a failed conversation is detected (by conversation-outcome.ts or retell-webhook.ts).
 * Flow:
 *   1. Analyze the transcript to identify the failure type and root cause
 *   2. Generate 4 test scenarios: 3 similar variations + 1 exact replay
 *   3. Clone voice agent → chat agent, reproduce the failure
 *   4. Fix the prompt
 *   5. Retest all 4 — ALL must pass (100% threshold)
 *   6. If not all pass, re-analyze and re-fix (up to MAX_HEAL_ITERATIONS attempts)
 *   7. Deploy the verified fix or revert after max attempts
 *   8. Notify via Telegram + store in DB
 */

const RETELL_API = 'https://api.retellai.com';
const RETELL_KEY = process.env.RETELL_API_KEY || '';
const MAX_HEAL_ITERATIONS = 3;
const VERIFY_RUNS = 4; // 3 similar + 1 exact, all must pass

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Internal-Secret, X-Cron-Secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

async function retellFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${RETELL_API}${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${RETELL_KEY}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (path.includes('delete') && res.status === 204) return null;
  if (!res.ok) {
    const errText = await res.text().catch(() => 'Unknown error');
    throw new Error(`Retell API ${path} failed (${res.status}): ${errText}`);
  }
  return res.json();
}

async function askLLM(systemPrompt: string, userPrompt: string): Promise<string> {
  return chatCompletion(systemPrompt, userPrompt, { maxTokens: 4000 });
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface FailureAnalysis {
  failureType: string;
  failureSummary: string;
  rootCause: string;
  testMessages: string[];
  promptFix: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface HealScenario {
  label: 'similar_1' | 'similar_2' | 'similar_3' | 'exact';
  messages: string[];
}

interface RubricCriterion {
  id: string;
  label: string;
  description: string;
  weight: number;
}

// ─── Step 1: Analyze failure ──────────────────────────────────────────────────

async function analyzeFailure(
  transcript: string,
  agentPrompt: string,
  callAnalysis: unknown,
  priorFailedFixes?: string[],
): Promise<FailureAnalysis> {
  const priorFixContext = priorFailedFixes && priorFailedFixes.length > 0
    ? `\n\n## Prior Fix Attempts (all failed verification)\n${priorFailedFixes.map((f, i) => `Fix ${i + 1}: ${f}`).join('\n')}`
    : '';

  const systemPrompt = `You are an expert AI voice agent debugger. Analyze a failed conversation transcript and the agent's current prompt to identify:
1. What went wrong (the failure type)
2. Why it went wrong (root cause in the prompt)
3. Test messages that would reproduce this exact failure
4. A specific prompt fix (the exact text to add/change)

${priorFailedFixes && priorFailedFixes.length > 0 ? 'IMPORTANT: Previous fix attempts have already been tried and failed. Propose a different, more targeted fix.' : ''}

Respond in JSON only with this structure:
{
  "failureType": "string - e.g. 'missed_booking', 'wrong_info', 'loop_detected', 'hallucination', 'greeting_skip', 'transfer_failure', 'rude_response'",
  "failureSummary": "string - one sentence describing what happened",
  "rootCause": "string - why the prompt allowed this to happen",
  "testMessages": ["array of 3-5 user messages that would reproduce this exact failure"],
  "promptFix": "string - the exact text to ADD to the prompt to fix this issue. Be specific. Include the section header and instruction.",
  "severity": "low|medium|high|critical"
}`;

  const userPrompt = `## Call Analysis
${JSON.stringify(callAnalysis || {}, null, 2)}

## Call Transcript
${transcript}

## Current Agent Prompt
${agentPrompt}${priorFixContext}

Analyze why this conversation failed and provide the fix.`;

  const response = await askLLM(systemPrompt, userPrompt);
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Failed to parse failure analysis');
  return JSON.parse(jsonMatch[0]);
}

// ─── Step 2: Generate 4 targeted test scenarios (3 similar + 1 exact) ────────

async function generateHealScenarios(
  transcript: string,
  analysis: FailureAnalysis,
): Promise<HealScenario[]> {
  const systemPrompt = `You are an AI agent test engineer. Given a failed conversation transcript and failure analysis, generate exactly 4 test scenarios:

1. similar_1: Same failure topic but rephrased — different wording, same underlying issue
2. similar_2: Same failure topic but from a different angle — different lead persona or context
3. similar_3: Same failure topic edge case — pushes harder or uses unexpected phrasing
4. exact: Replays the ACTUAL failed conversation turn by turn — use exact user phrases from the real transcript

Respond in JSON array only:
[
  { "label": "similar_1", "messages": ["user msg 1", "user msg 2", ...] },
  { "label": "similar_2", "messages": ["user msg 1", "user msg 2", ...] },
  { "label": "similar_3", "messages": ["user msg 1", "user msg 2", ...] },
  { "label": "exact",     "messages": ["exact user msg 1", "exact user msg 2", ...] }
]

Each scenario: 3-6 user messages. For 'exact', extract ONLY the user turns from the transcript in order.`;

  const userPrompt = `## Failure Type: ${analysis.failureType}
## Root Cause: ${analysis.rootCause}
## Original test messages: ${JSON.stringify(analysis.testMessages)}

## Actual Transcript:
${transcript}`;

  const response = await askLLM(systemPrompt, userPrompt);
  const jsonMatch = response.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    // Fallback: derive scenarios from analysis.testMessages
    return [
      { label: 'similar_1', messages: analysis.testMessages },
      { label: 'similar_2', messages: analysis.testMessages.map(m => m + ' please') },
      { label: 'similar_3', messages: ['Actually, ' + (analysis.testMessages[0] || 'I need help')] },
      { label: 'exact',     messages: analysis.testMessages },
    ];
  }
  return JSON.parse(jsonMatch[0]) as HealScenario[];
}

// ─── Step 3: Create/delete temp chat agent ────────────────────────────────────

async function createTempChatAgent(voiceAgentId: string): Promise<{ chatAgentId: string; llmId: string }> {
  const voiceAgent = await retellFetch(`/get-agent/${voiceAgentId}`);
  const llmId = voiceAgent.response_engine?.llm_id;
  if (!llmId) throw new Error('Voice agent has no LLM configured');

  const chatAgent = await retellFetch('/create-chat-agent', {
    method: 'POST',
    body: JSON.stringify({
      response_engine: { type: 'retell-llm', llm_id: llmId },
      agent_name: `HEAL-${voiceAgent.agent_name}-${Date.now()}`,
    }),
  });

  return { chatAgentId: chatAgent.agent_id, llmId };
}

async function runChatTest(
  chatAgentId: string,
  messages: string[],
): Promise<{ conversation: Array<{ role: string; content: string }>; analysis: unknown }> {
  const chat = await retellFetch('/create-chat', {
    method: 'POST',
    body: JSON.stringify({ agent_id: chatAgentId }),
  });

  const conversation: Array<{ role: string; content: string }> = [];
  if (chat.first_message) {
    conversation.push({ role: 'agent', content: chat.first_message });
  }

  for (const message of messages) {
    conversation.push({ role: 'user', content: message });
    try {
      const response = await retellFetch('/create-chat-completion', {
        method: 'POST',
        body: JSON.stringify({ chat_id: chat.chat_id, content: message }),
      });
      if (response.messages) {
        for (const msg of response.messages) {
          if (msg.content) {
            conversation.push({ role: 'agent', content: msg.content });
          }
        }
      }
    } catch (err) {
      conversation.push({ role: 'system', content: `Error: ${err}` });
    }
  }

  try {
    await retellFetch(`/end-chat/${chat.chat_id}`, { method: 'PATCH' });
  } catch { /* ignore */ }

  await new Promise(r => setTimeout(r, 2000));
  let analysis = null;
  try {
    const chatData = await retellFetch(`/get-chat/${chat.chat_id}`);
    analysis = chatData.chat_analysis || null;
  } catch { /* ignore */ }

  return { conversation, analysis };
}

async function deleteTempChatAgent(chatAgentId: string) {
  try {
    await retellFetch(`/delete-chat-agent/${chatAgentId}`, { method: 'DELETE' });
  } catch { /* ignore */ }
}

// ─── Rubric scoring ───────────────────────────────────────────────────────────

async function scoreWithRubric(
  conversation: Array<{ role: string; content: string }>,
  criteria: RubricCriterion[],
): Promise<{ overall: number; criteriaScores: Record<string, { label: string; passed: boolean; notes: string }> }> {
  if (!criteria || criteria.length === 0) return { overall: 100, criteriaScores: {} };

  const systemPrompt = `You are a QA evaluator for an AI voice agent. Score a conversation against specific rubric criteria.
For each criterion, determine if it was met and provide brief notes.
Respond in JSON only:
{
  "overall": 0-100,
  "criteriaScores": {
    "<criterion-id>": {"label": "<label>", "passed": true or false, "notes": "<brief notes>"}
  }
}
The overall score should reflect weighted pass/fail across all criteria.`;

  const conversationText = conversation.map(m => `${m.role}: ${m.content}`).join('\n');
  const criteriaText = criteria
    .map(c => `- ID: ${c.id} | Label: ${c.label} | Description: ${c.description} | Weight: ${c.weight}`)
    .join('\n');
  const userPrompt = `## Rubric Criteria\n${criteriaText}\n\n## Conversation\n${conversationText}`;

  const response = await chatCompletion(systemPrompt, userPrompt, { maxTokens: 1000 });
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return { overall: 50, criteriaScores: {} };
  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    return { overall: 50, criteriaScores: {} };
  }
}

// ─── Step 4: Apply prompt fix ─────────────────────────────────────────────────

async function applyPromptFix(
  llmId: string,
  promptFix: string,
  iteration: number,
): Promise<{ oldPrompt: string; newPrompt: string }> {
  const llm = await retellFetch(`/get-retell-llm/${llmId}`);
  const oldPrompt = llm.general_prompt || '';

  const fixSection = `\n\n## AUTO-FIX v${iteration} (${new Date().toISOString().split('T')[0]})\n${promptFix}`;
  const newPrompt = oldPrompt + fixSection;

  await retellFetch(`/update-retell-llm/${llmId}`, {
    method: 'PATCH',
    body: JSON.stringify({ general_prompt: newPrompt }),
  });

  return { oldPrompt, newPrompt };
}

// ─── Main Handler ─────────────────────────────────────────────────────────────

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }
  if (!RETELL_KEY) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'RETELL_API_KEY not configured' }) };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { action } = body;

    // ─── ACTION: analyze ──────────────────────────────────────────────────────
    if (action === 'analyze') {
      const { transcript, agentPrompt, callAnalysis, userId } = body;
      if (!transcript) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'transcript required' }) };
      }
      const auth = await requireInternalOrMatchingUser(event, userId, headers);
      if (!auth.ok) return auth.response;
      const analysis = await analyzeFailure(transcript, agentPrompt || '', callAnalysis);
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, analysis }) };
    }

    // ─── ACTION: heal ─────────────────────────────────────────────────────────
    if (action === 'heal') {
      const { agentId, callId, transcript, callAnalysis, userId } = body;
      if (!agentId || !transcript || !userId) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'agentId, transcript, and userId required' }) };
      }
      const auth = await requireInternalOrMatchingUser(event, userId, headers);
      if (!auth.ok) return auth.response;

      const supabase = getServiceSupabase();
      const startTime = Date.now();

      // Daily heal cap: max 5 heals per agent per day
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const { count: healsToday } = await supabase
        .from('agent_self_heal_log')
        .select('id', { count: 'exact', head: true })
        .eq('agent_id', agentId)
        .gte('created_at', todayStart.toISOString());

      if ((healsToday || 0) >= 5) {
        await notifyInfo(`⛔ *Self\\-Heal Blocked*\nAgent ${agentId} hit daily heal cap \\(5/day\\)\\. Skipping\\.`);
        return { statusCode: 429, headers, body: JSON.stringify({ error: 'Daily heal limit reached (5 per agent). Try again tomorrow.' }) };
      }

      // Token gate
      if (userId) {
        const deductResult = await deductTokens(userId, TOKEN_COSTS.ai_self_heal, 'ai_self_heal', `Self-heal pipeline for agent ${agentId}`);
        if (!deductResult.success) {
          return { statusCode: 402, headers, body: JSON.stringify({ error: 'Insufficient tokens for self-heal', details: deductResult.error }) };
        }
      }

      // Get current agent + prompt
      const voiceAgent = await retellFetch(`/get-agent/${agentId}`);
      const llmId = voiceAgent.response_engine?.llm_id;
      if (!llmId) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Agent has no LLM configured' }) };
      }

      const llm = await retellFetch(`/get-retell-llm/${llmId}`);
      const originalPrompt = llm.general_prompt || '';

      // Initial failure analysis
      let analysis = await analyzeFailure(transcript, originalPrompt, callAnalysis);

      // Reproduce the failure (3 quick runs)
      const { chatAgentId: reproAgentId } = await createTempChatAgent(agentId);
      let reproduced = 0;
      try {
        for (let i = 0; i < 3; i++) {
          const result = await runChatTest(reproAgentId, analysis.testMessages);
          if (result.analysis && (result.analysis as any).call_successful === false) reproduced++;
        }
      } finally {
        await deleteTempChatAgent(reproAgentId);
      }

      // Generate 4 targeted test scenarios (3 similar + 1 exact)
      const healScenarios = await generateHealScenarios(transcript, analysis);

      // Fetch active rubric for this agent (used for scenario scoring)
      let activeCriteria: RubricCriterion[] = [];
      try {
        const { data: rubricRow } = await supabase
          .from('qa_rubrics')
          .select('criteria')
          .eq('agent_id', agentId)
          .eq('is_active', true)
          .limit(1)
          .maybeSingle();
        if (rubricRow?.criteria) activeCriteria = rubricRow.criteria;
      } catch { /* no rubric, fall back to default scoring */ }

      // ── Retry loop: fix → test all 4 → re-analyze if any fail ──────────────
      let fixVerified = false;
      let passedAfterFix = 0;
      let iteration = 0;
      let currentPromptFix = analysis.promptFix;
      const priorFailedFixes: string[] = [];
      let failedScenarioLabels: string[] = [];

      while (iteration < MAX_HEAL_ITERATIONS && !fixVerified) {
        iteration++;

        // Apply the fix
        const { oldPrompt } = await applyPromptFix(llmId, currentPromptFix, iteration);

        // Mirror updated prompt to Supabase for text channels
        try {
          const llmAfterFix = await retellFetch(`/get-retell-llm/${llmId}`);
          await supabase
            .from('agents')
            .update({
              system_prompt: llmAfterFix.general_prompt || '',
              system_prompt_synced_at: new Date().toISOString(),
            })
            .eq('retell_agent_id', agentId)
            .eq('user_id', userId);
        } catch (mirrorErr) {
          console.warn('[agent-self-heal] system_prompt mirror failed:', mirrorErr instanceof Error ? mirrorErr.message : mirrorErr);
        }

        // Test all 4 scenarios — ALL must pass
        const { chatAgentId: verifyAgentId } = await createTempChatAgent(agentId);
        passedAfterFix = 0;
        failedScenarioLabels = [];

        try {
          for (const scenario of healScenarios) {
            const result = await runChatTest(verifyAgentId, scenario.messages);
            let passed: boolean;
            if (activeCriteria.length > 0) {
              const rubricScore = await scoreWithRubric(result.conversation, activeCriteria);
              passed = rubricScore.overall >= 70;
            } else {
              passed = result.analysis === null || (result.analysis as any).call_successful !== false;
            }
            if (passed) {
              passedAfterFix++;
            } else {
              failedScenarioLabels.push(scenario.label);
            }
          }
        } finally {
          await deleteTempChatAgent(verifyAgentId);
        }

        fixVerified = passedAfterFix === VERIFY_RUNS;

        if (!fixVerified && iteration < MAX_HEAL_ITERATIONS) {
          // Re-analyze: inform LLM which scenarios still failed
          priorFailedFixes.push(currentPromptFix);
          analysis = await analyzeFailure(transcript, originalPrompt, callAnalysis, priorFailedFixes);
          currentPromptFix = analysis.promptFix;

          // Revert the failed fix before applying the next one
          await retellFetch(`/update-retell-llm/${llmId}`, {
            method: 'PATCH',
            body: JSON.stringify({ general_prompt: oldPrompt }),
          });
        }
      }

      // If still not verified after all iterations, revert to original prompt
      if (!fixVerified) {
        await retellFetch(`/update-retell-llm/${llmId}`, {
          method: 'PATCH',
          body: JSON.stringify({ general_prompt: originalPrompt }),
        });
        try {
          await supabase
            .from('agents')
            .update({ system_prompt: originalPrompt, system_prompt_synced_at: new Date().toISOString() })
            .eq('retell_agent_id', agentId)
            .eq('user_id', userId);
        } catch { /* ignore */ }
      }

      const elapsedMs = Date.now() - startTime;
      const fixSuccessRate = Math.round((passedAfterFix / VERIFY_RUNS) * 100);
      const finalStatus = fixVerified
        ? 'fixed'
        : iteration >= MAX_HEAL_ITERATIONS
          ? 'max_attempts_reached'
          : 'reverted';

      // Store result in Supabase
      const healRecord = {
        agent_id: agentId,
        call_id: callId || null,
        user_id: userId || null,
        failure_type: analysis.failureType,
        failure_summary: analysis.failureSummary,
        root_cause: analysis.rootCause,
        severity: analysis.severity,
        reproduced_count: reproduced,
        original_prompt: originalPrompt,
        prompt_fix_applied: currentPromptFix,
        fix_verified: fixVerified,
        fix_success_rate: fixSuccessRate,
        fix_pass_count: passedAfterFix,
        fix_total_runs: VERIFY_RUNS,
        prompt_reverted: !fixVerified,
        elapsed_ms: elapsedMs,
        status: finalStatus,
        heal_iterations: iteration,
        failed_scenario_labels: failedScenarioLabels.length > 0 ? failedScenarioLabels.join(',') : null,
      };

      const { data: insertedRecord, error: insertError } = await supabase
        .from('agent_self_heal_log')
        .insert(healRecord)
        .select('id')
        .single();

      if (insertError) {
        console.error('[self-heal] Failed to store record:', insertError);
      }

      // Create QA review entry for human oversight
      if (insertedRecord?.id && userId) {
        supabase.from('qa_reviews').insert({
          user_id: userId,
          agent_id: agentId,
          call_id: callId || null,
          heal_log_id: insertedRecord.id,
          call_type: 'failure',
          status: 'pending',
          overall_score: fixSuccessRate,
          auto_summary: `${analysis.failureType} — ${analysis.failureSummary} | Fix: ${finalStatus} (${passedAfterFix}/${VERIFY_RUNS} passed)`,
        }).then(({ error: reviewErr }) => {
          if (reviewErr) console.warn('[self-heal] qa_reviews insert failed:', reviewErr.message);
        });
      }

      // Notify via Telegram
      const statusEmoji = fixVerified ? '✅' : finalStatus === 'max_attempts_reached' ? '🔴' : '⚠️';
      const fixStatus = fixVerified
        ? `Verified \\(all 4/4 passed, ${iteration} iteration${iteration > 1 ? 's' : ''}\\)`
        : finalStatus === 'max_attempts_reached'
          ? `Max attempts reached \\(${MAX_HEAL_ITERATIONS}\\) \\— reverted`
          : 'Reverted \\— fix did not hold';

      const notification =
        `${statusEmoji} *Agent Self\\-Heal*\n\n` +
        `🤖 *Agent:* ${voiceAgent.agent_name?.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&') || 'Unknown'}\n` +
        `❌ *Failure:* ${analysis.failureSummary.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&')}\n` +
        `🔍 *Type:* ${analysis.failureType}\n` +
        `🧪 *Tests:* ${passedAfterFix}/${VERIFY_RUNS} passed \\(3 similar \\+ 1 exact\\)\n` +
        `🔧 *Fix:* ${fixStatus}\n` +
        `⏱ *Time:* ${Math.round(elapsedMs / 1000)}s`;

      await notifyInfo(notification);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          healId: insertedRecord?.id || null,
          analysis: {
            failureType: analysis.failureType,
            failureSummary: analysis.failureSummary,
            rootCause: analysis.rootCause,
            severity: analysis.severity,
          },
          reproduction: { runs: 3, reproduced },
          fix: {
            applied: true,
            verified: fixVerified,
            successRate: fixSuccessRate,
            passedRuns: passedAfterFix,
            totalRuns: VERIFY_RUNS,
            iterations: iteration,
            reverted: !fixVerified,
            status: finalStatus,
          },
          elapsedMs,
        }),
      };
    }

    // ─── ACTION: history ──────────────────────────────────────────────────────
    if (action === 'history') {
      const { agentId, userId, limit: queryLimit } = body;
      const auth = userId
        ? await requireInternalOrMatchingUser(event, userId, headers)
        : await requireUser(event, headers);
      if (!auth.ok) return auth.response;
      const effectiveUserId = userId || auth.userId;
      const supabase = getServiceSupabase();

      let query = supabase
        .from('agent_self_heal_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(queryLimit || 20);

      if (agentId) query = query.eq('agent_id', agentId);
      query = query.eq('user_id', effectiveUserId);

      const { data, error } = await query;
      if (error) throw error;

      return { statusCode: 200, headers, body: JSON.stringify({ success: true, records: data || [] }) };
    }

    // ─── ACTION: analyze-success ──────────────────────────────────────────────
    if (action === 'analyze-success') {
      const { agentId, callId, transcript, callAnalysis, userId } = body;
      if (!transcript || !agentId || !userId) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'agentId, transcript, and userId are required' }) };
      }
      const auth = await requireInternalOrMatchingUser(event, userId, headers);
      if (!auth.ok) return auth.response;

      const supabase = getServiceSupabase();

      const deductResult = await deductTokens(
        userId,
        TOKEN_COSTS.ai_qa_success_analysis,
        'ai_qa_success_analysis',
        `Success call QA analysis for agent ${agentId}`,
      );
      if (!deductResult.success) {
        console.warn('[self-heal] Skipping success analysis — insufficient tokens');
        return { statusCode: 402, headers, body: JSON.stringify({ error: 'Insufficient tokens for QA analysis' }) };
      }

      const systemPrompt = `You are a QA analyst for an AI voice agent. Analyze this SUCCESSFUL conversation (the goal was achieved) for quality improvement.

Even though this call succeeded, identify:
1. Friction points — moments of confusion, unnecessary repetition, hesitation, or suboptimal responses
2. Positive patterns — things the agent did excellently that should be reinforced
3. Improvement suggestions — specific prompt changes to make similar calls smoother

Respond in JSON only:
{
  "friction_points": ["description", ...],
  "positive_patterns": ["description", ...],
  "improvement_suggestions": ["specific prompt change", ...],
  "friction_score": 0
}
friction_score: 0 = perfectly smooth, 10 = very rough despite success.`;

      const userPrompt = `## Call Analysis\n${JSON.stringify(callAnalysis || {}, null, 2)}\n\n## Transcript\n${transcript}`;
      const response = await chatCompletion(systemPrompt, userPrompt, { maxTokens: 1200 });
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return { statusCode: 200, headers, body: JSON.stringify({ success: true, skipped: 'parse_failed' }) };
      }

      let insights: any;
      try {
        insights = JSON.parse(jsonMatch[0]);
      } catch {
        return { statusCode: 200, headers, body: JSON.stringify({ success: true, skipped: 'parse_failed' }) };
      }

      const frictionScore = Number(insights.friction_score) || 0;

      // Create review entry first to get its ID
      const { data: reviewRow } = await supabase.from('qa_reviews').insert({
        user_id: userId,
        agent_id: agentId,
        call_id: callId || null,
        call_type: 'success',
        status: 'pending',
        friction_score: frictionScore,
        auto_summary: `Successful call. Friction score: ${frictionScore}/10. ${(insights.friction_points || []).length} friction points.`,
      }).select('id').single();

      await supabase.from('qa_success_insights').insert({
        user_id: userId,
        agent_id: agentId,
        call_id: callId || null,
        qa_review_id: reviewRow?.id || null,
        friction_points: insights.friction_points || [],
        positive_patterns: insights.positive_patterns || [],
        improvement_suggestions: insights.improvement_suggestions || [],
        friction_score: frictionScore,
      });

      if (frictionScore >= 6) {
        const esc = (s: string) => s.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
        await notifyInfo(
          `⚠️ *High\\-Friction Success Call*\n` +
          `🤖 *Agent:* ${esc(agentId)}\n` +
          `📊 *Friction Score:* ${frictionScore}/10\n` +
          `📝 *Top Issue:* ${esc((insights.friction_points || [])[0] || 'See review queue')}`,
        ).catch(() => {});
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, frictionScore, reviewId: reviewRow?.id }),
      };
    }

    // ─── ACTION: revert-fix ───────────────────────────────────────────────────
    if (action === 'revert-fix') {
      const { healLogId, userId } = body;
      if (!healLogId || !userId) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'healLogId and userId are required' }) };
      }
      const auth = await requireInternalOrMatchingUser(event, userId, headers);
      if (!auth.ok) return auth.response;

      const supabase = getServiceSupabase();

      const { data: healLog, error: fetchErr } = await supabase
        .from('agent_self_heal_log')
        .select('agent_id, original_prompt')
        .eq('id', healLogId)
        .eq('user_id', userId)
        .single();

      if (fetchErr || !healLog) {
        return { statusCode: 404, headers, body: JSON.stringify({ error: 'Heal log not found' }) };
      }

      const { agent_id: agentId, original_prompt: storedOriginalPrompt } = healLog;

      const voiceAgent = await retellFetch(`/get-agent/${agentId}`);
      const llmId = voiceAgent.response_engine?.llm_id;
      if (!llmId) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Agent has no LLM configured' }) };
      }

      let restoredPrompt: string;
      if (storedOriginalPrompt) {
        restoredPrompt = storedOriginalPrompt;
      } else {
        // Strip AUTO-FIX sections from old records that didn't store original_prompt
        const currentLlm = await retellFetch(`/get-retell-llm/${llmId}`);
        restoredPrompt = (currentLlm.general_prompt || '')
          .replace(/\n\n## AUTO-FIX v\d+[^\n]*\n[\s\S]*?(?=\n\n## AUTO-FIX v\d|\s*$)/g, '')
          .trimEnd();
      }

      await retellFetch(`/update-retell-llm/${llmId}`, {
        method: 'PATCH',
        body: JSON.stringify({ general_prompt: restoredPrompt }),
      });

      supabase
        .from('agents')
        .update({ system_prompt: restoredPrompt, system_prompt_synced_at: new Date().toISOString() })
        .eq('retell_agent_id', agentId)
        .eq('user_id', userId)
        .then(({ error: mirrorErr }) => {
          if (mirrorErr) console.warn('[revert-fix] mirror failed:', mirrorErr.message);
        });

      supabase
        .from('qa_reviews')
        .update({ status: 'rejected', reviewed_at: new Date().toISOString(), reviewed_by: userId || null })
        .eq('heal_log_id', healLogId)
        .eq('user_id', userId)
        .then(() => {});

      const esc = (s: string) => s.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
      await notifyInfo(
        `↩️ *Prompt Reverted*\n` +
        `🤖 *Agent:* ${esc(voiceAgent.agent_name || agentId)}\n` +
        `👤 *By:* ${userId ? esc(userId) : 'unknown'}`,
      ).catch(() => {});

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, reverted: true, agentId, llmId }),
      };
    }

    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid action. Use: analyze, heal, history, analyze-success, revert-fix' }) };

  } catch (err) {
    console.error('[agent-self-heal] Error:', err);
    await notifyError('agent-self-heal: Pipeline failed', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err instanceof Error ? err.message : 'Self-healing failed' }),
    };
  }
};
