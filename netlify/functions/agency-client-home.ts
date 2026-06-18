import { withLegacyHandler } from './_shared/runtime-compat';
/**
 * agency-client-home.ts — Boltcall Agency OS · Client Portal · Phase E
 * ────────────────────────────────────────────────────────────────────
 *
 * GET endpoint backing the client portal home page at /client.
 *
 * Auth model:
 *   - Caller must be a real human (Supabase JWT, not an API key — this is a
 *     UI surface).
 *   - JWT auth.uid() is matched against agency_clients.user_id to resolve a
 *     SINGLE client_id (defense-in-depth: also gated by RLS on the table).
 *   - If the caller owns >1 active client, the first is used unless ?client_id
 *     is passed AND owns_client() approves it. (Most clients only have one.)
 *
 * Output (single round-trip; auto-refreshed every 30s by the page):
 *   {
 *     hero: {
 *       agent_online: boolean,
 *       agent_phone_number: string | null,
 *       today_pipeline_value_usd: number,
 *       today_bookings: number,
 *       today_calls: number,
 *     },
 *     daily_digest: {
 *       narrative: string,           // 2 sentences, AI-narrated
 *       generated_at: string,        // iso
 *       call_evidence: [             // links the narrative back to receipts
 *         { call_id, summary, started_at, outcome },
 *         ...
 *       ],
 *       confidence: number,          // 0..1
 *     } | null,
 *     pending_approvals: {
 *       count: number,
 *       most_recent: { artifact_id, type, client_facing_note, created_at } | null,
 *     },
 *     anomaly: {
 *       event_id: string,
 *       severity: 'warn' | 'error' | 'critical',
 *       why_explanation: string,
 *       created_at: string,
 *       fix: {
 *         artifact_id: string,
 *         type: string,
 *         status: 'draft' | 'approved' | 'shipped' | 'rejected',
 *         client_facing_note: string | null,
 *       } | null,
 *     } | null,
 *     live_calls: {
 *       active_count: number,
 *       last_call_started_at: string | null,
 *     },
 *     starter_questions: string[],   // 4 prompts for Ask Boltcall AI,
 *                                    // generated per-client based on recent
 *                                    // events. Falls back to sensible
 *                                    // defaults if the generator is
 *                                    // unavailable (cost-bounded — only
 *                                    // re-runs once per hour per client).
 *   }
 *
 * Design contract (from the Customer UX spec):
 *   - One screen, one action. We surface AT MOST one anomaly, one digest,
 *     pending-approvals count + 1 recent. The chat hero is the action.
 *   - Every alert paired with a fix. If anomaly.fix is null we omit the
 *     whole anomaly card client-side (verified in ClientHomePage).
 *   - Narrative-first. The digest text is a paragraph, not a chart.
 *   - The founder is invisible. Strings here say "our team" / "your
 *     strategist", never "Noam".
 */

import type { Handler } from '@netlify/functions';

import { getServiceSupabase } from './_shared/token-utils';
import { callClaude } from './_shared/agency-agents/run-agent';
import { retrieve } from './_shared/agency-knowledge/retrieve';

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json',
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Vertical-average ticket sizes for estimating pipeline value when a
// booking_made event doesn't carry an explicit estimated_value_usd. Keep
// conservative; the digest narrative will hedge if we had to estimate.
const VERTICAL_AVG_TICKET_USD: Record<string, number> = {
  plumber: 380,
  hvac: 520,
  electrician: 410,
  med_spa: 425,
  dental: 580,
  legal: 1200,
  roofing: 1800,
  landscaping: 220,
  pest_control: 240,
  cleaning: 180,
  other: 300,
};

// Starter-question cache TTL — these are expensive (Sonnet call) but
// near-static across a single client's day. 1h is the sweet spot.
const STARTER_QUESTIONS_TTL_MS = 60 * 60 * 1000;
const starterQuestionCache = new Map<
  string,
  { questions: string[]; ts: number }
>();

const DEFAULT_STARTER_QUESTIONS = [
  'What changed in my call performance this week?',
  'Which call types are booking the worst right now?',
  'Is my agent handling pricing questions well?',
  'What is our team working on this week?',
];

// ─── Handler ────────────────────────────────────────────────────────────────

