import { Handler } from '@netlify/functions';
import { getSupabase } from './_shared/token-utils';
import { chatCompletion } from './_shared/azure-ai';
import { inferVertical } from './_shared/vertical-utils';
import { hasSharedSecret } from './_shared/user-auth';

/**
 * retell-call-scorer
 *
 * Fire-and-forget from retell-webhook.ts after every call_ended event.
 * Writes the call to retell_calls, scores it on 6 dimensions using an LLM
 * judge, writes scores to retell_call_scores, and emits to aios_event_log.
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
Score a completed AI receptionist call on 6 dimensions. Return ONLY valid JSON, no markdown.`;

const SCORING_USER_TEMPLATE = `Vertical: {VERTICAL}
Outcome: {OUTCOME}
Duration: {DURATION}s
Transcript:
{TRANSCRIPT}

Score each dimension 0.00–1.00 (two decimals). Return JSON:
{
  "booking_attempt": { "score": 0.00, "notes": "one sentence" },
  "objection_handling": { "score": 0.00, "notes": "one sentence" },
  "on_script": { "score": 0.00, "notes": "one sentence" },
  "caller_sentiment": { "score": 0.00, "notes": "one sentence" },
  "hallucination_free": { "score": 0.00, "notes": "one sentence" },
  "latency_ok": { "score": 0.00, "notes": "one sentence" }
}

Scoring rules:
- booking_attempt: Did agent move toward booking when lead intent was clear? N/A → 0.5 if no clear intent.
- objection_handling: Did agent address price/timing/trust objections per best practices? N/A → 0.5 if no objections.
- on_script: Were required disclosures (AI identity where needed) and compliance phrases present?
- caller_sentiment: End-of-call caller mood trajectory. Positive/neutral = 0.8-1.0. Frustrated/hung-up = 0.0-0.3.
- hallucination_free: Did agent invent prices, hours, or services not in its knowledge? Any clear invention = 0.0.
- latency_ok: Did conversation flow naturally without awkward silences or interruptions? Estimate from transcript flow.`;

async function scoreCall(
  vertical: string,
  outcome: string,
  durationS: number,
  transcript: string
): Promise<Record<string, { score: number; notes: string }>> {
  const prompt = SCORING_USER_TEMPLATE
    .replace('{VERTICAL}', vertical)
    .replace('{OUTCOME}', outcome)
    .replace('{DURATION}', String(durationS))
    .replace('{TRANSCRIPT}', transcript.slice(0, 6000)); // cap at ~6k chars

  try {
    const response = await chatCompletion(SCORING_SYSTEM_PROMPT, prompt, { tier: 'light', maxTokens: 400 });
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Scoring response did not contain JSON');
    const json = JSON.parse(jsonMatch[0]);
    return json;
  } catch (err) {
    console.error('[retell-call-scorer] Scoring LLM call failed:', err);
    // Return neutral 0.5 scores so the call is still recorded, not lost
    const dims = ['booking_attempt', 'objection_handling', 'on_script', 'caller_sentiment', 'hallucination_free', 'latency_ok'];
    return Object.fromEntries(dims.map(d => [d, { score: 0.5, notes: 'scoring_failed' }]));
  }
}

export const handler: Handler = async (event) => {
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

  const supabase = getSupabase();

  // Look up the Boltcall agent row by Retell agent_id
  const retellAgentId: string = call.agent_id || '';
  let agentRow: { id: string; workspace_id: string | null; name: string; description: string | null } | null = null;

  if (retellAgentId) {
    const { data } = await supabase
      .from('agents')
      .select('id, workspace_id, name, description')
      .or(`retell_agent_id.eq.${retellAgentId},api_keys->>retell_agent_id.eq.${retellAgentId}`)
      .limit(1)
      .maybeSingle();
    agentRow = data || null;
  }

  const vertical = inferVertical(
    [agentRow?.name, agentRow?.description].filter(Boolean).join(' ')
  );

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
    }, { onConflict: 'call_id' });

  if (callErr) {
    console.error('[retell-call-scorer] Failed to upsert retell_calls:', callErr);
    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ error: 'DB write failed' }) };
  }

  // Stamp prompt_version_id if a shadow version is active for this vertical
  const { data: shadowVersion } = await supabase
    .from('retell_prompt_versions')
    .select('id')
    .eq('vertical', vertical)
    .eq('status', 'shadowing')
    .limit(1)
    .maybeSingle();

  if (shadowVersion?.id) {
    supabase
      .from('retell_calls')
      .update({ prompt_version_id: shadowVersion.id })
      .eq('call_id', callId)
      .then(({ error }) => {
        if (error) console.error('[retell-call-scorer] prompt_version_id stamp failed:', error);
      });
  }

  // Skip scoring if no meaningful transcript
  if (!transcriptText || transcriptText.length < 50) {
    console.log(`[retell-call-scorer] Call ${callId} written, no transcript to score`);
    return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: true, scored: false, reason: 'no_transcript' }) };
  }

  // Score the call
  const scores = await scoreCall(vertical, outcome, durationS, transcriptText);

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

  // Emit to aios_event_log (best-effort)
  const weightedScore = (
    (scores.booking_attempt?.score || 0.5) * 0.25 +
    (scores.objection_handling?.score || 0.5) * 0.20 +
    (scores.on_script?.score || 0.5) * 0.10 +
    (scores.caller_sentiment?.score || 0.5) * 0.15 +
    (scores.hallucination_free?.score || 0.5) * 0.20 +
    (scores.latency_ok?.score || 0.5) * 0.10
  );

  supabase.from('aios_event_log').insert({
    event_type: 'retell_call_scored',
    channel: 'voice',
    subject_id: callId,
    sentiment: weightedScore >= 0.7 ? 'positive' : weightedScore >= 0.5 ? 'neutral' : 'negative',
    payload: {
      call_id: callId,
      vertical,
      outcome,
      duration_s: durationS,
      weighted_score: Math.round(weightedScore * 100) / 100,
      hallucination_free: scores.hallucination_free?.score,
      booking_attempt: scores.booking_attempt?.score,
    },
    ts: new Date().toISOString(),
  }).then(({ error }) => {
    if (error) console.error('[retell-call-scorer] aios_event_log write failed (non-blocking):', error);
  });

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
      weighted_score: Math.round(weightedScore * 100) / 100,
    }),
  };
};
