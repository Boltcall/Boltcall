// Analytics API — data fetching for the deep analytics dashboard

import { supabase } from './supabase';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface FunnelStage {
  name: string;
  count: number;
  rate: number;       // conversion % from previous stage
  totalRate: number;  // conversion % from first stage
  previousCount: number; // count from comparison period
  change: number;     // % change vs comparison period
}

export interface RoiMetrics {
  totalLeads: number;
  subscriptionCost: number;
  costPerLead: number;
  avgDealValue: number;
  estimatedRevenue: number;
  // 'actual' when summed from real booking values stamped on appointments;
  // 'estimate' when derived from leads × avg deal value × close rate.
  revenueSource: 'actual' | 'estimate';
  roiPercentage: number;
  callsHandled: number;
  avgCallDurationMin: number;
  timeSavedHours: number;
  hourlyRate: number;
  moneySaved: number;
}

export interface RoiTrendPoint {
  month: string;
  leads: number;
  revenue: number;
  roi: number;
  costPerLead: number;
}

export interface ResponseTimeStats {
  avgSeconds: number;
  fastestSeconds: number;
  slowestSeconds: number;
  medianSeconds: number;
  byHour: { hour: number; avgSeconds: number; count: number }[];
}

export interface HeatmapCell {
  day: number;   // 0=Sun, 6=Sat
  hour: number;  // 0-23
  count: number;
}

export interface SourceAttribution {
  source: string;
  count: number;
  percentage: number;
  color: string;
}

export interface AgentPerformance {
  agentId: string;
  agentName: string;
  callsHandled: number;
  avgDurationSec: number;
  successRate: number;
  satisfactionScore: number;
}

export interface MissedOpportunity {
  id: string;
  phone: string;
  name: string;
  missedAt: string;
  followedUp: boolean;
  source: string;
}

export interface ActivityEvent {
  id: string;
  type: 'new_lead' | 'call_completed' | 'appointment_booked' | 'chat_started' | 'sms_sent' | 'missed_call';
  description: string;
  timestamp: string;
  meta?: Record<string, unknown>;
}

export interface LiveCounters {
  activeCalls: number;
  activeChats: number;
  leadsToday: number;
  callsToday: number;
  bookingsToday: number;
  smsSentToday: number;
}

export interface ExportHistoryEntry {
  id: string;
  type: 'csv' | 'pdf';
  section: string;
  exportedAt: string;
  recordCount: number;
}

export interface DateRangeFilter {
  start: string; // YYYY-MM-DD
  end: string;
}

export interface AnalyticsFilters {
  dateRange: DateRangeFilter;
  userId?: string;
  agentId?: string;
  source?: string;
  leadStatus?: string;
  phone?: string;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const SOURCE_COLORS: Record<string, string> = {
  website: '#2563EB',
  phone: '#7C3AED',
  sms: '#059669',
  whatsapp: '#25D366',
  form: '#F59E0B',
  referral: '#EC4899',
  ads: '#EF4444',
  organic: '#06B6D4',
  dm: '#8B5CF6',
  missed_call: '#F97316',
  other: '#6B7280',
};

function getDaysInRange(start: string, end: string): number {
  const s = new Date(start);
  const e = new Date(end);
  return Math.max(1, Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)));
}

function getPreviousPeriod(filter: DateRangeFilter): DateRangeFilter {
  const days = getDaysInRange(filter.start, filter.end);
  const prevEnd = new Date(filter.start);
  prevEnd.setDate(prevEnd.getDate() - 1);
  const prevStart = new Date(prevEnd);
  prevStart.setDate(prevStart.getDate() - days);
  return {
    start: prevStart.toISOString().split('T')[0],
    end: prevEnd.toISOString().split('T')[0],
  };
}

/* ------------------------------------------------------------------ */
/*  Conversion Funnel                                                  */
/* ------------------------------------------------------------------ */

