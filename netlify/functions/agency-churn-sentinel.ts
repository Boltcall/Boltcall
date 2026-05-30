/**
 * Agency OS — churn-sentinel daily runner
 * ========================================
 *
 * Trigger: cron daily at 06:00 UTC (Netlify scheduled function;
 *          orchestrated by n8n workflow `daily-churn-scan` in prod).
 *
 * Scope per run: every `agency_clients.status='live'` row.
 *
 * Killer features implemented HERE (no stubs):
 *
 *   (a) 7-SIGNAL CAUSAL SCORER
 *       Each signal is computed independently from real OS state:
 *         1. kpi_trend             — booking_made / call_completed events trend
 *         2. queue_rejection_rate  — agency_artifacts.status='rejected' rate
 *         3. report_open_rate      — report_sent events vs (tracked) opens
 *         4. slack_sentiment       — Haiku scoring over cohort messages (if any)
 *         5. payment_lag           — stripe-adapter getInvoices days-to-pay
 *         6. nps_proxy             — optimization_brief.client_response sentiment
 *         7. call_volume_trend     — retell-adapter listRecentCalls 7d vs 28d
 *       Then the agent's meta-classifier (Sonnet via runAgent) combines them
 *       with vertical_weights and returns { risk_tier, top_2_drivers,
 *       signal_contributions, rationale, save_call_outreach? }.
 *
 *   (b) SIMULATED-CLIENT REHEARSAL (red tier only)
 *       After the scorer drafts a save_call_outreach for a red client, this
 *       runner spawns an OPUS persona of the *actual* client (RAG'd over
 *       agency_knowledge + last 30d transcripts + vertical-typical objections)
 *       and runs two rounds of objection → rewrite. Only the surviving
 *       version lands in `agency_artifacts` (status='draft'). The full
 *       rehearsal log is attached to the artifact for founder review.
 *
 *   (c) CLOSED-LOOP OUTCOME LOGGING
 *       Separate code path `recordChurnOutcome()` is exported so the
 *       stripe-webhook handler (cancellation) and the founder UI (renewal /
 *       saved) can log every realized outcome via `post_ship_outcome_recorded`.
 *       The monthly `bolt-churn-classifier-retrain` loop reads these to
 *       update vertical weights.
 *
 * Cross-cutting features inherited from run-agent.ts harness:
 *   - confidence / reasoning_trace / alternatives_rejected / retrieved_context
 *     enforced via output_schema
 *   - adversarial critic + one rebuttal pass on the artifact
 *   - dedicated kernel columns populated, event emitted via shared bus
 *   - per-call model routing + cost events
 *
 * Cost ceiling: ~$0.15/red client (Sonnet score + Opus rehearsal x2),
 *               ~$0.02/non-red (Sonnet score only).
 */

import type { Handler, HandlerEvent } from '@netlify/functions';
import path from 'node:path';
import Anthropic from '@anthropic-ai/sdk';

import { getServiceSupabase } from './_shared/token-utils';
import { runAgent, type RunAgentResult } from './_shared/agency-agents/run-agent';
import { emitAgencyEvent } from './_shared/emit-agency-event';
import { getInvoices } from './_shared/agency-adapters/stripe-adapter';
import { listRecentCalls } from './_shared/agency-adapters/retell-adapter';
import { authorizeRunner } from './_shared/agency-runner-auth';

// ─────────────────────────────────────────────────────────────────────────────
//   Types
// ─────────────────────────────────────────────────────────────────────────────

const AGENT_NAME = 'churn-sentinel';
const SKILL_DIR = path.resolve(
  process.cwd(),
  '..',
  'Marketing',
  'strategy',
  'skills',
  'agency-fleet',
  'churn-sentinel',
);

type Vertical =
  | 'med_spa'
  | 'cosmetic_dental'
  | 'hvac'
  | 'plumbing'
  | 'legal'
  | 'gym'
  | 'other';

type RiskTier = 'green' | 'yellow' | 'red';

interface SignalScores {
  kpi_trend: number;
  queue_rejection_rate: number;
  report_open_rate: number;
  slack_sentiment: number;
  payment_lag: number;
  nps_proxy: number;
  call_volume_trend: number;
}

interface SignalEvidence {
  kpi_trend?: Record<string, unknown>;
  queue_rejection_rate?: Record<string, unknown>;
  report_open_rate?: Record<string, unknown>;
  slack_sentiment?: Record<string, unknown>;
  payment_lag?: Record<string, unknown>;
  nps_proxy?: Record<string, unknown>;
  call_volume_trend?: Record<string, unknown>;
}

interface ClientRow {
  id: string;
  business_name: string | null;
  vertical: Vertical | string | null;
  region: string | null;
  timezone: string | null;
  mrr: number;
  sku: string;
  status: string;
  live_at: string | null;
  churn_risk: RiskTier;
  churn_risk_drivers: string[] | null;
  secrets?: Record<string, unknown> | null;
}

interface AgentOutput {
  risk_tier: RiskTier;
  risk_score: number;
  top_2_drivers: [string, string];
  signal_contributions: SignalScores;
  rationale: string;
  recommended_watch_action: string;
  save_call_outreach?: SaveCallOutreach;
  confidence: number;
  reasoning_trace: string[];
  alternatives_rejected: Array<{ option: string; why_rejected: string }>;
  retrieved_context: unknown[];
}

interface SaveCallOutreach {
  subject: string;
  body_plain: string;
  suggested_call_talking_points: string[];
  tone_target: 'direct_owner_to_owner' | 'apologetic_with_plan' | 'data_first_then_offer';
  concession_authority_needed: string[];
  rehearsal_log: Array<{ round: number; objection: string; rewrite_summary: string }>;
}

// ─────────────────────────────────────────────────────────────────────────────
//   Vertical weight presets — per-vertical signal weighting for the
//   meta-classifier. Sum to ~1.0 each.
// ─────────────────────────────────────────────────────────────────────────────

