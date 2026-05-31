/**
 * agency-client-approvals — GET (list) + POST (action). Client-authenticated.
 *
 * GET  — return pending artifacts that need *the client's* approval, with a
 *        plain-language diff already rendered server-side. Sorted by urgency
 *        (irreversible first, oldest second). One JSON round-trip drives the
 *        whole page.
 *
 * POST — { artifact_id, action: 'approve'|'reject'|'defer', reason? }.
 *        Mirrors agency-queue-action but client-scoped. Only acts on artifacts
 *        the calling client owns AND that are tagged for client review.
 *
 * "Client review" gate:
 *   Founder approval is the default; client-side approval is opt-in per
 *   artifact via `content.client_review_required === true`. The agent that
 *   generates the artifact decides this (e.g. ad-creative swaps where the
 *   client opted into review, KB additions referencing their brand voice,
 *   adopted cohort experiments). The founder queue still sees these — it
 *   just yields the decision to the client. Approval here moves the artifact
 *   from 'draft' → 'approved'; the founder side then ships.
 *
 * Plain-language diff:
 *   For prompt_revision / knowledge_base we render
 *     "Before: agent says X. After: agent says Y. Why: Z."
 *   using Azure OpenAI (light tier) with a tightly-scoped prompt. Cached
 *   per-artifact in content.client_diff so we don't re-call the model on
 *   every GET. NEVER raw prompt JSON.
 *
 * Auth: Bearer JWT → resolved to a single client_id. Defence-in-depth:
 *   every read/write is scoped by client_id even though RLS already does it.
 */

import type { Handler } from '@netlify/functions';
import { getServiceSupabase } from './_shared/token-utils';
import { chatCompletion, isAzureConfigured } from './_shared/azure-ai';

const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const REVERSIBLE_TYPES = new Set([
  'agent_prompt',
  'ad_creative',
  'ad_copy',
  'knowledge_base',
  'prompt_revision',
  'optimization_brief',
  'experiment_plan',
]);

const ALLOWED_ACTIONS = new Set(['approve', 'reject', 'defer']);
const MAX_REASON_LEN = 500;

interface PendingArtifact {
  id: string;
  type: string;
  generated_by: string;
  created_at: string;
  reversible: boolean;
  hours_old: number;
  defer_count: number;
  // Pre-rendered, client-friendly explanation.
  client_diff: {
    before: string;
    after: string;
    why: string;
  };
  // Risk level governs the auto-approve-after-72h behaviour.
  risk_level: 'low' | 'medium' | 'high';
  predicted_impact: { metric?: string; value?: number } | null;
  shipping_deadline: string | null;
}

async function resolveClient(
  authHeader: string | undefined,
): Promise<{ user_id: string; client_id: string; auto_approve_low_risk: boolean } | null> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.substring(7);
  const supabase = getServiceSupabase();
  const { data: userResult, error } = await supabase.auth.getUser(token);
  if (error || !userResult?.user) return null;
  const user_id = userResult.user.id;

  const { data: rows } = await supabase
    .from('agency_clients')
    .select('id, auto_approve_low_risk')
    .eq('user_id', user_id)
    .not('status', 'in', '("churned","paused")')
    .order('signed_up_at', { ascending: true })
    .limit(1);
  const client = rows?.[0];
  if (!client) return null;
  return {
    user_id,
    client_id: client.id as string,
    auto_approve_low_risk: !!client.auto_approve_low_risk,
  };
}

function isClientReviewable(content: Record<string, unknown>): boolean {
  return (
    content.client_review_required === true ||
    content.visibility === 'client_review'
  );
}

function inferRiskLevel(
  type: string,
  content: Record<string, unknown>,
): 'low' | 'medium' | 'high' {
  // Explicit caller-set risk wins.
  const explicit = content.risk_level;
  if (explicit === 'low' || explicit === 'medium' || explicit === 'high') {
    return explicit;
  }
  // Heuristic: KB additions + ad-copy tweaks are low; prompt revisions
  // touching booking/payment logic are high; everything else medium.
  if (type === 'knowledge_base' || type === 'ad_copy') return 'low';
  if (
    type === 'prompt_revision' &&
    typeof content.touches === 'string' &&
    /booking|payment|insurance|emergency/i.test(content.touches as string)
  ) {
    return 'high';
  }
  return 'medium';
}

/**
 * Render a plain-language diff. If Azure isn't configured we fall back to a
 * deterministic template so the page never blanks out — the founder will see
 * the unrendered diff in the parallel founder queue.
 */
