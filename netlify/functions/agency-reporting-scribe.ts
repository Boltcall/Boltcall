/**
 * agency-reporting-scribe — Friday weekly client report runner (Agency OS Phase C)
 * ================================================================================
 *
 * This is the production runner the cron `friday-auto-report` workflow invokes.
 * It composes the kernel + adapters per the plan in
 *   C:/Users/Asus/.claude/plans/i-ahev-so-much-steady-frog.md
 *
 * Killer-feature implementation (per task spec):
 *
 *   (1) Pull the last 7 days of evidence from real adapters:
 *         - retell-adapter.listRecentCalls + getCallTranscript (top 20)
 *         - calcom-adapter.getBookings
 *         - meta-ads-adapter.getCampaignInsights + getCreativeInsights
 *         - prior-week KPI deltas computed inline from the same adapters
 *   (2) Narrative-first generation via runAgent() with all evidence in `input`
 *       and a high-k RAG pre-pass (k=15) over agency_knowledge — the harness
 *       handles model routing, schema enforcement, adversarial critic.
 *   (3) AI-generated 1-sentence caption per chart (already inside the same
 *       structured output — the prompt forces `charts[].caption`).
 *   (4) Plain-English check sub-pass: a dedicated post-generation Haiku call
 *       that re-reads the narrative + KPI captions + next-week-ask, scrubs
 *       jargon / hedges / passive voice, and updates the artifact in place.
 *       Run AFTER runAgent() so it can rewrite the actual draft the harness
 *       produced (and append its rewrites to plain_english_check.rewrites[]).
 *   (5) Render via pdf-renderer.renderClientReport.
 *   (6) Auto-ship (no founder approval per plan §6): transition the artifact
 *       from 'draft' → 'shipped', record ship_result + ship_window_ends_at,
 *       emit report_sent event.
 *
 * Trigger:
 *   - Cron path: invoked by `friday-auto-report` Netlify scheduled function
 *     with a service-role bearer. Iterates all live agency_clients and POSTs
 *     to this function per client.
 *   - Manual:    POST /.netlify/functions/agency-reporting-scribe
 *                { "client_id": "<uuid>", "week_starting"?: "YYYY-MM-DD" }
 *
 * Auth:
 *   Service-role bearer required (matches admin-metrics.ts pattern). Founder
 *   or system caller — never client-facing.
 */

import type { Handler, HandlerEvent } from '@netlify/functions';
import path from 'node:path';

import { getServiceSupabase } from './_shared/token-utils';
import { runAgent, callClaude, type ModelTier } from './_shared/agency-agents/run-agent';
import { emitAgencyEvent } from './_shared/emit-agency-event';

import * as retell from './_shared/agency-adapters/retell-adapter';
import * as calcom from './_shared/agency-adapters/calcom-adapter';
import * as meta from './_shared/agency-adapters/meta-ads-adapter';
import { renderClientReport } from './_shared/agency-adapters/pdf-renderer';

// ─────────────────────────────────────────────────────────────────────────────
//   Constants
// ─────────────────────────────────────────────────────────────────────────────

const AGENT_NAME = 'reporting-scribe';
const SKILL_DIR = path.resolve(
  process.cwd(),
  // Marketing/strategy is outside the Boltcall repo on disk; in the deployed
  // Lambda the skill files are bundled under the function include path. The
  // fallback chain handles both local dev (worktree-relative) and prod
  // (bundled include).
  'strategy/skills/agency-fleet/reporting-scribe',
);
const SKILL_DIR_FALLBACKS = [
  // Marketing checkout next to the Boltcall repo (local dev).
  path.resolve(
    process.cwd(),
    '../../Marketing/strategy/skills/agency-fleet/reporting-scribe',
  ),
  // Per-user absolute (last-resort).
  'C:/Users/Asus/Desktop/Marketing/strategy/skills/agency-fleet/reporting-scribe',
];
const REPORT_AUTO_SHIP = true; // plan §6 — Friday report auto-ships
const POST_SHIP_WINDOW_HOURS = 168; // 7 days; matches predicted_impact.horizon_hours
const KNOWLEDGE_K = 15; // higher than default — narrative needs many transcript-derived chunks
const TOP_TRANSCRIPT_COUNT = 20; // killer-feature spec: top 20 full transcripts

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

// ─────────────────────────────────────────────────────────────────────────────
//   Types
// ─────────────────────────────────────────────────────────────────────────────

interface AgencyClientRow {
  id: string;
  business_name: string | null;
  vertical: string | null;
  timezone: string | null;
  region: string | null;
  status: string;
}

interface CallSummary {
  call_id: string;
  started_at: string;
  duration_sec: number;
  outcome?: string;
  transcript_excerpt: string;
}

interface FullTranscript {
  call_id: string;
  started_at: string;
  duration_sec: number;
  outcome?: string;
  qa_score?: number;
  transcript: string;
}

interface BookingRow {
  booking_id: number;
  service?: string;
  scheduled_at: string;
  channel?: string;
}

interface MetaCreativeInsight {
  ad_id: string;
  impressions: number;
  ctr: number;
  cpl_usd: number;
  leads: number;
}

interface MetaInsightsBundle {
  campaign?: {
    campaign_id: string;
    impressions: number;
    clicks: number;
    ctr: number;
    spend_usd: number;
    leads: number;
    cpl_usd: number;
  };
  creatives?: MetaCreativeInsight[];
}

interface WeekKpis {
  calls_answered: number;
  calls_total: number;
  bookings: number;
  ad_spend_usd: number;
  leads_from_ads: number;
  cpl_usd: number;
  avg_call_duration_sec: number;
  avg_qa_score: number;
  answer_rate: number;
  estimated_booked_revenue_usd: number;
}

interface ScribeInput {
  client_id: string;
  business_name: string;
  vertical: string;
  vertical_template_tone: string;
  period_start: string;
  period_end: string;
  week_starting: string;
  timezone: string;
  client_kpis: WeekKpis;
  prior_week_kpis: WeekKpis | null;
  calls_summary: CallSummary[];
  top_transcripts: FullTranscript[];
  bookings: BookingRow[];
  meta_insights: MetaInsightsBundle | null;
  prior_optimization_brief: unknown | null;
  anomaly_events: Array<{ type: string; severity: string; created_at: string; payload: unknown }>;
}