export async function fetchFunnelData(filters: AnalyticsFilters): Promise<FunnelStage[]> {
  const { dateRange } = filters;
  const prevRange = getPreviousPeriod(dateRange);

  // Fetch metrics for current period
  const { data: currentMetrics } = await supabase
    .from('daily_metrics')
    .select('*')
    .gte('date', dateRange.start)
    .lte('date', dateRange.end);

  // Fetch metrics for comparison period
  const { data: prevMetrics } = await supabase
    .from('daily_metrics')
    .select('*')
    .gte('date', prevRange.start)
    .lte('date', prevRange.end);

  // Fetch leads for status breakdown
  let leadsQuery = supabase
    .from('callbacks')
    .select('status, source, created_at')
    .gte('created_at', dateRange.start)
    .lte('created_at', dateRange.end + 'T23:59:59');

  if (filters.userId) leadsQuery = leadsQuery.eq('user_id', filters.userId);
  if (filters.source) leadsQuery = leadsQuery.eq('source', filters.source);
  if (filters.leadStatus) leadsQuery = leadsQuery.eq('status', filters.leadStatus);

  const { data: leads } = await leadsQuery;

  // Aggregate current period
  const cm = (currentMetrics || []);
  const pm = (prevMetrics || []);

  const sumField = (arr: any[], field: string) => arr.reduce((s, r) => s + (r[field] || 0), 0);

  const currentVisits = sumField(cm, 'website_visits') || sumField(cm, 'calls') * 8; // estimate
  const currentWidgetOpens = sumField(cm, 'widget_opens') || Math.round(currentVisits * 0.35);
  const currentConversations = sumField(cm, 'conversations') || sumField(cm, 'calls') + sumField(cm, 'chats');
  const currentLeads = (leads || []).length || sumField(cm, 'leads');
  const currentBookings = sumField(cm, 'bookings') || (leads || []).filter(l => l.status === 'completed' || l.status === 'booked').length;
  const currentClosed = sumField(cm, 'deals_closed') || Math.round(currentBookings * 0.4);

  const prevVisits = sumField(pm, 'website_visits') || sumField(pm, 'calls') * 8;
  const prevWidgetOpens = sumField(pm, 'widget_opens') || Math.round(prevVisits * 0.35);
  const prevConversations = sumField(pm, 'conversations') || sumField(pm, 'calls') + sumField(pm, 'chats');
  const prevLeads = sumField(pm, 'leads');
  const prevBookings = sumField(pm, 'bookings');
  const prevClosed = sumField(pm, 'deals_closed') || Math.round(prevBookings * 0.4);

  const stages = [
    { name: 'Website Visits', current: currentVisits, prev: prevVisits },
    { name: 'Widget Opens', current: currentWidgetOpens, prev: prevWidgetOpens },
    { name: 'Conversations', current: currentConversations, prev: prevConversations },
    { name: 'Leads Captured', current: currentLeads, prev: prevLeads },
    { name: 'Appointments', current: currentBookings, prev: prevBookings },
    { name: 'Deals Closed', current: currentClosed, prev: prevClosed },
  ];

  const firstCount = stages[0].current || 1;

  return stages.map((stage, i) => {
    const prevStageCount = i > 0 ? stages[i - 1].current : stage.current;
    const rate = prevStageCount > 0 ? (stage.current / prevStageCount) * 100 : 0;
    const totalRate = (stage.current / firstCount) * 100;
    const change = stage.prev > 0 ? ((stage.current - stage.prev) / stage.prev) * 100 : 0;

    return {
      name: stage.name,
      count: stage.current,
      rate: Math.round(rate * 10) / 10,
      totalRate: Math.round(totalRate * 10) / 10,
      previousCount: stage.prev,
      change: Math.round(change * 10) / 10,
    };
  });
}

/* ------------------------------------------------------------------ */
/*  ROI Metrics                                                        */
/* ------------------------------------------------------------------ */

