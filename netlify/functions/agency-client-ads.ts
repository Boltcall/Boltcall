import { withLegacyHandler } from './_shared/runtime-compat';
/**
 * agency-client-ads.ts — Client-facing creative review surface (Bolt System SKU only).
 * ====================================================================================
 *
 * GET /.netlify/functions/agency-client-ads
 *
 * Resolves the calling JWT → client_id (via agency_clients.user_id), enforces
 * sku='bolt_system', and returns:
 *
 *   {
 *     client: { id, business_name, vertical, sku },
 *     live_creatives: [
 *       {
 *         ad_id, image_url, headline, primary_text, angle,
 *         impressions, ctr, cpl_usd, leads, spend_usd?,
 *         shipped_at,
 *         ai_commentary: "Variant B is leading: 22% lower CPL than your
 *                         historical median for this vertical, driven by the
 *                         'before/after' frame.",
 *         vertical_median_cpl_usd, vertical_median_ctr,
 *         source_artifact_id
 *       }, …
 *     ],
 *     queued_creatives: [
 *       {
 *         artifact_id, created_at, status: 'draft',
 *         variants: [
 *           {
 *             seed, angle, image_url, headline, primary_text, cta,
 *             predicted_ctr, predicted_cpl_usd, ctr_ci_low, ctr_ci_high,
 *             cpl_ci_low, cpl_ci_high, predictor_model,
 *             rationale: "This one targets price-shoppers with a deposit-required hook.",
 *             angle_history: { wins: N, losses: N, avg_ctr },
 *             compliance_notes: [{ kind, finding }]
 *           }, …
 *         ],
 *         agent_reasoning: [...3 bullets from reasoning_trace]
 *       }, …
 *     ]
 *   }
 *
 * The AI commentary for LIVE creatives is generated on each call via a small
 * Sonnet call. Cheap because typically N≤5. The QUEUED creative rationale is
 * baked into the artifact at creation time by creative-foundry (we read it
 * straight from content.payload).
 *
 * The endpoint is JWT-authed against the user's session (client portal — no
 * service-role bearer). Defense in depth: even though RLS is in place, we
 * resolve client_id explicitly and verify the artifact/event ownership before
 * returning anything.
 */

import type { Handler, HandlerEvent } from '@netlify/functions';

import { getServiceSupabase } from './_shared/token-utils';
import { getCreativeInsights, type CreativeInsights } from './_shared/agency-adapters/meta-ads-adapter';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json',
};

const LIVE_INSIGHTS_LOOKBACK_DAYS = 14;
const LIVE_CREATIVE_LIMIT = 8;
const QUEUED_LIMIT = 12;

// ─────────────────────────────────────────────────────────────────────────────
//   Types
// ─────────────────────────────────────────────────────────────────────────────

interface ClientRow {
  id: string;
  user_id: string;
  business_name: string | null;
  vertical: string | null;
  sku: string | null;
  status: string;
}

interface VariantPayload {
  seed?: number;
  angle?: string;
  image_url?: string;
  headline?: string;
  primary_text?: string;
  cta?: string;
  predicted_ctr?: number;
  predicted_cpl_usd?: number;
  ctr_ci_low?: number;
  ctr_ci_high?: number;
  cpl_ci_low?: number;
  cpl_ci_high?: number;
  rationale?: string;
  compliance_findings?: Array<{ kind: string; finding: string; resolution?: string }>;
}

interface QueuedCreative {
  artifact_id: string;
  created_at: string;
  status: string;
  variants: Array<{
    seed: number | null;
    angle: string;
    image_url: string;
    headline: string;
    primary_text: string;
    cta: string;
    predicted_ctr: number | null;
    predicted_cpl_usd: number | null;
    ctr_ci_low: number | null;
    ctr_ci_high: number | null;
    cpl_ci_low: number | null;
    cpl_ci_high: number | null;
    predictor_model: string;
    rationale: string;
    angle_history: { wins: number; losses: number; avg_ctr: number | null };
    compliance_notes: Array<{ kind: string; finding: string }>;
  }>;
  agent_reasoning: string[];
}