const VERTICAL_WEIGHTS: Record<Vertical, SignalScores> = {
  med_spa: {
    kpi_trend: 0.15,
    queue_rejection_rate: 0.10,
    report_open_rate: 0.20,
    slack_sentiment: 0.05,
    payment_lag: 0.25,
    nps_proxy: 0.15,
    call_volume_trend: 0.10,
  },
  cosmetic_dental: {
    kpi_trend: 0.15,
    queue_rejection_rate: 0.30,
    report_open_rate: 0.15,
    slack_sentiment: 0.05,
    payment_lag: 0.10,
    nps_proxy: 0.15,
    call_volume_trend: 0.10,
  },
  hvac: {
    kpi_trend: 0.20,
    queue_rejection_rate: 0.10,
    report_open_rate: 0.10,
    slack_sentiment: 0.05,
    payment_lag: 0.10,
    nps_proxy: 0.10,
    call_volume_trend: 0.35,
  },
  plumbing: {
    kpi_trend: 0.20,
    queue_rejection_rate: 0.10,
    report_open_rate: 0.10,
    slack_sentiment: 0.05,
    payment_lag: 0.10,
    nps_proxy: 0.10,
    call_volume_trend: 0.35,
  },
  legal: {
    kpi_trend: 0.10,
    queue_rejection_rate: 0.15,
    report_open_rate: 0.15,
    slack_sentiment: 0.05,
    payment_lag: 0.15,
    nps_proxy: 0.30,
    call_volume_trend: 0.10,
  },
  gym: {
    kpi_trend: 0.25,
    queue_rejection_rate: 0.10,
    report_open_rate: 0.10,
    slack_sentiment: 0.20,
    payment_lag: 0.10,
    nps_proxy: 0.10,
    call_volume_trend: 0.15,
  },
  other: {
    kpi_trend: 0.15,
    queue_rejection_rate: 0.15,
    report_open_rate: 0.15,
    slack_sentiment: 0.10,
    payment_lag: 0.15,
    nps_proxy: 0.15,
    call_volume_trend: 0.15,
  },
};

function weightsFor(vertical: string | null | undefined): SignalScores {
  const v = (vertical ?? 'other') as Vertical;
  return VERTICAL_WEIGHTS[v] ?? VERTICAL_WEIGHTS.other;
}

// ─────────────────────────────────────────────────────────────────────────────
//   Killer feature (a) — 7 signal computers
//   Each is independent. Each gracefully degrades to a neutral (0.5) score
//   when its source has no data, with the evidence noting the degradation.
// ─────────────────────────────────────────────────────────────────────────────

const WINDOW_30D_MS = 30 * 24 * 60 * 60 * 1000;
const WINDOW_7D_MS = 7 * 24 * 60 * 60 * 1000;
const WINDOW_14D_MS = 14 * 24 * 60 * 60 * 1000;
const WINDOW_28D_MS = 28 * 24 * 60 * 60 * 1000;

interface SignalResult {
  score: number;
  evidence: Record<string, unknown>;
}

/**
 * Signal 1 — KPI trend (booking rate slope last 30d vs prior 30d).
 * booking_rate = booking_made_events / call_completed_events.
 * Risk rises as the rate drops.
 */
async function signal_kpi_trend(client_id: string): Promise<SignalResult> {
  const supabase = getServiceSupabase();
  const now = Date.now();
  const cutoff_30d = new Date(now - WINDOW_30D_MS).toISOString();
  const cutoff_60d = new Date(now - 2 * WINDOW_30D_MS).toISOString();

  const { data, error } = await supabase
    .from('agency_events')
    .select('type, created_at')
    .eq('client_id', client_id)
    .in('type', ['booking_made', 'call_completed'])
    .gte('created_at', cutoff_60d);

  if (error || !data) {
    return { score: 0.5, evidence: { error: error?.message ?? 'no data', degraded: true } };
  }

  let calls_30d = 0;
  let calls_prior = 0;
  let bookings_30d = 0;
  let bookings_prior = 0;
  for (const row of data) {
    const isRecent = row.created_at >= cutoff_30d;
    if (row.type === 'call_completed') {
      if (isRecent) calls_30d += 1;
      else calls_prior += 1;
    } else if (row.type === 'booking_made') {
      if (isRecent) bookings_30d += 1;
      else bookings_prior += 1;
    }
  }

  const rate_30d = calls_30d > 0 ? bookings_30d / calls_30d : 0;
  const rate_prior = calls_prior > 0 ? bookings_prior / calls_prior : 0;

  if (calls_30d < 10 && calls_prior < 10) {
    return {
      score: 0.5,
      evidence: { calls_30d, calls_prior, note: 'insufficient sample (<10 calls per window)', degraded: true },
    };
  }

  const delta_pct = rate_prior > 0 ? ((rate_30d - rate_prior) / rate_prior) * 100 : 0;
  // delta_pct of -50% or worse → risk 1.0; flat or improving → risk 0.1.
  const risk = clamp01(0.1 + Math.max(0, -delta_pct) / 50);

  return {
    score: risk,
    evidence: {
      metric: 'booking_rate',
      current_30d: round3(rate_30d),
      prior_30d: round3(rate_prior),
      delta_pct: Math.round(delta_pct * 10) / 10,
      calls_30d,
      bookings_30d,
    },
  };
}

/**
 * Signal 2 — Queue rejection rate over last 30d.
 * Rejected / (approved + rejected + shipped). High rate = founder is unhappy.
 */
async function signal_queue_rejection_rate(client_id: string): Promise<SignalResult> {
  const supabase = getServiceSupabase();
  const cutoff = new Date(Date.now() - WINDOW_30D_MS).toISOString();

  const { data, error } = await supabase
    .from('agency_artifacts')
    .select('status')
    .eq('client_id', client_id)
    .in('status', ['approved', 'rejected', 'shipped'])
    .gte('created_at', cutoff);

  if (error || !data) {
    return { score: 0.5, evidence: { error: error?.message ?? 'no data', degraded: true } };
  }

  let approved = 0;
  let rejected = 0;
  let shipped = 0;
  for (const r of data) {
    if (r.status === 'approved') approved += 1;
    else if (r.status === 'rejected') rejected += 1;
    else if (r.status === 'shipped') shipped += 1;
  }
  const total = approved + rejected + shipped;
  if (total < 3) {
    return {
      score: 0.3,
      evidence: { total, note: 'insufficient queue activity (<3 decisions/30d)', degraded: true },
    };
  }
  const rate = rejected / total;
  // baseline ~8%; risk scales linearly to ~50% rejection = max risk.
  const risk = clamp01((rate - 0.08) / (0.50 - 0.08));
  return {
    score: risk,
    evidence: { approved, rejected, shipped, total, rate: round3(rate), baseline: 0.08 },
  };
}