async function renderPlainLanguageDiff(args: {
  artifact_id: string;
  type: string;
  content: Record<string, unknown>;
}): Promise<{ before: string; after: string; why: string }> {
  // Cached?
  const cached = args.content.client_diff as
    | { before?: string; after?: string; why?: string }
    | undefined;
  if (
    cached &&
    typeof cached.before === 'string' &&
    typeof cached.after === 'string' &&
    typeof cached.why === 'string'
  ) {
    return {
      before: cached.before,
      after: cached.after,
      why: cached.why,
    };
  }

  // Best-effort prompt for the LLM. Schema-light so we don't have to wire a
  // structured-output dance — just three short strings.
  const fallback = {
    before:
      typeof args.content.before === 'string'
        ? (args.content.before as string)
        : 'Current behaviour unchanged.',
    after:
      typeof args.content.after === 'string'
        ? (args.content.after as string)
        : typeof args.content.summary === 'string'
        ? (args.content.summary as string)
        : 'Proposed change to your agent.',
    why:
      typeof args.content.why === 'string'
        ? (args.content.why as string)
        : typeof args.content.rationale === 'string'
        ? (args.content.rationale as string)
        : 'Drafted by your strategist team.',
  };

  if (!isAzureConfigured()) return fallback;

  try {
    const promptInput = JSON.stringify(args.content).slice(0, 8_000);
    const systemPrompt =
      'You are a Boltcall strategist explaining one proposed change to a small-business owner. Never reference prompts, JSON, or technical details. Return STRICT JSON: {"before": string, "after": string, "why": string}. Each string under 240 characters. "before" = what the AI agent says today. "after" = what it would say if approved. "why" = one short sentence on the trigger (e.g. "4 callers asked about Z").';
    const userPrompt = `Artifact type: ${args.type}\nContent: ${promptInput}`;
    const completion = await chatCompletion(systemPrompt, userPrompt, {
      tier: 'light',
      maxTokens: 400,
    });
    const text = (completion ?? '').trim();
    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}');
    if (jsonStart === -1 || jsonEnd === -1) return fallback;
    const parsed = JSON.parse(text.slice(jsonStart, jsonEnd + 1));
    if (
      typeof parsed.before === 'string' &&
      typeof parsed.after === 'string' &&
      typeof parsed.why === 'string'
    ) {
      return {
        before: parsed.before.slice(0, 240),
        after: parsed.after.slice(0, 240),
        why: parsed.why.slice(0, 240),
      };
    }
    return fallback;
  } catch (err) {
    console.warn(
      '[agency-client-approvals] LLM diff render failed, using template',
      err,
    );
    return fallback;
  }
}

async function persistDiffCache(
  client_id: string,
  artifact_id: string,
  diff: { before: string; after: string; why: string },
  currentContent: Record<string, unknown>,
): Promise<void> {
  const supabase = getServiceSupabase();
  await supabase
    .from('agency_artifacts')
    .update({
      content: { ...currentContent, client_diff: diff },
    })
    .eq('id', artifact_id)
    .eq('client_id', client_id);
}

// ───────────────────────── GET ─────────────────────────

async function handleList(
  authHeader: string | undefined,
): Promise<{ statusCode: number; body: string }> {
  const me = await resolveClient(authHeader);
  if (!me) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Authentication required' }),
    };
  }

  const supabase = getServiceSupabase();
  const { data: artifacts, error } = await supabase
    .from('agency_artifacts')
    .select(
      'id, type, status, content, generated_by, created_at, predicted_impact, ship_window_ends_at',
    )
    .eq('client_id', me.client_id)
    .in('status', ['draft', 'deferred'])
    .order('created_at', { ascending: true })
    .limit(50);
  if (error) {
    console.error('[agency-client-approvals] list query failed', error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Query failed' }),
    };
  }

  const now = Date.now();
  const pending: PendingArtifact[] = [];

  for (const a of artifacts ?? []) {
    const content = (a.content ?? {}) as Record<string, unknown>;
    if (!isClientReviewable(content)) continue;

    const hours_old = Math.max(
      0,
      (now - Date.parse(a.created_at as string)) / 3_600_000,
    );
    const defer_count =
      typeof content.defer_count === 'number'
        ? (content.defer_count as number)
        : 0;

    const diff = await renderPlainLanguageDiff({
      artifact_id: a.id as string,
      type: a.type as string,
      content,
    });

    // Persist the cache so next GET is free. Fire-and-forget.
    if (!content.client_diff) {
      persistDiffCache(me.client_id, a.id as string, diff, content).catch(
        (err) =>
          console.warn(
            '[agency-client-approvals] diff cache persist failed',
            err,
          ),
      );
    }

    const reversible = REVERSIBLE_TYPES.has(a.type as string);
    const risk_level = inferRiskLevel(a.type as string, content);
    const pi = (a.predicted_impact ?? null) as
      | { metric?: string; value?: number; prediction?: number }
      | null;

    pending.push({
      id: a.id as string,
      type: a.type as string,
      generated_by: (a.generated_by as string) ?? 'agent',
      created_at: a.created_at as string,
      reversible,
      hours_old,
      defer_count,
      client_diff: diff,
      risk_level,
      predicted_impact: pi
        ? { metric: pi.metric, value: pi.value ?? pi.prediction }
        : null,
      shipping_deadline: (a.ship_window_ends_at as string | null) ?? null,
    });
  }

  // Sort: irreversible first; then oldest; then high-risk before low-risk.
  pending.sort((a, b) => {
    if (a.reversible !== b.reversible) return a.reversible ? 1 : -1;
    const riskOrder = { high: 0, medium: 1, low: 2 } as const;
    if (a.risk_level !== b.risk_level) {
      return riskOrder[a.risk_level] - riskOrder[b.risk_level];
    }
    return b.hours_old - a.hours_old;
  });

  return {
    statusCode: 200,
    body: JSON.stringify({
      artifacts: pending,
      auto_approve_low_risk: me.auto_approve_low_risk,
      counts: {
        pending: pending.length,
        high_risk: pending.filter((p) => p.risk_level === 'high').length,
        irreversible: pending.filter((p) => !p.reversible).length,
      },
    }),
  };
}

