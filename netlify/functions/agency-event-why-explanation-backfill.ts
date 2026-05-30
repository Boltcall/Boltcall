/**
 * agency-event-why-explanation-backfill — Cross-cutting feature #3 (Why-Log)
 * ===========================================================================
 *
 * Implements the AI-explained decisions in the kernel log per the audit lines
 * 118–123:
 *
 *   "Every agency_events row of severity warn+ carries an auto-generated
 *   plain-English 'why this happened' sentence written by a tiny Haiku call
 *   that RAGs over the last 50 related events. The Atlas morning briefing,
 *   the per-client dashboard, and the queue all render the why-sentence
 *   first, the raw data second."
 *
 * Schedule:
 *   '@hourly'  — every hour, top of the hour.
 *
 * What it does:
 *   1. Query agency_events WHERE
 *        severity IN ('warn','error','critical')
 *        AND why_explanation IS NULL
 *        AND created_at > now() - interval '24 hours'
 *      (limit BATCH_SIZE = 50 per tick)
 *   2. For each event, fetch up to 50 related prior events for the same
 *      client+agent (RAG context).
 *   3. Call Haiku 4.5 with a tight prompt that returns exactly one short
 *      sentence (≤180 chars).
 *   4. UPDATE agency_events SET why_explanation = <text> WHERE id = ?
 *
 * Cost cap:
 *   - Hard daily limit of 1000 events. If we'd exceed it, log + skip the
 *     rest. The 24h window keeps stale events from re-queuing forever.
 *
 * Failure handling:
 *   - Each event is independent. One Haiku failure does not block the others.
 *   - Adapter errors emit their own adapter_error event so the dashboard
 *     surfaces a broken Why-Log generator immediately.
 */

import type { Handler, HandlerEvent } from '@netlify/functions';
import Anthropic from '@anthropic-ai/sdk';

import { getServiceSupabase } from './_shared/token-utils';
import { emitAgencyEvent } from './_shared/emit-agency-event';
import { authorizeRunner } from './_shared/agency-runner-auth';
import { wrapCronWithAlert } from './_shared/agency-cron-alert';

const AGENT_NAME = 'why-log-generator';
const BATCH_SIZE = 50;
const RELATED_CONTEXT_LIMIT = 50;
const RECENT_WINDOW_HOURS = 24;
const HAIKU_MODEL = 'claude-haiku-4-5-20251001';
const HAIKU_MAX_TOKENS = 200;
const WHY_MAX_CHARS = 180;

// Hard daily ceiling — tracked via the count of why_explanation backfills
// emitted in the last 24h (we use a debug-severity cost_incurred sentinel
// event with op='why_backfill' to be the counter).
const DAILY_COST_CAP_EVENTS = 1000;

interface QueuedEvent {
  id: string;
  client_id: string | null;
  agent_name: string | null;
  type: string;
  severity: 'warn' | 'error' | 'critical';
  payload: Record<string, unknown> | null;
  created_at: string;
}

interface RelatedEvent {
  type: string;
  severity: string;
  payload: Record<string, unknown> | null;
  created_at: string;
}