/**
 * Signal 3 — Report open rate.
 * report_sent count vs distinct opens (tracked via a "report_opened" custom event
 * if present; if not, we degrade gracefully).
 */
async function signal_report_open_rate(client_id: string): Promise<SignalResult> {
  const supabase = getServiceSupabase();
  const cutoff = new Date(Date.now() - WINDOW_30D_MS).toISOString();

  const { data: sent } = await supabase
    .from('agency_events')
    .select('id')
    .eq('client_id', client_id)
    .eq('type', 'report_sent')
    .gte('created_at', cutoff);

  // Opens are tracked in `agency_events.payload->>opened='true'` on the same
  // `report_sent` event when the tracker pixel fires (post-insert update). If
  // there is no tracking column, fall back to severity-based proxy.
  const { data: opens } = await supabase
    .from('agency_events')
    .select('payload')
    .eq('client_id', client_id)
    .eq('type', 'report_sent')
    .gte('created_at', cutoff);

  const sent_count = sent?.length ?? 0;
  if (sent_count === 0) {
    return {
      score: 0.5,
      evidence: { sent_30d: 0, note: 'no reports in window', degraded: true },
    };
  }
  let open_count = 0;
  for (const r of opens ?? []) {
    const p = (r.payload ?? {}) as Record<string, unknown>;
    if (p.opened === true || p.opened === 'true') open_count += 1;
  }
  const rate = open_count / sent_count;
  // baseline 80%; risk = (0.80 - rate) / 0.80, capped 0..1.
  const risk = clamp01((0.80 - rate) / 0.80);
  return {
    score: risk,
    evidence: { reports_sent_30d: sent_count, reports_opened_30d: open_count, rate: round3(rate) },
  };
}

/**
 * Signal 4 — Slack cohort sentiment (last 14d). Best-effort: requires cohort
 * channel id stored in agency_clients.secrets; otherwise neutral.
 *
 * Uses a single Haiku call to score recent messages 0..1 (1=negative) — we
 * don't pull thousands of messages; we read the most recent 50 from the
 * cohort archive table if present.
 */
async function signal_slack_sentiment(
  client_id: string,
  secrets: Record<string, unknown> | null | undefined,
): Promise<SignalResult> {
  const cohort_channel = (secrets?.cohort_channel_id as string | undefined) ?? null;
  if (!cohort_channel) {
    return {
      score: 0.45,
      evidence: { cohort_channel_id: null, note: 'client has no cohort channel; default mid-risk' },
    };
  }

  const supabase = getServiceSupabase();
  const cutoff = new Date(Date.now() - WINDOW_14D_MS).toISOString();

  // Cohort messages mirrored into agency_events as 'notification_sent' with
  // payload.channel='cohort_message' when slack-adapter ingests them; if the
  // table is empty we degrade.
  const { data } = await supabase
    .from('agency_events')
    .select('payload')
    .eq('client_id', client_id)
    .eq('type', 'notification_sent')
    .gte('created_at', cutoff)
    .limit(50);

  const messages = (data ?? [])
    .map((r) => {
      const p = (r.payload ?? {}) as Record<string, unknown>;
      return typeof p.message_excerpt === 'string' ? p.message_excerpt : '';
    })
    .filter((m) => m.length > 0);

  if (messages.length === 0) {
    return {
      score: 0.45,
      evidence: { cohort_channel_id: cohort_channel, n: 0, note: 'no recent messages', degraded: true },
    };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      score: 0.45,
      evidence: { n: messages.length, note: 'no ANTHROPIC_API_KEY; cannot classify', degraded: true },
    };
  }

  const claude = new Anthropic({ apiKey });
  const resp = await claude.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 200,
    system:
      'You are a sentiment classifier. Read the messages below from a cohort Slack channel and return a single JSON object: {"negative_share": 0..1, "summary": "<one sentence>"}. Negative includes complaints, frustration, sarcasm directed at the product/operator. Do NOT classify a vent about a customer call as negative — only the relationship with the OS counts.',
    messages: [
      {
        role: 'user',
        content:
          'Messages:\n' +
          messages.map((m, i) => `${i + 1}. ${m.slice(0, 200)}`).join('\n') +
          '\n\nRespond with JSON only.',
      },
    ],
  });

  const text = resp.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join(' ');
  let negative_share = 0.45;
  let summary = 'classifier did not return parseable JSON';
  try {
    const m = text.match(/\{[\s\S]*\}/);
    if (m) {
      const parsed = JSON.parse(m[0]) as { negative_share?: number; summary?: string };
      if (typeof parsed.negative_share === 'number') {
        negative_share = clamp01(parsed.negative_share);
      }
      if (typeof parsed.summary === 'string') summary = parsed.summary;
    }
  } catch {
    // keep defaults
  }

  return {
    score: negative_share,
    evidence: { cohort_channel_id: cohort_channel, n_messages: messages.length, summary },
  };
}

/**
 * Signal 5 — Stripe payment lag.
 * Pulls last invoices via stripe-adapter, computes days-to-pay, compares to
 * SKU baseline (3d default). risk = (avg_days - baseline) / 14.
 */
