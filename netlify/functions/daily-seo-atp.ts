import type { Handler } from '@netlify/functions';
import { getRequestOrigin, getV2CorsHeaders } from './_shared/cors-v2';
import { findWorkspaceForUser } from './_shared/setup-workspace';
import { getServiceSupabase } from './_shared/token-utils';
import { withLegacyHandler } from './_shared/runtime-compat';

const DEFAULT_WORKSPACE_ID = '001dd963-d375-474c-9073-21c887771243';
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseBody(body: string | null) {
  if (!body) return {};
  try {
    return JSON.parse(body);
  } catch {
    return null;
  }
}

function normalizeTasks(value: unknown) {
  if (!Array.isArray(value) || value.length !== 3) return null;
  return value.map((task, index) => ({
    id: typeof task?.id === 'string' && task.id ? task.id : `task-${index + 1}`,
    prompt: typeof task?.prompt === 'string' ? task.prompt.trim() : '',
    result: typeof task?.result === 'string' ? task.result.trim() : '',
  }));
}

const handler: Handler = async (event) => {
  const origin = getRequestOrigin(event.headers as Record<string, string>);
  const v2cors = getV2CorsHeaders(origin, { methods: 'POST' });
  const cors = v2cors.headers;

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors, body: '' };
  if (origin && !v2cors.allowed) return { statusCode: 403, headers: cors, body: JSON.stringify({ error: 'Origin not allowed' }) };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: cors, body: JSON.stringify({ error: 'Method not allowed' }) };

  const token = (event.headers.authorization || event.headers.Authorization || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return { statusCode: 401, headers: cors, body: JSON.stringify({ error: 'Missing bearer token' }) };

  const supabase = getServiceSupabase();
  const { data: userRes, error: authError } = await supabase.auth.getUser(token);
  if (authError || !userRes?.user) return { statusCode: 401, headers: cors, body: JSON.stringify({ error: 'Invalid token' }) };

  const workspace = await findWorkspaceForUser<{ id: string }>(userRes.user.id, 'id');
  if (!workspace?.id || workspace.id !== (process.env.DAILY_SEO_WORKSPACE_ID || DEFAULT_WORKSPACE_ID)) {
    return { statusCode: 403, headers: cors, body: JSON.stringify({ error: 'Workspace not allowed' }) };
  }

  const body = parseBody(event.body || null);
  if (!body) return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  const date = typeof body.date === 'string' && DATE_RE.test(body.date) ? body.date : new Date().toISOString().slice(0, 10);
  const tasks = normalizeTasks(body.tasks);
  if (!tasks) return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'Expected exactly 3 ATP tasks' }) };

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('daily_seo_atp_entries')
    .upsert({
      workspace_id: workspace.id,
      user_id: userRes.user.id,
      entry_date: date,
      tasks,
      last_saved_at: now,
      submitted_at: now,
      updated_at: now,
    }, { onConflict: 'workspace_id,entry_date' })
    .select('entry_date,tasks,last_saved_at,submitted_at')
    .single();

  if (error) return { statusCode: 500, headers: cors, body: JSON.stringify({ error: error.message }) };
  return { statusCode: 200, headers: cors, body: JSON.stringify(data) };
};

export const testHandler = handler;
export default withLegacyHandler(handler);
