import { createSign } from 'crypto';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import type { SupabaseClient } from '@supabase/supabase-js';

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_SUPABASE_URL = 'https://hbwogktdajorojljkjwg.supabase.co';
const DEFAULT_SITE_URL = 'sc-domain:boltcall.org';
const DEFAULT_GA4_PROPERTY_ID = '527238136';
const DEFAULT_CLARITY_PROJECT_ID = 'x4e3hjsgc7';
const DEFAULT_WORKSPACE_ID = '001dd963-d375-474c-9073-21c887771243';
const ATP_BASE_URL = 'https://answerthepublic.com';
const ATP_REPORT_ATTEMPTS = 4;

export const DEFAULT_ATP_TASKS = [
  { id: 'task-1', prompt: 'how fast should local service businesses respond to leads', result: '' },
  { id: 'task-2', prompt: 'why local service businesses lose leads after hours', result: '' },
  { id: 'task-3', prompt: 'how to book more inbound leads automatically', result: '' },
];

type Warning = string;

interface RunnerOptions {
  supabase: SupabaseClient;
  date?: string;
}

interface AtpRun {
  tasks: Array<{ id: string; prompt: string; result: string; clusters?: string[] }>;
  raw: Record<string, unknown>;
  warnings: Warning[];
}

type AtpTaskResult = AtpRun['tasks'][number];

interface WeeklySeoRun {
  status: string;
  run_week_start: string;
  run_week_end: string;
  warnings: Warning[];
  weekly_seo_run_id?: string;
  summary: string;
}

interface SourceWindow {
  label: string;
  startDate: string;
  endDate: string;
}

async function readServerSecret(supabase: SupabaseClient | undefined, envName: string, key: string) {
  const envValue = process.env[envName];
  if (envValue) return envValue;
  if (!supabase) return '';
  const { data, error } = await supabase
    .from('daily_seo_secrets')
    .select('value')
    .eq('key', key)
    .maybeSingle();
  if (error) throw new Error(`${envName} lookup failed: ${error.message}`);
  return typeof data?.value === 'string' ? data.value : '';
}

async function readFirstServerSecret(supabase: SupabaseClient | undefined, envNames: string[], key: string) {
  for (const envName of envNames) {
    const value = await readServerSecret(undefined, envName, key);
    if (value) return value;
  }
  return readServerSecret(supabase, envNames[0], key);
}

async function readServerSetting(supabase: SupabaseClient | undefined, envName: string, key: string) {
  const envValue = process.env[envName];
  if (envValue) return envValue;
  if (!supabase) return '';
  const { data, error } = await supabase
    .from('daily_seo_secrets')
    .select('value')
    .eq('key', key)
    .maybeSingle();
  if (error) throw new Error(`${envName} lookup failed: ${error.message}`);
  return typeof data?.value === 'string' ? data.value : '';
}

function yesterdayKey() {
  return new Date(Date.now() - DAY_MS).toISOString().slice(0, 10);
}

function shiftDate(date: string, days: number) {
  const [year, month, day] = date.split('-').map(Number);
  const current = new Date(Date.UTC(year, month - 1, day));
  current.setUTCDate(current.getUTCDate() + days);
  return current.toISOString().slice(0, 10);
}

function fallbackWindow(date: string): SourceWindow {
  return {
    label: `fallback ${shiftDate(date, -28)} to ${shiftDate(date, -3)}`,
    startDate: shiftDate(date, -28),
    endDate: shiftDate(date, -3),
  };
}

function weeklyWindow(date: string): SourceWindow {
  return {
    label: `${shiftDate(date, -6)} to ${date}`,
    startDate: shiftDate(date, -6),
    endDate: date,
  };
}

async function readServiceAccount(supabase?: SupabaseClient) {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (raw) return JSON.parse(raw);
  if (process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
    return {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    };
  }
  if (supabase) {
    const { data, error } = await supabase
      .from('daily_seo_secrets')
      .select('value')
      .eq('key', 'google_service_account_json')
      .maybeSingle();
    if (error) throw new Error(`Google service account secret lookup failed: ${error.message}`);
    if (typeof data?.value === 'string' && data.value) return JSON.parse(data.value);
  }

  const candidates = [
    process.env.GSC_SERVICE_ACCOUNT,
    resolve(process.cwd(), '../gsc-service-account.json'),
    'C:/Users/Asus/Desktop/Boltcall_website/gsc-service-account.json',
  ].filter(Boolean) as string[];
  const path = candidates.find((candidate) => existsSync(candidate));
  if (!path) throw new Error(`Google service account JSON not found. Tried: ${candidates.join(', ')}`);
  return JSON.parse(readFileSync(path, 'utf8'));
}