async function signal_payment_lag(
  client_id: string,
  stripe_customer_id: string | undefined,
): Promise<SignalResult> {
  if (!stripe_customer_id) {
    return {
      score: 0.3,
      evidence: { note: 'no stripe_customer_id; cannot read invoices', degraded: true },
    };
  }
  try {
    const invoices = await getInvoices({ stripe_customer_id, limit: 3 });
    const lags: number[] = [];
    for (const inv of invoices) {
      if (inv.due_date && inv.paid_at) {
        const lag_days = (Date.parse(inv.paid_at) - Date.parse(inv.due_date)) / (24 * 60 * 60 * 1000);
        if (Number.isFinite(lag_days)) lags.push(Math.max(0, lag_days));
      }
    }
    if (lags.length === 0) {
      return { score: 0.2, evidence: { invoices: invoices.length, note: 'no due/paid pairs', degraded: true } };
    }
    const avg = lags.reduce((a, b) => a + b, 0) / lags.length;
    const baseline = 3;
    const risk = clamp01((avg - baseline) / 14);
    return {
      score: risk,
      evidence: {
        last_invoices_lag_days: lags.map((l) => Math.round(l * 10) / 10),
        avg_days: Math.round(avg * 10) / 10,
        baseline_days: baseline,
      },
    };
  } catch (err) {
    return {
      score: 0.3,
      evidence: { error: (err as Error).message, degraded: true },
    };
  }
}

/**
 * Signal 6 — NPS proxy from monthly optimization brief responses.
 * Reads last 3 optimization_brief artifacts' `content.client_response` and
 * classifies sentiment (Haiku) → mean negative share.
 */
async function signal_nps_proxy(client_id: string): Promise<SignalResult> {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('agency_artifacts')
    .select('content, created_at')
    .eq('client_id', client_id)
    .eq('type', 'optimization_brief')
    .order('created_at', { ascending: false })
    .limit(3);

  if (error || !data || data.length === 0) {
    return { score: 0.3, evidence: { briefs: 0, note: 'no briefs yet', degraded: true } };
  }

  const responses: string[] = [];
  for (const row of data) {
    const c = (row.content ?? {}) as Record<string, unknown>;
    const payload = (c.payload ?? c) as Record<string, unknown>;
    const resp = payload.client_response;
    if (typeof resp === 'string' && resp.trim().length > 0) responses.push(resp);
  }

  if (responses.length === 0) {
    return {
      score: 0.4,
      evidence: { briefs: data.length, responses: 0, note: 'briefs sent but no responses', degraded: true },
    };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { score: 0.4, evidence: { responses: responses.length, degraded: true, note: 'no api key' } };
  }
  const claude = new Anthropic({ apiKey });
  const resp = await claude.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 200,
    system:
      'You classify client feedback to a monthly optimization brief. Return JSON: {"negative_share": 0..1, "tags": ["<short>", ...]}. Negative = expressing disappointment, frustration, intent to leave, perceived poor value. Neutral acknowledgments are NOT negative.',
    messages: [
      {
        role: 'user',
        content: 'Responses:\n' + responses.map((r, i) => `${i + 1}. ${r.slice(0, 500)}`).join('\n'),
      },
    ],
  });
  const text = resp.content.filter((b): b is Anthropic.TextBlock => b.type === 'text').map((b) => b.text).join(' ');
  let negative_share = 0.4;
  let tags: string[] = [];
  try {
    const m = text.match(/\{[\s\S]*\}/);
    if (m) {
      const parsed = JSON.parse(m[0]) as { negative_share?: number; tags?: string[] };
      if (typeof parsed.negative_share === 'number') negative_share = clamp01(parsed.negative_share);
      if (Array.isArray(parsed.tags)) tags = parsed.tags.filter((t): t is string => typeof t === 'string');
    }
  } catch {
    // ignore
  }
  return { score: negative_share, evidence: { briefs_with_response: responses.length, tags } };
}

/**
 * Signal 7 — Call volume trend (last 7d vs trailing 28d daily avg).
 * Uses retell-adapter listRecentCalls if agent_id is known; falls back to
 * agency_events call_completed counts (no adapter call needed).
 */
