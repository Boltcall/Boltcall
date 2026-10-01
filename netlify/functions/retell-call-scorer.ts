import { Handler } from '@netlify/functions';
import { getServiceSupabase } from './_shared/token-utils';
import { chatCompletion } from './_shared/azure-ai';
import { inferVertical } from './_shared/vertical-utils';
import { hasSharedSecret } from './_shared/user-auth';
import { withLegacyHandler } from './_shared/runtime-compat';
import { buildAgentOwnerOrFilter, sanitizeRetellAgentId } from './_shared/lookup-agent-owner';

/**
 * retell-call-scorer
 *
 * Dispatched by retell-webhook.ts after every completed call.
 * Writes the call to retell_calls, scores it with an LLM judge (generic dims,
 * plus law_* dims for law firms), writes scores to retell_call_scores, the
 * per-call report to retell_calls.score_report, and emits to aios_event_log.
 *
 * This is the sensor layer for the retell-agent-improvement loop.
 */

const HEADERS = {
  'Content-Type': 'application/json',
};

// Minimum call duration to score (avoid test calls, hang-ups before agent spoke)
const MIN_DURATION_S = 8;

// Excluded call patterns — don't score these
function shouldExclude(call: any, durationS: number): { exclude: boolean; reason?: string } {
  if (durationS < MIN_DURATION_S) return { exclude: true, reason: 'too_short' };
  if (call.call_type === 'outbound_api' && call.metadata?.is_test) return { exclude: true, reason: 'test_call' };
  if (call.metadata?.exclude_from_scoring) return { exclude: true, reason: 'manually_excluded' };
  return { exclude: false };
}

// Map Retell call analysis to our outcome taxonomy
function inferOutcome(call: any): string {
  const analysis = call.call_analysis || {};
  const summary: string = (analysis.call_summary || '').toLowerCase();
  const sentiment: string = (analysis.user_sentiment || '').toLowerCase();

  if (call.metadata?.outcome) return call.metadata.outcome;

  // Booking signals
  if (analysis.call_successful === true) return 'booked';
  if (/book|schedul|appoint|confirm|slot|time|set up|reserv/.test(summary)) return 'booked';

  // Transfer signals
  if (summary.includes('transfer') || summary.includes('connect')) return 'transferred';

  // Hang-up / abandoned
  if (call.call_status === 'not_connected') return 'wrong_number';
  if (/vendor|selling|soliciting|spam/.test(summary)) return 'vendor';
  if (sentiment === 'negative' && /hang|frustrat|angry/.test(summary)) return 'hung_up';

  return 'no_outcome';
}

const SCORING_SYSTEM_PROMPT = `You are a voice AI quality analyst for Boltcall, a speed-to-lead platform.
Score a completed AI receptionist call on the listed dimensions and write a short report. Return ONLY valid JSON, no markdown.`;

const SCORING_USER_TEMPLATE = `Vertical: {VERTICAL}
Outcome: {OUTCOME}
Duration: {DURATION}s
Transcript:
{TRANSCRIPT}

Score each dimension 0.00 to 1.00 (two decimals). Return JSON:
{
  "booking_attempt": { "score": 0.00, "notes": "one sentence" },
  "objection_handling": { "score": 0.00, "notes": "one sentence" },
  "on_script": { "score": 0.00, "notes": "one sentence" },
  "caller_sentiment": { "score": 0.00, "notes": "one sentence" },
  "hallucination_free": { "score": 0.00, "notes": "one sentence" },
  "latency_ok": { "score": 0.00, "notes": "one sentence" },
  "urgency_signal": { "score": 0.00, "notes": "one sentence" },{LAW_DIMS}
  "report": {
    "summary": "one or two plain sentences: who called, what they wanted, how it ended",
    "went_well": "one sentence",
    "went_wrong": "one sentence, or 'Nothing notable'",
    "top_improvement": "the single change to the agent that would most improve calls like this"
  }
}

Scoring rules:
- booking_attempt: Did agent move toward booking when lead intent was clear? N/A → 0.5 if no clear intent.
- objection_handling: Did agent address price/timing/trust objections per best practices? N/A → 0.5 if no objections.
- on_script: Were required disclosures (AI identity where needed) and compliance phrases present?
- caller_sentiment: End-of-call caller mood trajectory. Positive/neutral = 0.8-1.0. Frustrated/hung-up = 0.0-0.3.
- hallucination_free: Did agent invent prices, hours, or services not in its knowledge? Any clear invention = 0.0.
- latency_ok: Did conversation flow naturally without awkward silences or interruptions? Estimate from transcript flow.
- urgency_signal: How urgent/high-stakes is this lead: emergencies, large deal value, "need this today/now" language, safety issues. 0.0 = routine inquiry, 1.0 = drop-everything urgent. This does NOT measure mood (see caller_sentiment); an angry caller about a routine matter still scores low here.{LAW_RULES}
Report text is shown to the business owner: plain language, no jargon, no dashes as punctuation.`;

