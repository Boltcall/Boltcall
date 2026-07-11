import { Handler } from '@netlify/functions';
import { getSupabase } from './_shared/token-utils';
import { chatCompletion } from './_shared/azure-ai';
import { authorizeRunner } from './_shared/agency-runner-auth';
import { withLegacyHandler } from './_shared/runtime-compat';

/**
 * objection-miner — weekly objection-mining loop (batch-2 task 10).
 *
 * Scheduled Mondays 08:00 UTC. For each workspace with enough lost calls in
 * the last 7 days, clusters the objections that killed those calls (using the
 * per-call objection_handling notes already produced by retell-call-scorer),
 * and files ONE prompt_revision artifact into the client approval queue
 * (agency_artifacts → ClientApprovalsPage). On client approve,
 * agency-client-approvals wires it into retell_prompt_versions → shadow
 * rollout → auto-promote/revert. Zero new UI.
 *
 * POST { dry_run?: boolean, workspace_id?: string } — manual trigger.
 */

const HEADERS = { 'Content-Type': 'application/json' };

// Lost-call outcomes (taxonomy from retell-call-scorer inferOutcome)
const LOST_OUTCOMES = ['no_outcome', 'hung_up'];
// Minimum lost calls in the window before a workspace is mined
const MIN_LOST_CALLS = 3;
// Minimum occurrences of an objection pattern to propose a fix
const MIN_CLUSTER_FREQUENCY = 2;
// Only consider calls the scorer flagged weak on objection handling
const MAX_OBJECTION_SCORE = 0.6;
// Caps to keep the LLM prompt bounded
const MAX_CALLS_PER_WORKSPACE = 10;
const MAX_TRANSCRIPT_CHARS = 800;

const MINER_SYSTEM_PROMPT = `You are a voice AI conversion analyst for Boltcall, a speed-to-lead platform.
You are given transcripts of LOST calls (caller did not book) plus a QA note per call about how the agent handled objections.
Cluster the recurring objections and propose ONE prompt patch per cluster.

Return ONLY valid JSON (no markdown):
[
  {
    "objection_pattern": "short label, e.g. 'price too high'",
    "frequency": <number of calls in this cluster>,
    "example_quote": "verbatim caller quote from a transcript",
    "proposed_prompt_patch": "exact text to ADD to the agent prompt: a section header + 2-4 verbatim response scripts the agent should use when this objection comes up",
    "before_summary": "one sentence, plain language: what the agent says today when hit with this objection (under 200 chars)",
    "after_summary": "one sentence, plain language: what the agent would say after the patch (under 200 chars)"
  }
]

Rules:
- Only include clusters with frequency >= ${MIN_CLUSTER_FREQUENCY}.
- Sort by frequency descending.
- Patches must be additive (text to append), never rewrite the whole prompt.
- Scripts must be speakable — short sentences, no markdown inside the scripts.
- If no recurring objection exists, return [].`;

interface ObjectionCluster {
  objection_pattern: string;
  frequency: number;
  example_quote: string;
  proposed_prompt_patch: string;
  before_summary?: string;
  after_summary?: string;
}