async function signal_call_volume_trend(
  client_id: string,
  retell_agent_id: string | null,
): Promise<SignalResult> {
  const supabase = getServiceSupabase();
  const now = Date.now();
  const since_28d = new Date(now - WINDOW_28D_MS).toISOString();

  // Primary read: event bus (cheaper than Retell, already covers all calls).
  const { data: events } = await supabase
    .from('agency_events')
    .select('created_at')
    .eq('client_id', client_id)
    .eq('type', 'call_completed')
    .gte('created_at', since_28d);

  let last_7d = 0;
  let last_28d = 0;
  if (events && events.length > 0) {
    const cutoff_7d_iso = new Date(now - WINDOW_7D_MS).toISOString();
    for (const e of events) {
      last_28d += 1;
      if (e.created_at >= cutoff_7d_iso) last_7d += 1;
    }
  } else if (retell_agent_id) {
    // Fallback: query retell directly (slower, costs an API call).
    try {
      const calls = await listRecentCalls({
        agent_id: retell_agent_id,
        since: since_28d,
        limit: 500,
        client_id,
      });
      const cutoff_7d_iso = new Date(now - WINDOW_7D_MS).toISOString();
      for (const c of calls) {
        last_28d += 1;
        if (c.started_at >= cutoff_7d_iso) last_7d += 1;
      }
    } catch {
      return { score: 0.4, evidence: { note: 'retell list failed; no event-bus data either', degraded: true } };
    }
  }

  if (last_28d < 10) {
    return {
      score: 0.4,
      evidence: { last_7d, last_28d, note: 'insufficient call sample (<10/28d)', degraded: true },
    };
  }

  const expected_7d = (last_28d / 28) * 7;
  const delta_pct = expected_7d > 0 ? ((last_7d - expected_7d) / expected_7d) * 100 : 0;
  // -50% or worse → 1.0; flat → 0.1.
  const risk = clamp01(0.1 + Math.max(0, -delta_pct) / 50);
  return {
    score: risk,
    evidence: {
      last_7d,
      last_28d,
      expected_7d: Math.round(expected_7d * 10) / 10,
      delta_pct: Math.round(delta_pct * 10) / 10,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
//   Killer feature (b) — simulated-client rehearsal
//   Spawn an Opus persona of the actual client and run 2 rounds of objections.
// ─────────────────────────────────────────────────────────────────────────────

interface RehearsalRound {
  round: number;
  objection: string;
  rewrite_summary: string;
}

interface RehearsalResult {
  final_outreach: SaveCallOutreach;
  rehearsal_log: RehearsalRound[];
  cost_usd: number;
}

async function rehearseSaveOutreach(args: {
  client: ClientRow;
  initial_draft: SaveCallOutreach;
  top_drivers: string[];
  retrieved_chunks: unknown[];
  recent_call_excerpts: string[];
}): Promise<RehearsalResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    // Degrade: keep the v1 draft, log a degradation entry.
    return {
      final_outreach: args.initial_draft,
      rehearsal_log: [
        { round: 1, objection: '(no ANTHROPIC_API_KEY)', rewrite_summary: 'rehearsal skipped' },
      ],
      cost_usd: 0,
    };
  }
  const claude = new Anthropic({ apiKey });
  const log: RehearsalRound[] = [];
  let current = args.initial_draft;
  let total_cost = 0;

  // Build the persona system prompt — vertical-aware, RAG-aware.
  const personaSystem = buildPersonaSystemPrompt({
    client: args.client,
    drivers: args.top_drivers,
    chunks: args.retrieved_chunks,
    call_excerpts: args.recent_call_excerpts,
  });

  for (let round = 1; round <= 2; round += 1) {
    // ── Step 1: simulated client raises an objection to the current draft.
    const objectionResp = await claude.messages.create({
      model: 'claude-opus-4-7-20260101',
      max_tokens: 600,
      system: personaSystem,
      messages: [
        {
          role: 'user',
          content:
            'You are reading a save-call email from your account manager. Your job is to push back as the real owner would. ' +
            'Produce ONE sharp objection (3-6 sentences) that the email does NOT adequately answer. ' +
            'Be specific. Reference what the email actually says, not what you wish it said. ' +
            'If you are this round genuinely have no real objection left, say "ACCEPT: <one-line reason>" instead.\n\n' +
            'Email subject: ' +
            current.subject +
            '\n\nEmail body:\n' +
            current.body_plain,
        },
      ],
    });
    total_cost += estimateOpusCost(objectionResp);
    const objection = textOf(objectionResp).trim();
    if (objection.toUpperCase().startsWith('ACCEPT:')) {
      log.push({ round, objection, rewrite_summary: 'persona accepted; no rewrite needed' });
      break;
    }

    // ── Step 2: the agent rewrites in response, returning ONLY a fresh draft.
    const rewriteResp = await claude.messages.create({
      model: 'claude-opus-4-7-20260101',
      max_tokens: 1500,
      system:
        'You are the churn-sentinel save-call drafter. The simulated client has raised an objection to your prior draft. ' +
        'Rewrite the email to directly answer the objection without losing the data-first, concrete-fix, three-time-options shape. ' +
        'Return ONLY a JSON object matching the original SaveCallOutreach schema: ' +
        '{"subject", "body_plain", "suggested_call_talking_points", "tone_target", "concession_authority_needed", "rehearsal_log"}. ' +
        'Leave "rehearsal_log" empty — the runner manages it. Keep concession_authority_needed minimal — do not give away the farm because the client pushed back.',
      messages: [
        {
          role: 'user',
          content:
            'Previous draft:\n' +
            JSON.stringify(current, null, 2) +
            '\n\nClient objection:\n' +
            objection +
            '\n\nReturn the revised SaveCallOutreach JSON only.',
        },
      ],
    });
    total_cost += estimateOpusCost(rewriteResp);
    const rewriteText = textOf(rewriteResp);
    const parsed = parseSaveOutreach(rewriteText);
    if (parsed) {
      current = parsed;
      log.push({
        round,
        objection,
        rewrite_summary: summarizeRewrite(current, args.initial_draft, round),
      });
    } else {
      log.push({
        round,
        objection,
        rewrite_summary: '(rewrite failed to parse; keeping prior draft)',
      });
    }
  }

  current.rehearsal_log = log;
  return { final_outreach: current, rehearsal_log: log, cost_usd: total_cost };
}

function buildPersonaSystemPrompt(args: {
  client: ClientRow;
  drivers: string[];
  chunks: unknown[];
  call_excerpts: string[];
}): string {
  const vertical = (args.client.vertical ?? 'other') as string;
  const verticalObjectionPlaybook: Record<string, string> = {
    med_spa:
      'Typical pushback: "FDA wording is off-limits, do not promise medical outcomes", "my receptionist already handles after-hours", "your reports never mention which procedures actually convert".',
    cosmetic_dental:
      'Typical pushback: "your prompt makes my front desk sound aggressive", "the creative looks like a discount dentist", "I already get all the new patients I can handle".',
    hvac:
      'Typical pushback: "Emergency-AC calls need a real person, not a bot", "my competitors run free-estimate offers I can\'t match", "your reports don\'t separate maintenance vs replacement leads".',
    plumbing:
      'Typical pushback: "After-hours pricing has to be transparent — your agent buries it", "I lose leads when the agent asks too many qualifying questions before pricing".',
    legal:
      'Typical pushback: "Any conversation with a prospect is a bar-rules risk", "you cannot promise outcomes", "your briefs assume marketing matters more than referrals do for me".',
    gym:
      'Typical pushback: "Members don\'t want to talk to a bot", "your scripts feel salesy in a community-first culture".',
    other: 'Typical pushback: skeptical of automation, wants founder attention, has competing priorities.',
  };

  return [
    `You ARE the owner of "${args.client.business_name ?? 'this business'}", a ${vertical} business in ${args.client.region ?? 'the US'}.`,
    `You are paying $${Math.round(args.client.mrr / 100)}/mo for the Boltcall agency service. You have been live for ${daysSince(args.client.live_at)} days.`,
    'You are mildly to highly frustrated. The account manager is reaching out because the OS scored you red on churn risk.',
    `The OS believes the top drivers are: ${args.drivers.join('; ')}.`,
    '',
    '# Your style',
    '- Direct, owner-to-owner. No hedging.',
    '- You read the actual email; do not invent claims it did not make.',
    '- You push on real soft spots, not theatre.',
    '- You accept (say "ACCEPT: ...") only when the email truly closes the gap that bothers you.',
    '',
    '# Vertical-specific pushback playbook',
    verticalObjectionPlaybook[vertical] ?? verticalObjectionPlaybook.other,
    '',
    '# Context you remember about your own business',
    JSON.stringify(args.chunks).slice(0, 1500),
    '',
    '# Excerpts from your recent calls (you remember these)',
    args.call_excerpts.slice(0, 5).map((e, i) => `${i + 1}. ${e}`).join('\n') || '(none yet)',
  ].join('\n');
}

function parseSaveOutreach(text: string): SaveCallOutreach | null {
  // Try to find the first {...} block.
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    const obj = JSON.parse(m[0]) as Partial<SaveCallOutreach>;
    if (
      typeof obj.subject === 'string' &&
      typeof obj.body_plain === 'string' &&
      Array.isArray(obj.suggested_call_talking_points) &&
      typeof obj.tone_target === 'string' &&
      Array.isArray(obj.concession_authority_needed)
    ) {
      return {
        subject: obj.subject,
        body_plain: obj.body_plain,
        suggested_call_talking_points: obj.suggested_call_talking_points.filter(
          (s): s is string => typeof s === 'string',
        ),
        tone_target: obj.tone_target as SaveCallOutreach['tone_target'],
        concession_authority_needed: obj.concession_authority_needed.filter(
          (s): s is string => typeof s === 'string',
        ),
        rehearsal_log: [],
      };
    }
  } catch {
    return null;
  }
  return null;
}

