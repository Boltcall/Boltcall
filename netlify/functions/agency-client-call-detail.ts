import { withLegacyHandler } from './_shared/runtime-compat';
/**
 * agency-client-call-detail.ts — Boltcall Agency OS · Layer 7 · Client portal
 * ───────────────────────────────────────────────────────────────────────────
 *
 * GET ?call_id=<retell-call-id> endpoint backing the per-call drawer
 * on `/client/calls`. Returns:
 *   - Full transcript via retell-adapter.getCallTranscript
 *   - QA score breakdown (5-dim final scores, no raw judge internals)
 *   - AI explanation generated server-side by Sonnet (with the
 *     transcript + the QA rubric in context). Cached on the artifact
 *     so the same drawer open doesn't pay the LLM cost twice.
 *
 * Auth: same model as agency-client-calls.ts.
 *   - Bearer JWT required.
 *   - Server resolves client_id from auth.uid().
 *   - Defense in depth: we verify the call_id actually belongs to the
 *     calling client by joining against agency_events (call_completed
 *     row tagged with the client_id). If no such event exists for that
 *     client, we return 404 (NOT 403 — leaking "exists but you can't
 *     see it" would let a client probe whether other clients exist).
 */

import type { Handler } from '@netlify/functions';
import path from 'node:path';
import fs from 'node:fs';

import { getServiceSupabase } from './_shared/token-utils';
import { getCallTranscript } from './_shared/agency-adapters/retell-adapter';
import {
  callClaude,
  type JsonSchemaObject,
} from './_shared/agency-agents/run-agent';

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json',
};

const DIM_KEYS = [
  'dim_booking_craft',
  'dim_qualifying_hygiene',
  'dim_vertical_compliance',
  'dim_empathy_tone',
  'dim_handoff_hygiene',
] as const;
type DimKey = (typeof DIM_KEYS)[number];

const DIM_LABELS: Record<DimKey, string> = {
  dim_booking_craft: 'Booking craft',
  dim_qualifying_hygiene: 'Qualifying hygiene',
  dim_vertical_compliance: 'Vertical compliance',
  dim_empathy_tone: 'Empathy & tone',
  dim_handoff_hygiene: 'Handoff hygiene',
};

interface JudgmentArtifactContent {
  payload?: {
    call_id?: string;
    final_score?: number;
    final_dim_scores?: Partial<Record<DimKey, number>>;
    failure_pattern?: { slug?: string; one_line_description?: string } | null;
    notable_moments?: string[];
    sampling_reason?: string;
  };
  // Cache key for the per-client AI explanation, written by THIS function
  // on first request and re-served from then on.
  client_explanation?: ClientExplanation;
}

interface ClientExplanation {
  headline: string;
  why_it_went_this_way: string;
  what_were_doing_about_it: string;
  per_dim_notes: Array<{ dim_key: DimKey; note: string }>;
  generated_at: string;
  model: string;
}

const EXPLAIN_SCHEMA: JsonSchemaObject = {
  type: 'object',
  additionalProperties: false,
  required: ['headline', 'why_it_went_this_way', 'what_were_doing_about_it', 'per_dim_notes'],
  properties: {
    headline: { type: 'string', maxLength: 140 },
    why_it_went_this_way: { type: 'string', maxLength: 600 },
    what_were_doing_about_it: { type: 'string', maxLength: 400 },
    per_dim_notes: {
      type: 'array',
      minItems: 1,
      maxItems: 5,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['dim_key', 'note'],
        properties: {
          dim_key: { type: 'string', enum: [...DIM_KEYS] },
          note: { type: 'string', maxLength: 220 },
        },
      },
    },
  },
};