async function googleAccessToken(scopes: string[], supabase?: SupabaseClient) {
  const sa = await readServiceAccount(supabase);
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    iss: sa.client_email,
    scope: scopes.join(' '),
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  })).toString('base64url');

  const signer = createSign('RSA-SHA256');
  signer.update(`${header}.${payload}`);
  const assertion = `${header}.${payload}.${signer.sign(sa.private_key, 'base64url')}`;

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });
  const data = await response.json();
  if (!response.ok || !data.access_token) throw new Error(`Google auth failed: ${JSON.stringify(data)}`);
  return data.access_token as string;
}

async function gscQuery(token: string, body: Record<string, unknown>) {
  const site = process.env.GSC_SITE_URL || DEFAULT_SITE_URL;
  const response = await fetch(
    `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site)}/searchAnalytics/query`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  );
  const data = await response.json();
  if (!response.ok) throw new Error(`GSC query failed: ${JSON.stringify(data)}`);
  return data;
}

async function ga4RunReport(token: string, body: Record<string, unknown>) {
  const propertyId = process.env.GA4_PROPERTY_ID || DEFAULT_GA4_PROPERTY_ID;
  const response = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(`GA4 report failed: ${JSON.stringify(data)}`);
  return data;
}

async function fetchClarity(warnings: Warning[], supabase?: SupabaseClient, days = 1) {
  const token = await readServerSecret(supabase, 'CLARITY_API_TOKEN', 'clarity_api_token');
  if (!token) {
    warnings.push('Clarity skipped: CLARITY_API_TOKEN missing');
    return [];
  }

  const url = new URL('https://www.clarity.ms/export-data/api/v1/project-live-insights');
  url.searchParams.set('projectId', process.env.CLARITY_PROJECT_ID || DEFAULT_CLARITY_PROJECT_ID);
  url.searchParams.set('numOfDays', String(days));
  url.searchParams.set('dimension1', 'URL');

  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } });
  const text = await response.text();
  let data: unknown = text;
  try {
    data = JSON.parse(text);
  } catch {
    warnings.push(`Clarity warning: ${text.slice(0, 140)}`);
    return [];
  }
  if (!response.ok) {
    warnings.push(`Clarity warning: ${JSON.stringify(data).slice(0, 220)}`);
    return [];
  }
  return Array.isArray(data) ? data : [];
}

function walkQuestions(value: unknown, out: string[] = []) {
  if (out.length >= 30 || value == null) return out;
  if (typeof value === 'string') {
    const clean = value.replace(/\s+/g, ' ').trim();
    if (
      clean.length >= 12 &&
      clean.length <= 180 &&
      (clean.includes('?') || /^(how|why|what|when|where|which|who|can|should|is|are|will)\b/i.test(clean)) &&
      !out.includes(clean)
    ) out.push(clean);
    return out;
  }
  if (Array.isArray(value)) {
    for (const item of value) walkQuestions(item, out);
    return out;
  }
  if (typeof value === 'object') {
    for (const item of Object.values(value as Record<string, unknown>)) walkQuestions(item, out);
  }
  return out;
}

function clustersFromReport(report: unknown) {
  const questions = walkQuestions(report).slice(0, 9);
  const clusters = [0, 1, 2].map((index) => questions.slice(index * 3, index * 3 + 3)).filter((items) => items.length);
  return clusters.map((items, index) => [`Cluster ${index + 1}:`, ...items.map((item) => `- ${item}`)].join('\n'));
}

function compactRaw(value: unknown) {
  const text = JSON.stringify(value);
  if (!text) return null;
  if (text.length <= 5000) return value;
  return { excerpt: text.slice(0, 5000) };
}

class AtpClient {
  private workspaceSlug = '';

  constructor(private token: string, workspaceSlug = '') {
    this.workspaceSlug = workspaceSlug;
  }