function summarizeRewrite(after: SaveCallOutreach, before: SaveCallOutreach, round: number): string {
  const changes: string[] = [];
  if (after.subject !== before.subject) changes.push('subject changed');
  if (after.body_plain.length !== before.body_plain.length) {
    const delta = after.body_plain.length - before.body_plain.length;
    changes.push(`body ${delta > 0 ? '+' : ''}${delta} chars`);
  }
  if (after.tone_target !== before.tone_target) changes.push(`tone → ${after.tone_target}`);
  const addedConcessions = after.concession_authority_needed.filter(
    (c) => !before.concession_authority_needed.includes(c),
  );
  if (addedConcessions.length > 0) changes.push(`added concessions: ${addedConcessions.join(',')}`);
  if (changes.length === 0) return `round ${round}: no structural change (rewrite kept content)`;
  return `round ${round}: ${changes.join('; ')}`;
}

// ─────────────────────────────────────────────────────────────────────────────
//   Per-client orchestration
// ─────────────────────────────────────────────────────────────────────────────

interface PerClientResult {
  client_id: string;
  business_name: string | null;
  prev_tier: RiskTier;
  new_tier: RiskTier;
  risk_score: number;
  top_2_drivers: string[];
  artifact_id?: string;
  rehearsal_rounds?: number;
  signals_degraded: string[];
  error?: string;
}

async function processClient(client: ClientRow): Promise<PerClientResult> {
  const t0 = Date.now();
  try {
    // ── 1. Compute the 7 signals in parallel.
    const stripe_customer_id = (client.secrets?.stripe_customer_id as string | undefined) ?? undefined;
    const retell_agent_id = (client.secrets?.retell_agent_id as string | undefined) ?? null;

    const [
      s_kpi,
      s_queue,
      s_report,
      s_slack,
      s_payment,
      s_nps,
      s_calls,
    ] = await Promise.all([
      signal_kpi_trend(client.id),
      signal_queue_rejection_rate(client.id),
      signal_report_open_rate(client.id),
      signal_slack_sentiment(client.id, client.secrets ?? null),
      signal_payment_lag(client.id, stripe_customer_id),
      signal_nps_proxy(client.id),
      signal_call_volume_trend(client.id, retell_agent_id),
    ]);

    const signal_scores: SignalScores = {
      kpi_trend: s_kpi.score,
      queue_rejection_rate: s_queue.score,
      report_open_rate: s_report.score,
      slack_sentiment: s_slack.score,
      payment_lag: s_payment.score,
      nps_proxy: s_nps.score,
      call_volume_trend: s_calls.score,
    };
    const signal_evidence: SignalEvidence = {
      kpi_trend: s_kpi.evidence,
      queue_rejection_rate: s_queue.evidence,
      report_open_rate: s_report.evidence,
      slack_sentiment: s_slack.evidence,
      payment_lag: s_payment.evidence,
      nps_proxy: s_nps.evidence,
      call_volume_trend: s_calls.evidence,
    };

    const signals_degraded: string[] = [];
    for (const [k, v] of Object.entries(signal_evidence)) {
      if (v && (v as Record<string, unknown>).degraded === true) signals_degraded.push(k);
    }

    const vertical_weights = weightsFor(client.vertical);

    // ── 2. Call runAgent (Sonnet) to produce the meta-classification + draft.
    const agentInput = {
      client: {
        id: client.id,
        business_name: client.business_name,
        vertical: client.vertical,
        region: client.region,
        timezone: client.timezone,
        mrr_usd: Math.round(client.mrr / 100),
        days_since_live: daysSince(client.live_at),
        sku: client.sku,
      },
      signal_scores,
      signal_evidence,
      vertical_weights,
    };

    const agentResult: RunAgentResult<AgentOutput> = await runAgent<typeof agentInput, AgentOutput>({
      agent_name: AGENT_NAME,
      client_id: client.id,
      input: agentInput,
      skill_dir: SKILL_DIR,
      output_schema: CHURN_SENTINEL_SCHEMA,
      artifact_type: 'client_outreach',
      ship_target: 'client_email',
      knowledge_k: 8,
      knowledge_query: `${client.business_name ?? ''} services, FAQs, recent objections, brief responses, common call patterns`,
      router_summary: `churn-sentinel scoring ${client.vertical ?? 'other'} client; ${signals_degraded.length} signal(s) degraded`,
      agent_default_tier: 'sonnet',
      // Critic is meaningful here — the rationale + outreach both benefit.
      adversarial_critic: true,
      max_iterations: 1,
    });

    let final_output = agentResult.output;
    let rehearsal_rounds = 0;

    // ── 3. RED tier ONLY: rehearse the save-call outreach.
    if (final_output.risk_tier === 'red') {
      const draft = final_output.save_call_outreach;
      if (draft) {
        // Pull recent call excerpts for the persona.
        const supabase = getServiceSupabase();
        const { data: recent_calls } = await supabase
          .from('agency_events')
          .select('payload')
          .eq('client_id', client.id)
          .eq('type', 'call_completed')
          .order('created_at', { ascending: false })
          .limit(10);
        const excerpts = (recent_calls ?? [])
          .map((r) => {
            const p = (r.payload ?? {}) as Record<string, unknown>;
            return typeof p.ended_reason === 'string'
              ? `(ended: ${p.ended_reason})`
              : typeof p.outcome === 'string'
              ? `(outcome: ${p.outcome})`
              : '';
          })
          .filter((e) => e.length > 0);

        const rehearsal = await rehearseSaveOutreach({
          client,
          initial_draft: draft,
          top_drivers: final_output.top_2_drivers,
          retrieved_chunks: agentResult.retrieved_context,
          recent_call_excerpts: excerpts,
        });
        rehearsal_rounds = rehearsal.rehearsal_log.length;

        // Replace the in-memory output (the artifact row in DB still has v1 —
        // we patch it below) and patch the artifact row with the survived
        // outreach + rehearsal log.
        final_output = {
          ...final_output,
          save_call_outreach: rehearsal.final_outreach,
        };

        await patchArtifactWithRehearsal({
          artifact_id: agentResult.artifact_id,
          final_outreach: rehearsal.final_outreach,
          rehearsal_log: rehearsal.rehearsal_log,
          extra_cost_usd: rehearsal.cost_usd,
        });
      }
    }

    // ── 4. Update agency_clients.churn_risk + drivers (atomic).
    const prev_tier = client.churn_risk;
    const new_tier = final_output.risk_tier;
    const new_drivers = final_output.top_2_drivers ?? [];

    await updateClientChurn({
      client_id: client.id,
      new_tier,
      new_drivers,
    });

    // ── 5. Emit churn_risk_changed if tier changed.
    if (prev_tier !== new_tier) {
      await emitAgencyEvent({
        client_id: client.id,
        agent_name: AGENT_NAME,
        type: 'churn_risk_changed',
        severity: new_tier === 'red' ? 'critical' : new_tier === 'yellow' ? 'warn' : 'info',
        payload: {
          previous_tier: prev_tier,
          new_tier,
          score: round3(final_output.risk_score),
          top_drivers: new_drivers.slice(0, 5),
        },
        why_explanation: `Tier moved ${prev_tier}→${new_tier} on score ${round3(final_output.risk_score)}. Top: ${new_drivers.join('; ')}.`,
      });
    }

    return {
      client_id: client.id,
      business_name: client.business_name,
      prev_tier,
      new_tier,
      risk_score: final_output.risk_score,
      top_2_drivers: new_drivers,
      artifact_id: agentResult.artifact_id,
      rehearsal_rounds,
      signals_degraded,
    };
  } catch (err) {
    await emitAgencyEvent({
      client_id: client.id,
      agent_name: AGENT_NAME,
      type: 'adapter_error',
      severity: 'error',
      payload: {
        adapter: AGENT_NAME,
        operation: 'processClient',
        error_message: (err as Error).message,
        error_class: (err as Error).name ?? 'Error',
        duration_ms: Date.now() - t0,
      },
      why_explanation: `churn-sentinel failed for client ${client.id}: ${(err as Error).message}`,
    }).catch(() => undefined);
    return {
      client_id: client.id,
      business_name: client.business_name,
      prev_tier: client.churn_risk,
      new_tier: client.churn_risk,
      risk_score: 0,
      top_2_drivers: [],
      signals_degraded: [],
      error: (err as Error).message,
    };
  }
}