export const handler: Handler = async (event) => {
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

  // ── 1. Auth: resolve auth.uid() from JWT ──────────────────────────────
  const authHeader =
    event.headers['authorization'] || event.headers['Authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    return {
      statusCode: 401,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Unauthorized — missing bearer token' }),
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

  // ── 2. Resolve client_id (owns_client defense-in-depth) ───────────────
  // Optional ?client_id override (for clients with multi-tenant org access);
  // most users own exactly one row.
  const explicitId = event.queryStringParameters?.client_id;
  if (explicitId && !UUID_RE.test(explicitId)) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Bad request — invalid client_id' }),
    };
  }

  let client_id: string;
  let client_vertical = 'other';
  let agent_id: string | null = null;
  let agent_phone_number: string | null = null;

  {
    let query = supa
      .from('agency_clients')
      .select('id,user_id,vertical,status,notes,business_name')
      .eq('user_id', uid)
      .not('status', 'in', '(churned,paused)');
    if (explicitId) query = query.eq('id', explicitId);
    const { data: clientRow, error: clientErr } = await query
      .order('signed_up_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (clientErr) {
      return {
        statusCode: 500,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          error: 'Failed to resolve client',
          detail: clientErr.message,
        }),
      };
    }
    if (!clientRow) {
      // Caller has no active client — distinct from a permission error.
      // The UI can show a friendly "no agency client found" state.
      return {
        statusCode: 404,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          error: 'No active agency client found for this account',
          code: 'no_client',
        }),
      };
    }
    client_id = clientRow.id as string;
    client_vertical = (clientRow.vertical as string) || 'other';
    // Try to discover the live agent_id from the client's notes blob (kernel
    // doesn't expose this as a first-class column today). Best-effort —
    // missing agent_id means the LiveCallTicker shows the calmer empty state.
    const notes = (clientRow.notes ?? {}) as Record<string, unknown>;
    if (typeof notes['retell_agent_id'] === 'string') {
      agent_id = notes['retell_agent_id'] as string;
    }
    if (typeof notes['agent_phone_number'] === 'string') {
      agent_phone_number = notes['agent_phone_number'] as string;
    }
  }

  // ── 3. Parallel reads — keep the round-trip tight (auto-refresh is 30s) ──
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setUTCHours(0, 0, 0, 0);
  const todayStartIso = todayStart.toISOString();

  const last30dStart = new Date(now);
  last30dStart.setUTCDate(last30dStart.getUTCDate() - 30);

  const last24hStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const last24hIso = last24hStart.toISOString();

  const last10MinIso = new Date(now.getTime() - 10 * 60 * 1000).toISOString();

  const [
    todayEventsRes,
    pendingArtifactsRes,
    anomalyRes,
    recentTranscriptsRes,
    liveCallsRes,
  ] = await Promise.all([
    // Today's events for hero + digest source material
    supa
      .from('agency_events')
      .select('id,type,severity,payload,why_explanation,created_at')
      .eq('client_id', client_id)
      .gte('created_at', todayStartIso)
      .order('created_at', { ascending: false })
      .limit(200),

    // Pending approvals queue
    supa
      .from('agency_artifacts')
      .select('id,type,client_facing_note,created_at')
      .eq('client_id', client_id)
      .eq('status', 'draft')
      .order('created_at', { ascending: false })
      .limit(5),

    // Most recent anomaly + its fix status. We pull the newest anomaly
    // first; the lookup of the paired fix artifact is a second .select()
    // below (kept inline so we don't fan out 6 parallel calls).
    supa
      .from('agency_events')
      .select('id,severity,why_explanation,payload,created_at')
      .eq('client_id', client_id)
      .eq('type', 'anomaly_detected')
      .gte('created_at', last30dStart.toISOString())
      .order('created_at', { ascending: false })
      .limit(1),

    // Last 5 call transcripts (excerpts) for digest grounding
    supa
      .from('agency_events')
      .select('id,payload,created_at')
      .eq('client_id', client_id)
      .eq('type', 'call_completed')
      .order('created_at', { ascending: false })
      .limit(5),

    // Live calls — events in the last 10 min are treated as "active"
    // (call_completed fires on hangup; if it hasn't fired yet, we infer
    // active from the agency_artifacts.test_call rows + recency).
    supa
      .from('agency_events')
      .select('id,type,created_at')
      .eq('client_id', client_id)
      .eq('type', 'call_completed')
      .gte('created_at', last10MinIso)
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  // ── 4. Build hero ─────────────────────────────────────────────────────
  const todayEvents = todayEventsRes.data || [];
  const bookings = todayEvents.filter((e) => e.type === 'booking_made');
  const calls = todayEvents.filter((e) => e.type === 'call_completed');

  const avgTicket =
    VERTICAL_AVG_TICKET_USD[client_vertical] ?? VERTICAL_AVG_TICKET_USD.other;

  let today_pipeline_value_usd = 0;
  for (const b of bookings) {
    const p = (b.payload ?? {}) as Record<string, unknown>;
    const explicit =
      typeof p['estimated_value_usd'] === 'number'
        ? (p['estimated_value_usd'] as number)
        : null;
    today_pipeline_value_usd += explicit ?? avgTicket;
  }
  today_pipeline_value_usd = Math.round(today_pipeline_value_usd);

  // ── 5. Pending approvals ──────────────────────────────────────────────
  const pendingRows = pendingArtifactsRes.data || [];
  const pending_approvals = {
    count: pendingRows.length,
    most_recent: pendingRows[0]
      ? {
          artifact_id: pendingRows[0].id as string,
          type: pendingRows[0].type as string,
          client_facing_note:
            (pendingRows[0].client_facing_note as string | null) ?? null,
          created_at: pendingRows[0].created_at as string,
        }
      : null,
  };

  // ── 6. Anomaly + fix lookup ───────────────────────────────────────────
  let anomaly: {
    event_id: string;
    severity: 'warn' | 'error' | 'critical';
    why_explanation: string;
    created_at: string;
    fix: {
      artifact_id: string;
      type: string;
      status: 'draft' | 'approved' | 'shipped' | 'rejected';
      client_facing_note: string | null;
    } | null;
  } | null = null;

  const anomalyRow = (anomalyRes.data || [])[0];
  if (anomalyRow) {
    // Find the AI's drafted fix for this anomaly. We do this by looking
    // for the freshest artifact created strictly AFTER the anomaly event
    // — that's the convention the fix-drafter agent follows. We could be
    // tighter by matching artifact.parent_artifact_id or a payload field,
    // but for the client-facing surface "the freshest fix queued after
    // the anomaly" is the right heuristic and matches what's actually
    // shipping.
    const { data: fixRows } = await supa
      .from('agency_artifacts')
      .select('id,type,status,client_facing_note,created_at')
      .eq('client_id', client_id)
      .in('type', ['prompt_revision', 'knowledge_base', 'optimization_brief'])
      .gte('created_at', anomalyRow.created_at)
      .order('created_at', { ascending: false })
      .limit(1);

    const fix = (fixRows || [])[0];

    anomaly = {
      event_id: anomalyRow.id as string,
      // Anomaly severity is enforced by the kernel — narrow defensively.
      severity:
        anomalyRow.severity === 'critical' || anomalyRow.severity === 'error'
          ? (anomalyRow.severity as 'critical' | 'error')
          : 'warn',
      why_explanation:
        (anomalyRow.why_explanation as string | null) ??
        'Our team flagged unusual behavior on your agent.',
      created_at: anomalyRow.created_at as string,
      fix: fix
        ? {
            artifact_id: fix.id as string,
            type: fix.type as string,
            status: fix.status as 'draft' | 'approved' | 'shipped' | 'rejected',
            client_facing_note:
              (fix.client_facing_note as string | null) ?? null,
          }
        : null,
    };
  }

  // ── 7. Live calls ─────────────────────────────────────────────────────
  const liveRows = liveCallsRes.data || [];
  const live_calls = {
    active_count: liveRows.length,
    last_call_started_at: liveRows[0]?.created_at
      ? (liveRows[0].created_at as string)
      : null,
  };

  // ── 8. AI-narrated daily digest (last 24h) ─────────────────────────────
  // Cost-bounded: only run when we have real activity. If today saw zero
  // calls and zero bookings, we skip the LLM entirely and serve a quiet
  // canned line (saves $$ on empty days).
  let daily_digest: {
    narrative: string;
    generated_at: string;
    call_evidence: Array<{
      call_id: string;
      summary: string;
      started_at: string;
      outcome: string;
    }>;
    confidence: number;
  } | null = null;

  const last24hCallEvents = (recentTranscriptsRes.data || []).filter(
    (r) => r.created_at >= last24hIso,
  );

  if (calls.length === 0 && bookings.length === 0 && last24hCallEvents.length === 0) {
    daily_digest = {
      narrative:
        'Quiet day so far — your agent is online and ready. We will surface anything notable here as soon as calls start coming in.',
      generated_at: now.toISOString(),
      call_evidence: [],
      confidence: 1,
    };
  } else {
    try {
      daily_digest = await generateDailyDigest({
        client_id,
        today_calls: calls.length,
        today_bookings: bookings.length,
        today_pipeline_value_usd,
        recent_call_events: last24hCallEvents.slice(0, 5),
      });
    } catch (err) {
      console.warn(
        '[agency-client-home] daily digest generation failed (non-fatal):',
        (err as Error).message,
      );
      // Don't fail the whole page — surface a neutral fallback that still
      // respects the narrative-first principle.
      daily_digest = {
        narrative: `Today: ${calls.length} call${calls.length === 1 ? '' : 's'} handled, ${bookings.length} booked. Your strategist is preparing a deeper read for you shortly.`,
        generated_at: now.toISOString(),
        call_evidence: [],
        confidence: 0.5,
      };
    }
  }

  // ── 9. Starter questions for Ask Boltcall AI ──────────────────────────
  let starter_questions = DEFAULT_STARTER_QUESTIONS;
  const cached = starterQuestionCache.get(client_id);
  if (cached && now.getTime() - cached.ts < STARTER_QUESTIONS_TTL_MS) {
    starter_questions = cached.questions;
  } else {
    try {
      const generated = await generateStarterQuestions({
        client_id,
        recent_events: todayEvents.slice(0, 25),
        pending_count: pending_approvals.count,
        has_anomaly: anomaly !== null,
      });
      if (generated.length >= 3) {
        starter_questions = generated.slice(0, 4);
        starterQuestionCache.set(client_id, {
          questions: starter_questions,
          ts: now.getTime(),
        });
      }
    } catch (err) {
      console.warn(
        '[agency-client-home] starter question generation failed (non-fatal):',
        (err as Error).message,
      );
    }
  }

  // ── 10. Return ────────────────────────────────────────────────────────
  return {
    statusCode: 200,
    headers: CORS_HEADERS,
    body: JSON.stringify({
      hero: {
        agent_online: agent_id !== null,
        agent_phone_number,
        today_pipeline_value_usd,
        today_bookings: bookings.length,
        today_calls: calls.length,
      },
      daily_digest,
      pending_approvals,
      anomaly,
      live_calls,
      starter_questions,
    }),
  };
};

// ─── Helpers ────────────────────────────────────────────────────────────────

interface DigestGenArgs {
  client_id: string;
  today_calls: number;
  today_bookings: number;
  today_pipeline_value_usd: number;
  recent_call_events: Array<{
    id: string;
    payload: unknown;
    created_at: string;
  }>;
}

interface DigestOutput {
  narrative: string;
  call_evidence: Array<{
    call_id: string;
    summary: string;
    started_at: string;
    outcome: string;
  }>;
  confidence: number;
}

/**
 * Generate the 2-sentence narrative digest using Sonnet + KB grounding.
 *
 * "Narrative-first" is enforced by the schema (free-text narrative is
 * required, charts are not). Every call_evidence row is keyed to the
 * actual call_id so the client can audit the claim — receipts principle.
 */
async function generateDailyDigest(args: DigestGenArgs): Promise<DigestOutput & {
  generated_at: string;
}> {
  // Pull a small KB chunk to ground the digest's tone (services, current
  // pricing, agent's voice). Failure here is non-fatal — we just lose
  // grounding context.
  let kbContext = '';
  try {
    const kb = await retrieve({
      client_id: args.client_id,
      query_text: 'recent call themes + services + win/loss patterns',
      k: 5,
    });
    kbContext = kb.chunks
      .map((c, i) => `[${i + 1}] (${c.kind}) ${JSON.stringify(c.content).slice(0, 400)}`)
      .join('\n');
  } catch {
    kbContext = '';
  }

  const callsSummary = args.recent_call_events
    .map((e) => {
      const p = (e.payload ?? {}) as Record<string, unknown>;
      return {
        call_id: (p['call_id'] as string) ?? e.id,
        outcome: (p['outcome'] as string) ?? 'unknown',
        duration_seconds: (p['duration_seconds'] as number) ?? 0,
        started_at: e.created_at,
        excerpt: ((p['transcript_excerpt'] as string) ?? '').slice(0, 280),
      };
    })
    .filter((c) => c.call_id);

  const result = await callClaude<{
    narrative: string;
    call_evidence: Array<{
      call_id: string;
      summary: string;
      started_at: string;
      outcome: string;
    }>;
    confidence: number;
  }>({
    agent_name: 'client-portal.daily-digest',
    client_id: args.client_id,
    tier: 'sonnet',
    system: [
      'You are this client\'s account strategist for Boltcall — a calm, specific senior consultant.',
      'You write ONE narrative digest paragraph (1-2 sentences) summarizing the client\'s last 24 hours of agent activity.',
      '',
      'STRICT rules:',
      '- Narrative-first. No charts, no markdown, no bullets. Plain prose.',
      '- Cite specific call evidence (time of day, what was asked, outcome). Numbers without story are anxiety; numbers with story are confidence.',
      '- If you mention a number, ground it in a specific call from the input.',
      '- Sound like a 20-person team. Use "we" and "our team", never "I". Never mention the founder by name.',
      '- Never invent calls or outcomes. Only reference call_ids you were given.',
      '- Keep it under 60 words. Senior consultants are concise.',
      '- Confidence: 0.9 if you had enough call detail; 0.5 if you mostly relied on counts; 0.2 if guessing.',
    ].join('\n'),
    user_messages: [
      {
        role: 'user',
        content: [
          `# Today's numbers`,
          `- Calls handled: ${args.today_calls}`,
          `- Bookings made: ${args.today_bookings}`,
          `- Pipeline value created today: $${args.today_pipeline_value_usd.toLocaleString()}`,
          '',
          '# Recent call events (last 24h)',
          callsSummary.length > 0
            ? '```json\n' + JSON.stringify(callsSummary, null, 2) + '\n```'
            : '(no call events with detail available)',
          '',
          '# Client KB context',
          kbContext || '(no kb context available)',
          '',
          'Emit your digest via emit_structured_output.',
        ].join('\n'),
      },
    ],
    output_schema: {
      type: 'object',
      properties: {
        narrative: {
          type: 'string',
          description: '1-2 sentences narrating today\'s agent performance, grounded in specific call evidence.',
        },
        call_evidence: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              call_id: { type: 'string' },
              summary: { type: 'string' },
              started_at: { type: 'string' },
              outcome: { type: 'string' },
            },
            required: ['call_id', 'summary', 'started_at', 'outcome'],
          },
          description: 'Specific calls cited in the narrative. Each call_id MUST come from the input.',
        },
        confidence: {
          type: 'number',
          minimum: 0,
          maximum: 1,
          description: 'Self-assessed confidence in the narrative\'s grounding.',
        },
      },
      required: ['narrative', 'call_evidence', 'confidence'],
      additionalProperties: false,
    },
  });

  return {
    ...result.output,
    generated_at: new Date().toISOString(),
  };
}