// ───────────────────────── POST ─────────────────────────

async function handleAction(
  authHeader: string | undefined,
  rawBody: string,
): Promise<{ statusCode: number; body: string }> {
  const me = await resolveClient(authHeader);
  if (!me) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Authentication required' }),
    };
  }

  let parsed: { artifact_id?: unknown; action?: unknown; reason?: unknown };
  try {
    parsed = JSON.parse(rawBody || '{}');
  } catch {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid JSON body' }),
    };
  }
  const artifact_id =
    typeof parsed.artifact_id === 'string' ? parsed.artifact_id : '';
  const action = typeof parsed.action === 'string' ? parsed.action : '';
  if (!UUID_RE.test(artifact_id)) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'artifact_id must be a uuid' }),
    };
  }
  if (!ALLOWED_ACTIONS.has(action)) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: `action must be one of ${[...ALLOWED_ACTIONS].join(', ')}`,
      }),
    };
  }
  const reason =
    typeof parsed.reason === 'string'
      ? parsed.reason.slice(0, MAX_REASON_LEN)
      : null;

  const supabase = getServiceSupabase();

  // Defence in depth — re-read the artifact constrained by client_id.
  const { data: art, error: readErr } = await supabase
    .from('agency_artifacts')
    .select('id, client_id, type, status, content')
    .eq('id', artifact_id)
    .eq('client_id', me.client_id)
    .maybeSingle();

  if (readErr || !art) {
    return {
      statusCode: 404,
      body: JSON.stringify({ error: 'Artifact not found' }),
    };
  }
  if (art.status !== 'draft' && art.status !== 'deferred') {
    return {
      statusCode: 409,
      body: JSON.stringify({
        error: `Artifact is already ${art.status}; cannot act on it`,
      }),
    };
  }
  const content = (art.content ?? {}) as Record<string, unknown>;
  if (!isClientReviewable(content)) {
    return {
      statusCode: 403,
      body: JSON.stringify({
        error: 'This artifact is not marked for client review',
      }),
    };
  }

  const reviewed_at = new Date().toISOString();
  let nextStatus: 'approved' | 'rejected' | 'deferred';
  let updatedContent: Record<string, unknown> = content;

  if (action === 'approve') {
    nextStatus = 'approved';
    updatedContent = {
      ...content,
      client_decision: {
        action: 'approve',
        actor: 'client',
        at: reviewed_at,
        reason,
      },
    };
  } else if (action === 'reject') {
    nextStatus = 'rejected';
    updatedContent = {
      ...content,
      client_decision: {
        action: 'reject',
        actor: 'client',
        at: reviewed_at,
        reason,
      },
    };
  } else {
    // defer
    nextStatus = 'deferred';
    const defer_count =
      typeof content.defer_count === 'number'
        ? (content.defer_count as number) + 1
        : 1;
    updatedContent = {
      ...content,
      defer_count,
      client_decision: {
        action: 'defer',
        actor: 'client',
        at: reviewed_at,
        reason,
      },
    };
  }

  const { error: updErr } = await supabase
    .from('agency_artifacts')
    .update({
      status: nextStatus,
      reviewed_at,
      content: updatedContent,
    })
    .eq('id', artifact_id)
    .eq('client_id', me.client_id);

  if (updErr) {
    console.error('[agency-client-approvals] update failed', updErr);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Update failed' }),
    };
  }

  // Audit trail lives on the artifact itself (content.client_decision); we
  // log here so Netlify's drain captures the timeline even when the row read
  // is RLS-restricted. Avoids emitting custom-type agency_events that aren't
  // in the strict schema (which intentionally gates table writes).
  console.log('[agency-client-approvals] client_decision', {
    client_id: me.client_id,
    artifact_id,
    artifact_type: art.type,
    action,
    has_reason: !!reason,
    at: reviewed_at,
  });

  return {
    statusCode: 200,
    body: JSON.stringify({ status: nextStatus, artifact_id }),
  };
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS, body: '' };
  }
  const authHeader =
    event.headers['authorization'] || event.headers['Authorization'];

  try {
    if (event.httpMethod === 'GET') {
      const r = await handleList(authHeader);
      return { ...r, headers: CORS };
    }
    if (event.httpMethod === 'POST') {
      const r = await handleAction(authHeader, event.body || '');
      return { ...r, headers: CORS };
    }
    return {
      statusCode: 405,
      headers: CORS,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  } catch (err) {
    console.error('[agency-client-approvals] uncaught', err);
    return {
      statusCode: 500,
      headers: CORS,
      body: JSON.stringify({ error: 'Internal error' }),
    };
  }
};
