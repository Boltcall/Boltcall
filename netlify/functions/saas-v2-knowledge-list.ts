import type { Handler } from '@netlify/functions';
import { getServiceSupabase } from './_shared/token-utils';
import { chatCompletion } from './_shared/azure-ai';

import { getV2CorsHeaders, getRequestOrigin } from './_shared/cors-v2';
/**
 * saas-v2-knowledge-list.ts
 *
 * V2 Knowledge page — lists existing KB entries and AI-curates topical
 * categories so the user sees their KB grouped by what it's actually about.
 *
 * Auth: JWT (Authorization: Bearer <token>) → user_id → workspace_id.
 * Method: GET (also accepts OPTIONS for CORS preflight).
 *
 * Response shape:
 *   {
 *     entries: Array<{id, title, body_preview, category, updated_at}>,
 *     categories: Array<{label, count}>,
 *     total: number,
 *     cold_start: boolean,
 *   }
 *
 * Cold-start guard: when the user has < 5 KB entries we skip the LLM
 * clustering pass (Haiku is wasted on a list that's already comprehensible
 * at-a-glance) and fall back to the existing `category` column.
 *
 * Telemetry: emits `saas_v2_knowledge_list_rendered` to aios_event_log via
 * the shared emitter when available; silently no-ops otherwise so the page
 * still works in environments where wave-1's emit helper hasn't landed.
 */



interface KBRow {
  id: string;
  title: string | null;
  content: string | null;
  category: string | null;
  updated_at: string | null;
}

function makePreview(content: string | null): string {
  if (!content) return '';
  const stripped = content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return stripped.length > 180 ? stripped.slice(0, 177) + '…' : stripped;
}

async function emitListRendered(workspaceId: string, count: number, latencyMs: number) {
  try {
    // Lazy require so missing module doesn't break the handler.
    const mod = await import('./_shared/emit-agency-event').catch(() => null);
    if (!mod) return;
    const emitter = (mod as any).emitSaasV2Event || (mod as any).emitAgencyEvent;
    if (typeof emitter !== 'function') return;
    await emitter({
      workspace_id: workspaceId,
      type: 'saas_v2_knowledge_list_rendered',
      payload: { workspace_id: workspaceId, count, latency_ms: latencyMs },
    });
  } catch (err) {
    console.warn('[saas-v2-knowledge-list] emit failed (non-fatal):', err);
  }
}

async function clusterCategories(
  entries: Array<{ id: string; title: string; preview: string; fallback: string }>,
): Promise<{ assignments: Record<string, string>; labels: Array<{ label: string; count: number }> }> {
  // Cap input — Haiku is fast but we don't need 500 rows in the prompt.
  const sample = entries.slice(0, 100);
  if (sample.length < 5) {
    // Cold-start: fall back to existing `category` column.
    const assignments: Record<string, string> = {};
    const counts: Record<string, number> = {};
    for (const e of sample) {
      const label = e.fallback || 'General';
      assignments[e.id] = label;
      counts[label] = (counts[label] || 0) + 1;
    }
    const labels = Object.entries(counts)
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);
    return { assignments, labels };
  }

  const list = sample
    .map((e, i) => `${i + 1}. "${(e.title || '').slice(0, 80)}" — ${e.preview.slice(0, 100)}`)
    .join('\n');

  const system =
    'You cluster a Boltcall customer\'s knowledge-base entries into 4-8 topical buckets. ' +
    'Return STRICT JSON only — no markdown, no commentary. Shape:\n' +
    '{\n  "labels": ["Hours & Pricing", "Services Offered", ...],\n  "assignments": { "1": "Hours & Pricing", "2": "Services Offered", ... }\n}\n' +
    'Rules:\n' +
    '- 4-8 short bucket labels (max 3 words each). Use Title Case.\n' +
    '- Every entry index must be assigned to exactly one label from the labels list.\n' +
    '- Group like-with-like. Avoid generic catch-alls unless truly necessary.';

  const user = `Cluster these KB entries:\n\n${list}`;

  let raw: string;
  try {
    raw = await chatCompletion(system, user, { maxTokens: 1200, tier: 'light' });
  } catch (err) {
    console.warn('[saas-v2-knowledge-list] LLM clustering failed, falling back to column:', err);
    raw = '';
  }

  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) {
    return fallbackByColumn(sample);
  }

  try {
    const parsed = JSON.parse(match[0]);
    const labels: string[] = Array.isArray(parsed.labels)
      ? parsed.labels.filter((l: unknown) => typeof l === 'string').slice(0, 8)
      : [];
    const rawAssign: Record<string, string> = parsed.assignments || {};

    if (labels.length < 2) return fallbackByColumn(sample);

    const assignments: Record<string, string> = {};
    const counts: Record<string, number> = {};
    for (const label of labels) counts[label] = 0;

    sample.forEach((entry, i) => {
      const key = String(i + 1);
      const assigned = rawAssign[key];
      const label = labels.includes(assigned) ? assigned : labels[0];
      assignments[entry.id] = label;
      counts[label] = (counts[label] || 0) + 1;
    });

    const labelList = labels
      .map(label => ({ label, count: counts[label] || 0 }))
      .filter(l => l.count > 0)
      .sort((a, b) => b.count - a.count);

    return { assignments, labels: labelList };
  } catch (err) {
    console.warn('[saas-v2-knowledge-list] LLM JSON parse failed:', err);
    return fallbackByColumn(sample);
  }
}