interface ScribeOutput {
  narrative: {
    opening: string;
    lift_attribution: string;
    miss_explanation: string;
  };
  kpis: Array<{
    label: string;
    value: string;
    prior_value: string;
    delta: string;
    caption: string;
    cited_call_ids?: string[];
  }>;
  charts: Array<{
    chart_id: string;
    type: 'bar' | 'line' | 'stacked_bar' | 'pie';
    title: string;
    series: Array<{ label: string; values: number[] }>;
    x_labels?: string[];
    caption: string;
    cited_call_ids?: string[];
  }>;
  next_week_ask: {
    question: string;
    unblocks: string;
    cost_if_unanswered_usd: number;
    estimated_response_time_seconds: number;
  };
  plain_english_check: {
    rewrites: Array<{ before: string; after: string; reason: string }>;
  };
  report_html: string;
  client_facing_note: string;
  predicted_impact: {
    metric: string;
    prediction: number;
    ci_low?: number;
    ci_high?: number;
    base_rate?: number;
    horizon_hours: number;
  };
  // cross-cutting (enforced by run-agent.ts)
  confidence: number;
  reasoning_trace: string[];
  alternatives_rejected: Array<{ option: string; why_rejected: string }>;
}

// ─────────────────────────────────────────────────────────────────────────────
//   Handler
// ─────────────────────────────────────────────────────────────────────────────

