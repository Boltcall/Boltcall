import type { Handler } from '@netlify/functions';

import { getRequestOrigin, getV2CorsHeaders } from './_shared/cors-v2';
import { emitSaasV2Event } from './_shared/saas-v2-events';
import { getServiceSupabase } from './_shared/token-utils';

type LeadStatus = 'new' | 'contacted' | 'booked' | 'lost';
type PeriodKey = '7d' | '30d' | '90d' | '12m';

interface LeadRow {
  id: string;
  created_at: string;
  status: string | null;
}

interface BucketRow {
  label: string;
  new: number;
  contacted: number;
  booked: number;
  lost: number;
}

interface MetricRow {
  key: LeadStatus;
  current_total: number;
  previous_total: number;
  delta: number;
}

interface LeadStatusFlowResponse {
  period: PeriodKey;
  period_label: string;
  comparison_label: string;
  filtered_total: number;
  series: BucketRow[];
  metrics: MetricRow[];
}

const PERIODS: Record<
  PeriodKey,
  { label: string; rangeDays: number; bucketCount: number; formatter: Intl.DateTimeFormatOptions }
> = {
  '7d': {
    label: 'Last 7 days',
    rangeDays: 7,
    bucketCount: 7,
    formatter: { weekday: 'short' },
  },
  '30d': {
    label: 'Last 30 days',
    rangeDays: 30,
    bucketCount: 6,
    formatter: { month: 'short', day: 'numeric' },
  },
  '90d': {
    label: 'Last 90 days',
    rangeDays: 90,
    bucketCount: 6,
    formatter: { month: 'short', day: 'numeric' },
  },
  '12m': {
    label: 'Last 12 months',
    rangeDays: 365,
    bucketCount: 6,
    formatter: { month: 'short' },
  },
};

function normalizeStatus(raw: string | null): LeadStatus {
  if (!raw) return 'new';
  const s = String(raw).toLowerCase().trim();
  if (s === 'booked' || s === 'confirmed' || s === 'completed') return 'booked';
  if (s === 'lost' || s === 'dead' || s === 'rejected' || s === 'unqualified') return 'lost';
  if (s === 'contacted' || s === 'in_progress' || s === 'pending' || s === 'scheduled') {
    return 'contacted';
  }
  return 'new';
}

function statusCandidates(status: LeadStatus): string[] {
  switch (status) {
    case 'new':
      return ['new', 'open', 'fresh'];
    case 'contacted':
      return ['contacted', 'in_progress', 'pending', 'scheduled'];
    case 'booked':
      return ['booked', 'confirmed', 'completed'];
    case 'lost':
      return ['lost', 'dead', 'rejected', 'unqualified'];
  }
}

function createEmptyBucket(label: string): BucketRow {
  return { label, new: 0, contacted: 0, booked: 0, lost: 0 };
}

function getMetricTotal(rows: BucketRow[], key: LeadStatus) {
  return rows.reduce((sum, row) => sum + row[key], 0);
}

function getDelta(current: number, previous: number) {
  if (previous === 0) {
    return current === 0 ? 0 : 100;
  }

  return Math.round(((current - previous) / previous) * 100);
}

function buildBuckets(leads: LeadRow[], period: PeriodKey, startMs: number, endMs: number) {
  const definition = PERIODS[period];
  const bucketSize = Math.max(1, Math.ceil(definition.rangeDays / definition.bucketCount)) * 86_400_000;
  const formatter = new Intl.DateTimeFormat('en-US', definition.formatter);

  const buckets = Array.from({ length: definition.bucketCount }, (_, index) => {
    const bucketStart = startMs + bucketSize * index;
    return createEmptyBucket(formatter.format(new Date(bucketStart + bucketSize / 2)));
  });

  leads.forEach((lead) => {
    const createdMs = new Date(lead.created_at).getTime();
    if (Number.isNaN(createdMs) || createdMs < startMs || createdMs >= endMs) {
      return;
    }

    const bucketIndex = Math.min(
      definition.bucketCount - 1,
      Math.max(0, Math.floor((createdMs - startMs) / bucketSize)),
    );
    buckets[bucketIndex][normalizeStatus(lead.status)] += 1;
  });

  return buckets;
}