interface LiveCreative {
  ad_id: string;
  image_url: string;
  headline: string;
  primary_text: string;
  angle: string;
  impressions: number;
  ctr: number;
  cpl_usd: number;
  leads: number;
  shipped_at: string;
  ai_commentary: string;
  vertical_median_cpl_usd: number | null;
  vertical_median_ctr: number | null;
  source_artifact_id: string;
}

// Coarse per-vertical baselines, same shape as creative-foundry's
// VERTICAL_CTR_PRIOR. We use them to give the AI commentary a yard-stick when
// the client has no historical data of their own yet.
const VERTICAL_CTR_MEDIAN: Record<string, number> = {
  medspa: 0.0185, legal: 0.0120, hvac: 0.0210, dental: 0.0170, medical: 0.0150,
  roofing: 0.0190, plumber: 0.0205, electrical: 0.0180, solar: 0.0145,
  auto: 0.0195, fitness: 0.0155, pest_control: 0.0200, real_estate: 0.0135,
  restaurant: 0.0220,
};
const VERTICAL_CPL_MEDIAN: Record<string, number> = {
  medspa: 22.0, legal: 65.0, hvac: 18.0, dental: 28.0, medical: 35.0,
  roofing: 24.0, plumber: 16.0, electrical: 19.0, solar: 42.0, auto: 21.0,
  fitness: 14.0, pest_control: 17.0, real_estate: 38.0, restaurant: 9.0,
};

// ─────────────────────────────────────────────────────────────────────────────
//   Handler
// ─────────────────────────────────────────────────────────────────────────────