// Law firm intake checks, worded to match the law_firm template in generate-agent-prompt.ts.
const LAW_DIMS = `
  "law_disclosure": { "score": 0.00, "notes": "one sentence" },
  "law_no_legal_advice": { "score": 0.00, "notes": "one sentence" },
  "law_intake_complete": { "score": 0.00, "notes": "one sentence" },
  "law_urgent_escalation": { "score": 0.00, "notes": "one sentence" },
  "law_consult_or_callback": { "score": 0.00, "notes": "one sentence" },`;

const LAW_RULES = `
Law firm rules (this agent is a law firm intake specialist):
- law_disclosure: Early in the call the agent said it is an AI assistant AND that the call may be recorded. Both = 1.0, one = 0.5, neither = 0.0. Promising confidentiality or privilege = 0.0.
- law_no_legal_advice: Agent gave no legal advice, no case strength or chances assessment, no outcome/value/timeline prediction, never told the caller whether to sign, respond, appear, pay, settle, or wait, and never implied the firm represents them. Any violation = 0.0.
- law_intake_complete: Share of these captured: full name, callback number, email, practice area, brief matter summary, names of opposing/other parties (conflict check), key dates (court dates, filing deadlines, incident date), urgency. Score = share captured. Existing clients, opposing parties, vendors: 1.0 if name, number, and message were taken.
- law_urgent_escalation: If the matter was urgent (arrest or someone in custody, custody emergency, domestic violence or safety risk, ICE or removal proceedings, court date within 48 hours, imminent filing deadline), did the agent put safety first, transfer or flag it as URGENT, and promise a same day attorney callback? Urgent and missed = 0.0. No urgent matter = 1.0.
- law_consult_or_callback: A consultation was booked, or a callback was captured with name and number. Neither = 0.0.`;

async function scoreCall(
  vertical: string,
  outcome: string,
  durationS: number,
  transcript: string,
  isLawFirm: boolean,
): Promise<{ scores: Record<string, { score: number; notes: string }>; report: Record<string, string> } | null> {
  const prompt = SCORING_USER_TEMPLATE
    .replace('{VERTICAL}', vertical)
    .replace('{OUTCOME}', outcome)
    .replace('{DURATION}', String(durationS))
    .replace('{LAW_DIMS}', isLawFirm ? LAW_DIMS : '')
    .replace('{LAW_RULES}', isLawFirm ? LAW_RULES : '')
    .replace('{TRANSCRIPT}', transcript.slice(0, 6000)); // cap at ~6k chars

  try {
    const response = await chatCompletion(SCORING_SYSTEM_PROMPT, prompt, { tier: 'light', maxTokens: 1000 });
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Scoring response did not contain JSON');
    const { report, ...dims } = JSON.parse(jsonMatch[0]);
    const scores = Object.fromEntries(
      Object.entries(dims).filter(([, v]: [string, any]) => typeof v?.score === 'number'),
    ) as Record<string, { score: number; notes: string }>;
    if (Object.keys(scores).length === 0) throw new Error('Scoring response had no numeric scores');
    return { scores, report: report && typeof report === 'object' ? report : {} };
  } catch (err) {
    // ponytail: no neutral 0.5 fallback; fake scores polluted dim averages.
    console.error('[retell-call-scorer] Scoring LLM call failed:', err);
    return null;
  }
}

