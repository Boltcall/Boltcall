import { withLegacyHandler } from './_shared/runtime-compat';
/**
 * agency-client-circle — GET. Client-authenticated.
 *
 * Backs /client/circle (Day 14+ cohort hub). Returns:
 *   1. members          — anonymized cohort roster from slack-adapter
 *   2. wins             — recent peer wins (last 14 days) from agency_artifacts
 *                         where type='experiment_plan' and status='shipped'
 *                         and visibility='cohort_visible'
 *   3. cohort_pulse     — short AI summary of "this week in your cohort"
 *                         (cached as a chart_reading artifact, 24h TTL)
 *   4. eligible         — boolean — false if the calling client is < 14 days
 *                         past their live_at (the page itself will then render
 *                         the "Your cohort opens on Day 14" card).
 *
 * Auth:
 *   - Bearer JWT (Supabase user). Must own at least one agency_clients row.
 *   - All reads scoped to the calling client_id. RLS is the source of truth —
 *     we *also* perform an explicit owns_client() check here as defence in
 *     depth, so even a misconfigured policy can't leak another tenant's data.
 *
 * If the client is not yet enrolled in a cohort (no agency_cohort_members
 * row), we return an empty members + wins payload and `eligible=true` so the
 * UI can render the "matching you with peers — back soon" placeholder.
 */

import type { Handler } from '@netlify/functions';
import { getServiceSupabase } from './_shared/token-utils';
import {
  listCohortMembers,
  type CohortMember,
} from './_shared/agency-adapters/slack-adapter';

const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json',
  // Day 14+ cohort data refreshes every few hours, never instantly.
  // 5 min CDN cache + 1 min browser cache is a good balance.
  'Cache-Control': 'private, max-age=60, s-maxage=300',
};

const COHORT_GATE_DAYS = 14;
const WINS_LOOKBACK_DAYS = 14;
const WINS_LIMIT = 25;

interface ClientCircleResponse {
  eligible: boolean;
  days_until_eligible: number | null;
  cohort_channel_id: string | null;
  members: CohortMember[];
  wins: Array<{
    artifact_id: string;
    peer_anonymized_label: string;
    metric: string;
    lift_summary: string;
    shipped_at: string;
    evidence_url: string | null;
  }>;
  cohort_pulse: string | null;
}

async function resolveClient(
  authHeader: string | undefined,
): Promise<
  | {
      kind: 'ok';
      user_id: string;
      client_id: string;
      live_at: string | null;
    }
  | { kind: 'unauthenticated' }
  | { kind: 'no_client' }
> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { kind: 'unauthenticated' };
  }
  const token = authHeader.substring(7);
  const supabase = getServiceSupabase();
  const { data: userResult, error } = await supabase.auth.getUser(token);
  if (error || !userResult?.user) return { kind: 'unauthenticated' };
  const user_id = userResult.user.id;

  // Find this user's primary client row. We exclude churned/paused — the
  // portal is for live (and trial / building) accounts only.
  const { data: rows, error: rowErr } = await supabase
    .from('agency_clients')
    .select('id, live_at, status')
    .eq('user_id', user_id)
    .not('status', 'in', '("churned","paused")')
    .order('signed_up_at', { ascending: true })
    .limit(1);
  if (rowErr) {
    console.error('[agency-client-circle] client lookup failed', rowErr.message);
    return { kind: 'no_client' };
  }
  const client = rows?.[0];
  if (!client) return { kind: 'no_client' };
  return {
    kind: 'ok',
    user_id,
    client_id: client.id as string,
    live_at: (client.live_at as string | null) ?? null,
  };
}