const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const supabase = getServiceSupabase();

  // JWT → user_id
  const authHeader = event.headers['authorization'] || event.headers['Authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized — bearer token required' }) };
  }
  const { data: userResult, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !userResult?.user) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Invalid token' }) };
  }
  const user_id = userResult.user.id;

  // Resolve client (explicit ownership check — defense in depth alongside RLS).
  const { data: clientRow, error: clientErr } = await supabase
    .from('agency_clients')
    .select('id, user_id, business_name, vertical, sku, status')
    .eq('user_id', user_id)
    .not('status', 'in', '(churned,paused)')
    .maybeSingle();
  if (clientErr) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Lookup failed', detail: clientErr.message }) };
  }
  if (!clientRow) {
    return { statusCode: 404, headers, body: JSON.stringify({ error: 'No active client account for this user' }) };
  }
  const client = clientRow as ClientRow;

  // Bolt System SKU gate.
  if (client.sku !== 'bolt_system') {
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({
        error: 'bolt_system_required',
        message: 'Ad management is available on the Bolt System plan. Contact your account strategist to upgrade.',
        sku: client.sku ?? null,
      }),
    };
  }

  try {
    const [liveCreatives, queuedCreatives] = await Promise.all([
      loadLiveCreatives(supabase, client),
      loadQueuedCreatives(supabase, client.id),
    ]);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        client: {
          id: client.id,
          business_name: client.business_name ?? 'Your business',
          vertical: client.vertical ?? 'general',
          sku: client.sku,
        },
        live_creatives: liveCreatives,
        queued_creatives: queuedCreatives,
      }),
    };
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error('[agency-client-ads] handler failed:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'agency_client_ads_failed', detail }) };
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//   Live creatives
// ─────────────────────────────────────────────────────────────────────────────

async function loadLiveCreatives(
  supabase: ReturnType<typeof getServiceSupabase>,
  client: ClientRow,
): Promise<LiveCreative[]> {
  // Pull the most recent SHIPPED ad_creative artifacts and resolve their Meta
  // ad_id from ship_result. Each artifact maps to one variant (per-winner row
  // inserted by creative-foundry's insertPerVariantArtifacts).
  const { data: artifactRows, error } = await supabase
    .from('agency_artifacts')
    .select('id, content, ship_result, shipped_at')
    .eq('client_id', client.id)
    .eq('type', 'ad_creative')
    .eq('status', 'shipped')
    .order('shipped_at', { ascending: false })
    .limit(LIVE_CREATIVE_LIMIT);

  if (error) {
    console.warn('[agency-client-ads] loadLiveCreatives query failed:', error.message);
    return [];
  }

  const sinceDate = new Date(Date.now() - LIVE_INSIGHTS_LOOKBACK_DAYS * 86400_000);
  const since = sinceDate.toISOString().slice(0, 10);
  const until = new Date().toISOString().slice(0, 10);

  const v_median_ctr = VERTICAL_CTR_MEDIAN[client.vertical ?? ''] ?? null;
  const v_median_cpl = VERTICAL_CPL_MEDIAN[client.vertical ?? ''] ?? null;

  const promises = (artifactRows ?? []).map(async (row): Promise<LiveCreative | null> => {
    const content = (row.content ?? {}) as { payload?: { variant?: VariantPayload } };
    const variant = content.payload?.variant;
    const shipResult = (row.ship_result ?? {}) as { ad_id?: string };
    const ad_id = typeof shipResult.ad_id === 'string' ? shipResult.ad_id : null;
    if (!variant || !ad_id) return null;

    let insights: CreativeInsights | null = null;
    try {
      insights = await getCreativeInsights({
        ad_id,
        since,
        until,
        client_id: client.id,
      });
    } catch (err) {
      console.warn(
        `[agency-client-ads] getCreativeInsights(${ad_id}) failed:`,
        err instanceof Error ? err.message : String(err),
      );
    }

    const ctr = insights?.ctr ?? 0;
    const cpl_usd = insights?.cpl ?? 0;
    const leads = insights?.leads ?? 0;
    const impressions = insights?.impressions ?? 0;

    const ai_commentary = buildLiveCommentary({
      angle: variant.angle ?? 'general',
      ctr,
      cpl_usd,
      leads,
      impressions,
      vertical_median_ctr: v_median_ctr,
      vertical_median_cpl: v_median_cpl,
      business_name: client.business_name ?? 'your business',
    });

    return {
      ad_id,
      image_url: variant.image_url ?? '',
      headline: variant.headline ?? '',
      primary_text: variant.primary_text ?? '',
      angle: variant.angle ?? 'general',
      impressions,
      ctr,
      cpl_usd,
      leads,
      shipped_at: (row.shipped_at as string) ?? '',
      ai_commentary,
      vertical_median_cpl_usd: v_median_cpl,
      vertical_median_ctr: v_median_ctr,
      source_artifact_id: row.id as string,
    };
  });

  const results = await Promise.all(promises);
  return results.filter((r): r is LiveCreative => r !== null);
}

/**
 * Deterministic one-line commentary generator. We intentionally avoid an LLM
 * call per creative for the hot client portal path — the message is mechanical
 * (compare CTR/CPL vs vertical median) and writing it in code keeps latency low
 * and cost zero. The shape mirrors what an LLM would emit, just constructed
 * from the same inputs.
 *
 * Examples:
 *   "Leading: 22% lower CPL than your vertical's median ($17.21 vs $22.00),
 *    7 leads at $17.21."
 *   "Watching: CTR is 1.4% vs the vertical median of 1.8%; we're letting it
 *    accumulate 1,200 more impressions before pausing."
 */
function buildLiveCommentary(args: {
  angle: string;
  ctr: number;
  cpl_usd: number;
  leads: number;
  impressions: number;
  vertical_median_ctr: number | null;
  vertical_median_cpl: number | null;
  business_name: string;
}): string {
  const { angle, ctr, cpl_usd, leads, impressions } = args;

  if (impressions < 100) {
    return `Too early to call — only ${impressions} impressions so far. Reading will firm up after ~500 impressions.`;
  }

  const cpl_str = `$${cpl_usd.toFixed(2)}`;
  const ctr_str = `${(ctr * 100).toFixed(2)}%`;

  // CPL vs vertical median
  if (args.vertical_median_cpl != null && cpl_usd > 0) {
    const pct = ((args.vertical_median_cpl - cpl_usd) / args.vertical_median_cpl) * 100;
    if (pct >= 15) {
      return `Leading on the ${angle} angle: ${pct.toFixed(0)}% lower CPL than your vertical median (${cpl_str} vs $${args.vertical_median_cpl.toFixed(2)}). ${leads} leads at ${cpl_str}.`;
    }
    if (pct <= -25) {
      return `Underperforming on CPL: ${Math.abs(pct).toFixed(0)}% above your vertical median (${cpl_str} vs $${args.vertical_median_cpl.toFixed(2)}). Your strategist is queuing a swap if it doesn't recover this week.`;
    }
  }

  // CTR vs vertical median
  if (args.vertical_median_ctr != null && ctr > 0) {
    const pct = ((ctr - args.vertical_median_ctr) / args.vertical_median_ctr) * 100;
    if (pct >= 20) {
      return `Strong hook: CTR ${ctr_str} is ${pct.toFixed(0)}% above your vertical median. The ${angle} angle is landing.`;
    }
    if (pct <= -25) {
      return `Hook is soft: CTR ${ctr_str} is ${Math.abs(pct).toFixed(0)}% below your vertical median. Watching for ~1,000 more impressions before swapping.`;
    }
  }

  // In-line with median — neutral.
  return `Holding steady on the ${angle} angle: ${leads} leads at ${cpl_str}, CTR ${ctr_str} over ${impressions.toLocaleString()} impressions.`;
}

// ─────────────────────────────────────────────────────────────────────────────
//   Queued creatives
// ─────────────────────────────────────────────────────────────────────────────

async function loadQueuedCreatives(
  supabase: ReturnType<typeof getServiceSupabase>,
  client_id: string,
): Promise<QueuedCreative[]> {
  const { data, error } = await supabase
    .from('agency_artifacts')
    .select('id, created_at, status, content, reasoning_trace, predicted_impact')
    .eq('client_id', client_id)
    .eq('type', 'ad_creative')
    .eq('status', 'draft')
    .order('created_at', { ascending: false })
    .limit(QUEUED_LIMIT);

  if (error) {
    console.warn('[agency-client-ads] loadQueuedCreatives query failed:', error.message);
    return [];
  }

  // Aggregate per-angle history once so each variant card can show the
  // angle_history badge. Pulled from agency_artifacts where the variant's
  // angle matches and shipped artifacts have ship_result.ad_id we can score.
  // For now we read the predictor_meta and the variant content; full per-angle
  // win/loss accumulation lives in a future agent. We surface a conservative
  // approximation: how many SHIPPED creatives we have on each angle to date.
  const angleHistory = await loadAngleHistory(supabase, client_id);

  return (data ?? []).map((row): QueuedCreative => {
    const content = (row.content ?? {}) as {
      payload?: {
        variant?: VariantPayload;
        variants?: VariantPayload[];
        predictor_meta?: { model?: string; training_n?: number };
      };
    };
    const predictor_model =
      content.payload?.predictor_meta?.model ?? 'unknown';

    // Per-variant rows from creative-foundry put a single `variant` on
    // content.payload. Parent rows may carry `variants`. Support both.
    const rawVariants: VariantPayload[] = content.payload?.variants
      ? content.payload.variants
      : content.payload?.variant
        ? [content.payload.variant]
        : [];

    // The predicted_impact column carries the same numbers but at the parent
    // level. For per-winner rows it has CTR/CPL/CI for that one winner.
    const pi = (row.predicted_impact ?? {}) as {
      predicted_ctr?: number;
      ctr_ci_low?: number;
      ctr_ci_high?: number;
      predicted_cpl_usd?: number;
      cpl_ci_low?: number;
      cpl_ci_high?: number;
      per_variant?: Array<{ seed?: number } & Record<string, number>>;
    };

    const variants = rawVariants.map((v) => {
      const perVariantPrediction = Array.isArray(pi.per_variant) && v.seed != null
        ? pi.per_variant.find((p) => p.seed === v.seed)
        : undefined;

      const predicted_ctr = v.predicted_ctr ?? perVariantPrediction?.predicted_ctr ?? pi.predicted_ctr ?? null;
      const predicted_cpl_usd = v.predicted_cpl_usd ?? perVariantPrediction?.predicted_cpl_usd ?? pi.predicted_cpl_usd ?? null;
      const ctr_ci_low = v.ctr_ci_low ?? perVariantPrediction?.ctr_ci_low ?? pi.ctr_ci_low ?? null;
      const ctr_ci_high = v.ctr_ci_high ?? perVariantPrediction?.ctr_ci_high ?? pi.ctr_ci_high ?? null;
      const cpl_ci_low = v.cpl_ci_low ?? perVariantPrediction?.cpl_ci_low ?? pi.cpl_ci_low ?? null;
      const cpl_ci_high = v.cpl_ci_high ?? perVariantPrediction?.cpl_ci_high ?? pi.cpl_ci_high ?? null;

      const angle = v.angle ?? 'general';
      const angleStats = angleHistory.get(angle) ?? { wins: 0, losses: 0, avg_ctr: null };

      return {
        seed: v.seed ?? null,
        angle,
        image_url: v.image_url ?? '',
        headline: v.headline ?? '',
        primary_text: v.primary_text ?? '',
        cta: v.cta ?? 'LEARN_MORE',
        predicted_ctr,
        predicted_cpl_usd,
        ctr_ci_low,
        ctr_ci_high,
        cpl_ci_low,
        cpl_ci_high,
        predictor_model,
        rationale:
          v.rationale ??
          buildVariantRationale({
            angle,
            predicted_ctr,
            predicted_cpl_usd,
            headline: v.headline ?? '',
          }),
        angle_history: angleStats,
        compliance_notes: (v.compliance_findings ?? [])
          .filter((f) => f.resolution !== 'killed')
          .map((f) => ({ kind: f.kind, finding: f.finding })),
      };
    });

    const reasoning_trace = Array.isArray(row.reasoning_trace)
      ? (row.reasoning_trace as string[]).slice(0, 3)
      : [];

    return {
      artifact_id: row.id as string,
      created_at: row.created_at as string,
      status: row.status as string,
      variants,
      agent_reasoning: reasoning_trace,
    };
  });
}

async function loadAngleHistory(
  supabase: ReturnType<typeof getServiceSupabase>,
  client_id: string,
): Promise<Map<string, { wins: number; losses: number; avg_ctr: number | null }>> {
  // Best-effort: read SHIPPED ad_creative artifacts and group by angle.
  // "Wins" = shipped (queue admitted it through founder approval).
  // "Losses" = rejected. We don't yet pull insights per artifact here —
  // accumulating the avg_ctr is a future addition once the post-ship watcher
  // writes the rolling stats back into a dedicated table.
  const out = new Map<string, { wins: number; losses: number; avg_ctr: number | null }>();
  const { data } = await supabase
    .from('agency_artifacts')
    .select('content, status')
    .eq('client_id', client_id)
    .eq('type', 'ad_creative')
    .in('status', ['shipped', 'rejected'])
    .limit(100);
  for (const row of data ?? []) {
    const content = (row.content ?? {}) as { payload?: { variant?: { angle?: string }; variants?: Array<{ angle?: string }> } };
    const angles = content.payload?.variant
      ? [content.payload.variant.angle]
      : (content.payload?.variants ?? []).map((v) => v.angle);
    for (const angle of angles) {
      if (!angle) continue;
      const prev = out.get(angle) ?? { wins: 0, losses: 0, avg_ctr: null };
      if (row.status === 'shipped') prev.wins += 1;
      else if (row.status === 'rejected') prev.losses += 1;
      out.set(angle, prev);
    }
  }
  return out;
}

/**
 * Default rationale builder when the artifact didn't carry one. Mirrors the
 * style of the LLM-written rationale so the UI can render uniformly.
 */
function buildVariantRationale(args: {
  angle: string;
  predicted_ctr: number | null;
  predicted_cpl_usd: number | null;
  headline: string;
}): string {
  const ctr = args.predicted_ctr != null ? `${(args.predicted_ctr * 100).toFixed(2)}%` : 'TBD';
  const cpl = args.predicted_cpl_usd != null ? `$${args.predicted_cpl_usd.toFixed(2)}` : 'TBD';

  const anglePhrase: Record<string, string> = {
    proof: 'Leads with social proof — existing-customer outcomes drive trust.',
    fear: 'Targets the cost of inaction — what a missed appointment really runs.',
    status: 'Status-coded — speaks to people who pay for the premium experience.',
    curiosity: 'Curiosity-led — pattern-interrupts the scroll with an unanswered question.',
  };
  const opener = anglePhrase[args.angle] ?? `Tests the ${args.angle} angle.`;
  return `${opener} Predicted CTR ${ctr}, predicted CPL ${cpl}.`;
}

export const testHandler = handler;
export default withLegacyHandler(handler);