const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: HEADERS, body: JSON.stringify({ error: 'Method not allowed' }) };
  }
  if (!hasSharedSecret(event)) {
    return { statusCode: 401, headers: HEADERS, body: JSON.stringify({ error: 'Internal authorization required' }) };
  }

  let call: any;
  try {
    const body = JSON.parse(event.body || '{}');
    call = body.call || body;
  } catch {
    return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const callId: string = call.call_id;
  if (!callId) {
    return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'call_id required' }) };
  }

  const durationS = Math.round((call.duration_ms || 0) / 1000);
  const { exclude, reason } = shouldExclude(call, durationS);

  if (exclude) {
    console.log(`[retell-call-scorer] Excluded call ${callId}: ${reason}`);
    return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: true, excluded: true, reason }) };
  }

  const supabase = getServiceSupabase();

  // Look up the Boltcall agent row by Retell agent_id
  const retellAgentId: string = call.agent_id || '';
  let agentRow: { id: string; user_id: string | null; workspace_id: string | null; name: string; description: string | null } | null = null;

  const safeRetellAgentId = sanitizeRetellAgentId(retellAgentId);
  if (safeRetellAgentId) {
    const { data } = await supabase
      .from('agents')
      .select('id, user_id, workspace_id, name, description')
      .or(buildAgentOwnerOrFilter(safeRetellAgentId))
      .limit(1)
      .maybeSingle();
    agentRow = data || null;
  }

  // Industry comes from the owner's business profile (law_firm canonical,
  // legal legacy); the agent name/description keyword match is the fallback.
  let industry = '';
  if (agentRow?.user_id) {
    const { data: profile } = await supabase
      .from('business_profiles')
      .select('main_category')
      .eq('user_id', agentRow.user_id)
      .limit(1)
      .maybeSingle();
    industry = String(profile?.main_category || '').toLowerCase();
  }
  const inferredVertical = inferVertical(
    [agentRow?.name, agentRow?.description].filter(Boolean).join(' ')
  );
  const isLawFirm = industry === 'law_firm' || industry === 'legal' || inferredVertical === 'legal';
  const vertical = isLawFirm ? 'legal' : inferredVertical;

  const outcome = inferOutcome(call);

  // Build transcript text
  const transcriptObj = call.transcript_object || call.transcript;
  let transcriptText = '';
  if (Array.isArray(transcriptObj)) {
    transcriptText = transcriptObj
      .map((t: any) => `${t.role || 'unknown'}: ${t.content || t.words?.map((w: any) => w.word).join(' ') || ''}`)
      .join('\n');
  } else if (typeof transcriptObj === 'string') {
    transcriptText = transcriptObj;
  } else {
    transcriptText = call.call_analysis?.call_summary || '';
  }

  // Stamp prompt_version_id: call metadata wins (A/B variant arm, set at
  // call creation), else the shadow version rolled out to THIS agent
  // (shadow_agent_ids covers both customer-pinned and template rollouts).
  let stampVersionId: string | null =
    typeof call.metadata?.prompt_version_id === 'string' ? call.metadata.prompt_version_id : null;
  if (!stampVersionId && retellAgentId) {
    const { data: shadowVersion } = await supabase
      .from('retell_prompt_versions')
      .select('id')
      .eq('status', 'shadowing')
      .contains('shadow_agent_ids', [retellAgentId])
      .limit(1)
      .maybeSingle();
    stampVersionId = shadowVersion?.id || null;
  }

  // Upsert call row
  const { error: callErr } = await supabase
    .from('retell_calls')
    .upsert({
      call_id: callId,
      retell_agent_id: retellAgentId,
      agent_id: agentRow?.id || null,
      workspace_id: agentRow?.workspace_id || null,
      vertical,
      started_at: call.start_timestamp ? new Date(call.start_timestamp).toISOString() : new Date().toISOString(),
      ended_at: call.end_timestamp ? new Date(call.end_timestamp).toISOString() : null,
      duration_s: durationS,
      transcript: transcriptText,
      recording_url: call.recording_url || null,
      outcome,
      call_type: call.call_type || 'inbound',
      retell_payload: call,
      ...(stampVersionId ? { prompt_version_id: stampVersionId } : {}),
    }, { onConflict: 'call_id' });

  if (callErr) {
    console.error('[retell-call-scorer] Failed to upsert retell_calls:', callErr);
    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ error: 'DB write failed' }) };
  }

  // Skip scoring if no meaningful transcript
  if (!transcriptText || transcriptText.length < 50) {
    console.log(`[retell-call-scorer] Call ${callId} written, no transcript to score`);
    return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: true, scored: false, reason: 'no_transcript' }) };
  }

  // Score the call
  const result = await scoreCall(vertical, outcome, durationS, transcriptText, isLawFirm);

  if (!result) {
    // No score rows: a failed judge must not drag dim averages toward 0.5.
    await supabase.from('retell_calls').update({ score_report: { status: 'failed', error: 'scoring_llm_failed' } }).eq('call_id', callId);
    const { error: evErr } = await supabase.from('aios_event_log').insert({
      event_type: 'retell_call_scoring_failed',
      channel: 'voice',
      subject_id: callId,
      sentiment: 'neutral',
      payload: { call_id: callId, vertical, outcome, duration_s: durationS },
      ts: new Date().toISOString(),
    });
    if (evErr) console.error('[retell-call-scorer] aios_event_log write failed (non-blocking):', evErr);
    return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: true, scored: false, reason: 'scoring_failed', call_id: callId }) };
  }
  const { scores, report } = result;

  // Upsert scores
  const scoreRows = Object.entries(scores).map(([dim, { score, notes }]) => ({
    call_id: callId,
    dim,
    score: Math.min(1, Math.max(0, score)),
    notes: notes || null,
    scored_at: new Date().toISOString(),
  }));

  const { error: scoresErr } = await supabase
    .from('retell_call_scores')
    .upsert(scoreRows, { onConflict: 'call_id,dim' });

  if (scoresErr) {
    console.error('[retell-call-scorer] Failed to upsert retell_call_scores:', scoresErr);
  }

  // ?? not ||: a real 0 score must not read as 0.5
  const weightedScore = (
    (scores.booking_attempt?.score ?? 0.5) * 0.25 +
    (scores.objection_handling?.score ?? 0.5) * 0.20 +
    (scores.on_script?.score ?? 0.5) * 0.10 +
    (scores.caller_sentiment?.score ?? 0.5) * 0.15 +
    (scores.hallucination_free?.score ?? 0.5) * 0.20 +
    (scores.latency_ok?.score ?? 0.5) * 0.10
  );
  const weighted = Math.round(weightedScore * 100) / 100;

  // Per-call report for the dashboard (retell_calls.score_report)
  const text = (v: unknown) => (typeof v === 'string' ? v.trim().slice(0, 500) : '');
  const { error: reportErr } = await supabase
    .from('retell_calls')
    .update({
      score_report: {
        status: 'scored',
        summary: text(report.summary),
        went_well: text(report.went_well),
        went_wrong: text(report.went_wrong),
        top_improvement: text(report.top_improvement),
        weighted_score: weighted,
        law_firm: isLawFirm,
      },
    })
    .eq('call_id', callId);
  if (reportErr) console.error('[retell-call-scorer] score_report write failed:', reportErr);

  // Emit to aios_event_log (best-effort, awaited so the runtime can't drop it)
  const { error: eventErr } = await supabase.from('aios_event_log').insert({
    event_type: 'retell_call_scored',
    channel: 'voice',
    subject_id: callId,
    sentiment: weightedScore >= 0.7 ? 'positive' : weightedScore >= 0.5 ? 'neutral' : 'negative',
    payload: {
      call_id: callId,
      vertical,
      outcome,
      duration_s: durationS,
      weighted_score: weighted,
      hallucination_free: scores.hallucination_free?.score,
      booking_attempt: scores.booking_attempt?.score,
    },
    ts: new Date().toISOString(),
  });
  if (eventErr) console.error('[retell-call-scorer] aios_event_log write failed (non-blocking):', eventErr);

  console.log(`[retell-call-scorer] Scored call ${callId} | vertical=${vertical} outcome=${outcome} weighted=${weightedScore.toFixed(2)}`);

  return {
    statusCode: 200,
    headers: HEADERS,
    body: JSON.stringify({
      ok: true,
      scored: true,
      call_id: callId,
      vertical,
      outcome,
      weighted_score: weighted,
    }),
  };
};

export const testHandler = handler;
export default withLegacyHandler(handler);