  private async request(path: string, init: RequestInit = {}) {
    const response = await fetch(`${ATP_BASE_URL}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.token}`,
        'X-API-Key': this.token,
        ...(init.headers || {}),
      },
    });
    const text = await response.text();
    let data: unknown = text;
    try {
      data = JSON.parse(text);
    } catch {}
    if (!response.ok) throw new Error(`ATP ${path} failed ${response.status}: ${JSON.stringify(data).slice(0, 220)}`);
    return data;
  }

  async workspace() {
    if (this.workspaceSlug) return this.workspaceSlug;
    let me: unknown;
    me = await this.request('/api/public/v1/me');
    const anyMe = me as any;
    this.workspaceSlug =
      anyMe?.data?.current_workspace?.slug ||
      anyMe?.data?.workspace?.slug ||
      anyMe?.data?.user?.current_workspace?.slug ||
      anyMe?.workspace?.slug ||
      anyMe?.current_workspace?.slug ||
      '';
    if (!this.workspaceSlug) throw new Error('ATP workspace slug not found; set ATP_WORKSPACE_SLUG');
    return this.workspaceSlug;
  }

  async search(prompt: string) {
    await this.workspace();
    const body = {
      search: {
        keyword: prompt,
        language: process.env.ATP_LANGUAGE || 'en',
        region: process.env.ATP_REGION || 'us',
      },
    };
    const created = await this.request('/api/public/v1/searches', { method: 'POST', body: JSON.stringify(body) });
    const anyCreated = created as any;
    const reportId =
      anyCreated?.data?.report_id ||
      anyCreated?.data?.parent_search_id ||
      anyCreated?.data?.id ||
      anyCreated?.report_id ||
      anyCreated?.parent_search_id ||
      anyCreated?.id;
    if (!reportId) throw new Error('ATP search response did not include report id');

    let report: unknown = null;
    let lastError: unknown = null;
    for (let attempt = 1; attempt <= ATP_REPORT_ATTEMPTS; attempt += 1) {
      try {
        report = await this.request(`/api/public/v1/reports/${encodeURIComponent(String(reportId))}`);
        break;
      } catch (error) {
        lastError = error;
        if (attempt === ATP_REPORT_ATTEMPTS) throw error;
        await new Promise((resolveDelay) => setTimeout(resolveDelay, attempt * 1500));
      }
    }
    if (!report && lastError) throw lastError;
    const clusters = clustersFromReport(report);
    return { reportId, clusters, raw: compactRaw({ created, report }) };
  }
}

async function runAtp(warnings: Warning[], supabase?: SupabaseClient): Promise<AtpRun> {
  const token = await readFirstServerSecret(supabase, ['ATP_API_TOKEN', 'ATP_API_KEY'], 'atp_api_token');
  if (!token) {
    warnings.push('ATP skipped: ATP_API_TOKEN or ATP_API_KEY missing');
    return { tasks: DEFAULT_ATP_TASKS.map((task) => ({ ...task })), raw: {}, warnings };
  }

  const workspaceSlug = await readServerSetting(supabase, 'ATP_WORKSPACE_SLUG', 'atp_workspace_slug');
  const client = new AtpClient(token, workspaceSlug);
  const tasks: AtpTaskResult[] = [];
  const raw: Record<string, unknown> = {};
  for (const task of DEFAULT_ATP_TASKS) {
    try {
      const result = await client.search(task.prompt);
      const text = result.clusters.length ? result.clusters.join('\n\n') : 'No question clusters found in ATP response.';
      tasks.push({ ...task, result: text, clusters: result.clusters });
      raw[task.id] = result.raw;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      warnings.push(`ATP ${task.id} warning: ${message}`);
      tasks.push({ ...task, result: '' });
    }
  }
  return { tasks, raw, warnings };
}

function parseGscRows(rows: any[] = []) {
  return rows.map((row) => ({
    key: row.keys?.[0] || '(unknown)',
    clicks: Number(row.clicks || 0),
    impressions: Number(row.impressions || 0),
  }));
}

function parseGa4Rows(rows: any[] = []) {
  return rows.map((row) => ({
    key: row.dimensionValues?.[0]?.value || '(unknown)',
    sessions: Number(row.metricValues?.[0]?.value || 0),
    engagedSessions: Number(row.metricValues?.[1]?.value || 0),
    keyEvents: Number(row.metricValues?.[2]?.value || 0),
  }));
}