interface LostCall {
  call_id: string;
  workspace_id: string;
  agent_id: string | null;
  vertical: string | null;
  transcript: string | null;
  objection_notes?: string;
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

async function mineWorkspace(calls: LostCall[]): Promise<ObjectionCluster[]> {
  const sample = calls.slice(0, MAX_CALLS_PER_WORKSPACE);
  const userPrompt = sample
    .map((c, i) =>
      `## Call ${i + 1}\nQA note on objection handling: ${c.objection_notes || 'n/a'}\nTranscript:\n${(c.transcript || '').slice(0, MAX_TRANSCRIPT_CHARS)}`
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

function buildDigestHtml(args: { businessName: string; lostCount: number; pattern: string; quote: string }): string {
  const approvalsUrl = 'https://boltcall.org/dashboard/client/approvals';
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
          <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;">Your agent hit the same objection ${args.lostCount} times this week</h1>
          <p style="margin:0 0 16px;font-size:15px;color:#6b7280;">At ${args.businessName}, callers kept pushing back on <strong>${args.pattern}</strong> and didn't book. One of them said:</p>
          <p style="margin:0 0 24px;font-size:14px;color:#374151;background:#eff6ff;border-left:3px solid #1d4ed8;padding:12px 16px;border-radius:0 6px 6px 0;">"${args.quote}"</p>
          <p style="margin:0 0 24px;font-size:15px;color:#374151;">We drafted a fix for your agent's script. It's waiting for your one-tap approval — once approved, it rolls out with an automatic safety net (we revert it if bookings drop).</p>
          <a href="${approvalsUrl}" style="display:inline-block;background:#1d4ed8;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:15px;">
            Review the fix →
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
        email: process.env.BREVO_FROM_EMAIL || 'noreply@boltcall.org',
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

  const supabase = getSupabase();
  const since = new Date(Date.now() - 7 * 86400000).toISOString();

  // 1. Lost calls in the window
  let callsQuery = supabase
    .from('retell_calls')
    .select('call_id, workspace_id, agent_id, vertical, transcript')
    .in('outcome', LOST_OUTCOMES)
    .gte('started_at', since)
    .not('workspace_id', 'is', null)
    .not('transcript', 'is', null)
    .limit(500);
  if (only_workspace) callsQuery = callsQuery.eq('workspace_id', only_workspace);

  const { data: lostCalls, error: callsErr } = await callsQuery;
  if (callsErr) {
    console.error('[objection-miner] lost-calls query failed:', callsErr);
    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ error: 'DB query failed' }) };
  }
  if (!lostCalls?.length) {
    return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: true, mined: 0, message: 'No lost calls in window' }) };
  }

  // 2. Join objection_handling scores — keep only calls flagged weak
  const callIds = lostCalls.map(c => c.call_id);
  const { data: scores } = await supabase
    .from('retell_call_scores')
    .select('call_id, score, notes')
    .eq('dim', 'objection_handling')
    .lt('score', MAX_OBJECTION_SCORE)
    .in('call_id', callIds);

  const notesByCall = new Map<string, string>();
  for (const s of scores || []) notesByCall.set(s.call_id, s.notes || '');

  const byWorkspace = new Map<string, LostCall[]>();
  for (const call of lostCalls) {
    if (!notesByCall.has(call.call_id)) continue;
    const c: LostCall = { ...call, objection_notes: notesByCall.get(call.call_id) };
    const list = byWorkspace.get(call.workspace_id) || [];
    list.push(c);
    byWorkspace.set(call.workspace_id, list);
  }

  const results: any[] = [];

  for (const [workspaceId, calls] of byWorkspace) {
    if (calls.length < MIN_LOST_CALLS) {
      results.push({ workspace_id: workspaceId, skipped: 'below_min_lost_calls', lost_calls: calls.length });
      continue;
    }

    // 3. Need an agency_clients row — the approval queue is client-scoped
    const { data: client } = await supabase
      .from('agency_clients')
      .select('id')
      .eq('user_id', workspaceId)
      .not('status', 'in', '("churned","paused")')
      .limit(1)
      .maybeSingle();
    if (!client) {
      results.push({ workspace_id: workspaceId, skipped: 'no_agency_client_row' });
      continue;
    }

    // 4. No queue spam — skip if a prompt_revision is already pending
    const { data: pending } = await supabase
      .from('agency_artifacts')
      .select('id')
      .eq('client_id', client.id)
      .eq('type', 'prompt_revision')
      .in('status', ['draft', 'deferred', 'approved'])
      .limit(1);
    if (pending?.length) {
      results.push({ workspace_id: workspaceId, skipped: 'pending_revision_exists' });
      continue;
    }

    // 5. Cluster objections with the LLM
    let clusters: ObjectionCluster[];
    try {
      clusters = await mineWorkspace(calls);
    } catch (err) {
      console.error(`[objection-miner] LLM failed for workspace ${workspaceId}:`, err);
      results.push({ workspace_id: workspaceId, skipped: 'llm_failed' });
      continue;
    }
    if (!clusters.length) {
      results.push({ workspace_id: workspaceId, skipped: 'no_recurring_objection', lost_calls: calls.length });
      continue;
    }

    // One proposal per workspace per week — top cluster only.
    const top = clusters[0];
    const agentRowId = mostCommon(calls.map(c => c.agent_id));
    const vertical = mostCommon(calls.map(c => c.vertical)) || 'other';
    const why = `${top.frequency} callers this week objected: "${top.example_quote}"`;

    if (dry_run) {
      results.push({ workspace_id: workspaceId, dry_run: true, cluster: top, agent_row_id: agentRowId, vertical });
      continue;
    }

    // 6. File the proposal into the client approval queue
    const clientDiff = {
      before: top.before_summary || 'Your agent has no scripted answer for this objection today.',
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
      console.error(`[objection-miner] artifact insert failed for workspace ${workspaceId}:`, insErr);
      results.push({ workspace_id: workspaceId, skipped: 'insert_failed', detail: insErr.message });
      continue;
    }

    // 7. Weekly digest email to the owner (best-effort)
    let emailed = false;
    try {
      const { data: userResult } = await supabase.auth.admin.getUserById(workspaceId);
      const email = userResult?.user?.email;
      if (email) {
        const { data: profile } = await supabase
          .from('business_profiles')
          .select('business_name')
          .eq('user_id', workspaceId)
          .maybeSingle();
        await sendBrevoEmail(
          email,
          `Your agent hit "${top.objection_pattern}" ${top.frequency}x this week — 1 fix awaiting your approval`,
          buildDigestHtml({
            businessName: profile?.business_name || 'your business',
            lostCount: top.frequency,
            pattern: top.objection_pattern,
            quote: top.example_quote,
          })
        );
        emailed = true;
      }
    } catch (err) {
      console.warn(`[objection-miner] digest email failed for workspace ${workspaceId}:`, err);
    }

    // 8. Emit event (best-effort)
    supabase.from('aios_event_log').insert({
      event_type: 'objection_fix_proposed',
      channel: 'voice',
      subject_id: artifact.id,
      sentiment: 'neutral',
      payload: {
        workspace_id: workspaceId,
        client_id: client.id,
        objection_pattern: top.objection_pattern,
        frequency: top.frequency,
        lost_calls_analyzed: calls.length,
      },
      ts: new Date().toISOString(),
    }).then(({ error }) => {
      if (error) console.error('[objection-miner] aios_event_log write failed:', error);
    });

    console.log(`[objection-miner] Proposed fix for workspace ${workspaceId} | pattern="${top.objection_pattern}" freq=${top.frequency} artifact=${artifact.id} emailed=${emailed}`);
    results.push({ workspace_id: workspaceId, artifact_id: artifact.id, pattern: top.objection_pattern, frequency: top.frequency, emailed });
  }

  const mined = results.filter(r => r.artifact_id || r.dry_run).length;
  return {
    statusCode: 200,
    headers: HEADERS,
    body: JSON.stringify({ ok: true, mined, workspaces_scanned: byWorkspace.size, results }),
  };
};

export const testHandler = handler;
export default withLegacyHandler(handler);