export async function fetchRoiMetrics(
  filters: AnalyticsFilters,
  config: { avgDealValue: number; hourlyRate: number; subscriptionCost: number }
): Promise<RoiMetrics> {
  const { dateRange } = filters;

  const { data: metrics } = await supabase
    .from('daily_metrics')
    .select('*')
    .gte('date', dateRange.start)
    .lte('date', dateRange.end);

  let leadsQuery = supabase
    .from('callbacks')
    .select('id')
    .gte('created_at', dateRange.start)
    .lte('created_at', dateRange.end + 'T23:59:59');
  if (filters.userId) leadsQuery = leadsQuery.eq('user_id', filters.userId);
  const { data: leads } = await leadsQuery;

  const m = metrics || [];
  const totalLeads = (leads || []).length || m.reduce((s, r) => s + (r.leads || 0), 0);
  const callsHandled = m.reduce((s, r) => s + (r.calls || 0), 0);
  const avgCallDuration = m.length > 0
    ? m.reduce((s, r) => s + (r.avg_call_duration || 0), 0) / m.length
    : 3; // default 3 min

  const timeSavedHours = (callsHandled * avgCallDuration) / 60;
  const moneySaved = timeSavedHours * config.hourlyRate;
  const costPerLead = totalLeads > 0 ? config.subscriptionCost / totalLeads : 0;

  // Prefer real booked values (stamped on appointments from the services
  // catalog) over the synthetic leads × close-rate estimate.
  let bookedValueQuery = supabase
    .from('appointments')
    .select('estimated_value_cents')
    .neq('status', 'cancelled')
    .not('estimated_value_cents', 'is', null)
    .gte('created_at', dateRange.start)
    .lte('created_at', dateRange.end + 'T23:59:59');
  if (filters.userId) bookedValueQuery = bookedValueQuery.eq('user_id', filters.userId);
  const { data: valuedBookings } = await bookedValueQuery;

  const actualRevenue = (valuedBookings || []).reduce(
    (s, r) => s + (r.estimated_value_cents || 0), 0
  ) / 100;
  const revenueSource: 'actual' | 'estimate' = (valuedBookings || []).length > 0 ? 'actual' : 'estimate';
  const estimatedRevenue = revenueSource === 'actual'
    ? actualRevenue
    : totalLeads * config.avgDealValue * 0.3; // 30% close rate estimate
  const roiPercentage = config.subscriptionCost > 0
    ? ((estimatedRevenue + moneySaved - config.subscriptionCost) / config.subscriptionCost) * 100
    : 0;

  return {
    totalLeads,
    subscriptionCost: config.subscriptionCost,
    costPerLead: Math.round(costPerLead * 100) / 100,
    avgDealValue: config.avgDealValue,
    estimatedRevenue: Math.round(estimatedRevenue),
    revenueSource,
    roiPercentage: Math.round(roiPercentage),
    callsHandled,
    avgCallDurationMin: Math.round(avgCallDuration * 10) / 10,
    timeSavedHours: Math.round(timeSavedHours * 10) / 10,
    hourlyRate: config.hourlyRate,
    moneySaved: Math.round(moneySaved),
  };
}

export async function fetchRoiTrend(months: number = 6): Promise<RoiTrendPoint[]> {
  const result: RoiTrendPoint[] = [];
  const now = new Date();

  for (let i = months - 1; i >= 0; i--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
    const monthLabel = monthStart.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });

    const { data } = await supabase
      .from('daily_metrics')
      .select('leads, bookings, calls')
      .gte('date', monthStart.toISOString().split('T')[0])
      .lte('date', monthEnd.toISOString().split('T')[0]);

    const m = data || [];
    const leads = m.reduce((s, r) => s + (r.leads || 0), 0);
    const revenue = leads * 500 * 0.3; // rough estimate
    const cost = 897; // Pro plan
    const roi = cost > 0 ? ((revenue - cost) / cost) * 100 : 0;

    result.push({
      month: monthLabel,
      leads,
      revenue: Math.round(revenue),
      roi: Math.round(roi),
      costPerLead: leads > 0 ? Math.round((cost / leads) * 100) / 100 : 0,
    });
  }

  return result;
}

/* ------------------------------------------------------------------ */
/*  Response Time Analytics                                            */
/* ------------------------------------------------------------------ */

