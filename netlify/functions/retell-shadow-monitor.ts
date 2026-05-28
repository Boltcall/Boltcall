import { Handler } from '@netlify/functions';
import { getSupabase } from './_shared/token-utils';

/**
 * retell-shadow-monitor
 *
 * W4 — Evaluates shadowing prompt versions after 48 h and decides:
 *   PROMOTE → status 'live'   if shadow book rate >= baseline * 0.95
 *   REVERT  → status 'reverted' if shadow book rate < baseline * 0.95
 *             (also reverts if no data after 96 h — conservative default)
 *
 * Intended as a cron target (every 4 h) or manual trigger.
 * POST {} — no required body; dry_run:true skips DB writes and Retell calls.
 *
 * Book rate = booked / (booked + no_outcome + hung_up) calls.
 * Vendor, wrong_number, and transferred calls are excluded from the count
 * because they don't reflect prompt quality.
 */

const HEADERS = { 'Content-Type': 'application/json' };
const RETELL_API = 'https://api.retellai.com';

// Shadow window before evaluation
const SHADOW_WINDOW_H = 48;
// Force-revert if still no data after this long
const MAX_SHADOW_H = 96;
// Minimum qualifying calls to compute a statistically meaningful rate
const MIN_SHADOW_CALLS = 15;
// Book rate must not drop by more than this fraction relative to baseline
const REVERT_THRESHOLD_RELATIVE = 0.05; // 5%
// Baseline window: 30 days before shadow started
const BASELINE_DAYS = 30;
// Fallback book rate when no baseline data exists
const FALLBACK_BASELINE_RATE = 0.20;

// Outcomes that count toward the book rate denominator (exclude vendor/wrong_number/transferred)
const QUALIFYING_OUTCOMES = new Set(['booked', 'no_outcome', 'hung_up']);

