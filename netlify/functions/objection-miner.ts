import { Handler } from '@netlify/functions';
import { getServiceSupabase } from './_shared/token-utils';
import { chatCompletion } from './_shared/azure-ai';
import { authorizeRunner } from './_shared/agency-runner-auth';
import { withLegacyHandler } from './_shared/runtime-compat';

/**
 * objection-miner — weekly objection-mining loop (batch-2 task 10).
 *
 * Scheduled Mondays 08:00 UTC. For each agent with enough weak calls in the
 * last 7 days (any quality dim the retell-call-scorer rated < 0.6), clusters
 * the recurring failures from the scorer notes + transcripts and proposes a
 * prompt patch per cluster.
 *
 * Where the suggestion goes depends on the workspace owner:
 *   - plain SaaS workspace: each patch becomes a pending qa_reviews item
 *     (backed by an agent_self_heal_log row, status 'pending_approval'), shown
 *     in /dashboard/qa/review; agent-self-heal 'approve-fix' applies it.
 *   - agency client: ONE prompt_revision artifact into the client approval
 *     queue (agency_artifacts → ClientApprovalsPage → shadow rollout).
 *
 * POST { dry_run?: boolean, workspace_id?: string } — manual trigger.
 */

const HEADERS = { 'Content-Type': 'application/json' };

// Minimum weak calls in the window before an agent is mined
const MIN_WEAK_CALLS = 3;
// Minimum occurrences of a failure pattern to propose a fix
const MIN_CLUSTER_FREQUENCY = 2;
// A call is weak when any quality dim scored below this
const MAX_WEAK_SCORE = 0.6;
// Scorer dims that rate the lead, not the agent
const NON_QUALITY_DIMS = '("urgency_signal")';
// Caps to keep the LLM prompt and the review queue bounded
const MAX_CALLS_PER_WORKSPACE = 10;
const MAX_TRANSCRIPT_CHARS = 800;
const MAX_SUGGESTIONS_PER_AGENT = 3;
// agent_self_heal_log.failure_type for miner suggestions (dedupe key)
const MINER_FAILURE_TYPE = 'recurring_pattern';

const MINER_SYSTEM_PROMPT = `You are a voice AI quality analyst for Boltcall, a speed-to-lead platform.
You are given transcripts of calls the QA scorer flagged weak, plus the QA notes for the weak areas of each call.
Cluster the recurring failures (objections the agent fumbled, missed bookings, missing disclosures, incomplete intake, advice it must not give, made-up facts) and propose ONE prompt patch per cluster.

Return ONLY valid JSON (no markdown):
[
  {
    "objection_pattern": "short label of the recurring failure, e.g. 'price too high' or 'no recording disclosure'",
    "frequency": <number of calls in this cluster>,
    "example_quote": "verbatim caller quote from a transcript",
    "proposed_prompt_patch": "exact text to ADD to the agent prompt: a section header + 2-4 verbatim response scripts the agent should use when this objection comes up",
    "before_summary": "one sentence, plain language: what the agent does today in this situation (under 200 chars)",
    "after_summary": "one sentence, plain language: what the agent would do after the patch (under 200 chars)"
  }
]

Rules:
- Only include clusters with frequency >= ${MIN_CLUSTER_FREQUENCY}.
- Sort by frequency descending.
- Patches must be additive (text to append), never rewrite the whole prompt.
- Scripts must be speakable — short sentences, no markdown inside the scripts.
- Write summaries in plain language with no dashes as punctuation.
- If no recurring failure exists, return [].`;

interface ObjectionCluster {
  objection_pattern: string;
  frequency: number;
  example_quote: string;
  proposed_prompt_patch: string;
  before_summary?: string;
  after_summary?: string;
}

interface WeakCall {
  call_id: string;
  workspace_id: string;
  agent_id: string | null;
  retell_agent_id: string;
  vertical: string | null;
  transcript: string | null;
  weak_notes?: string;
}

function mostCommon<T>(values: (T | null)[]): T | null {
  const counts = new Map<T, number>();
  for (const v of values) {
    if (v == null) continue;
    counts.set(v, (counts.get(v) || 0) + 1);
  }
  let best: T | null = null;
  let bestN = 0;
  for (const [v, n] of counts) {
    if (n > bestN) { best = v; bestN = n; }
  }
  return best;
}