export async function fetchResponseTimeStats(filters: AnalyticsFilters): Promise<ResponseTimeStats> {
  const { dateRange } = filters;

  const { data: calls, error: callsError } = await supabase
    .from('call_logs')
    .select('duration_seconds, created_at, response_time_seconds')
    .gte('created_at', dateRange.start)
    .lte('created_at', dateRange.end + 'T23:59:59')
    .order('created_at', { ascending: true });
  if (callsError) {
    console.warn('call_logs unavailable (fetchResponseTimeStats):', callsError.message);
  }

  // Also try callbacks table for response times
  let cbRtQuery = supabase
    .from('callbacks')
    .select('created_at, first_reply_seconds')
    .gte('created_at', dateRange.start)
    .lte('created_at', dateRange.end + 'T23:59:59');
  if (filters.userId) cbRtQuery = cbRtQuery.eq('user_id', filters.userId);
  const { data: callbacks } = await cbRtQuery;

  const responseTimes = [
    ...(calls || []).map(c => c.response_time_seconds || c.duration_seconds || 0).filter(t => t > 0),
    ...(callbacks || []).map(c => c.first_reply_seconds || 0).filter(t => t > 0),
  ];

  if (responseTimes.length === 0) {
    return {
      avgSeconds: 0,
      fastestSeconds: 0,
      slowestSeconds: 0,
      medianSeconds: 0,
      byHour: Array.from({ length: 24 }, (_, h) => ({ hour: h, avgSeconds: 0, count: 0 })),
    };
  }

  responseTimes.sort((a, b) => a - b);
  const avg = responseTimes.reduce((s, t) => s + t, 0) / responseTimes.length;
  const median = responseTimes[Math.floor(responseTimes.length / 2)];

  // Group by hour
  const hourBuckets: { total: number; count: number }[] = Array.from({ length: 24 }, () => ({ total: 0, count: 0 }));
  const allRecords = [
    ...(calls || []).map(c => ({ time: c.created_at, rt: c.response_time_seconds || c.duration_seconds || 0 })),
    ...(callbacks || []).map(c => ({ time: c.created_at, rt: c.first_reply_seconds || 0 })),
  ].filter(r => r.rt > 0);

  allRecords.forEach(r => {
    const hour = new Date(r.time).getHours();
    hourBuckets[hour].total += r.rt;
    hourBuckets[hour].count += 1;
  });

  return {
    avgSeconds: Math.round(avg),
    fastestSeconds: responseTimes[0],
    slowestSeconds: responseTimes[responseTimes.length - 1],
    medianSeconds: median,
    byHour: hourBuckets.map((b, h) => ({
      hour: h,
      avgSeconds: b.count > 0 ? Math.round(b.total / b.count) : 0,
      count: b.count,
    })),
  };
}

/* ------------------------------------------------------------------ */
/*  Peak Hours Heatmap                                                 */
/* ------------------------------------------------------------------ */

export async function fetchHeatmapData(filters: AnalyticsFilters): Promise<HeatmapCell[]> {
  const { dateRange } = filters;

  const { data: calls, error: callsHeatmapError } = await supabase
    .from('call_logs')
    .select('created_at')
    .gte('created_at', dateRange.start)
    .lte('created_at', dateRange.end + 'T23:59:59');
  if (callsHeatmapError) {
    console.warn('call_logs unavailable (fetchHeatmapData):', callsHeatmapError.message);
  }

  const { data: chats } = await supabase
    .from('chats')
    .select('created_at')
    .gte('created_at', dateRange.start)
    .lte('created_at', dateRange.end + 'T23:59:59');

  const grid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));

  [...(calls || []), ...(chats || [])].forEach(r => {
    const d = new Date(r.created_at);
    grid[d.getDay()][d.getHours()] += 1;
  });

  const cells: HeatmapCell[] = [];
  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      cells.push({ day, hour, count: grid[day][hour] });
    }
  }

  return cells;
}

/* ------------------------------------------------------------------ */
/*  Source Attribution                                                  */
/* ------------------------------------------------------------------ */