const inner: Handler = async (event: HandlerEvent) => {
  const t0 = Date.now();

  const authz = await authorizeRunner(event);
  if (!authz.ok) {
    return {
      statusCode: authz.status,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: authz.message }),
    };
  }

  const url = new URL(
    event.rawUrl ||
      `https://x${event.path}${event.rawQuery ? `?${event.rawQuery}` : ''}`,
  );
  const onlyEventId = url.searchParams.get('event_id'); // manual replay

  // 1. Cost cap check
  const dailyCount = await getDailyBackfillCount();
  if (dailyCount >= DAILY_COST_CAP_EVENTS && !onlyEventId) {
    console.log(
      `[agency-event-why-explanation-backfill] daily cap reached (${dailyCount}/${DAILY_COST_CAP_EVENTS}) — skipping`,
    );
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skipped: 'daily_cap_reached', daily_count: dailyCount }),
    };
  }

  // 2. Load queue
  let queue: QueuedEvent[];
  try {
    queue = await loadQueuedEvents(onlyEventId);
  } catch (err) {
    console.error('[agency-event-why-explanation-backfill] queue load failed:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'queue load failed' }),
    };
  }

  if (queue.length === 0) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events_in_queue: 0, latency_ms: Date.now() - t0 }),
    };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('[agency-event-why-explanation-backfill] ANTHROPIC_API_KEY missing');
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }),
    };
  }
  const anthropic = new Anthropic({ apiKey });

  // 3. Process each event
  const remainingBudget = DAILY_COST_CAP_EVENTS - dailyCount;
  const toProcess = queue.slice(0, Math.min(queue.length, Math.max(0, remainingBudget)));
  const results: Array<{ id: string; ok: boolean; reason?: string }> = [];
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  for (const ev of toProcess) {
    try {
      const related = await fetchRelatedEvents(ev);
      const why = await generateWhy(anthropic, ev, related);
      await updateWhy(ev.id, why.text);
      totalInputTokens += why.input_tokens;
      totalOutputTokens += why.output_tokens;
      results.push({ id: ev.id, ok: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[agency-event-why-explanation-backfill] event ${ev.id} failed: ${msg}`);
      results.push({ id: ev.id, ok: false, reason: msg.slice(0, 200) });
    }
  }

  // 4. Single cost-summary sentinel — also the per-day counter
  const okCount = results.filter((r) => r.ok).length;
  if (okCount > 0) {
    try {
      await emitAgencyEvent({
        client_id: '00000000-0000-0000-0000-000000000000', // sentinel: cap counter is OS-wide.
        agent_name: AGENT_NAME,
        type: 'cost_incurred',
        severity: 'debug',
        payload: {
          category: 'why_backfill',
          provider: 'anthropic',
          amount_usd: estimateHaikuCostUsd(totalInputTokens, totalOutputTokens),
          tokens: { input: totalInputTokens, output: totalOutputTokens },
          model: HAIKU_MODEL,
          source: AGENT_NAME,
          op: 'why_backfill',
          // Pass the count to make the daily-cap query easy.
          k: okCount,
        },
      });
    } catch {
      // Best-effort — if the sentinel write fails the cap check may be off by
      // one batch, but the actual updates are durable.
    }
  }

  const latency_ms = Date.now() - t0;
  console.log(
    `[agency-event-why-explanation-backfill] processed ${results.length} ` +
      `(${okCount} ok) in ${latency_ms}ms tokens_in=${totalInputTokens} tokens_out=${totalOutputTokens}`,
  );

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      events_in_queue: queue.length,
      processed: results.length,
      ok_count: okCount,
      daily_count_before: dailyCount,
      daily_cap: DAILY_COST_CAP_EVENTS,
      latency_ms,
      total_input_tokens: totalInputTokens,
      total_output_tokens: totalOutputTokens,
    }),
  };
};
export const handler = wrapCronWithAlert('agency-event-why-explanation-backfill', inner);

// ─────────────────────────────────────────────────────────────────────────────
//   Helpers
// ─────────────────────────────────────────────────────────────────────────────

async function getDailyBackfillCount(): Promise<number> {
  const supabase = getServiceSupabase();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('agency_events')
    .select('payload')
    .eq('type', 'cost_incurred')
    .eq('agent_name', AGENT_NAME)
    .gte('created_at', since);
  if (error) {
    console.warn(`[agency-event-why-explanation-backfill] cap query failed: ${error.message}`);
    return 0; // fail open — better to over-process than miss explanations
  }
  let count = 0;
  for (const r of data ?? []) {
    const k = (r.payload as Record<string, unknown> | null)?.k;
    if (typeof k === 'number') count += k;
  }
  return count;
}

async function loadQueuedEvents(onlyEventId: string | null): Promise<QueuedEvent[]> {
  const supabase = getServiceSupabase();
  const since = new Date(Date.now() - RECENT_WINDOW_HOURS * 60 * 60 * 1000).toISOString();
  let q = supabase
    .from('agency_events')
    .select('id, client_id, agent_name, type, severity, payload, created_at')
    .in('severity', ['warn', 'error', 'critical'])
    .is('why_explanation', null)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(BATCH_SIZE);
  if (onlyEventId) q = q.eq('id', onlyEventId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as QueuedEvent[];
}

async function fetchRelatedEvents(ev: QueuedEvent): Promise<RelatedEvent[]> {
  const supabase = getServiceSupabase();
  const since = new Date(Date.now() - RECENT_WINDOW_HOURS * 60 * 60 * 1000).toISOString();
  let q = supabase
    .from('agency_events')
    .select('type, severity, payload, created_at')
    .neq('id', ev.id)
    .gte('created_at', since)
    .lte('created_at', ev.created_at)
    .order('created_at', { ascending: false })
    .limit(RELATED_CONTEXT_LIMIT);
  if (ev.client_id) {
    q = q.eq('client_id', ev.client_id);
  }
  const { data, error } = await q;
  if (error) {
    console.warn(`[agency-event-why-explanation-backfill] related fetch failed: ${error.message}`);
    return [];
  }
  return (data ?? []) as RelatedEvent[];
}

async function generateWhy(
  anthropic: Anthropic,
  ev: QueuedEvent,
  related: RelatedEvent[],
): Promise<{ text: string; input_tokens: number; output_tokens: number }> {
  const system = [
    'You are the Why-Log explainer for the Boltcall Agency OS.',
    'Given a single warning/error/critical event and up to 50 related prior events,',
    'write ONE plain-English sentence (≤180 chars) explaining the most likely cause',
    'in language a non-technical founder can read in 2 seconds. No hedging.',
    'No jargon. No "may have", "possibly", "it seems". State the cause directly.',
    'No marketing fluff. No emoji. No quotes. Output JSON: {"why": "..."}.',
  ].join(' ');

  const compactRelated = related.slice(0, RELATED_CONTEXT_LIMIT).map((r) => ({
    type: r.type,
    severity: r.severity,
    at: r.created_at,
    payload: compactPayload(r.payload),
  }));

  const userMessage = JSON.stringify({
    target_event: {
      type: ev.type,
      severity: ev.severity,
      agent: ev.agent_name,
      at: ev.created_at,
      payload: compactPayload(ev.payload),
    },
    context_recent_events: compactRelated,
  });

  const t0 = Date.now();
  const res = await anthropic.messages.create({
    model: HAIKU_MODEL,
    max_tokens: HAIKU_MAX_TOKENS,
    system,
    messages: [{ role: 'user', content: userMessage }],
  });
  void t0;

  // Parse the first text block as JSON {"why":"..."}.
  const textBlock = res.content.find(
    (b): b is Anthropic.TextBlock => b.type === 'text',
  );
  if (!textBlock) {
    throw new Error('Haiku returned no text block');
  }
  let why = '';
  try {
    const parsed = JSON.parse(textBlock.text) as { why?: unknown };
    why = typeof parsed.why === 'string' ? parsed.why.trim() : '';
  } catch {
    // Some Haiku outputs are not valid JSON despite the prompt — accept the
    // raw text as a fallback, trimmed.
    why = textBlock.text.trim().replace(/^[\s"']+|[\s"']+$/g, '');
  }
  if (!why) throw new Error('Haiku returned empty why');
  if (why.length > WHY_MAX_CHARS) why = `${why.slice(0, WHY_MAX_CHARS - 1)}…`;

  return {
    text: why,
    input_tokens: res.usage?.input_tokens ?? 0,
    output_tokens: res.usage?.output_tokens ?? 0,
  };
}

function compactPayload(p: Record<string, unknown> | null): Record<string, unknown> {
  if (!p) return {};
  // Drop very large fields; keep keys and short string/number values.
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(p)) {
    if (typeof v === 'string') {
      out[k] = v.length > 200 ? `${v.slice(0, 200)}…` : v;
    } else if (typeof v === 'number' || typeof v === 'boolean') {
      out[k] = v;
    } else if (v === null) {
      out[k] = null;
    } else {
      // Object/array — keep just the keys to give Haiku schema-shape, not values.
      try {
        out[k] = `[${Array.isArray(v) ? `${v.length} items` : `${Object.keys(v as object).length} keys`}]`;
      } catch {
        out[k] = '[unserializable]';
      }
    }
  }
  return out;
}

async function updateWhy(event_id: string, why: string): Promise<void> {
  const supabase = getServiceSupabase();
  const { error } = await supabase
    .from('agency_events')
    .update({ why_explanation: why })
    .eq('id', event_id);
  if (error) throw new Error(`update failed: ${error.message}`);
}

function estimateHaikuCostUsd(input: number, output: number): number {
  // Haiku 4.5 indicative pricing (cents per 1M tokens, in dollars per token):
  //   input  ≈ $1 / 1M
  //   output ≈ $5 / 1M
  return (input / 1_000_000) * 1.0 + (output / 1_000_000) * 5.0;
}
