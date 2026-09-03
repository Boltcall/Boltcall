import { Handler } from '@netlify/functions';
import { getServiceSupabase } from './_shared/token-utils';
import { authorizeRunner } from './_shared/agency-runner-auth';
import { withLegacyHandler } from './_shared/runtime-compat';

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

// A call counts as booked if the transcript heuristic said so OR a confirmed
// appointment row is linked to it (appointments.call_id — stronger signal).
function bookRate(
  calls: { call_id?: string; outcome: string }[],
  confirmed: Set<string> = new Set(),
): number | null {
  const qualifying = calls.filter(c => QUALIFYING_OUTCOMES.has(c.outcome) || confirmed.has(c.call_id || ''));
  if (qualifying.length === 0) return null;
  const booked = qualifying.filter(c => c.outcome === 'booked' || confirmed.has(c.call_id || '')).length;
  return booked / qualifying.length;
}

/** Call ids with a confirmed appointment linked (appointments.call_id). */
async function confirmedCallIds(supabase: any, callIds: string[]): Promise<Set<string>> {
  const ids = new Set<string>();
  for (let i = 0; i < callIds.length; i += 200) {
    const { data } = await supabase
      .from('appointments')
      .select('call_id')
      .in('call_id', callIds.slice(i, i + 200));
    for (const row of data || []) if (row.call_id) ids.add(row.call_id);
  }
  return ids;
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
  try {
    if (event.body) {
      const body = JSON.parse(event.body);
      dry_run = body.dry_run === true;
    }
  } catch { /* ignore parse errors for GET */ }

  const supabase = getServiceSupabase();
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

  const results: any[] = [];

  for (const version of versions || []) {
    const shadowStart: string = version.shadow_started_at;
    const shadowEnd = now.toISOString();
    const shadowAgeH = (now.getTime() - new Date(shadowStart).getTime()) / 3600000;

    // Shadow window calls
    const { data: shadowCalls } = await supabase
      .from('retell_calls')
      .select('call_id, outcome')
      .eq('vertical', version.vertical)
      .gte('started_at', shadowStart)
      .lte('started_at', shadowEnd);

    const shadowConfirmed = await confirmedCallIds(supabase, (shadowCalls || []).map(c => c.call_id));
    const shadowRate = bookRate(shadowCalls || [], shadowConfirmed);
    const shadowQualifying = (shadowCalls || []).filter(c => QUALIFYING_OUTCOMES.has(c.outcome) || shadowConfirmed.has(c.call_id)).length;

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
      .select('call_id, outcome')
      .eq('vertical', version.vertical)
      .gte('started_at', baselineStart)
      .lt('started_at', shadowStart);

    const baselineConfirmed = await confirmedCallIds(supabase, (baselineCalls || []).map(c => c.call_id));
    const baselineRate = bookRate(baselineCalls || [], baselineConfirmed) ?? FALLBACK_BASELINE_RATE;

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

  // ─── A/B experiments (status 'ab_testing', started by retell-ab-start) ────
  // Variant runs as a SECOND Retell agent with traffic split at call-creation.
  // Winner promotion: variant beats control on confirmed book rate → patch the
  // base LLM with the variant prompt and delete the variant agent. Loser or
  // inconclusive past 2x window → delete variant, revert.
  const { data: abVersions } = await supabase
    .from('retell_prompt_versions')
    .select('id, vertical, agent_id, prompt_text, shadow_started_at, rollback_data')
    .eq('status', 'ab_testing');

  for (const version of abVersions || []) {
    const exp = ((version.rollback_data || {}) as any).experiment || {};
    const startedAt: string | null = version.shadow_started_at;
    const baseAgentId: string | undefined = exp.base_retell_agent_id;
    const variantAgentId: string | undefined = exp.variant_retell_agent_id;
    if (!startedAt || !baseAgentId || !variantAgentId) {
      console.warn(`[shadow-monitor] AB version ${version.id} malformed experiment metadata, skipping`);
      continue;
    }
    const windowH = Number(exp.evaluation_window_hours) || SHADOW_WINDOW_H;
    const ageH = (now.getTime() - new Date(startedAt).getTime()) / 3600000;
    if (ageH < windowH) {
      results.push({ version_id: version.id, mode: 'ab', decision: 'waiting', age_h: Math.round(ageH) });
      continue;
    }

    const nowIso = now.toISOString();
    const { data: variantCalls } = await supabase
      .from('retell_calls')
      .select('call_id, outcome')
      .eq('retell_agent_id', variantAgentId)
      .gte('started_at', startedAt);
    const { data: controlCalls } = await supabase
      .from('retell_calls')
      .select('call_id, outcome')
      .eq('retell_agent_id', baseAgentId)
      .gte('started_at', startedAt);

    const confirmed = await confirmedCallIds(
      supabase,
      [...(variantCalls || []), ...(controlCalls || [])].map(c => c.call_id),
    );
    const qualifies = (c: { call_id: string; outcome: string }) =>
      QUALIFYING_OUTCOMES.has(c.outcome) || confirmed.has(c.call_id);
    const variantN = (variantCalls || []).filter(qualifies).length;
    const controlN = (controlCalls || []).filter(qualifies).length;
    const variantRate = bookRate(variantCalls || [], confirmed);
    const controlRate = bookRate(controlCalls || [], confirmed);

    const enoughData = variantN >= MIN_SHADOW_CALLS && controlN >= MIN_SHADOW_CALLS && variantRate !== null && controlRate !== null;
    // Inconclusive: the window auto-extends once (2x); past that, retire.
    if (!enoughData && ageH < windowH * 2) {
      results.push({ version_id: version.id, mode: 'ab', decision: 'waiting', variant_n: variantN, control_n: controlN, age_h: Math.round(ageH) });
      continue;
    }

    const decision: 'promote' | 'revert' = enoughData && (variantRate as number) > (controlRate as number) ? 'promote' : 'revert';
    console.log(`[shadow-monitor] AB version ${version.id}: ${decision} | variant=${((variantRate ?? 0) * 100).toFixed(1)}% (n=${variantN}) control=${((controlRate ?? 0) * 100).toFixed(1)}% (n=${controlN})`);

    if (!dry_run) {
      if (decision === 'promote' && exp.base_llm_id) {
        try {
          await retellFetch(`/v2/retell-llm/${exp.base_llm_id}`, {
            method: 'PATCH',
            body: JSON.stringify({ general_prompt: version.prompt_text }),
          });
          // Mirror to the Supabase agent row so the dashboard shows the live prompt
          if (version.agent_id) {
            await supabase
              .from('agents')
              .update({ system_prompt: version.prompt_text, system_prompt_synced_at: nowIso })
              .eq('id', version.agent_id);
          }
        } catch (err) {
          console.error(`[shadow-monitor] AB promote failed to patch base LLM for ${version.id}:`, err);
          results.push({ version_id: version.id, mode: 'ab', decision: 'error', detail: String(err) });
          continue;
        }
      }

      // Either way the variant agent + its LLM are torn down.
      try {
        await retellFetch(`/delete-agent/${variantAgentId}`, { method: 'DELETE' });
      } catch (err) {
        console.warn(`[shadow-monitor] variant agent delete failed for ${version.id}:`, err);
      }
      if (exp.variant_llm_id) {
        try {
          await retellFetch(`/delete-retell-llm/${exp.variant_llm_id}`, { method: 'DELETE' });
        } catch (err) {
          console.warn(`[shadow-monitor] variant LLM delete failed for ${version.id}:`, err);
        }
      }

      if (decision === 'promote') {
        await supabase
          .from('retell_prompt_versions')
          .update({ status: 'live', shadow_ended_at: nowIso, applied_at: nowIso, shadow_book_rate: Math.round((variantRate ?? 0) * 10000) / 10000 })
          .eq('id', version.id);
        await supabase
          .from('retell_prompt_versions')
          .update({ status: 'superseded', retired_at: nowIso })
          .eq('vertical', version.vertical)
          .eq('status', 'live')
          .neq('id', version.id);
      } else {
        await supabase
          .from('retell_prompt_versions')
          .update({ status: 'reverted', shadow_ended_at: nowIso, retired_at: nowIso, shadow_book_rate: Math.round((variantRate ?? 0) * 10000) / 10000 })
          .eq('id', version.id);
      }

      supabase.from('aios_event_log').insert({
        event_type: `retell_ab_${decision}d`,
        channel: 'voice',
        subject_id: version.id,
        sentiment: decision === 'promote' ? 'positive' : 'negative',
        payload: {
          version_id: version.id,
          vertical: version.vertical,
          decision,
          variant_book_rate: Math.round((variantRate ?? 0) * 1000) / 1000,
          control_book_rate: Math.round((controlRate ?? 0) * 1000) / 1000,
          variant_n: variantN,
          control_n: controlN,
          age_h: Math.round(ageH),
        },
        ts: nowIso,
      }).then(({ error }) => {
        if (error) console.error('[shadow-monitor] aios_event_log write failed:', error);
      });
    }

    results.push({
      version_id: version.id,
      mode: 'ab',
      decision,
      dry_run,
      variant_book_rate: Math.round((variantRate ?? 0) * 1000) / 1000,
      control_book_rate: Math.round((controlRate ?? 0) * 1000) / 1000,
      variant_n: variantN,
      control_n: controlN,
    });
  }

  return {
    statusCode: 200,
    headers: HEADERS,
    body: JSON.stringify({ ok: true, evaluated: results.length, results }),
  };
};

export const testHandler = handler;
export default withLegacyHandler(handler);