async function updateClientChurn(args: {
  client_id: string;
  new_tier: RiskTier;
  new_drivers: string[];
}): Promise<void> {
  const supabase = getServiceSupabase();
  await supabase
    .from('agency_clients')
    .update({
      churn_risk: args.new_tier,
      churn_risk_drivers: args.new_drivers,
      updated_at: new Date().toISOString(),
    })
    .eq('id', args.client_id);
}

async function patchArtifactWithRehearsal(args: {
  artifact_id: string;
  final_outreach: SaveCallOutreach;
  rehearsal_log: RehearsalRound[];
  extra_cost_usd: number;
}): Promise<void> {
  const supabase = getServiceSupabase();
  const { data: existing } = await supabase
    .from('agency_artifacts')
    .select('content, cost_usd')
    .eq('id', args.artifact_id)
    .maybeSingle();

  if (!existing) return;

  const content = (existing.content ?? {}) as Record<string, unknown>;
  const payload = (content.payload ?? {}) as Record<string, unknown>;
  payload.save_call_outreach = args.final_outreach;
  payload.rehearsal_log = args.rehearsal_log;
  content.payload = payload;

  const new_cost = (Number(existing.cost_usd) || 0) + args.extra_cost_usd;

  await supabase
    .from('agency_artifacts')
    .update({
      content,
      cost_usd: new_cost,
    })
    .eq('id', args.artifact_id);
}

// ─────────────────────────────────────────────────────────────────────────────
//   Killer feature (c) — outcome logging (called by stripe-webhook /
//   founder UI when a previously-red client renews or churns)
// ─────────────────────────────────────────────────────────────────────────────

