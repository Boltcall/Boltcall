/**
 * agency-client-reports.ts — Client-facing report archive endpoint.
 * ==================================================================
 *
 * GET /.netlify/functions/agency-client-reports
 *
 * Auth: client JWT → resolves agency_clients.user_id → client_id.
 *
 * Returns the archive of SHIPPED weekly_report + optimization_brief artifacts.
 * Each entry includes the PDF URL (or video URL for optimization_brief once
 * the briefer ships a video), the AI-written client_facing_note, predicted
 * impact (e.g. "predicted open rate 78%"), and the period covered.
 *
 *   {
 *     reports: [
 *       {
 *         artifact_id, type: 'weekly_report'|'optimization_brief',
 *         created_at, shipped_at, period_start, period_end,
 *         title: "Week of May 19 — 47 leads captured",
 *         summary: "Bookings up 12% week-over-week, driven by Tuesday calls…",
 *         pdf_url, video_url?, share_url?,
 *         predicted_open_rate?: number,
 *         next_week_ask?: string
 *       }, …
 *     ],
 *     monthly_video_status: 'available' | 'coming_next_month'
 *   }
 */

import type { Handler, HandlerEvent } from '@netlify/functions';

import { getServiceSupabase } from './_shared/token-utils';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json',
};

const ARCHIVE_LIMIT = 50;

interface AgencyArtifactRow {
  id: string;
  type: string;
  created_at: string;
  shipped_at: string | null;
  preview_url: string | null;
  ship_result: Record<string, unknown> | null;
  content: Record<string, unknown> | null;
  client_facing_note: string | null;
  predicted_impact: Record<string, unknown> | null;
}

interface ReportEntry {
  artifact_id: string;
  type: 'weekly_report' | 'optimization_brief';
  created_at: string;
  shipped_at: string | null;
  period_start: string | null;
  period_end: string | null;
  title: string;
  summary: string;
  pdf_url: string | null;
  video_url: string | null;
  predicted_open_rate: number | null;
  next_week_ask: string | null;
}

export const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const supabase = getServiceSupabase();

  // 1. JWT → user_id
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

  // 2. Resolve client_id
  const { data: clientRow, error: clientErr } = await supabase
    .from('agency_clients')
    .select('id, user_id, status, sku')
    .eq('user_id', user_id)
    .not('status', 'in', '(churned,paused)')
    .maybeSingle();
  if (clientErr) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Lookup failed', detail: clientErr.message }) };
  }
  if (!clientRow) {
    return { statusCode: 404, headers, body: JSON.stringify({ error: 'No active client account for this user' }) };
  }

  // 3. Pull shipped weekly_report + optimization_brief artifacts.
  const { data: artifactRows, error: artErr } = await supabase
    .from('agency_artifacts')
    .select(
      'id, type, created_at, shipped_at, preview_url, ship_result, content, client_facing_note, predicted_impact',
    )
    .eq('client_id', clientRow.id)
    .in('type', ['weekly_report', 'optimization_brief'])
    .eq('status', 'shipped')
    .order('shipped_at', { ascending: false })
    .limit(ARCHIVE_LIMIT);

  if (artErr) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Report query failed', detail: artErr.message }) };
  }

  const reports: ReportEntry[] = (artifactRows ?? []).map((row) => mapArtifactRow(row as AgencyArtifactRow));

  // Determine whether any monthly video brief has shipped — if not, the UI
  // shows the "coming next month" placeholder.
  const has_video = reports.some((r) => r.type === 'optimization_brief' && r.video_url);

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      reports,
      monthly_video_status: has_video ? 'available' : 'coming_next_month',
    }),
  };
};

function mapArtifactRow(row: AgencyArtifactRow): ReportEntry {
  const ship = (row.ship_result ?? {}) as { pdf_url?: string; video_url?: string };
  const content = (row.content ?? {}) as {
    payload?: {
      narrative?: { opening?: string };
      next_week_ask?: { question?: string };
      period_start?: string;
      period_end?: string;
      title?: string;
    };
  };
  const predicted = (row.predicted_impact ?? {}) as { metric?: string; prediction?: number };

  const opening = content.payload?.narrative?.opening ?? '';
  const summary = opening
    ? opening.slice(0, 220) + (opening.length > 220 ? '…' : '')
    : (row.client_facing_note ?? 'Weekly performance report');

  const period_start = content.payload?.period_start ?? null;
  const period_end = content.payload?.period_end ?? null;

  const title =
    content.payload?.title ??
    (period_start
      ? `${row.type === 'weekly_report' ? 'Week of' : 'Brief —'} ${formatHumanDate(period_start)}`
      : row.type === 'weekly_report'
        ? 'Weekly report'
        : 'Optimization brief');

  return {
    artifact_id: row.id,
    type: row.type as 'weekly_report' | 'optimization_brief',
    created_at: row.created_at,
    shipped_at: row.shipped_at,
    period_start,
    period_end,
    title,
    summary,
    pdf_url: ship.pdf_url ?? row.preview_url ?? null,
    video_url: ship.video_url ?? null,
    predicted_open_rate:
      predicted.metric === 'report_open_rate' && typeof predicted.prediction === 'number'
        ? predicted.prediction
        : null,
    next_week_ask: content.payload?.next_week_ask?.question ?? null,
  };
}

function formatHumanDate(iso: string): string {
  try {
    const d = new Date(`${iso}T00:00:00Z`);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return iso;
  }
}