export async function fetchSourceAttribution(filters: AnalyticsFilters): Promise<SourceAttribution[]> {
  const { dateRange } = filters;

  let srcQuery = supabase
    .from('callbacks')
    .select('source')
    .gte('created_at', dateRange.start)
    .lte('created_at', dateRange.end + 'T23:59:59');
  if (filters.userId) srcQuery = srcQuery.eq('user_id', filters.userId);
  const { data } = await srcQuery;

  const counts: Record<string, number> = {};
  (data || []).forEach(r => {
    const src = r.source || 'other';
    counts[src] = (counts[src] || 0) + 1;
  });

  const total = Object.values(counts).reduce((s, c) => s + c, 0) || 1;

  return Object.entries(counts)
    .map(([source, count]) => ({
      source,
      count,
      percentage: Math.round((count / total) * 1000) / 10,
      color: SOURCE_COLORS[source] || SOURCE_COLORS.other,
    }))
    .sort((a, b) => b.count - a.count);
}

/* ------------------------------------------------------------------ */
/*  Agent Performance                                                  */
/* ------------------------------------------------------------------ */

export async function fetchAgentPerformance(filters: AnalyticsFilters): Promise<AgentPerformance[]> {
  const { dateRange } = filters;

  const { data: calls, error: callsAgentError } = await supabase
    .from('call_logs')
    .select('agent_id, agent_name, duration_seconds, status, customer_sentiment')
    .gte('created_at', dateRange.start)
    .lte('created_at', dateRange.end + 'T23:59:59');
  if (callsAgentError) {
    console.warn('call_logs unavailable (fetchAgentPerformance):', callsAgentError.message);
  }

  const agentMap: Record<string, {
    name: string;
    calls: number;
    totalDuration: number;
    successful: number;
    sentimentSum: number;
    sentimentCount: number;
  }> = {};

  (calls || []).forEach(c => {
    const id = c.agent_id || 'default';
    if (!agentMap[id]) {
      agentMap[id] = { name: c.agent_name || 'AI Agent', calls: 0, totalDuration: 0, successful: 0, sentimentSum: 0, sentimentCount: 0 };
    }
    agentMap[id].calls += 1;
    agentMap[id].totalDuration += c.duration_seconds || 0;
    if (c.status === 'completed' || c.status === 'successful') agentMap[id].successful += 1;
    if (c.customer_sentiment) {
      agentMap[id].sentimentSum += c.customer_sentiment;
      agentMap[id].sentimentCount += 1;
    }
  });

  return Object.entries(agentMap).map(([id, data]) => ({
    agentId: id,
    agentName: data.name,
    callsHandled: data.calls,
    avgDurationSec: data.calls > 0 ? Math.round(data.totalDuration / data.calls) : 0,
    successRate: data.calls > 0 ? Math.round((data.successful / data.calls) * 100) : 0,
    satisfactionScore: data.sentimentCount > 0
      ? Math.round((data.sentimentSum / data.sentimentCount) * 10) / 10
      : 0,
  }));
}

/* ------------------------------------------------------------------ */
/*  Missed Opportunities                                               */
/* ------------------------------------------------------------------ */

export async function fetchMissedOpportunities(filters: AnalyticsFilters): Promise<MissedOpportunity[]> {
  const { dateRange } = filters;

  let missedQuery = supabase
    .from('callbacks')
    .select('id, caller_number, caller_name, created_at, status, source')
    .eq('status', 'missed')
    .gte('created_at', dateRange.start)
    .lte('created_at', dateRange.end + 'T23:59:59')
    .order('created_at', { ascending: false })
    .limit(50);
  if (filters.userId) missedQuery = missedQuery.eq('user_id', filters.userId);
  const { data } = await missedQuery;

  return (data || []).map(r => ({
    id: r.id,
    phone: r.caller_number || 'Unknown',
    name: r.caller_name || 'Unknown',
    missedAt: r.created_at,
    followedUp: false,
    source: r.source || 'phone',
  }));
}

/* ------------------------------------------------------------------ */
/*  Activity Feed                                                      */
/* ------------------------------------------------------------------ */