async function mineWorkspace(calls: WeakCall[]): Promise<ObjectionCluster[]> {
  const sample = calls.slice(0, MAX_CALLS_PER_WORKSPACE);
  const userPrompt = sample
    .map((c, i) =>
      `## Call ${i + 1}\nQA notes on weak areas:\n${c.weak_notes || 'n/a'}\nTranscript:\n${(c.transcript || '').slice(0, MAX_TRANSCRIPT_CHARS)}`
    )
    .join('\n\n');

  const response = await chatCompletion(MINER_SYSTEM_PROMPT, userPrompt, { tier: 'heavy', maxTokens: 1500 });
  const jsonMatch = response.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];
  try {
    const parsed = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (c: any) =>
        c &&
        typeof c.objection_pattern === 'string' &&
        typeof c.proposed_prompt_patch === 'string' &&
        Number(c.frequency) >= MIN_CLUSTER_FREQUENCY
    );
  } catch {
    return [];
  }
}

function buildDigestHtml(args: { businessName: string; lostCount: number; pattern: string; quote: string; approvalsUrl: string }): string {
  const approvalsUrl = args.approvalsUrl;
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f9fafb;color:#111827;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:32px 16px;">
    <tr><td align="center">
      <table width="540" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
        <tr><td style="background:#1d4ed8;padding:24px 32px;">
          <p style="margin:0;font-size:18px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">Boltcall</p>
        </td></tr>
        <tr><td style="padding:32px;">
          <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;">Your agent hit the same problem ${args.lostCount} times this week</h1>
          <p style="margin:0 0 16px;font-size:15px;color:#6b7280;">At ${args.businessName}, the same issue kept coming up on calls: <strong>${args.pattern}</strong>. One caller said:</p>
          <p style="margin:0 0 24px;font-size:14px;color:#374151;background:#eff6ff;border-left:3px solid #1d4ed8;padding:12px 16px;border-radius:0 6px 6px 0;">"${args.quote}"</p>
          <p style="margin:0 0 24px;font-size:15px;color:#374151;">We drafted a fix for your agent's script. It's waiting for your one-tap approval, and nothing changes until you approve it.</p>
          <a href="${approvalsUrl}" style="display:inline-block;background:#1d4ed8;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:15px;">
            Review the fix
          </a>
        </td></tr>
        <tr><td style="padding:16px 32px;border-top:1px solid #e5e7eb;">
          <p style="margin:0;font-size:12px;color:#9ca3af;">You're getting this because you have an active Boltcall account. © 2026 Boltcall</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

async function sendBrevoEmail(to: string, subject: string, htmlContent: string): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) throw new Error('BREVO_API_KEY not configured');
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': apiKey, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      sender: {
        name: process.env.BREVO_FROM_NAME || 'Boltcall',
        email: process.env.BREVO_FROM_EMAIL || 'noamj@boltcall.org',
      },
      to: [{ email: to }],
      subject,
      htmlContent,
    }),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(`Brevo error ${response.status}: ${(data as any).message || 'unknown'}`);
  }
}