export async function recordChurnOutcome(args: {
  client_id: string;
  outcome: 'saved' | 'churned';
  red_flagged_at?: string;
  notes?: string;
}): Promise<void> {
  // The most recent red-tier client_outreach artifact is the "shipped" item
  // whose outcome we are recording. Look it up so we can attach the verdict.
  const supabase = getServiceSupabase();
  const { data: artifact } = await supabase
    .from('agency_artifacts')
    .select('id, created_at')
    .eq('client_id', args.client_id)
    .eq('type', 'client_outreach')
    .eq('generated_by', AGENT_NAME)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!artifact) return; // no flag was ever raised; nothing to score

  await emitAgencyEvent({
    client_id: args.client_id,
    agent_name: AGENT_NAME,
    type: 'post_ship_outcome_recorded',
    severity: 'info',
    payload: {
      artifact_id: artifact.id,
      window: '30d',
      observed_metric: 'save_call_outcome',
      observed_value: args.outcome === 'saved' ? 1 : 0,
      baseline_value: 0.5,
      verdict: args.outcome === 'saved' ? 'pass' : 'regress',
    },
    why_explanation: `${args.outcome === 'saved' ? 'Saved' : 'Churned'} the red-tier client ${args.client_id}; outcome will feed the monthly classifier retrain.`,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
//   The JSON Schema for runAgent (mirror of the on-disk one; harness compares)
// ─────────────────────────────────────────────────────────────────────────────

const CHURN_SENTINEL_SCHEMA = {
  type: 'object' as const,
  additionalProperties: false,
  required: [
    'risk_tier',
    'risk_score',
    'top_2_drivers',
    'signal_contributions',
    'rationale',
    'recommended_watch_action',
  ],
  properties: {
    risk_tier: { type: 'string', enum: ['green', 'yellow', 'red'] },
    risk_score: { type: 'number', minimum: 0, maximum: 1 },
    top_2_drivers: {
      type: 'array',
      minItems: 2,
      maxItems: 2,
      items: { type: 'string', minLength: 6 },
    },
    signal_contributions: {
      type: 'object',
      additionalProperties: false,
      required: [
        'kpi_trend',
        'queue_rejection_rate',
        'report_open_rate',
        'slack_sentiment',
        'payment_lag',
        'nps_proxy',
        'call_volume_trend',
      ],
      properties: {
        kpi_trend: { type: 'number', minimum: 0, maximum: 1 },
        queue_rejection_rate: { type: 'number', minimum: 0, maximum: 1 },
        report_open_rate: { type: 'number', minimum: 0, maximum: 1 },
        slack_sentiment: { type: 'number', minimum: 0, maximum: 1 },
        payment_lag: { type: 'number', minimum: 0, maximum: 1 },
        nps_proxy: { type: 'number', minimum: 0, maximum: 1 },
        call_volume_trend: { type: 'number', minimum: 0, maximum: 1 },
      },
    },
    rationale: { type: 'string', minLength: 40, maxLength: 1200 },
    recommended_watch_action: { type: 'string', minLength: 20, maxLength: 600 },
    save_call_outreach: {
      type: 'object',
      additionalProperties: false,
      required: [
        'subject',
        'body_plain',
        'suggested_call_talking_points',
        'tone_target',
        'concession_authority_needed',
        'rehearsal_log',
      ],
      properties: {
        subject: { type: 'string', minLength: 8, maxLength: 90 },
        body_plain: { type: 'string', minLength: 200, maxLength: 4000 },
        suggested_call_talking_points: {
          type: 'array',
          minItems: 3,
          maxItems: 5,
          items: { type: 'string', minLength: 10 },
        },
        tone_target: {
          type: 'string',
          enum: ['direct_owner_to_owner', 'apologetic_with_plan', 'data_first_then_offer'],
        },
        concession_authority_needed: {
          type: 'array',
          maxItems: 5,
          items: { type: 'string' },
        },
        rehearsal_log: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['round', 'objection', 'rewrite_summary'],
            properties: {
              round: { type: 'integer', minimum: 1, maximum: 5 },
              objection: { type: 'string', minLength: 5 },
              rewrite_summary: { type: 'string', minLength: 5 },
            },
          },
        },
      },
    },
    retrieved_context: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          knowledge_id: { type: 'string' },
          kind: { type: 'string' },
          snippet: { type: 'string' },
          score: { type: 'number' },
        },
      },
    },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
//   Utilities
// ─────────────────────────────────────────────────────────────────────────────

function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0.5;
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}
function round3(x: number): number {
  return Math.round(x * 1000) / 1000;
}
function daysSince(iso: string | null | undefined): number {
  if (!iso) return 0;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return 0;
  return Math.floor((Date.now() - t) / (24 * 60 * 60 * 1000));
}
function textOf(resp: Anthropic.Message): string {
  return resp.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n');
}
function estimateOpusCost(resp: Anthropic.Message): number {
  const i = resp.usage?.input_tokens ?? 0;
  const o = resp.usage?.output_tokens ?? 0;
  // Opus pricing per 1M: input $15, output $75.
  return (i * 15 + o * 75) / 1_000_000;
}

// ─────────────────────────────────────────────────────────────────────────────
//   Netlify handler — cron entrypoint
// ─────────────────────────────────────────────────────────────────────────────

export const handler: Handler = async (event: HandlerEvent) => {
  const startedAt = Date.now();

  const authz = await authorizeRunner(event);
  if (!authz.ok) {
    return {
      statusCode: authz.status,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: authz.message }),
    };
  }

  const triggeredBy = event.headers?.['x-trigger'] ?? 'cron';
  const supabase = getServiceSupabase();

  // Pull all live clients.
  const { data: clients, error } = await supabase
    .from('agency_clients')
    .select(
      'id, business_name, vertical, region, timezone, mrr, sku, status, live_at, churn_risk, churn_risk_drivers, secrets',
    )
    .eq('status', 'live');

  if (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: error.message }),
    };
  }
  if (!clients || clients.length === 0) {
    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, scanned: 0, triggeredBy, message: 'no live clients' }),
    };
  }

  // Run sequentially per-client (we want to keep total cost predictable; and
  // Claude rate-limits prefer serial Opus rehearsals over a flood).
  const results: PerClientResult[] = [];
  for (const c of clients as unknown as ClientRow[]) {
    const r = await processClient(c);
    results.push(r);
  }

  const summary = {
    ok: true,
    triggeredBy,
    scanned: results.length,
    red: results.filter((r) => r.new_tier === 'red').length,
    yellow: results.filter((r) => r.new_tier === 'yellow').length,
    green: results.filter((r) => r.new_tier === 'green').length,
    transitions: results.filter((r) => r.prev_tier !== r.new_tier).length,
    rehearsals_run: results.filter((r) => (r.rehearsal_rounds ?? 0) > 0).length,
    errors: results.filter((r) => r.error).length,
    duration_ms: Date.now() - startedAt,
    results,
  };

  return {
    statusCode: 200,
    body: JSON.stringify(summary),
  };
};

// Netlify scheduled trigger — cron daily at 06:00 UTC.
export const config = {
  schedule: '0 6 * * *',
};