function topRows(rows: Array<Record<string, any>>, metric: string, count = 3) {
  return [...rows].sort((a, b) => Number(b[metric] || 0) - Number(a[metric] || 0)).slice(0, count);
}

function lines(rows: Array<Record<string, any>>, metric: string, suffix: string) {
  return rows.length ? rows.map((row) => `- ${row.key}: ${row[metric]}${suffix}`) : ['- No data.'];
}

function findGa4Opportunity(rows: Array<Record<string, any>>) {
  return [...rows]
    .filter((row) => Number(row.sessions || 0) > 0)
    .sort((a, b) => {
      const aRate = Number(a.keyEvents || 0) / Math.max(Number(a.sessions || 0), 1);
      const bRate = Number(b.keyEvents || 0) / Math.max(Number(b.sessions || 0), 1);
      if (aRate !== bRate) return aRate - bRate;
      return Number(b.sessions || 0) - Number(a.sessions || 0);
    })[0];
}

async function optionalSource<T>(warnings: Warning[], label: string, fallback: T, run: () => Promise<T>) {
  try {
    return await run();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    warnings.push(`${label} warning: ${message}`);
    return fallback;
  }
}

async function gscSnapshot(token: string, date: string, warnings: Warning[]) {
  const daily: SourceWindow = { label: date, startDate: date, endDate: date };
  let data = await gscQuery(token, { startDate: date, endDate: date, dimensions: ['page'], rowLimit: 25 });
  if (((data as any).rows || []).length) return { data, window: daily };

  const fallback = fallbackWindow(date);
  data = await gscQuery(token, { startDate: fallback.startDate, endDate: fallback.endDate, dimensions: ['page'], rowLimit: 25 });
  if (((data as any).rows || []).length) warnings.push(`GSC returned no rows for ${date}; used ${fallback.label}.`);
  return { data, window: ((data as any).rows || []).length ? fallback : daily };
}

async function ga4Snapshot(token: string, date: string, warnings: Warning[]) {
  const daily: SourceWindow = { label: date, startDate: date, endDate: date };
  const request = (window: SourceWindow) => ga4RunReport(token, {
    dateRanges: [{ startDate: window.startDate, endDate: window.endDate }],
    dimensions: [{ name: 'landingPagePlusQueryString' }],
    metrics: [{ name: 'sessions' }, { name: 'engagedSessions' }, { name: 'keyEvents' }],
    limit: 25,
    orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
  });

  let data = await request(daily);
  if (((data as any).rows || []).length) return { data, window: daily };

  const fallback = fallbackWindow(date);
  data = await request(fallback);
  if (((data as any).rows || []).length) warnings.push(`GA4 returned no rows for ${date}; used ${fallback.label}.`);
  return { data, window: ((data as any).rows || []).length ? fallback : daily };
}

async function gscRange(token: string, window: SourceWindow) {
  const data = await gscQuery(token, {
    startDate: window.startDate,
    endDate: window.endDate,
    dimensions: ['page'],
    rowLimit: 50,
  });
  return { data, window };
}

async function ga4LandingPagesRange(token: string, window: SourceWindow) {
  const data = await ga4RunReport(token, {
    dateRanges: [{ startDate: window.startDate, endDate: window.endDate }],
    dimensions: [{ name: 'landingPagePlusQueryString' }],
    metrics: [{ name: 'sessions' }, { name: 'engagedSessions' }, { name: 'keyEvents' }],
    limit: 50,
    orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
  });
  return { data, window };
}

async function ga4AcquisitionRange(token: string, window: SourceWindow) {
  const data = await ga4RunReport(token, {
    dateRanges: [{ startDate: window.startDate, endDate: window.endDate }],
    dimensions: [{ name: 'sessionDefaultChannelGroup' }],
    metrics: [{ name: 'sessions' }, { name: 'engagedSessions' }, { name: 'keyEvents' }],
    limit: 20,
    orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
  });
  return { data, window };
}

async function ga4EventsRange(token: string, window: SourceWindow) {
  const data = await ga4RunReport(token, {
    dateRanges: [{ startDate: window.startDate, endDate: window.endDate }],
    dimensions: [{ name: 'eventName' }],
    metrics: [{ name: 'eventCount' }, { name: 'keyEvents' }],
    limit: 20,
    orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
  });
  return { data, window };
}