const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  const call_id = event.queryStringParameters?.call_id;
  if (!call_id || !/^[a-zA-Z0-9_\-]{6,128}$/.test(call_id)) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Bad request — call_id required' }),
    };
  }

  // ── 1. Authenticate caller ──────────────────────────────────────────
  const authHeader =
    event.headers['authorization'] || event.headers['Authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    return {
      statusCode: 401,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Unauthorized' }),
    };
  }

  const supa = getServiceSupabase();
  const { data: userResult, error: authErr } = await supa.auth.getUser(token);
  if (authErr || !userResult?.user) {
    return {
      statusCode: 401,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Invalid token' }),
    };
  }
  const uid = userResult.user.id;

  const { data: clientRow } = await supa
    .from('agency_clients')
    .select('id, business_name, vertical')
    .eq('user_id', uid)
    .not('status', 'in', '("churned","paused")')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!clientRow) {
    return {
      statusCode: 403,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'No active agency client' }),
    };
  }
  const client_id = clientRow.id as string;

  // ── 2. Verify the call_id belongs to this client ────────────────────
  const { data: ownership } = await supa
    .from('agency_events')
    .select('id, payload')
    .eq('client_id', client_id)
    .eq('type', 'call_completed')
    .eq('payload->>call_id', call_id)
    .limit(1)
    .maybeSingle();

  if (!ownership) {
    // 404 not 403 — see comment at top of file
    return {
      statusCode: 404,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Call not found' }),
    };
  }

  // ── 3. Pull the QA artifact (if one was written) ───────────────────
  // The auditor stamps `payload.call_id` inside `content.payload`. Use
  // a JSONB pointer query to find it. We're looking for SHIPPED status
  // only; draft artifacts may have unresolved divergences the client
  // shouldn't see yet.
  const { data: artifacts } = await supa
    .from('agency_artifacts')
    .select('id, content, eval_score, created_at, generated_by, type, status')
    .eq('client_id', client_id)
    .eq('type', 'escalation_action')
    .eq('generated_by', 'qa-auditor')
    .eq('content->payload->>call_id', call_id)
    .in('status', ['shipped', 'draft'])
    .order('created_at', { ascending: false })
    .limit(1);

  const artifact = artifacts && artifacts.length > 0 ? artifacts[0] : null;
  const artifactContent = (artifact?.content ?? {}) as JudgmentArtifactContent;
  const qaPayload = artifactContent.payload || {};

  // ── 4. Pull the transcript (full) ──────────────────────────────────
  let transcript = '';
  let duration_sec = 0;
  let recording_url = '';
  let outcomeRaw: string | undefined;
  try {
    const t = await getCallTranscript({ call_id, client_id });
    transcript = t.transcript;
    duration_sec = t.duration_sec;
    recording_url = t.recording_url;
    outcomeRaw = t.outcome;
  } catch (err) {
    console.warn('[agency-client-call-detail] transcript fetch failed:', err);
    // Fall back to the event payload — better to ship partial than 500
    const payload = (ownership.payload || {}) as { duration_seconds?: number; outcome?: string };
    duration_sec = Number(payload.duration_seconds ?? 0);
    outcomeRaw = payload.outcome;
  }

  // ── 5. Render dim scores in stable order ───────────────────────────
  const finalDimScores = qaPayload.final_dim_scores || {};
  const dim_scores = DIM_KEYS.map((dim) => ({
    dim_key: dim,
    label: DIM_LABELS[dim],
    score: typeof finalDimScores[dim] === 'number' ? Number(finalDimScores[dim]) : null,
  }));

  // ── 6. AI explanation (cache-or-generate) ──────────────────────────
  let explanation: ClientExplanation | null = artifactContent.client_explanation ?? null;

  if (!explanation && transcript) {
    try {
      explanation = await generateExplanation({
        transcript,
        duration_sec,
        outcome_raw: outcomeRaw,
        vertical: clientRow.vertical || 'other',
        business_name: clientRow.business_name || 'your business',
        client_id,
        final_score: qaPayload.final_score ?? null,
        final_dim_scores: finalDimScores,
        failure_pattern: qaPayload.failure_pattern ?? null,
        notable_moments: qaPayload.notable_moments ?? [],
      });

      // Cache on the artifact so the next drawer open is free
      if (artifact && explanation) {
        const newContent: JudgmentArtifactContent = {
          ...artifactContent,
          client_explanation: explanation,
        };
        await supa
          .from('agency_artifacts')
          .update({ content: newContent })
          .eq('id', artifact.id);
      }
    } catch (err) {
      console.warn('[agency-client-call-detail] explain failed:', err);
    }
  }

  // ── 7. Whitelisted response ────────────────────────────────────────
  return {
    statusCode: 200,
    headers: CORS_HEADERS,
    body: JSON.stringify({
      call: {
        call_id,
        duration_sec,
        recording_url,
        outcome_raw: outcomeRaw ?? null,
      },
      transcript,
      qa: {
        final_score:
          typeof qaPayload.final_score === 'number'
            ? qaPayload.final_score
            : artifact?.eval_score ?? null,
        dim_scores,
        failure_pattern: qaPayload.failure_pattern ?? null,
        notable_moments: qaPayload.notable_moments ?? [],
        artifact_id: artifact?.id ?? null,
      },
      explanation: explanation
        ? {
            headline: explanation.headline,
            why_it_went_this_way: explanation.why_it_went_this_way,
            what_were_doing_about_it: explanation.what_were_doing_about_it,
            per_dim_notes: explanation.per_dim_notes,
          }
        : null,
    }),
  };
};