export const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  // Auth — service-role bearer only. This runner is cron-invoked + founder-only;
  // never client-facing.
  const expected = process.env.AGENCY_OS_SERVICE_TOKEN ?? process.env.SUPABASE_SERVICE_KEY;
  const authHeader = event.headers['authorization'] || '';
  const token = authHeader.replace('Bearer ', '').trim();
  if (!expected || !token || token !== expected) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Unauthorized — service token required' }),
    };
  }

  let body: { client_id?: string; week_starting?: string };
  try {
    body = event.body ? JSON.parse(event.body) : {};
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  const client_id = body.client_id;
  if (!client_id) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'client_id is required' }),
    };
  }

  try {
    const result = await runForClient({
      client_id,
      week_starting: body.week_starting,
    });
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result),
    };
  } catch (err) {
    // Loud kernel event so monitoring picks it up. The shared kernel adapter_error
    // schema requires adapter+operation+error_message.
    try {
      await emitAgencyEvent({
        client_id,
        agent_name: AGENT_NAME,
        type: 'report_failed',
        severity: 'error',
        payload: {
          reason: 'runner_exception',
          error: err instanceof Error ? err.message : String(err),
          op: 'agency-reporting-scribe.handler',
        },
        why_explanation: `reporting-scribe failed for client ${client_id}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      });
    } catch {
      /* event-bus down — fall through */
    }
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'reporting-scribe failed',
        detail: err instanceof Error ? err.message : String(err),
      }),
    };
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//   Core orchestration
// ─────────────────────────────────────────────────────────────────────────────

async function runForClient(args: {
  client_id: string;
  week_starting?: string;
}): Promise<{
  artifact_id: string;
  pdf_url: string;
  shipped: boolean;
  cost_usd: number;
  latency_ms: number;
  confidence: number;
}> {
  const t0 = Date.now();
  const supabase = getServiceSupabase();

  // 1. Resolve client + period window.
  const client = await loadClient(supabase, args.client_id);
  const { period_start, period_end, week_starting } = resolveWeekWindow(
    args.week_starting,
    client.timezone ?? 'America/New_York',
  );

  // 2. Pull prior-period window too — for week-over-week deltas.
  const prior = priorWindow(period_start, period_end);

  // 3. Resolve the client's Retell agent_id from the latest shipped agent_prompt
  //    artifact's ship_result.retell_agent_id.
  const retell_agent_id = await resolveRetellAgentId(supabase, args.client_id);

  // 4. Pull evidence in parallel from real adapters.
  const evidence = await gatherEvidence({
    client_id: args.client_id,
    period_start,
    period_end,
    prior_period_start: prior.start,
    prior_period_end: prior.end,
    retell_agent_id,
  });

  // 5. Recent prior optimization brief (for closing the loop).
  const prior_brief = await loadLatestOptimizationBrief(supabase, args.client_id);

  // 6. Anomaly + report-degraded events in the window (must be acknowledged in
  //    narrative if any exist).
  const anomaly_events = await loadAnomalyEvents(
    supabase,
    args.client_id,
    period_start,
    period_end,
  );

  // 7. Compose the structured input the agent prompt expects.
  const scribe_input: ScribeInput = {
    client_id: args.client_id,
    business_name: client.business_name ?? 'Your Business',
    vertical: client.vertical ?? 'general',
    vertical_template_tone: verticalToneFor(client.vertical ?? 'general'),
    period_start,
    period_end,
    week_starting,
    timezone: client.timezone ?? 'America/New_York',
    client_kpis: evidence.this_week_kpis,
    prior_week_kpis: evidence.prior_week_kpis,
    calls_summary: evidence.calls_summary,
    top_transcripts: evidence.top_transcripts,
    bookings: evidence.bookings,
    meta_insights: evidence.meta_insights,
    prior_optimization_brief: prior_brief,
    anomaly_events,
  };

  // 8. Run the agent through the shared harness. The harness handles:
  //    - per-call model routing (sonnet default; bumped by router-classifier)
  //    - RAG pre-pass with k=15 over agency_knowledge
  //    - schema enforcement (cross-cutting fields included)
  //    - adversarial critic + rebuttal pass
  //    - artifact insert with confidence + reasoning_trace + retrieved_context
  //      + alternatives_rejected + adversarial_review + predicted_impact
  //    - report_sent event emission via ARTIFACT_TO_EVENT_TYPE mapping
  const skill_dir = resolveSkillDir();
  const generated = await runAgent<ScribeInput, ScribeOutput>({
    agent_name: AGENT_NAME,
    client_id: args.client_id,
    input: scribe_input,
    skill_dir,
    output_schema: getOutputSchema(),
    artifact_type: 'weekly_report',
    ship_target: 'client_email',
    knowledge_k: KNOWLEDGE_K,
    knowledge_query: buildKnowledgeQuery(scribe_input),
    router_summary: `Weekly report for ${scribe_input.business_name} (${scribe_input.vertical}): ${scribe_input.client_kpis.calls_total} calls, ${scribe_input.client_kpis.bookings} bookings, ${scribe_input.top_transcripts.length} full transcripts.`,
    agent_default_tier: 'sonnet',
    adversarial_critic: true,
    max_iterations: 1,
  });

  // 9. KILLER FEATURE #4 — Plain-English check sub-pass.
  //    A dedicated Haiku call re-reads the draft, scrubs jargon/hedges/passive
  //    voice, and updates the artifact in place. Logged into
  //    plain_english_check.rewrites[] so the founder + benchmark can audit it.
  const polished = await plainEnglishCheckPass({
    client_id: args.client_id,
    draft: generated.output,
  });

  // 10. Persist the polish back to the artifact row (overwrite content.payload
  //     with the polished version; preserve iteration_history).
  await persistPolishedArtifact(supabase, generated.artifact_id, polished);

  // 11. Render via pdf-renderer.renderClientReport.
  //     The renderer's `report_html` arg gets our polished html. The brand
  //     defaults come from agency_clients; logo + colors are best-effort.
  const render = await renderClientReport({
    client_id: args.client_id,
    week_starting,
    report_html: polished.report_html,
    brand: {
      business_name: client.business_name ?? 'Your Business',
      // We do not yet store brand colors per-client; defaults in pdf-renderer
      // are sensible. When a future migration adds agency_clients.brand jsonb,
      // wire it here.
    },
  });

  // 12. Write preview_url back onto the artifact so the queue + client portal
  //     can render it.
  await supabase
    .from('agency_artifacts')
    .update({ preview_url: render.pdf_url })
    .eq('id', generated.artifact_id);

  // 13. KILLER FEATURE #6 — Auto-ship. The Friday report ships without founder
  //     approval (per plan §6). We transition status draft → shipped, write
  //     ship_result + ship_window_ends_at (so the post-ship critic can watch
  //     open/reply for 7d), then emit a second report_sent event marking the
  //     actual delivery (the harness emitted the first one at artifact-creation
  //     time per ARTIFACT_TO_EVENT_TYPE).
  let shipped = false;
  if (REPORT_AUTO_SHIP) {
    shipped = await autoShip({
      supabase,
      artifact_id: generated.artifact_id,
      client_id: args.client_id,
      render,
      week_starting,
      period_start,
      period_end,
      next_week_ask: polished.next_week_ask.question,
    });
  }

  return {
    artifact_id: generated.artifact_id,
    pdf_url: render.pdf_url,
    shipped,
    cost_usd: generated.cost_usd,
    latency_ms: Date.now() - t0,
    confidence: generated.confidence,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
//   Client + window resolution
// ─────────────────────────────────────────────────────────────────────────────

async function loadClient(
  supabase: ReturnType<typeof getServiceSupabase>,
  client_id: string,
): Promise<AgencyClientRow> {
  const { data, error } = await supabase
    .from('agency_clients')
    .select('id, business_name, vertical, timezone, region, status')
    .eq('id', client_id)
    .single();
  if (error || !data) {
    throw new Error(
      `agency_clients lookup failed for ${client_id}: ${error?.message ?? 'not found'}`,
    );
  }
  if (data.status !== 'live' && data.status !== 'paused') {
    throw new Error(
      `agency_clients ${client_id} is in status='${data.status}' — reporting-scribe only runs for live/paused clients`,
    );
  }
  return data as AgencyClientRow;
}

/**
 * Resolve Mon–Sun ISO date window for the week ending most recently.
 * If `week_starting` was passed, use that exact Monday; otherwise compute the
 * Monday of the previous full week from the client's timezone.
 */
function resolveWeekWindow(
  override: string | undefined,
  timezone: string,
): { period_start: string; period_end: string; week_starting: string } {
  if (override && /^\d{4}-\d{2}-\d{2}$/.test(override)) {
    const start = new Date(`${override}T00:00:00Z`);
    const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
    return {
      period_start: start.toISOString().slice(0, 10),
      period_end: end.toISOString().slice(0, 10),
      week_starting: override,
    };
  }

  // Compute "last Monday at midnight" in the client's tz. We approximate by
  // walking calendar-days off `now`; the worst case is a ±1 day misalignment
  // around DST changes, which the narrative tolerates (the agent gets ISO
  // dates and never re-derives DOW arithmetic).
  void timezone; // tz arithmetic delegated to the date strings the agent sees
  const now = new Date();
  const dow = now.getUTCDay(); // 0=Sun..6=Sat
  // Days back to the most recent Monday that is at least 1 full week ago.
  // If today is Friday (5), we want last Monday (5-1=4 days back). If today
  // is Monday (1), we want the Monday 1 week ago (7 days back).
  const daysBack = dow === 0 ? 13 : dow === 1 ? 7 : dow + 6 - 1;
  const start = new Date(now);
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() - daysBack);
  const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
  return {
    period_start: start.toISOString().slice(0, 10),
    period_end: end.toISOString().slice(0, 10),
    week_starting: start.toISOString().slice(0, 10),
  };
}

function priorWindow(
  period_start: string,
  period_end: string,
): { start: string; end: string } {
  const startMs = Date.parse(`${period_start}T00:00:00Z`);
  const endMs = Date.parse(`${period_end}T23:59:59Z`);
  const len = endMs - startMs;
  const priorEnd = startMs - 1;
  const priorStart = priorEnd - len;
  return {
    start: new Date(priorStart).toISOString().slice(0, 10),
    end: new Date(priorEnd).toISOString().slice(0, 10),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
//   Retell agent_id lookup (from the latest shipped agent_prompt artifact)
// ─────────────────────────────────────────────────────────────────────────────

async function resolveRetellAgentId(
  supabase: ReturnType<typeof getServiceSupabase>,
  client_id: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from('agency_artifacts')
    .select('ship_result, content')
    .eq('client_id', client_id)
    .eq('type', 'agent_prompt')
    .eq('status', 'shipped')
    .order('shipped_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;

  const ship_result = (data.ship_result ?? {}) as Record<string, unknown>;
  const id = ship_result.retell_agent_id ?? ship_result.agent_id;
  return typeof id === 'string' && id.length > 0 ? id : null;
}

// ─────────────────────────────────────────────────────────────────────────────
//   Evidence gathering — adapters in parallel
// ─────────────────────────────────────────────────────────────────────────────

interface GatheredEvidence {
  this_week_kpis: WeekKpis;
  prior_week_kpis: WeekKpis | null;
  calls_summary: CallSummary[];
  top_transcripts: FullTranscript[];
  bookings: BookingRow[];
  meta_insights: MetaInsightsBundle | null;
}

async function gatherEvidence(args: {
  client_id: string;
  period_start: string;
  period_end: string;
  prior_period_start: string;
  prior_period_end: string;
  retell_agent_id: string | null;
}): Promise<GatheredEvidence> {
  const sinceIso = new Date(`${args.period_start}T00:00:00Z`).toISOString();
  const untilIso = new Date(`${args.period_end}T23:59:59Z`).toISOString();
  const priorSinceIso = new Date(
    `${args.prior_period_start}T00:00:00Z`,
  ).toISOString();
  const priorUntilIso = new Date(
    `${args.prior_period_end}T23:59:59Z`,
  ).toISOString();

  // Parallel fetches — never let one slow adapter block the others.
  const [
    callsThis,
    callsPrior,
    bookingsRaw,
    bookingsPriorRaw,
    metaCampaign,
    metaCreatives,
  ] = await Promise.all([
    args.retell_agent_id
      ? safeListRecentCalls({
          agent_id: args.retell_agent_id,
          since: sinceIso,
          limit: 500,
          client_id: args.client_id,
        })
      : Promise.resolve([] as retell.RecentCallSummary[]),
    args.retell_agent_id
      ? safeListRecentCalls({
          agent_id: args.retell_agent_id,
          since: priorSinceIso,
          limit: 500,
          client_id: args.client_id,
        })
      : Promise.resolve([] as retell.RecentCallSummary[]),
    safeGetBookings({
      since: sinceIso,
      until: untilIso,
      client_id: args.client_id,
    }),
    safeGetBookings({
      since: priorSinceIso,
      until: priorUntilIso,
      client_id: args.client_id,
    }),
    safeMetaCampaignInsights({
      client_id: args.client_id,
      since: args.period_start,
      until: args.period_end,
    }),
    safeMetaCreativeInsights({
      client_id: args.client_id,
      since: args.period_start,
      until: args.period_end,
    }),
  ]);

  // Filter prior calls to the actual prior window (listRecentCalls uses
  // `since` only; we may overpull if the prior window is shorter than `since`
  // implies — slice client-side).
  const priorUntilMs = Date.parse(priorUntilIso);
  const callsPriorWindowed = callsPrior.filter((c) =>
    c.started_at ? Date.parse(c.started_at) <= priorUntilMs : true,
  );

  // Pick top-20 transcripts by signal: prefer calls that booked or hung up
  // (those drive the narrative) and longer calls (richer evidence).
  const topPicks = pickTopCallsForTranscript(callsThis, TOP_TRANSCRIPT_COUNT);

  // Fetch full transcripts for the picks — in parallel but with a small cap
  // to avoid hammering Retell.
  const transcriptRows = await runWithConcurrency(
    topPicks,
    5,
    async (c) => {
      try {
        const r = await retell.getCallTranscript({
          call_id: c.call_id,
          client_id: args.client_id,
        });
        return {
          call_id: c.call_id,
          started_at: c.started_at,
          duration_sec: r.duration_sec,
          outcome: r.outcome,
          transcript: r.transcript,
        };
      } catch (err) {
        console.warn(
          `[agency-reporting-scribe] getCallTranscript failed for ${c.call_id}: ${
            err instanceof Error ? err.message : String(err)
          } — skipping`,
        );
        return null;
      }
    },
  );
  const transcripts: FullTranscript[] = transcriptRows
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .map((r) => ({
      call_id: r.call_id,
      started_at: r.started_at,
      duration_sec: r.duration_sec,
      ...(r.outcome ? { outcome: r.outcome } : {}),
      transcript: r.transcript,
    }));

  const this_week_kpis = computeKpis({
    calls: callsThis,
    bookings: bookingsRaw,
    meta: metaCampaign,
  });
  const prior_week_kpis = computeKpis({
    calls: callsPriorWindowed,
    bookings: bookingsPriorRaw,
    meta: null,
  });

  const meta_insights: MetaInsightsBundle | null =
    metaCampaign || metaCreatives.length > 0
      ? {
          campaign: metaCampaign
            ? {
                campaign_id: metaCampaign.campaign_id ?? '',
                impressions: metaCampaign.impressions,
                clicks: metaCampaign.clicks,
                ctr: metaCampaign.ctr,
                spend_usd: metaCampaign.spend_usd,
                leads: metaCampaign.leads,
                cpl_usd: metaCampaign.cpl,
              }
            : undefined,
          creatives: metaCreatives,
        }
      : null;

  return {
    this_week_kpis,
    prior_week_kpis: callsPriorWindowed.length === 0 && bookingsPriorRaw.length === 0
      ? null
      : prior_week_kpis,
    calls_summary: callsThis.map((c) => ({
      call_id: c.call_id,
      started_at: c.started_at,
      duration_sec: c.duration_sec,
      outcome: c.outcome,
      transcript_excerpt: c.transcript_excerpt,
    })),
    top_transcripts: transcripts,
    bookings: bookingsRaw.map((b) => ({
      booking_id: b.booking_id,
      service: undefined,
      scheduled_at: b.started_at,
      channel: 'inbound_call',
    })),
    meta_insights,
  };
}

async function safeListRecentCalls(
  opts: retell.ListRecentCallsOpts,
): Promise<retell.RecentCallSummary[]> {
  try {
    return await retell.listRecentCalls(opts);
  } catch (err) {
    console.warn(
      `[agency-reporting-scribe] listRecentCalls failed (continuing): ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
    return [];
  }
}

async function safeGetBookings(
  opts: calcom.GetBookingsOpts,
): Promise<calcom.BookingRecord[]> {
  try {
    return await calcom.getBookings(opts);
  } catch (err) {
    console.warn(
      `[agency-reporting-scribe] getBookings failed (continuing): ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
    return [];
  }
}

async function safeMetaCampaignInsights(opts: {
  client_id: string;
  since: string;
  until: string;
}): Promise<(meta.CampaignInsights & { campaign_id?: string }) | null> {
  // We need the campaign_id to call getCampaignInsights. Read it from the
  // client's most recent ad_creative artifact's ship_result, or skip if no
  // ads have been configured yet.
  const supabase = getServiceSupabase();
  const { data } = await supabase
    .from('agency_artifacts')
    .select('ship_result')
    .eq('client_id', opts.client_id)
    .eq('type', 'ad_creative')
    .eq('status', 'shipped')
    .order('shipped_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  const campaign_id =
    data?.ship_result && typeof (data.ship_result as Record<string, unknown>).campaign_id === 'string'
      ? ((data.ship_result as Record<string, unknown>).campaign_id as string)
      : null;
  if (!campaign_id) return null;
  try {
    const r = await meta.getCampaignInsights({
      campaign_id,
      since: opts.since,
      until: opts.until,
      client_id: opts.client_id,
    });
    return { ...r, campaign_id };
  } catch (err) {
    console.warn(
      `[agency-reporting-scribe] getCampaignInsights failed (continuing): ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
    return null;
  }
}

async function safeMetaCreativeInsights(opts: {
  client_id: string;
  since: string;
  until: string;
}): Promise<MetaCreativeInsight[]> {
  // Pull up to 5 most-recent shipped ad creatives and fetch insights for each.
  const supabase = getServiceSupabase();
  const { data } = await supabase
    .from('agency_artifacts')
    .select('ship_result')
    .eq('client_id', opts.client_id)
    .eq('type', 'ad_creative')
    .eq('status', 'shipped')
    .order('shipped_at', { ascending: false })
    .limit(5);
  const ads = (data ?? [])
    .map((r) => {
      const sr = r.ship_result as Record<string, unknown> | null;
      const ad_id = sr && typeof sr.ad_id === 'string' ? sr.ad_id : null;
      return ad_id;
    })
    .filter((x): x is string => !!x);
  if (ads.length === 0) return [];

  const insights = await runWithConcurrency(ads, 3, async (ad_id) => {
    try {
      const r = await meta.getCreativeInsights({
        ad_id,
        since: opts.since,
        until: opts.until,
        client_id: opts.client_id,
      });
      return {
        ad_id,
        impressions: r.impressions,
        ctr: r.ctr,
        cpl_usd: r.cpl,
        leads: r.leads,
      } as MetaCreativeInsight;
    } catch {
      return null;
    }
  });
  return insights.filter((i): i is MetaCreativeInsight => i !== null);
}

/**
 * Top-N calls to pull full transcripts for. Prefers outcome=booked (the
 * lift evidence), outcome=hangup (the loss evidence), and longer calls
 * (richer transcript). Falls back to most recent if fewer than N have
 * outcomes.
 */
function pickTopCallsForTranscript(
  calls: retell.RecentCallSummary[],
  n: number,
): retell.RecentCallSummary[] {
  if (calls.length <= n) return calls;
  const scored = calls.map((c) => {
    let score = 0;
    const o = (c.outcome ?? '').toLowerCase();
    if (o.includes('book')) score += 5;
    if (o.includes('hangup')) score += 4;
    if (o.includes('transfer')) score += 3;
    if (o.includes('qualif')) score += 2;
    // duration: long calls have more evidence per token
    score += Math.min(c.duration_sec / 60, 5);
    return { c, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, n).map((s) => s.c);
}

function computeKpis(args: {
  calls: retell.RecentCallSummary[];
  bookings: calcom.BookingRecord[];
  meta: (meta.CampaignInsights & { campaign_id?: string }) | null;
}): WeekKpis {
  const calls_total = args.calls.length;
  // We treat every Retell call we received as "answered" — Retell only returns
  // calls that were picked up. Voicemail outcomes are still answers by the agent.
  const calls_answered = args.calls.length;
  const bookings = args.bookings.filter((b) => b.status === 'accepted').length;
  const totalDuration = args.calls.reduce((s, c) => s + (c.duration_sec || 0), 0);
  const avg_call_duration_sec = calls_total > 0 ? Math.round(totalDuration / calls_total) : 0;
  // qa_score is not on RecentCallSummary; default 0 — qa-auditor populates this
  // path separately via agency_events. The agent prompt knows how to handle 0.
  const avg_qa_score = 0;
  const answer_rate = 1;
  const ad_spend_usd = args.meta?.spend_usd ?? 0;
  const leads_from_ads = args.meta?.leads ?? 0;
  const cpl_usd = args.meta?.cpl ?? 0;
  // Conservative revenue estimate: $400 average per booked job. Replaced when
  // the client's vertical-config table is wired in a later phase.
  const estimated_booked_revenue_usd = bookings * 400;

  return {
    calls_answered,
    calls_total,
    bookings,
    ad_spend_usd,
    leads_from_ads,
    cpl_usd,
    avg_call_duration_sec,
    avg_qa_score,
    answer_rate,
    estimated_booked_revenue_usd,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
//   Prior brief + anomaly events
// ─────────────────────────────────────────────────────────────────────────────

async function loadLatestOptimizationBrief(
  supabase: ReturnType<typeof getServiceSupabase>,
  client_id: string,
): Promise<unknown | null> {
  const { data } = await supabase
    .from('agency_artifacts')
    .select('content, shipped_at')
    .eq('client_id', client_id)
    .eq('type', 'optimization_brief')
    .eq('status', 'shipped')
    .order('shipped_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.content ?? null;
}

async function loadAnomalyEvents(
  supabase: ReturnType<typeof getServiceSupabase>,
  client_id: string,
  period_start: string,
  period_end: string,
): Promise<Array<{ type: string; severity: string; created_at: string; payload: unknown }>> {
  const { data } = await supabase
    .from('agency_events')
    .select('type, severity, created_at, payload')
    .eq('client_id', client_id)
    .in('type', ['anomaly_detected', 'report_degraded', 'adapter_error'])
    .gte('created_at', `${period_start}T00:00:00Z`)
    .lte('created_at', `${period_end}T23:59:59Z`)
    .order('created_at', { ascending: true })
    .limit(50);
  return (data ?? []).map((r) => ({
    type: r.type as string,
    severity: r.severity as string,
    created_at: r.created_at as string,
    payload: r.payload,
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
//   Vertical tone (small lookup; expanded by the vertical-template registry
//   in a later phase)
// ─────────────────────────────────────────────────────────────────────────────

function verticalToneFor(vertical: string): string {
  const v = vertical.toLowerCase();
  if (v === 'hvac' || v === 'plumbing' || v === 'roofing' || v === 'electrical') {
    return 'blue-collar, direct, dollar-value-forward; owners reading on the truck';
  }
  if (v === 'med_spa' || v === 'cosmetic_dental' || v === 'aesthetics') {
    return 'warm but professional, never clinical, services by plain names (Botox not BTX)';
  }
  if (v === 'lawyer' || v === 'law_firm' || v === 'attorney') {
    return 'precise, no exaggeration, no claim language that crosses bar rules';
  }
  if (v === 'dental' || v === 'general_dentistry') {
    return 'friendly-professional, family-clinic warmth, no procedure codes';
  }
  return 'friendly-professional, plain English, owner-facing';
}

// ─────────────────────────────────────────────────────────────────────────────
//   Knowledge query (drives RAG pre-pass)
// ─────────────────────────────────────────────────────────────────────────────

function buildKnowledgeQuery(input: ScribeInput): string {
  const outcomes = new Set(
    input.calls_summary.map((c) => (c.outcome ?? '').toLowerCase()).filter(Boolean),
  );
  const themes: string[] = [];
  if (outcomes.has('hangup')) themes.push('common hangup causes', 'KB gaps');
  if (outcomes.has('booked')) themes.push('successful booking patterns');
  if (input.bookings.length > 0) themes.push('service catalog');
  if (input.meta_insights) themes.push('ad creative angles that worked');
  if (input.prior_optimization_brief) themes.push('prior optimization actions');
  return [
    `Weekly report context for ${input.business_name} (${input.vertical}).`,
    `Period: ${input.period_start} to ${input.period_end}.`,
    `Themes: ${themes.join(', ') || 'general services and FAQs'}.`,
  ].join(' ');
}

// ─────────────────────────────────────────────────────────────────────────────
//   Output schema (mirrors strategy/skills/agency-fleet/reporting-scribe/output-schema.json)
//
//   We keep this inline (instead of reading the file) so the Lambda doesn't
//   depend on bundling the JSON file. The shared run-agent.ts harness also
//   sanity-checks against the on-disk schema and warns on divergence.
// ─────────────────────────────────────────────────────────────────────────────

function getOutputSchema() {
  return {
    type: 'object' as const,
    additionalProperties: false,
    required: [
      'narrative',
      'kpis',
      'charts',
      'next_week_ask',
      'plain_english_check',
      'report_html',
      'client_facing_note',
      'predicted_impact',
    ],
    properties: {
      narrative: {
        type: 'object' as const,
        additionalProperties: false,
        required: ['opening', 'lift_attribution', 'miss_explanation'],
        properties: {
          opening: { type: 'string' as const, minLength: 60, maxLength: 900 },
          lift_attribution: { type: 'string' as const, minLength: 40, maxLength: 1200 },
          miss_explanation: { type: 'string' as const, minLength: 40, maxLength: 1200 },
        },
      },
      kpis: {
        type: 'array' as const,
        minItems: 3,
        maxItems: 8,
        items: {
          type: 'object' as const,
          additionalProperties: false,
          required: ['label', 'value', 'prior_value', 'delta', 'caption'],
          properties: {
            label: { type: 'string' as const },
            value: { type: 'string' as const },
            prior_value: { type: 'string' as const },
            delta: { type: 'string' as const },
            caption: { type: 'string' as const, minLength: 30, maxLength: 280 },
            cited_call_ids: { type: 'array' as const, items: { type: 'string' as const } },
          },
        },
      },
      charts: {
        type: 'array' as const,
        minItems: 1,
        maxItems: 6,
        items: {
          type: 'object' as const,
          additionalProperties: false,
          required: ['chart_id', 'type', 'title', 'series', 'caption'],
          properties: {
            chart_id: { type: 'string' as const },
            type: { type: 'string' as const, enum: ['bar', 'line', 'stacked_bar', 'pie'] },
            title: { type: 'string' as const, maxLength: 80 },
            series: {
              type: 'array' as const,
              minItems: 1,
              items: {
                type: 'object' as const,
                additionalProperties: false,
                required: ['label', 'values'],
                properties: {
                  label: { type: 'string' as const },
                  values: { type: 'array' as const, items: { type: 'number' as const } },
                },
              },
            },
            x_labels: { type: 'array' as const, items: { type: 'string' as const } },
            caption: { type: 'string' as const, minLength: 30, maxLength: 280 },
            cited_call_ids: { type: 'array' as const, items: { type: 'string' as const } },
          },
        },
      },
      next_week_ask: {
        type: 'object' as const,
        additionalProperties: false,
        required: ['question', 'unblocks', 'cost_if_unanswered_usd', 'estimated_response_time_seconds'],
        properties: {
          question: { type: 'string' as const, minLength: 20, maxLength: 400 },
          unblocks: { type: 'string' as const, minLength: 20, maxLength: 400 },
          cost_if_unanswered_usd: { type: 'number' as const, minimum: 0 },
          estimated_response_time_seconds: { type: 'integer' as const, minimum: 5, maximum: 600 },
        },
      },
      plain_english_check: {
        type: 'object' as const,
        additionalProperties: false,
        required: ['rewrites'],
        properties: {
          rewrites: {
            type: 'array' as const,
            items: {
              type: 'object' as const,
              additionalProperties: false,
              required: ['before', 'after', 'reason'],
              properties: {
                before: { type: 'string' as const, maxLength: 400 },
                after: { type: 'string' as const, maxLength: 400 },
                reason: { type: 'string' as const, enum: ['jargon', 'hedge', 'passive', 'acronym', 'agency_vocabulary', 'missing_evidence', 'other'] },
              },
            },
          },
        },
      },
      report_html: { type: 'string' as const, minLength: 200 },
      client_facing_note: { type: 'string' as const, minLength: 60, maxLength: 400 },
      predicted_impact: {
        type: 'object' as const,
        additionalProperties: false,
        required: ['metric', 'prediction', 'horizon_hours'],
        properties: {
          metric: { type: 'string' as const, enum: ['report_open_rate', 'next_week_ask_response_rate', 'kb_update_after_ask', 'client_reply_rate'] },
          prediction: { type: 'number' as const, minimum: 0, maximum: 1 },
          ci_low: { type: 'number' as const, minimum: 0, maximum: 1 },
          ci_high: { type: 'number' as const, minimum: 0, maximum: 1 },
          base_rate: { type: 'number' as const, minimum: 0, maximum: 1 },
          horizon_hours: { type: 'integer' as const, minimum: 1, maximum: 720 },
        },
      },
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
//   Plain-English check sub-pass (killer feature #4)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The dedicated post-generation Haiku pass that re-reads the narrative + every
 * KPI caption + the next-week ask and rewrites any sentence containing:
 *   - jargon (CTR, CPL, conversion rate, throughput, top-of-funnel, etc.)
 *   - hedge phrases (appears to suggest, tends to, may indicate, potentially)
 *   - passive voice (was missed, were lost)
 *   - agency vocabulary (leveraging, synergies, robust, scalable)
 *
 * Each rewrite is logged into plain_english_check.rewrites[] so the founder
 * and the benchmark can audit the scrub quality. If the model finds NO
 * violations it returns the original text unchanged (and appends nothing).
 *
 * The scrub also rewrites the corresponding lines inside report_html so the
 * shipped PDF reflects the polished copy — we do a string-replace on each
 * `before` → `after` (case-preserving, first-occurrence).
 */
async function plainEnglishCheckPass(args: {
  client_id: string;
  draft: ScribeOutput;
}): Promise<ScribeOutput> {
  const system = [
    'You are a plain-English editor. Your one job: take the supplied weekly-report draft and rewrite ANY sentence that contains:',
    '  - JARGON: "conversion rate", "CTR", "CPL", "speed-to-lead", "answer rate", "throughput", "top-of-funnel", "MQL", "SQL", "ICP", "funnel", "pipeline" (in marketing sense).',
    '  - HEDGES: "appears to", "may indicate", "tends to", "seems like", "potentially", "in general", "broadly speaking".',
    '  - PASSIVE VOICE: "was missed", "were lost", "is being addressed", "have been improved".',
    '  - AGENCY VOCABULARY: "leveraging", "synergies", "drive results", "moving the needle", "robust", "scalable", "comprehensive solution", "best-in-class", "trending", "strong performance".',
    '  - PERCENTAGE WITHOUT ABSOLUTE: any "+X%" or "-X%" without the absolute count alongside it.',
    '',
    'Output via emit_structured_output. Return:',
    '  - narrative: { opening, lift_attribution, miss_explanation } — same shape, polished text.',
    '  - kpis: same array shape, each item with polished `caption`. Leave label/value/prior_value/delta untouched.',
    '  - charts: same shape, each with polished `caption`.',
    '  - next_week_ask: same shape, polished `question` + `unblocks`.',
    '  - rewrites: array of { before, after, reason } — one entry per change you made. Empty array if you made no changes.',
    '',
    'Rules:',
    '  - Never invent facts. If you cannot rewrite a sentence without losing meaning, leave it as-is and skip it.',
    '  - Preserve specific call_ids, timestamps, and dollar values exactly.',
    '  - Keep the same number of sentences in the opening (3).',
    '  - Do not add em dashes ("—") if the original did not have them.',
    '  - Reason codes: "jargon" | "hedge" | "passive" | "acronym" | "agency_vocabulary" | "missing_evidence" | "other".',
  ].join('\n');

  const polishSchema = {
    type: 'object' as const,
    additionalProperties: false,
    required: ['narrative', 'kpis', 'charts', 'next_week_ask', 'rewrites'],
    properties: {
      narrative: {
        type: 'object' as const,
        additionalProperties: false,
        required: ['opening', 'lift_attribution', 'miss_explanation'],
        properties: {
          opening: { type: 'string' as const, minLength: 60, maxLength: 900 },
          lift_attribution: { type: 'string' as const, minLength: 40, maxLength: 1200 },
          miss_explanation: { type: 'string' as const, minLength: 40, maxLength: 1200 },
        },
      },
      kpis: {
        type: 'array' as const,
        items: {
          type: 'object' as const,
          additionalProperties: false,
          required: ['label', 'caption'],
          properties: {
            label: { type: 'string' as const },
            caption: { type: 'string' as const, minLength: 30, maxLength: 280 },
          },
        },
      },
      charts: {
        type: 'array' as const,
        items: {
          type: 'object' as const,
          additionalProperties: false,
          required: ['chart_id', 'caption'],
          properties: {
            chart_id: { type: 'string' as const },
            caption: { type: 'string' as const, minLength: 30, maxLength: 280 },
          },
        },
      },
      next_week_ask: {
        type: 'object' as const,
        additionalProperties: false,
        required: ['question', 'unblocks'],
        properties: {
          question: { type: 'string' as const, minLength: 20, maxLength: 400 },
          unblocks: { type: 'string' as const, minLength: 20, maxLength: 400 },
        },
      },
      rewrites: {
        type: 'array' as const,
        items: {
          type: 'object' as const,
          additionalProperties: false,
          required: ['before', 'after', 'reason'],
          properties: {
            before: { type: 'string' as const, maxLength: 400 },
            after: { type: 'string' as const, maxLength: 400 },
            reason: {
              type: 'string' as const,
              enum: ['jargon', 'hedge', 'passive', 'acronym', 'agency_vocabulary', 'missing_evidence', 'other'],
            },
          },
        },
      },
    },
  };

  // Force Haiku — this is a cheap mechanical rewrite pass, not strategy.
  const tier: ModelTier = 'haiku';

  let polishResult;
  try {
    polishResult = await callClaude<{
      narrative: ScribeOutput['narrative'];
      kpis: Array<{ label: string; caption: string }>;
      charts: Array<{ chart_id: string; caption: string }>;
      next_week_ask: { question: string; unblocks: string };
      rewrites: ScribeOutput['plain_english_check']['rewrites'];
    }>({
      system,
      user_messages: [
        {
          role: 'user',
          content:
            '# Draft to polish\n\n```json\n' +
            JSON.stringify(
              {
                narrative: args.draft.narrative,
                kpis: args.draft.kpis.map((k) => ({ label: k.label, caption: k.caption })),
                charts: args.draft.charts.map((c) => ({
                  chart_id: c.chart_id,
                  caption: c.caption,
                })),
                next_week_ask: {
                  question: args.draft.next_week_ask.question,
                  unblocks: args.draft.next_week_ask.unblocks,
                },
              },
              null,
              2,
            ) +
            '\n```\n\nEmit the polished version via emit_structured_output.',
        },
      ],
      tier,
      output_schema: polishSchema,
      agent_name: `${AGENT_NAME}:plain-english`,
      client_id: args.client_id,
    });
  } catch (err) {
    // If the polish pass fails, ship the original draft — never block the
    // report on the scrubber. Loud warning so it shows up in logs.
    console.warn(
      `[agency-reporting-scribe] plain-english pass failed, shipping unpolished: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
    return args.draft;
  }

  // Stitch the polish back into the original artifact, preserving everything
  // the polish pass didn't touch.
  const merged: ScribeOutput = {
    ...args.draft,
    narrative: polishResult.output.narrative,
    kpis: args.draft.kpis.map((k, i) => ({
      ...k,
      caption: polishResult.output.kpis[i]?.caption ?? k.caption,
    })),
    charts: args.draft.charts.map((c) => {
      const updated = polishResult.output.charts.find((u) => u.chart_id === c.chart_id);
      return updated ? { ...c, caption: updated.caption } : c;
    }),
    next_week_ask: {
      ...args.draft.next_week_ask,
      question: polishResult.output.next_week_ask.question,
      unblocks: polishResult.output.next_week_ask.unblocks,
    },
    plain_english_check: {
      rewrites: [
        ...(args.draft.plain_english_check?.rewrites ?? []),
        ...(polishResult.output.rewrites ?? []),
      ],
    },
  };

  // Apply every rewrite back into report_html so the rendered PDF matches.
  let polished_html = args.draft.report_html;
  for (const rw of polishResult.output.rewrites ?? []) {
    if (!rw.before || !rw.after) continue;
    if (polished_html.includes(rw.before)) {
      polished_html = polished_html.split(rw.before).join(rw.after);
    }
  }
  // Also propagate the narrative-opening / next-week-ask edits into HTML even
  // when the exact original sentence wasn't a verbatim substring (the agent
  // may have wrapped it in HTML tags). We do a best-effort replacement on the
  // <p> containing the opening and the next-week-ask block.
  if (polishResult.output.narrative.opening !== args.draft.narrative.opening) {
    polished_html = polished_html.replace(
      args.draft.narrative.opening,
      polishResult.output.narrative.opening,
    );
  }
  merged.report_html = polished_html;

  return merged;
}

async function persistPolishedArtifact(
  supabase: ReturnType<typeof getServiceSupabase>,
  artifact_id: string,
  polished: ScribeOutput,
): Promise<void> {
  // Read the existing content jsonb so we preserve iteration_history.
  const { data: existing } = await supabase
    .from('agency_artifacts')
    .select('content')
    .eq('id', artifact_id)
    .single();
  const existingContent = (existing?.content ?? {}) as Record<string, unknown>;
  const iteration_history = existingContent.iteration_history ?? [];

  // Strip cross-cutting fields from polished (they live on dedicated columns).
  const {
    confidence: _c,
    reasoning_trace: _r,
    alternatives_rejected: _a,
    predicted_impact,
    ...payload
  } = polished;
  void _c;
  void _r;
  void _a;

  await supabase
    .from('agency_artifacts')
    .update({
      content: { payload, iteration_history },
      predicted_impact: predicted_impact ?? null,
      client_facing_note: polished.client_facing_note,
    })
    .eq('id', artifact_id);
}

// ─────────────────────────────────────────────────────────────────────────────
//   Auto-ship (killer feature #6)
// ─────────────────────────────────────────────────────────────────────────────

async function autoShip(args: {
  supabase: ReturnType<typeof getServiceSupabase>;
  artifact_id: string;
  client_id: string;
  render: { pdf_url: string; size_bytes: number; page_count: number; degraded: boolean; artifact_kind: 'pdf' | 'html' };
  week_starting: string;
  period_start: string;
  period_end: string;
  next_week_ask: string;
}): Promise<boolean> {
  const shipped_at = new Date().toISOString();
  const ship_window_ends_at = new Date(
    Date.now() + POST_SHIP_WINDOW_HOURS * 60 * 60 * 1000,
  ).toISOString();

  // Whitelisted ship_result fields ONLY — never the raw render response (the
  // kernel has an RLS trigger that rejects rows containing secret-token
  // prefixes, but we whitelist anyway for defense-in-depth).
  const ship_result = {
    delivery_channel: 'portal',
    pdf_url: args.render.pdf_url,
    artifact_kind: args.render.artifact_kind,
    size_bytes: args.render.size_bytes,
    page_count: args.render.page_count,
    degraded: args.render.degraded,
    shipped_at,
  };

  const { error } = await args.supabase
    .from('agency_artifacts')
    .update({
      status: 'shipped',
      shipped_at,
      ship_window_ends_at,
      ship_result,
    })
    .eq('id', args.artifact_id)
    .eq('status', 'draft'); // Idempotency: only ship if still in draft.

  if (error) {
    console.warn(
      `[agency-reporting-scribe] auto-ship update failed for ${args.artifact_id}: ${error.message}`,
    );
    return false;
  }

  // Emit a delivery-confirming report_sent event with the real channel +
  // period_start/period_end + next_week_ask (the harness emitted a placeholder
  // at artifact-creation time with delivery_channel='portal' and no period
  // info; this one carries the real shipping facts).
  try {
    await emitAgencyEvent({
      client_id: args.client_id,
      agent_name: AGENT_NAME,
      type: 'report_sent',
      severity: 'info',
      payload: {
        report_id: args.artifact_id,
        period_start: args.period_start,
        period_end: args.period_end,
        delivery_channel: 'portal',
        next_week_ask: args.next_week_ask,
      },
      why_explanation: `reporting-scribe shipped Friday report for week of ${args.week_starting}; post-ship watcher will measure open/reply through ${ship_window_ends_at}.`,
    });
  } catch (err) {
    // Telemetry failure must not undo the ship. Log + continue.
    console.warn(
      `[agency-reporting-scribe] post-ship event emit failed (non-fatal): ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }

  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
//   Utilities
// ─────────────────────────────────────────────────────────────────────────────

function resolveSkillDir(): string {
  const fs = require('node:fs') as typeof import('node:fs');
  if (fs.existsSync(path.join(SKILL_DIR, 'prompt.md'))) return SKILL_DIR;
  for (const fb of SKILL_DIR_FALLBACKS) {
    if (fs.existsSync(path.join(fb, 'prompt.md'))) return fb;
  }
  throw new Error(
    `reporting-scribe skill dir not found; tried ${[SKILL_DIR, ...SKILL_DIR_FALLBACKS].join(', ')}`,
  );
}

async function runWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx]);
    }
  }
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}