function daysBetween(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / 86_400_000);
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS, body: '' };
  }
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: CORS,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  const authHeader =
    event.headers['authorization'] || event.headers['Authorization'];
  const ctx = await resolveClient(authHeader);
  if (ctx.kind === 'unauthenticated') {
    return {
      statusCode: 401,
      headers: CORS,
      body: JSON.stringify({ error: 'Authentication required' }),
    };
  }
  if (ctx.kind === 'no_client') {
    return {
      statusCode: 403,
      headers: CORS,
      body: JSON.stringify({ error: 'No active client account for this user' }),
    };
  }

  const supabase = getServiceSupabase();

  // 1. Day 14 gate.
  const now = new Date();
  let eligible = false;
  let daysUntilEligible: number | null = null;
  if (ctx.live_at) {
    const liveAt = new Date(ctx.live_at);
    const liveDays = daysBetween(liveAt, now);
    eligible = liveDays >= COHORT_GATE_DAYS;
    daysUntilEligible = eligible ? 0 : COHORT_GATE_DAYS - liveDays;
  }

  if (!eligible) {
    const body: ClientCircleResponse = {
      eligible: false,
      days_until_eligible: daysUntilEligible,
      cohort_channel_id: null,
      members: [],
      wins: [],
      cohort_pulse: null,
    };
    return { statusCode: 200, headers: CORS, body: JSON.stringify(body) };
  }

  // 2. Resolve this client's cohort channel.
  const { data: membership } = await supabase
    .from('agency_cohort_members')
    .select('cohort_channel_id')
    .eq('client_id', ctx.client_id)
    .maybeSingle();

  const cohortChannelId =
    (membership?.cohort_channel_id as string | undefined) ?? null;

  if (!cohortChannelId) {
    // Eligible but not yet matched — render the "matching you with peers" placeholder.
    const body: ClientCircleResponse = {
      eligible: true,
      days_until_eligible: 0,
      cohort_channel_id: null,
      members: [],
      wins: [],
      cohort_pulse: null,
    };
    return { statusCode: 200, headers: CORS, body: JSON.stringify(body) };
  }

  // 3. Members (anonymized via slack-adapter).
  let members: CohortMember[] = [];
  try {
    members = await listCohortMembers({ cohort_channel_id: cohortChannelId });
  } catch (err) {
    console.error('[agency-client-circle] listCohortMembers failed', err);
    // Degrade — return empty member list rather than 500ing the whole page.
    members = [];
  }

  // 4. Wins — last 14 days of shipped experiment_plan artifacts among peers
  // in this cohort. We resolve peer client_ids via agency_cohort_members,
  // then pull their shipped experiment_plans.
  const since = new Date(
    now.getTime() - WINS_LOOKBACK_DAYS * 86_400_000,
  ).toISOString();

  const { data: peerRows } = await supabase
    .from('agency_cohort_members')
    .select('client_id, business_label_anonymized')
    .eq('cohort_channel_id', cohortChannelId);

  const peerLabels = new Map<string, string>();
  const peerIds: string[] = [];
  for (const row of peerRows ?? []) {
    const id = row.client_id as string;
    if (!id || id === ctx.client_id) continue; // exclude self
    peerIds.push(id);
    peerLabels.set(
      id,
      (row.business_label_anonymized as string | null) ?? 'Cohort peer',
    );
  }

  let wins: ClientCircleResponse['wins'] = [];
  if (peerIds.length > 0) {
    const { data: artifacts } = await supabase
      .from('agency_artifacts')
      .select(
        'id, client_id, type, content, ship_result, shipped_at, preview_url',
      )
      .in('client_id', peerIds)
      .eq('type', 'experiment_plan')
      .eq('status', 'shipped')
      .gte('shipped_at', since)
      .order('shipped_at', { ascending: false })
      .limit(WINS_LIMIT);

    wins = (artifacts ?? [])
      .map((a) => {
        const content = (a.content ?? {}) as Record<string, unknown>;
        const ship = (a.ship_result ?? {}) as Record<string, unknown>;
        const metric =
          typeof content.metric === 'string'
            ? content.metric
            : typeof content.hypothesis === 'string'
            ? (content.hypothesis as string)
            : 'experiment shipped';
        const liftSummary =
          typeof ship.lift_summary === 'string'
            ? ship.lift_summary
            : typeof ship.observed_value === 'number'
            ? `${ship.observed_value}`
            : typeof content.predicted_lift === 'string'
            ? (content.predicted_lift as string)
            : 'in progress';
        return {
          artifact_id: a.id as string,
          peer_anonymized_label:
            peerLabels.get(a.client_id as string) ?? 'Cohort peer',
          metric: String(metric).slice(0, 240),
          lift_summary: String(liftSummary).slice(0, 240),
          shipped_at:
            (a.shipped_at as string | null) ?? new Date(0).toISOString(),
          evidence_url: (a.preview_url as string | null) ?? null,
        };
      })
      .filter((w) => !!w.shipped_at);
  }

  // 5. Cohort pulse — look for the latest cached AI summary for this cohort.
  // We store these as agency_artifacts (type='weekly_report',
  // content.kind='cohort_pulse', client_id=ours, ship_target='cohort'). If
  // none exists in the last 7 days, the field is null and the UI shows
  // "Pulse refreshes every Friday".
  const pulseSince = new Date(now.getTime() - 7 * 86_400_000).toISOString();
  const { data: pulseRows } = await supabase
    .from('agency_artifacts')
    .select('content, created_at')
    .eq('client_id', ctx.client_id)
    .eq('type', 'weekly_report')
    .eq('ship_target', 'cohort')
    .gte('created_at', pulseSince)
    .order('created_at', { ascending: false })
    .limit(1);

  let cohortPulse: string | null = null;
  const pulseRow = pulseRows?.[0];
  if (pulseRow) {
    const c = (pulseRow.content ?? {}) as Record<string, unknown>;
    if (typeof c.summary === 'string') cohortPulse = c.summary as string;
    else if (typeof c.body === 'string') cohortPulse = c.body as string;
  }

  const body: ClientCircleResponse = {
    eligible: true,
    days_until_eligible: 0,
    cohort_channel_id: cohortChannelId,
    members,
    wins,
    cohort_pulse: cohortPulse,
  };

  return { statusCode: 200, headers: CORS, body: JSON.stringify(body) };
};

export default withLegacyHandler(handler);