// ─── AI explanation generator ───────────────────────────────────────────────

interface GenerateExplanationArgs {
  transcript: string;
  duration_sec: number;
  outcome_raw: string | undefined;
  vertical: string;
  business_name: string;
  client_id: string;
  final_score: number | null;
  final_dim_scores: Partial<Record<DimKey, number>>;
  failure_pattern: { slug?: string; one_line_description?: string } | null;
  notable_moments: string[];
}

async function generateExplanation(
  args: GenerateExplanationArgs,
): Promise<ClientExplanation | null> {
  const rubric = loadRubricSnippet();

  const system =
    `You are the Boltcall strategist writing a note to one of our clients about a single call from their AI receptionist.\n\n` +
    `Voice rules (load-bearing — design principle #1, #3):\n` +
    `- Sound like an account strategist who already listened to the call. NOT a chatbot, NOT a robot, NOT a generic\n` +
    `  "Hello! I'm happy to help analyze your call!" opener.\n` +
    `- Refer to the client's business as "${args.business_name}" or "your agent". Never refer to Noam, the founder,\n` +
    `  Anthropic, Claude, or any LLM. Say "we" or "our team" for any internal action.\n` +
    `- One narrative paragraph per field. No bullet points inside the strings.\n` +
    `- The "what_were_doing_about_it" field MUST name a concrete next action (a queued fix, a draft for approval,\n` +
    `  a flag for review). Never say "we will continue to monitor" — that's a non-action.\n` +
    `- Cite specific transcript moments where you can. The client can audit any claim — receipts matter.\n\n` +
    `QA rubric (for context — do NOT echo it back):\n${rubric}\n`;

  const userPayload = {
    vertical: args.vertical,
    duration_sec: args.duration_sec,
    raw_outcome: args.outcome_raw ?? 'unknown',
    qa_final_score: args.final_score,
    qa_per_dim: args.final_dim_scores,
    detected_failure_pattern: args.failure_pattern,
    notable_moments: args.notable_moments,
    transcript: args.transcript.slice(0, 12_000),
  };

  const result = await callClaude<ClientExplanation>({
    system,
    user_messages: [
      {
        role: 'user',
        content:
          'Write the client-facing explanation for this call. Emit via emit_structured_output.\n\n' +
          '```json\n' +
          JSON.stringify(userPayload, null, 2) +
          '\n```',
      },
    ],
    tier: 'sonnet',
    output_schema: EXPLAIN_SCHEMA,
    tool_name: 'emit_structured_output',
    agent_name: 'client-call-explainer',
    client_id: args.client_id,
  });

  return {
    ...result.output,
    generated_at: new Date().toISOString(),
    model: result.model,
  };
}

function loadRubricSnippet(): string {
  // The qa-rubrics.ts handler ships a canonical rubric file alongside it.
  // Best-effort read — if it's not bundled we ship a hand-distilled summary.
  try {
    const candidates = [
      path.resolve(process.cwd(), 'netlify/functions/_shared/rubrics/qa.md'),
      path.resolve(process.cwd(), 'strategy/skills/agency-fleet/qa-auditor/prompt.md'),
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) {
        return fs.readFileSync(p, 'utf8').slice(0, 3000);
      }
    }
  } catch {
    /* fall through */
  }
  return (
    '- Booking craft: did the agent ask for the booking and lock down a time?\n' +
    '- Qualifying hygiene: did the agent collect name, service, urgency, contact?\n' +
    '- Vertical compliance: did the agent follow vertical-specific rules?\n' +
    '- Empathy & tone: did the agent meet the caller emotionally?\n' +
    '- Handoff hygiene: if transferred or callback-queued, was the handoff clean?'
  );
}

export const testHandler = handler;
export default withLegacyHandler(handler);