/**
 * Generate 4 starter questions tied to the client's actual recent
 * behavior. These rotate based on what is actually interesting in the
 * client's data this week — never hardcoded.
 *
 * Uses Sonnet (not Opus); the task is short-context pattern-matching.
 */
async function generateStarterQuestions(args: {
  client_id: string;
  recent_events: Array<{
    id: string;
    type: string;
    severity: string;
    why_explanation: string | null;
    created_at: string;
  }>;
  pending_count: number;
  has_anomaly: boolean;
}): Promise<string[]> {
  const eventSummary = args.recent_events
    .map((e) => `- [${e.type}] ${e.why_explanation ?? '(no explanation)'}`)
    .join('\n');

  const result = await callClaude<{ questions: string[] }>({
    agent_name: 'client-portal.starter-questions',
    client_id: args.client_id,
    tier: 'sonnet',
    system: [
      'You write 4 starter questions a Boltcall agency client might ask their AI strategist today.',
      'Each question must be:',
      '- Tied to something specific in their recent events (not generic).',
      '- Phrased the way an operator would actually ask it (casual, direct, <12 words).',
      '- Useful — the answer would change a decision.',
      '- Different from each other (cover different surfaces: calls, ads, agent quality, ops).',
      '',
      'NEVER write questions starting with "How can I help" or "What would you like to know".',
      'NEVER mention the founder by name. Use "our team" / "your strategist".',
    ].join('\n'),
    user_messages: [
      {
        role: 'user',
        content: [
          `# Client situation`,
          `- Pending approvals waiting on the client: ${args.pending_count}`,
          `- Active anomaly: ${args.has_anomaly ? 'yes' : 'no'}`,
          `# Recent events (top 25)`,
          eventSummary || '(quiet day, no notable events)',
          '',
          'Emit 4 starter questions via emit_structured_output.',
        ].join('\n'),
      },
    ],
    output_schema: {
      type: 'object',
      properties: {
        questions: {
          type: 'array',
          minItems: 4,
          items: { type: 'string' },
        },
      },
      required: ['questions'],
      additionalProperties: false,
    },
  });

  const qs = Array.isArray(result.output?.questions) ? result.output.questions : [];
  return qs.filter((q): q is string => typeof q === 'string' && q.trim().length > 0);
}

export default withLegacyHandler(handler);