function parseNamedMetricRows(rows: any[] = [], metrics: string[]) {
  return rows.map((row) => {
    const record: Record<string, number | string> = {
      key: row.dimensionValues?.[0]?.value || '(unknown)',
    };
    metrics.forEach((metric, index) => {
      record[metric] = Number(row.metricValues?.[index]?.value || 0);
    });
    return record;
  });
}

function normalizePageKey(key: string) {
  if (!key) return '/';
  try {
    if (/^https?:\/\//i.test(key)) return new URL(key).pathname || '/';
  } catch {}
  return key.startsWith('/') ? key : `/${key.replace(/^\//, '')}`;
}

function rankWeeklyPageFixes(gscRows: Array<Record<string, any>>, ga4Rows: Array<Record<string, any>>, clarityRows: any[] = []) {
  const byPage = new Map<string, Record<string, number | string>>();

  for (const row of gscRows) {
    const key = normalizePageKey(String(row.key || '/'));
    const current = byPage.get(key) || { key, clicks: 0, impressions: 0, sessions: 0, engagedSessions: 0, keyEvents: 0, clarityHits: 0 };
    current.clicks = Number(current.clicks || 0) + Number(row.clicks || 0);
    current.impressions = Number(current.impressions || 0) + Number(row.impressions || 0);
    byPage.set(key, current);
  }

  for (const row of ga4Rows) {
    const key = normalizePageKey(String(row.key || '/'));
    const current = byPage.get(key) || { key, clicks: 0, impressions: 0, sessions: 0, engagedSessions: 0, keyEvents: 0, clarityHits: 0 };
    current.sessions = Number(current.sessions || 0) + Number(row.sessions || 0);
    current.engagedSessions = Number(current.engagedSessions || 0) + Number(row.engagedSessions || 0);
    current.keyEvents = Number(current.keyEvents || 0) + Number(row.keyEvents || 0);
    byPage.set(key, current);
  }

  for (const row of clarityRows) {
    const rawKey = String((row as any)?.URL || (row as any)?.url || (row as any)?.Page || '');
    if (!rawKey) continue;
    const key = normalizePageKey(rawKey);
    const current = byPage.get(key) || { key, clicks: 0, impressions: 0, sessions: 0, engagedSessions: 0, keyEvents: 0, clarityHits: 0 };
    current.clarityHits = Number(current.clarityHits || 0) + 1;
    byPage.set(key, current);
  }

  return [...byPage.values()]
    .filter((row) => Number(row.impressions || 0) > 0 || Number(row.sessions || 0) > 0)
    .sort((a, b) => {
      const aScore = Number(a.impressions || 0) + Number(a.sessions || 0) * 10 + Number(a.clarityHits || 0) * 15 - Number(a.keyEvents || 0) * 20;
      const bScore = Number(b.impressions || 0) + Number(b.sessions || 0) * 10 + Number(b.clarityHits || 0) * 15 - Number(b.keyEvents || 0) * 20;
      return bScore - aScore;
    })
    .slice(0, 5)
    .map((row) => `${row.key}: ${row.impressions} impressions, ${row.sessions} sessions, ${row.keyEvents} key events, ${row.clarityHits} Clarity flags`);
}

function rankWeeklyContentCandidates(atp: AtpRun) {
  return atp.tasks
    .flatMap((task) => (task.clusters || []).map((cluster) => `${task.prompt}: ${cluster.split('\n').slice(1, 3).join(' ')}`))
    .slice(0, 5);
}

function rankWeeklyCitationGaps(pageFixes: string[], gscRows: Array<Record<string, any>>) {
  const topPage = pageFixes[0]?.split(':')[0] || normalizePageKey(String(gscRows[0]?.key || '/'));
  return [
    `${topPage}: add direct-answer proof, source-backed stats, and FAQ/schema support.`,
    `${topPage}: strengthen comparison language and internal links for AI-surface retrieval.`,
  ];
}

function makeScorecard(
  date: string,
  windows: { gsc: SourceWindow; ga4: SourceWindow },
  gscRows: any[],
  ga4Rows: any[],
  clarityRows: unknown[],
  atp: AtpRun,
  warnings: Warning[],
) {
  const gscTop = topRows(gscRows, 'clicks');
  const ga4Top = topRows(ga4Rows, 'sessions');
  const opportunity = findGa4Opportunity(ga4Rows);
  return [
    '# Daily SEO + AEO scorecard',
    '',
    `Date: ${date}`,
    '',
    'Tool jobs: GSC and GA4 show what moved. Clarity explains why users got stuck. AnswerThePublic shows what to write or answer next.',
    '',
    '## GSC',
    `SEO demand snapshot (${windows.gsc.label}): top pages by clicks`,
    ...lines(gscTop, 'clicks', ' clicks'),
    '',
    '## GA4',
    `Landing-page movement (${windows.ga4.label}): top pages by sessions`,
    ...lines(ga4Top, 'sessions', ' sessions'),
    '',
    'Biggest GA4 landing-page opportunity',
    opportunity
      ? `- ${opportunity.key}: ${opportunity.sessions} sessions, ${opportunity.engagedSessions} engaged sessions, ${opportunity.keyEvents} key events`
      : '- No landing-page opportunity found.',
    '',
    '## Clarity',
    `- Rows returned: ${clarityRows.length}`,
    '- Use dashboard insights, heatmaps, and 2-3 recordings only when GA4 drops or Clarity flags friction.',
    '',
    '## AnswerThePublic',
    ...atp.tasks.map((task, index) => `- Prompt ${index + 1}: ${task.prompt}\n${task.result || 'No result saved.'}`),
    '',
    '## Daily action list',
    '- Page fix: improve the highest-traffic page with weak key events or repeated Clarity friction.',
    '- Content angle: use the strongest ATP question cluster after buyer-intent and demand checks.',
    '- Experiment: watch CTA visibility and conversion movement tomorrow.',
    '',
    '## Decision',
    `- Page to improve: ${opportunity?.key || 'highest-intent page from GSC/GA4 movers'}.`,
    '- Content angle to ship: strongest ATP speed-to-lead question cluster.',
    '- Experiment to watch tomorrow: CTA visibility and conversion movement.',
    '',
    ...(warnings.length ? ['## Warnings', ...warnings.map((warning) => `- ${warning}`), ''] : []),
  ].join('\n');
}

function makeWeeklySummary(
  window: SourceWindow,
  gscRows: Array<Record<string, any>>,
  ga4Rows: Array<Record<string, any>>,
  acquisitionRows: Array<Record<string, any>>,
  eventRows: Array<Record<string, any>>,
  clarityRows: unknown[],
  atp: AtpRun,
  queue: { page_fixes: string[]; content_candidates: string[]; citation_gaps: string[] },
  warnings: Warning[],
) {
  return [
    '# Weekly SEO + AEO queue',
    '',
    `Window: ${window.label}`,
    '',
    '## GSC',
    ...lines(topRows(gscRows, 'clicks', 5), 'clicks', ' clicks'),
    '',
    '## GA4 landing pages',
    ...lines(topRows(ga4Rows, 'sessions', 5), 'sessions', ' sessions'),
    '',
    '## GA4 acquisition',
    ...lines(topRows(acquisitionRows, 'sessions', 5), 'sessions', ' sessions'),
    '',
    '## GA4 events',
    ...lines(topRows(eventRows, 'eventCount', 5), 'eventCount', ' events'),
    '',
    '## Clarity',
    `- Rows returned: ${clarityRows.length}`,
    '- Use funnels, segments, and recordings on the top queue items first.',
    '',
    '## AnswerThePublic',
    ...atp.tasks.map((task, index) => `- Prompt ${index + 1}: ${task.prompt}\n${task.result || 'No result saved.'}`),
    '',
    '## Ranked next-week queue',
    '- Page fixes first:',
    ...(queue.page_fixes.length ? queue.page_fixes.map((item) => `  ${item}`) : ['  No page fixes ranked.']),
    '- Content candidates second:',
    ...(queue.content_candidates.length ? queue.content_candidates.map((item) => `  ${item}`) : ['  No content candidates ranked.']),
    '- Citation gaps third:',
    ...(queue.citation_gaps.length ? queue.citation_gaps.map((item) => `  ${item}`) : ['  No citation gaps ranked.']),
    '',
    ...(warnings.length ? ['## Warnings', ...warnings.map((warning) => `- ${warning}`), ''] : []),
  ].join('\n');
}

export async function runWeeklySeoAeo({ supabase, date = yesterdayKey() }: RunnerOptions): Promise<WeeklySeoRun> {
  const workspaceId = process.env.DAILY_SEO_WORKSPACE_ID || DEFAULT_WORKSPACE_ID;
  if (!workspaceId) throw new Error('DAILY_SEO_WORKSPACE_ID is required');

  const googleToken = await googleAccessToken([
    'https://www.googleapis.com/auth/webmasters.readonly',
    'https://www.googleapis.com/auth/analytics.readonly',
  ], supabase);
  const warnings: Warning[] = [];
  const window = weeklyWindow(date);

  const [gscResult, ga4LandingResult, ga4AcquisitionResult, ga4EventResult, clarity, atp] = await Promise.all([
    gscRange(googleToken, window),
    ga4LandingPagesRange(googleToken, window),
    ga4AcquisitionRange(googleToken, window),
    ga4EventsRange(googleToken, window),
    optionalSource(warnings, 'Clarity', [] as unknown[], () => fetchClarity(warnings, supabase, 7)),
    optionalSource(warnings, 'ATP', { tasks: DEFAULT_ATP_TASKS.map((task) => ({ ...task })), raw: {}, warnings } as AtpRun, () => runAtp(warnings, supabase)),
  ]);

  const gscRows = parseGscRows((gscResult.data as any).rows || []);
  const ga4Rows = parseGa4Rows((ga4LandingResult.data as any).rows || []);
  const acquisitionRows = parseNamedMetricRows((ga4AcquisitionResult.data as any).rows || [], ['sessions', 'engagedSessions', 'keyEvents']);
  const eventRows = parseNamedMetricRows((ga4EventResult.data as any).rows || [], ['eventCount', 'keyEvents']);

  if (!gscRows.length) warnings.push(`Weekly GSC returned no rows for ${window.label}.`);
  if (!ga4Rows.length) warnings.push(`Weekly GA4 landing pages returned no rows for ${window.label}.`);

  const queue = {
    page_fixes: rankWeeklyPageFixes(gscRows, ga4Rows, clarity as any[]),
    content_candidates: rankWeeklyContentCandidates(atp),
    citation_gaps: [] as string[],
  };
  queue.citation_gaps = rankWeeklyCitationGaps(queue.page_fixes, gscRows);

  const summary = makeWeeklySummary(window, gscRows, ga4Rows, acquisitionRows, eventRows, clarity, atp, queue, warnings);
  const now = new Date().toISOString();

  const { data: runRow, error: runError } = await supabase
    .from('weekly_seo_runs')
    .upsert({
      workspace_id: workspaceId,
      run_week_start: window.startDate,
      run_week_end: window.endDate,
      status: warnings.length ? 'completed_with_warnings' : 'completed',
      summary,
      warnings,
      sources: {
        window,
        gsc: gscRows,
        ga4_landing_pages: ga4Rows,
        ga4_acquisition: acquisitionRows,
        ga4_events: eventRows,
        clarity,
        atp: atp.raw,
      },
      priority_queue: queue,
      updated_at: now,
    }, { onConflict: 'workspace_id,run_week_start' })
    .select('id')
    .single();
  if (runError) throw new Error(`Weekly SEO run save failed: ${runError.message}`);

  return {
    status: warnings.length ? 'completed_with_warnings' : 'completed',
    run_week_start: window.startDate,
    run_week_end: window.endDate,
    warnings,
    weekly_seo_run_id: runRow?.id,
    summary,
  };
}

export async function runDailySeoAeo({ supabase, date = yesterdayKey() }: RunnerOptions) {
  const workspaceId = process.env.DAILY_SEO_WORKSPACE_ID || DEFAULT_WORKSPACE_ID;
  if (!workspaceId) throw new Error('DAILY_SEO_WORKSPACE_ID is required');

  const googleToken = await googleAccessToken([
    'https://www.googleapis.com/auth/webmasters.readonly',
    'https://www.googleapis.com/auth/analytics.readonly',
  ], supabase);
  const warnings: Warning[] = [];

  const [gscResult, ga4Result, clarity, atp] = await Promise.all([
    gscSnapshot(googleToken, date, warnings),
    ga4Snapshot(googleToken, date, warnings),
    optionalSource(warnings, 'Clarity', [] as unknown[], () => fetchClarity(warnings, supabase)),
    optionalSource(warnings, 'ATP', { tasks: DEFAULT_ATP_TASKS.map((task) => ({ ...task })), raw: {}, warnings } as AtpRun, () => runAtp(warnings, supabase)),
  ]);

  const gscRows = parseGscRows((gscResult.data as any).rows || []);
  const ga4Rows = parseGa4Rows((ga4Result.data as any).rows || []);
  const opportunity = findGa4Opportunity(ga4Rows);
  const now = new Date().toISOString();
  const windows = { gsc: gscResult.window, ga4: ga4Result.window };
  const scorecard = makeScorecard(date, windows, gscRows, ga4Rows, clarity, atp, warnings);
  const { data: workspaceRow, error: workspaceError } = await supabase
    .from('workspaces')
    .select('user_id')
    .eq('id', workspaceId)
    .maybeSingle();
  if (workspaceError) throw new Error(`Workspace lookup failed: ${workspaceError.message}`);

  const { data: atpRow, error: atpError } = await supabase
    .from('daily_seo_atp_entries')
    .upsert({
      workspace_id: workspaceId,
      user_id: (workspaceRow as { user_id?: string } | null)?.user_id || null,
      entry_date: date,
      tasks: atp.tasks,
      raw_atp: atp.raw,
      last_saved_at: now,
      submitted_at: now,
      updated_at: now,
    }, { onConflict: 'workspace_id,entry_date' })
    .select('id')
    .single();
  if (atpError) throw new Error(`ATP save failed: ${atpError.message}`);

  const sources = { windows, gsc: gscRows, ga4: ga4Rows, clarity, atp: atp.raw };
  const selectedAction = {
    page: opportunity?.key || gscRows[0]?.key || ga4Rows[0]?.key || '/',
    content_angle: atp.tasks.find((task) => task.result)?.prompt || DEFAULT_ATP_TASKS[0].prompt,
    experiment: 'Watch CTA visibility and conversion movement tomorrow',
  };

  const { data: runRow, error: runError } = await supabase
    .from('daily_seo_runs')
    .upsert({
      workspace_id: workspaceId,
      run_date: date,
      status: warnings.length ? 'completed_with_warnings' : 'completed',
      scorecard,
      warnings,
      sources,
      selected_action: selectedAction,
      updated_at: now,
    }, { onConflict: 'workspace_id,run_date' })
    .select('id')
    .single();
  if (runError) throw new Error(`Daily SEO run save failed: ${runError.message}`);

  return {
    status: warnings.length ? 'completed_with_warnings' : 'completed',
    run_date: date,
    warnings,
    atp_entry_id: atpRow?.id,
    daily_seo_run_id: runRow?.id,
    scorecard,
  };
}

export async function fetchDailySeoReview(supabase: SupabaseClient, date = new Date().toISOString().slice(0, 10)) {
  const workspaceId = process.env.DAILY_SEO_WORKSPACE_ID || DEFAULT_WORKSPACE_ID;
  if (!workspaceId) throw new Error('DAILY_SEO_WORKSPACE_ID is required');

  const [{ data: run }, { data: atp }, { data: weeklyRows }] = await Promise.all([
    supabase
      .from('daily_seo_runs')
      .select('run_date,status,scorecard,warnings,selected_action,updated_at')
      .eq('workspace_id', workspaceId)
      .eq('run_date', date)
      .maybeSingle(),
    supabase
      .from('daily_seo_atp_entries')
      .select('entry_date,tasks,last_saved_at,submitted_at')
      .eq('workspace_id', workspaceId)
      .eq('entry_date', date)
      .maybeSingle(),
    supabase
      .from('weekly_seo_runs')
      .select('run_week_start,run_week_end,status,summary,warnings,priority_queue,updated_at')
      .eq('workspace_id', workspaceId)
      .lte('run_week_end', date)
      .order('run_week_end', { ascending: false })
      .limit(1),
  ]);

  return {
    date,
    run: run || null,
    atp: atp || { entry_date: date, tasks: DEFAULT_ATP_TASKS, last_saved_at: null, submitted_at: null },
    weekly: weeklyRows?.[0] || null,
  };
}

export const __dailySeoAeoTest = {
  clustersFromReport,
  fallbackWindow,
  optionalSource,
  shiftDate,
  weeklyWindow,
  walkQuestions,
};