const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST' && event.httpMethod !== 'GET') {
    return { statusCode: 405, headers: HEADERS, body: JSON.stringify({ error: 'Method not allowed' }) };
  }
  const authz = await authorizeRunner(event);
  if (!authz.ok) {
    return { statusCode: authz.status, headers: HEADERS, body: JSON.stringify({ error: authz.message }) };
  }

  let dry_run = false;
  let only_workspace: string | null = null;
  try {
    if (event.body) {
      const body = JSON.parse(event.body);
      dry_run = body.dry_run === true;
      only_workspace = typeof body.workspace_id === 'string' ? body.workspace_id : null;
    }
  } catch { /* ignore */ }

  const supabase = getServiceSupabase();
  const since = new Date(Date.now() - 7 * 86400000).toISOString();

  // 1. Scored calls in the window
  let callsQuery = supabase
    .from('retell_calls')
    .select('call_id, workspace_id, agent_id, retell_agent_id, vertical, transcript')
    .gte('started_at', since)
    .not('workspace_id', 'is', null)
    .not('transcript', 'is', null)
    .limit(500);
  if (only_workspace) callsQuery = callsQuery.eq('workspace_id', only_workspace);

  const { data: recentCalls, error: callsErr } = await callsQuery;
  if (callsErr) {
    console.error('[objection-miner] calls query failed:', callsErr);
    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ error: 'DB query failed' }) };
  }
  if (!recentCalls?.length) {
    return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: true, mined: 0, message: 'No calls in window' }) };
  }

  // 2. Join weak quality scores: a call is weak if any quality dim is low
  const callIds = recentCalls.map(c => c.call_id);
  const { data: scores } = await supabase
    .from('retell_call_scores')
    .select('call_id, dim, notes')
    .lt('score', MAX_WEAK_SCORE)
    .not('dim', 'in', NON_QUALITY_DIMS)
    .in('call_id', callIds);

  const notesByCall = new Map<string, string[]>();
  for (const s of scores || []) {
    const list = notesByCall.get(s.call_id) || [];
    list.push(`${s.dim}: ${s.notes || 'low score'}`);
    notesByCall.set(s.call_id, list);
  }

  // A prompt patch targets one agent, so group per Retell agent
  const byAgent = new Map<string, WeakCall[]>();
  for (const call of recentCalls) {
    const notes = notesByCall.get(call.call_id);
    if (!notes || !call.retell_agent_id) continue;
    const list = byAgent.get(call.retell_agent_id) || [];
    list.push({ ...call, weak_notes: notes.join('\n') });
    byAgent.set(call.retell_agent_id, list);
  }

  // retell_calls.workspace_id is a workspaces.id; the owner is workspaces.user_id
  const workspaceIds = [...new Set([...byAgent.values()].map(calls => calls[0].workspace_id))];
  const { data: workspaces } = workspaceIds.length
    ? await supabase.from('workspaces').select('id, user_id').in('id', workspaceIds)
    : { data: [] as { id: string; user_id: string }[] };
  const ownerByWorkspace = new Map((workspaces || []).map(w => [w.id, w.user_id as string]));

  const results: any[] = [];

  for (const [retellAgentId, calls] of byAgent) {
    const workspaceId = calls[0].workspace_id;
    const ownerId = ownerByWorkspace.get(workspaceId);
    const ref = { workspace_id: workspaceId, retell_agent_id: retellAgentId };
    if (calls.length < MIN_WEAK_CALLS) {
      results.push({ ...ref, skipped: 'below_min_weak_calls', weak_calls: calls.length });
      continue;
    }
    if (!ownerId) {
      results.push({ ...ref, skipped: 'no_workspace_owner' });
      continue;
    }

    // 3. Agency clients keep their approval queue; everyone else uses /dashboard/qa/review
    const { data: client } = await supabase
      .from('agency_clients')
      .select('id')
      .eq('user_id', ownerId)
      .not('status', 'in', '("churned","paused")')
      .limit(1)
      .maybeSingle();

    // 4. No queue spam: skip if a suggestion is already waiting
    const { data: pending } = client
      ? await supabase
        .from('agency_artifacts')
        .select('id')
        .eq('client_id', client.id)
        .eq('type', 'prompt_revision')
        .in('status', ['draft', 'deferred', 'approved'])
        .limit(1)
      : await supabase
        .from('agent_self_heal_log')
        .select('id')
        .eq('user_id', ownerId)
        .eq('agent_id', retellAgentId)
        .eq('failure_type', MINER_FAILURE_TYPE)
        .eq('status', 'pending_approval')
        .limit(1);
    if (pending?.length) {
      results.push({ ...ref, skipped: client ? 'pending_revision_exists' : 'pending_suggestion_exists' });
      continue;
    }

    // 5. Cluster failures with the LLM
    let clusters: ObjectionCluster[];
    try {
      clusters = await mineWorkspace(calls);
    } catch (err) {
      console.error(`[objection-miner] LLM failed for agent ${retellAgentId}:`, err);
      results.push({ ...ref, skipped: 'llm_failed' });
      continue;
    }
    if (!clusters.length) {
      results.push({ ...ref, skipped: 'no_recurring_failure', weak_calls: calls.length });
      continue;
    }

    const top = clusters[0];
    const agentRowId = mostCommon(calls.map(c => c.agent_id));
    const vertical = mostCommon(calls.map(c => c.vertical)) || 'other';
    const why = `${top.frequency} callers this week: "${top.example_quote}"`;

    if (dry_run) {
      results.push({ ...ref, dry_run: true, agency: !!client, clusters, agent_row_id: agentRowId, vertical });
      continue;
    }

    // 6. File the suggestion(s)
    const filedIds: string[] = [];
    if (client) {
      // One proposal per client per week, top cluster only
      const clientDiff = {
        before: top.before_summary || 'Your agent has no scripted answer for this today.',
        after: top.after_summary || `Your agent gets a scripted answer for: ${top.objection_pattern}`,
        why,
      };
      const { data: artifact, error: insErr } = await supabase
        .from('agency_artifacts')
        .insert({
          client_id: client.id,
          type: 'prompt_revision',
          status: 'draft',
          generated_by: 'objection-miner',
          content: {
            source: 'objection-miner',
            client_review_required: true,
            objection_pattern: top.objection_pattern,
            frequency: top.frequency,
            example_quote: top.example_quote,
            prompt_patch: top.proposed_prompt_patch,
            agent_row_id: agentRowId,
            vertical,
            lost_calls_analyzed: calls.length,
            before: clientDiff.before,
            after: clientDiff.after,
            why,
            client_diff: clientDiff,
          },
          predicted_impact: { metric: 'book_rate', direction: 'up' },
          confidence: Math.min(0.9, 0.4 + top.frequency * 0.1),
        })
        .select('id')
        .single();
      if (insErr) {
        console.error(`[objection-miner] artifact insert failed for agent ${retellAgentId}:`, insErr);
        results.push({ ...ref, skipped: 'insert_failed', detail: insErr.message });
        continue;
      }
      filedIds.push(artifact.id);
    } else {
      // Same place self-heal fixes wait: heal log row (holds the patch) + qa_reviews item
      for (const c of clusters.slice(0, MAX_SUGGESTIONS_PER_AGENT)) {
        const { data: heal, error: healErr } = await supabase
          .from('agent_self_heal_log')
          .insert({
            agent_id: retellAgentId,
            user_id: ownerId,
            failure_type: MINER_FAILURE_TYPE,
            failure_summary: `${c.objection_pattern} (${c.frequency} calls this week)`,
            root_cause: c.before_summary || null,
            severity: 'medium',
            prompt_fix_applied: c.proposed_prompt_patch,
            fix_verified: false,
            fix_total_runs: 0,
            status: 'pending_approval',
          })
          .select('id')
          .single();
        if (healErr || !heal) {
          console.error(`[objection-miner] suggestion insert failed for agent ${retellAgentId}:`, healErr);
          continue;
        }
        const { data: review, error: reviewErr } = await supabase
          .from('qa_reviews')
          .insert({
            user_id: ownerId,
            agent_id: retellAgentId,
            heal_log_id: heal.id,
            call_type: 'failure',
            status: 'pending',
            auto_summary: `Recurring issue on ${c.frequency} calls this week: ${c.objection_pattern}. One caller said: "${c.example_quote}". ${c.after_summary || 'Suggested fix is ready for your approval.'}`,
          })
          .select('id')
          .single();
        if (reviewErr || !review) {
          console.error(`[objection-miner] qa_reviews insert failed for agent ${retellAgentId}:`, reviewErr);
          continue;
        }
        filedIds.push(review.id);
      }
      if (!filedIds.length) {
        results.push({ ...ref, skipped: 'insert_failed' });
        continue;
      }
    }

    // 7. Weekly digest email to the owner (best-effort)
    let emailed = false;
    try {
      const { data: userResult } = await supabase.auth.admin.getUserById(ownerId);
      const email = userResult?.user?.email;
      if (email) {
        const { data: profile } = await supabase
          .from('business_profiles')
          .select('business_name')
          .eq('user_id', ownerId)
          .limit(1)
          .maybeSingle();
        await sendBrevoEmail(
          email,
          `Your agent hit "${top.objection_pattern}" ${top.frequency}x this week: ${filedIds.length} fix${filedIds.length > 1 ? 'es' : ''} awaiting your approval`,
          buildDigestHtml({
            businessName: profile?.business_name || 'your business',
            lostCount: top.frequency,
            pattern: top.objection_pattern,
            quote: top.example_quote,
            approvalsUrl: client
              ? 'https://boltcall.org/dashboard/client/approvals'
              : 'https://boltcall.org/dashboard/qa/review',
          })
        );
        emailed = true;
      }
    } catch (err) {
      console.warn(`[objection-miner] digest email failed for agent ${retellAgentId}:`, err);
    }

    // 8. Emit event (best-effort)
    const { error: evErr } = await supabase.from('aios_event_log').insert({
      event_type: 'objection_fix_proposed',
      channel: 'voice',
      subject_id: filedIds[0],
      sentiment: 'neutral',
      payload: {
        workspace_id: workspaceId,
        retell_agent_id: retellAgentId,
        client_id: client?.id || null,
        objection_pattern: top.objection_pattern,
        frequency: top.frequency,
        weak_calls_analyzed: calls.length,
        suggestions: filedIds.length,
      },
      ts: new Date().toISOString(),
    });
    if (evErr) console.error('[objection-miner] aios_event_log write failed:', evErr);

    console.log(`[objection-miner] Proposed ${filedIds.length} fix(es) for agent ${retellAgentId} | pattern="${top.objection_pattern}" freq=${top.frequency} agency=${!!client} emailed=${emailed}`);
    results.push({ ...ref, ...(client ? { artifact_id: filedIds[0] } : { review_ids: filedIds }), pattern: top.objection_pattern, frequency: top.frequency, emailed });
  }

  const mined = results.filter(r => r.artifact_id || r.review_ids || r.dry_run).length;
  return {
    statusCode: 200,
    headers: HEADERS,
    body: JSON.stringify({ ok: true, mined, agents_scanned: byAgent.size, results }),
  };
};

export const testHandler = handler;
export default withLegacyHandler(handler);