async function retellFetch(path: string, options: RequestInit = {}) {
  const key = process.env.RETELL_API_KEY;
  if (!key) throw new Error('RETELL_API_KEY not configured');
  const res = await fetch(`${RETELL_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  if (res.status === 204) return null;
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || data?.error || `Retell API error ${res.status}`);
  return data;
}

function bookRate(calls: { outcome: string }[]): number | null {
  const qualifying = calls.filter(c => QUALIFYING_OUTCOMES.has(c.outcome));
  if (qualifying.length === 0) return null;
  const booked = qualifying.filter(c => c.outcome === 'booked').length;
  return booked / qualifying.length;
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST' && event.httpMethod !== 'GET') {
    return { statusCode: 405, headers: HEADERS, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let dry_run = false;
  try {
    if (event.body) {
      const body = JSON.parse(event.body);
      dry_run = body.dry_run === true;
    }
  } catch { /* ignore parse errors for GET */ }

  const supabase = getSupabase();
  const now = new Date();

  // Find all shadowing versions where at least 48 h have passed
  const shadowCutoff = new Date(now.getTime() - SHADOW_WINDOW_H * 3600 * 1000).toISOString();
  const { data: versions, error: versErr } = await supabase
    .from('retell_prompt_versions')
    .select('id, vertical, prompt_text, shadow_started_at, rollback_data, shadow_agent_ids')
    .eq('status', 'shadowing')
    .lt('shadow_started_at', shadowCutoff);

  if (versErr) {
    console.error('[shadow-monitor] Failed to query shadowing versions:', versErr);
    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ error: 'DB query failed' }) };
  }

  if (!versions?.length) {
    return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: true, evaluated: 0, message: 'No versions ready for evaluation' }) };
  }

  const results: any[] = [];

  for (const version of versions) {
    const shadowStart: string = version.shadow_started_at;
    const shadowEnd = now.toISOString();
    const shadowAgeH = (now.getTime() - new Date(shadowStart).getTime()) / 3600000;

    // Shadow window calls
    const { data: shadowCalls } = await supabase
      .from('retell_calls')
      .select('outcome')
      .eq('vertical', version.vertical)
      .gte('started_at', shadowStart)
      .lte('started_at', shadowEnd);

    const shadowRate = bookRate(shadowCalls || []);
    const shadowQualifying = (shadowCalls || []).filter(c => QUALIFYING_OUTCOMES.has(c.outcome)).length;

    // Not enough data yet — wait, unless we've hit the 96 h max
    if (shadowRate === null || shadowQualifying < MIN_SHADOW_CALLS) {
      if (shadowAgeH < MAX_SHADOW_H) {
        console.log(`[shadow-monitor] Version ${version.id} (${version.vertical}): insufficient data (${shadowQualifying} calls, ${shadowAgeH.toFixed(1)}h elapsed), waiting`);
        results.push({ version_id: version.id, decision: 'waiting', shadow_qualifying: shadowQualifying, age_h: Math.round(shadowAgeH) });
        continue;
      }
      // Past max window — revert conservatively
      console.warn(`[shadow-monitor] Version ${version.id}: no data after ${shadowAgeH.toFixed(1)}h, reverting conservatively`);
    }

    // Baseline calls (30 days before shadow_started_at)
    const baselineStart = new Date(new Date(shadowStart).getTime() - BASELINE_DAYS * 86400000).toISOString();
    const { data: baselineCalls } = await supabase
      .from('retell_calls')
      .select('outcome')
      .eq('vertical', version.vertical)
      .gte('started_at', baselineStart)
      .lt('started_at', shadowStart);

    const baselineRate = bookRate(baselineCalls || []) ?? FALLBACK_BASELINE_RATE;

    const effectiveRate = shadowRate ?? 0;
    const threshold = baselineRate * (1 - REVERT_THRESHOLD_RELATIVE);
    const decision: 'promote' | 'revert' = effectiveRate >= threshold ? 'promote' : 'revert';

    console.log(`[shadow-monitor] Version ${version.id} (${version.vertical}): ${decision} | shadow=${(effectiveRate * 100).toFixed(1)}% baseline=${(baselineRate * 100).toFixed(1)}% threshold=${(threshold * 100).toFixed(1)}%`);

    if (!dry_run) {
      if (decision === 'promote') {
        // Mark this version live
        await supabase
          .from('retell_prompt_versions')
          .update({ status: 'live', shadow_ended_at: shadowEnd, applied_at: shadowEnd })
          .eq('id', version.id);

        // Retire any older live version for this vertical
        await supabase
          .from('retell_prompt_versions')
          .update({ status: 'superseded', retired_at: shadowEnd })
          .eq('vertical', version.vertical)
          .eq('status', 'live')
          .neq('id', version.id);

      } else {
        // Revert: re-push original prompts to each Retell agent
        const rollbackData = (version.rollback_data || {}) as Record<string, { llm_id: string; original_prompt: string }>;
        const revertErrors: string[] = [];

        for (const [retellAgentId, { llm_id, original_prompt }] of Object.entries(rollbackData)) {
          try {
            await retellFetch(`/v2/retell-llm/${llm_id}`, {
              method: 'PATCH',
              body: JSON.stringify({ general_prompt: original_prompt }),
            });
          } catch (err: any) {
            const msg = `agent ${retellAgentId}: ${err?.message || err}`;
            console.error(`[shadow-monitor] Revert failed for ${msg}`);
            revertErrors.push(msg);
          }
        }

        await supabase
          .from('retell_prompt_versions')
          .update({ status: 'reverted', shadow_ended_at: shadowEnd, retired_at: shadowEnd })
          .eq('id', version.id);

        if (revertErrors.length) {
          console.error(`[shadow-monitor] ${revertErrors.length} agent(s) failed to revert for version ${version.id}`);
        }
      }

      // Emit event (best-effort)
      supabase.from('aios_event_log').insert({
        event_type: `retell_shadow_${decision}d`,
        channel: 'voice',
        subject_id: version.id,
        sentiment: decision === 'promote' ? 'positive' : 'negative',
        payload: {
          version_id: version.id,
          vertical: version.vertical,
          decision,
          shadow_book_rate: Math.round(effectiveRate * 1000) / 1000,
          baseline_book_rate: Math.round(baselineRate * 1000) / 1000,
          shadow_qualifying: shadowQualifying,
          age_h: Math.round(shadowAgeH),
        },
        ts: shadowEnd,
      }).then(({ error }) => {
        if (error) console.error('[shadow-monitor] aios_event_log write failed:', error);
      });

      // Update shadow_book_rate column for analytics
      supabase
        .from('retell_prompt_versions')
        .update({ shadow_book_rate: Math.round(effectiveRate * 10000) / 10000 })
        .eq('id', version.id)
        .then(({ error }) => {
          if (error) console.error('[shadow-monitor] shadow_book_rate update failed:', error);
        });
    }

    results.push({
      version_id: version.id,
      vertical: version.vertical,
      decision,
      dry_run,
      shadow_book_rate: Math.round(effectiveRate * 1000) / 1000,
      baseline_book_rate: Math.round(baselineRate * 1000) / 1000,
      shadow_qualifying: shadowQualifying,
    });
  }

  return {
    statusCode: 200,
    headers: HEADERS,
    body: JSON.stringify({ ok: true, evaluated: results.length, results }),
  };
};