export async function fetchActivityFeed(limit: number = 20, userId?: string): Promise<ActivityEvent[]> {
  const events: ActivityEvent[] = [];

  // Recent callbacks
  let activityQuery = supabase
    .from('callbacks')
    .select('id, caller_name, status, source, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (userId) activityQuery = activityQuery.eq('user_id', userId);
  const { data: callbacks } = await activityQuery;

  (callbacks || []).forEach(c => {
    const type = c.status === 'missed' ? 'missed_call'
      : c.status === 'completed' ? 'call_completed'
      : c.status === 'booked' ? 'appointment_booked'
      : 'new_lead';

    events.push({
      id: `cb-${c.id}`,
      type,
      description: `${c.caller_name || 'Unknown'} — ${c.status} via ${c.source || 'phone'}`,
      timestamp: c.created_at,
    });
  });

  // Recent chats
  const { data: chats } = await supabase
    .from('chats')
    .select('id, customer_name, status, created_at')
    .order('created_at', { ascending: false })
    .limit(10);

  (chats || []).forEach(c => {
    events.push({
      id: `chat-${c.id}`,
      type: 'chat_started',
      description: `${c.customer_name || 'Visitor'} started a chat`,
      timestamp: c.created_at,
    });
  });

  // Sort by timestamp descending, take top N
  events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return events.slice(0, limit);
}

/* ------------------------------------------------------------------ */
/*  Live Counters                                                      */
/* ------------------------------------------------------------------ */

export async function fetchLiveCounters(userId?: string): Promise<LiveCounters> {
  const today = new Date().toISOString().split('T')[0];

  let callbacksQuery = supabase.from('callbacks').select('id, status').gte('created_at', today);
  if (userId) callbacksQuery = callbacksQuery.eq('user_id', userId);

  const [
    { count: activeChats },
    { data: todayCallbacks },
    { data: todayMetrics },
  ] = await Promise.all([
    supabase.from('chats').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    callbacksQuery,
    supabase.from('daily_metrics').select('*').eq('date', today).single(),
  ]);

  const callbacks = todayCallbacks || [];
  const m = todayMetrics || {};

  return {
    activeCalls: 0, // Would come from Retell real-time
    activeChats: activeChats || 0,
    leadsToday: callbacks.length || m.leads || 0,
    callsToday: m.calls || 0,
    bookingsToday: callbacks.filter((c: any) => c.status === 'booked' || c.status === 'completed').length || m.bookings || 0,
    smsSentToday: m.sms_sent || 0,
  };
}

/* ------------------------------------------------------------------ */
/*  Funnel Drilldown — get actual records for a funnel stage           */
/* ------------------------------------------------------------------ */

export async function fetchFunnelDrilldown(
  stageName: string,
  filters: AnalyticsFilters
): Promise<any[]> {
  const { dateRange } = filters;

  let query = supabase
    .from('callbacks')
    .select('*')
    .gte('created_at', dateRange.start)
    .lte('created_at', dateRange.end + 'T23:59:59')
    .order('created_at', { ascending: false })
    .limit(100);

  if (filters.userId) query = query.eq('user_id', filters.userId);

  // Filter by stage
  switch (stageName) {
    case 'Leads Captured':
      // all leads
      break;
    case 'Appointments':
      query = query.in('status', ['booked', 'completed']);
      break;
    case 'Deals Closed':
      query = query.eq('status', 'completed');
      break;
    default:
      break;
  }

  if (filters.source) query = query.eq('source', filters.source);

  const { data } = await query;
  return data || [];
}

/* ------------------------------------------------------------------ */
/*  Export History                                                      */
/* ------------------------------------------------------------------ */

const EXPORT_HISTORY_KEY = 'boltcall_export_history';

export function getExportHistory(): ExportHistoryEntry[] {
  try {
    const raw = localStorage.getItem(EXPORT_HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addExportHistoryEntry(entry: Omit<ExportHistoryEntry, 'id' | 'exportedAt'>) {
  const history = getExportHistory();
  history.unshift({
    ...entry,
    id: crypto.randomUUID(),
    exportedAt: new Date().toISOString(),
  });
  // Keep last 50
  localStorage.setItem(EXPORT_HISTORY_KEY, JSON.stringify(history.slice(0, 50)));
}