export const handler: Handler = async (event) => {
  const v2cors = getV2CorsHeaders(
    getRequestOrigin(event.headers as Record<string, string>),
    { methods: 'GET' },
  );
  const cors = v2cors.headers;

  function json(statusCode: number, body: unknown) {
    return { statusCode, headers: cors, body: JSON.stringify(body) };
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: cors, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return json(405, { error: 'Method not allowed' });
  }

  const authHeader = event.headers.authorization || event.headers.Authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) return json(401, { error: 'Missing bearer token' });

  const supa = getServiceSupabase();
  const { data: userResult, error: authErr } = await supa.auth.getUser(token);
  if (authErr || !userResult?.user) return json(401, { error: 'Invalid or expired token' });
  const userId = userResult.user.id;

  const { data: workspaceRow, error: wsErr } = await supa
    .from('workspaces')
    .select('id, v2_enabled')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();

  if (wsErr) {
    console.warn(`[saas-v2-lead-status-flow] workspace lookup failed user=${userId} err=${wsErr.message}`);
    return json(500, { error: 'Failed to resolve workspace' });
  }

  if (!workspaceRow) {
    return json(404, { error: 'No workspace for this user' });
  }

  const workspaceId = (workspaceRow as { id: string }).id;
  if (!(workspaceRow as { v2_enabled?: boolean }).v2_enabled) {
    return json(403, { error: 'V2 is not enabled for this workspace' });
  }

  const q = event.queryStringParameters ?? {};
  const period = ((q.period as string | undefined)?.trim() || '30d') as PeriodKey;
  const filterStatus = (q.status as string | undefined)?.trim().toLowerCase();
  const dateFrom = (q.date_from as string | undefined)?.trim();
  const dateTo = (q.date_to as string | undefined)?.trim();
  const filterSource = (q.source as string | undefined)?.trim();

  if (!(period in PERIODS)) {
    return json(400, { error: 'period must be one of 7d|30d|90d|12m' });
  }
  if (filterStatus && !['new', 'contacted', 'booked', 'lost'].includes(filterStatus)) {
    return json(400, { error: 'status must be one of new|contacted|booked|lost' });
  }
  if (dateFrom && Number.isNaN(Date.parse(dateFrom))) {
    return json(400, { error: 'date_from must be an ISO date string' });
  }
  if (dateTo && Number.isNaN(Date.parse(dateTo))) {
    return json(400, { error: 'date_to must be an ISO date string' });
  }

  const nowMs = Date.now();
  const rangeMs = PERIODS[period].rangeDays * 86_400_000;
  const analyticsStartMs = nowMs - rangeMs * 2;

  let leadsQuery = supa
    .from('leads')
    .select('id, created_at, status', { count: 'exact' })
    .eq('workspace_id', workspaceId)
    .gte('created_at', new Date(analyticsStartMs).toISOString())
    .order('created_at', { ascending: true })
    .limit(5000);

  if (filterStatus) {
    leadsQuery = leadsQuery.in('status', statusCandidates(filterStatus as LeadStatus));
  }
  if (filterSource) leadsQuery = leadsQuery.eq('source', filterSource);
  if (dateFrom) leadsQuery = leadsQuery.gte('created_at', new Date(dateFrom).toISOString());
  if (dateTo) leadsQuery = leadsQuery.lte('created_at', new Date(dateTo).toISOString());

  const { data: leadRows, error: leadsErr, count } = await leadsQuery;
  if (leadsErr) {
    console.warn(`[saas-v2-lead-status-flow] leads query failed user=${userId} err=${leadsErr.message}`);
    return json(500, { error: 'Failed to fetch lead status flow' });
  }

  const leads = (leadRows ?? []) as LeadRow[];
  const currentStartMs = nowMs - rangeMs;
  const previousStartMs = currentStartMs - rangeMs;
  const currentBuckets = buildBuckets(leads, period, currentStartMs, nowMs);
  const previousBuckets = buildBuckets(leads, period, previousStartMs, currentStartMs);

  const response: LeadStatusFlowResponse = {
    period,
    period_label: PERIODS[period].label,
    comparison_label: `previous ${PERIODS[period].label.toLowerCase()}`,
    filtered_total: typeof count === 'number' ? count : leads.length,
    series: currentBuckets,
    metrics: (['new', 'contacted', 'booked', 'lost'] as LeadStatus[]).map((key) => {
      const currentTotal = getMetricTotal(currentBuckets, key);
      const previousTotal = getMetricTotal(previousBuckets, key);
      return {
        key,
        current_total: currentTotal,
        previous_total: previousTotal,
        delta: getDelta(currentTotal, previousTotal),
      };
    }),
  };

  await emitSaasV2Event({
    workspace_id: workspaceId,
    type: 'saas_v2_leads_list_rendered',
    payload: {
      workspace_id: workspaceId,
      count: response.filtered_total,
      filter_applied: Boolean(filterStatus || filterSource || dateFrom || dateTo),
    },
  }).catch(() => undefined);

  return json(200, response);
};