function fallbackByColumn(
  sample: Array<{ id: string; fallback: string }>,
): { assignments: Record<string, string>; labels: Array<{ label: string; count: number }> } {
  const assignments: Record<string, string> = {};
  const counts: Record<string, number> = {};
  for (const e of sample) {
    const label = (e.fallback || 'General').replace(/\b\w/g, c => c.toUpperCase());
    assignments[e.id] = label;
    counts[label] = (counts[label] || 0) + 1;
  }
  const labels = Object.entries(counts)
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
  return { assignments, labels };
}

const handler: Handler = async (event) => {
  const v2cors = getV2CorsHeaders(
    getRequestOrigin(event.headers as Record<string, string>),
    { methods: 'GET' },
  );
  const cors = v2cors.headers;


  function unauthorized(msg: string) {

    return { statusCode: 401, headers: cors, body: JSON.stringify({ error: msg }) };

  }
  const t0 = Date.now();

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: cors, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers: cors, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  // ── Auth: JWT → user_id → workspace_id ────────────────────────────────
  const authHeader = event.headers['authorization'] || event.headers['Authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) return unauthorized('Missing bearer token');

  const supa = getServiceSupabase();
  const { data: userResult, error: authErr } = await supa.auth.getUser(token);
  if (authErr || !userResult?.user) return unauthorized('Invalid or expired token');
  const userId = userResult.user.id;

  // Resolve workspace (user_id = userId). Falls back to userId itself for
  // legacy single-tenant rows that pre-date workspaces.
  const { data: ws } = await supa
    .from('workspaces')
    .select('id')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();
  const workspaceId = ws?.id || userId;

  try {
    // Read all KB entries owned by this user. knowledge_base has both
    // user_id (legacy) and (in newer migrations) is scoped via business
    // profile / workspace — we use user_id for the broadest coverage.
    const { data: rows, error: kbErr } = await supa
      .from('knowledge_base')
      .select('id, title, content, category, updated_at')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('updated_at', { ascending: false })
      .limit(500);

    if (kbErr) {
      console.error('[saas-v2-knowledge-list] kb read failed:', kbErr.message);
      return {
        statusCode: 500, headers: cors,
        body: JSON.stringify({ error: 'Failed to load knowledge base', details: kbErr.message }),
      };
    }

    const entries = (rows || []) as KBRow[];
    const total = entries.length;
    const coldStart = total < 5;

    // Build cluster inputs once.
    const clusterInputs = entries.map(r => ({
      id: r.id,
      title: r.title || '(untitled)',
      preview: makePreview(r.content),
      fallback: r.category || 'General',
    }));

    const { assignments, labels } = await clusterCategories(clusterInputs);

    const enriched = entries.map(r => ({
      id: r.id,
      title: r.title || '(untitled)',
      body_preview: makePreview(r.content),
      category: assignments[r.id] || (r.category || 'General'),
      updated_at: r.updated_at,
    }));

    const latencyMs = Date.now() - t0;
    await emitListRendered(workspaceId, total, latencyMs);

    return {
      statusCode: 200, headers: cors,
      body: JSON.stringify({
        entries: enriched,
        categories: labels,
        total,
        cold_start: coldStart,
      }),
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[saas-v2-knowledge-list] handler error:', msg);
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: msg }) };
  }
};

export { handler };
