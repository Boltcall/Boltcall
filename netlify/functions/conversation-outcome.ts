import { Handler } from '@netlify/functions';
import { notifyError, notifyInfo } from './_shared/notify';
import { getServiceSupabase } from './_shared/token-utils';
import { chatCompletion } from './_shared/azure-ai';
import { requireInternalOrMatchingUser } from './_shared/user-auth';
import { userOwnsAgent } from './_shared/require-auth';
import { withLegacyHandler } from './_shared/runtime-compat';

/**
 * Universal Post-Conversation Outcome Evaluator
 *
 * Called after any conversation ends — voice, chat, SMS, WhatsApp, email, ads.
 * Determines whether the agent achieved its objective, then either:
 *   - Records a win in `conversation_wins` (success path)
 *   - Triggers the self-heal pipeline (failure path)
 *
 * Channels that trigger this:
 *   - Voice (Retell): retell-webhook.ts fires this for every completed call
 *   - Chat / SMS / WhatsApp / Email: their handlers POST here when a thread ends
 */

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Internal-Secret, X-Cron-Secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

function internalHeaders(): Record<string, string> {
  const secret = process.env.INTERNAL_API_SECRET || process.env.INTERNAL_WEBHOOK_SECRET;
  return secret ? { 'x-internal-secret': secret } : {};
}

interface OutcomeEvaluation {
  success: boolean;
  outcome_type: 'booked' | 'answered' | 'unresolved';
  reason: string;
  confidence: 'high' | 'medium' | 'low';
}

async function evaluateOutcome(
  transcript: string,
  channel: string,
  callAnalysis?: Record<string, unknown>,
): Promise<OutcomeEvaluation> {
  // If Retell already made a definitive determination, trust it to skip an LLM call
  if (callAnalysis) {
    if (callAnalysis.call_successful === true) {
      const summary = String(callAnalysis.call_summary || '');
      const bookedKeywords = ['book', 'appoint', 'schedul', 'confirm', 'reserv'];
      const isBooked = bookedKeywords.some(kw => summary.toLowerCase().includes(kw));
      return {
        success: true,
        outcome_type: isBooked ? 'booked' : 'answered',
        reason: summary || 'Retell marked call as successful',
        confidence: 'high',
      };
    }
    if (callAnalysis.call_successful === false) {
      return {
        success: false,
        outcome_type: 'unresolved',
        reason: String(callAnalysis.call_summary || 'Retell marked call as failed'),
        confidence: 'high',
      };
    }
  }

  // LLM evaluation for ambiguous cases or non-Retell channels
  const systemPrompt = `You are an expert conversation quality evaluator for a local service business AI agent.
Analyze a conversation transcript and determine if the AI agent achieved its objective.

The agent's objectives (ANY ONE counts as success):
1. BOOKED — successfully booked, scheduled, or confirmed an appointment or callback
2. ANSWERED — fully answered the lead's question to their clear satisfaction (they confirmed it, or said thanks/goodbye positively, or explicitly indicated they got what they needed)

Failure indicators:
- Lead hung up frustrated or confused
- Lead's question was not answered or was answered incorrectly
- Booking was attempted but not completed
- Loop or repetition detected
- Lead asked to speak to a human but was not helped
- No meaningful interaction occurred

Respond in JSON only:
{
  "success": boolean,
  "outcome_type": "booked" | "answered" | "unresolved",
  "reason": "one sentence explanation",
  "confidence": "high" | "medium" | "low"
}`;

  const userPrompt = `Channel: ${channel}

Transcript:
${transcript}`;

  const response = await chatCompletion(systemPrompt, userPrompt, { maxTokens: 300 });
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return {
      success: false,
      outcome_type: 'unresolved',
      reason: 'Could not parse outcome evaluation',
      confidence: 'low',
    };
  }
  return JSON.parse(jsonMatch[0]) as OutcomeEvaluation;
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let body: any;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  try {
    const { channel, agentId, userId, conversationId, transcript, callAnalysis } = body;

    if (!transcript || !agentId || !userId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'transcript, agentId, and userId are required' }),
      };
    }

    const auth = await requireInternalOrMatchingUser(event, userId, headers);
    if (!auth.ok) return auth.response;
    if (!(await userOwnsAgent(userId, agentId))) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Not authorized to access this agent' }),
      };
    }

    const evaluation = await evaluateOutcome(transcript, channel || 'unknown', callAnalysis);

    const supabase = getServiceSupabase();

    if (evaluation.success) {
      const { error: insertErr } = await supabase.from('conversation_wins').insert({
        user_id: userId,
        agent_id: agentId,
        channel: channel || 'unknown',
        outcome_type: evaluation.outcome_type,
        conversation_id: conversationId || null,
        summary: evaluation.reason,
      });

      if (insertErr) {
        console.error('[conversation-outcome] Failed to insert win:', insertErr);
      }

      // Analyze successful call for friction and positive patterns (fire-and-forget)
      const baseUrl = process.env.URL || process.env.DEPLOY_URL || 'https://boltcall.org';
      fetch(`${baseUrl}/.netlify/functions/agent-self-heal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...internalHeaders() },
        body: JSON.stringify({
          action: 'analyze-success',
          agentId,
          callId: conversationId || null,
          transcript,
          callAnalysis: callAnalysis || null,
          userId,
        }),
      }).catch(err => {
        console.error('[conversation-outcome] Success analysis trigger failed (non-blocking):', err);
      });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          outcome: 'win',
          outcomeType: evaluation.outcome_type,
          reason: evaluation.reason,
          confidence: evaluation.confidence,
          healTriggered: false,
          successAnalysisTriggered: true,
        }),
      };
    }

    // Failure — trigger self-heal fire-and-forget
    const baseUrl = process.env.URL || process.env.DEPLOY_URL || 'https://boltcall.org';
    fetch(`${baseUrl}/.netlify/functions/agent-self-heal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...internalHeaders() },
      body: JSON.stringify({
        action: 'heal',
        agentId,
        callId: conversationId || null,
        transcript,
        callAnalysis: callAnalysis || null,
        userId,
      }),
    }).catch(err => {
      console.error('[conversation-outcome] Self-heal trigger failed (non-blocking):', err);
    });

    await notifyInfo(
      `⚠️ *Conversation Failed*\n` +
      `📡 *Channel:* ${(channel || 'unknown').replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&')}\n` +
      `🔍 *Reason:* ${evaluation.reason.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&')}\n` +
      `🔧 *Self\\-heal:* triggered`
    );

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        outcome: 'fail',
        outcomeType: evaluation.outcome_type,
        reason: evaluation.reason,
        confidence: evaluation.confidence,
        healTriggered: true,
      }),
    };

  } catch (err) {
    console.error('[conversation-outcome] Error:', err);
    await notifyError('conversation-outcome: Unhandled exception', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err instanceof Error ? err.message : 'Internal error' }),
    };
  }
};

export default withLegacyHandler(handler);
