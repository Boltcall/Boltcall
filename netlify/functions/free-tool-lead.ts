import type { Handler } from '@netlify/functions';
import { getRequestOrigin, getV2CorsHeaders } from './_shared/cors-v2';
import { getServiceSupabase } from './_shared/token-utils';
import { consumePublicRateLimit, getClientIp, hashRateLimitKey } from './_shared/public-rate-limit';
import { alertOwner, notifyError, notifyInfo } from './_shared/notify';
import { publicEnv } from './_shared/public-config';
import { withLegacyHandler } from './_shared/runtime-compat';

/**
 * Free-tool lead capture. boltcall.org free tools (AI audit, SEO/AEO audit,
 * business audit, niche tools) used to POST straight to n8n from the browser;
 * when a workflow was inactive the visitor saw an error and the lead was gone
 * (found 2026-11-26: all four webhooks returned 404 "not registered").
 *
 * Now: save the lead first (website_leads, source = tool), then forward the
 * form to the tool's n8n webhook server-side. A failed forward still answers
 * ok (the lead is saved) and alerts Noam with the details to fulfil by hand.
 * Every submission writes one aios_event_log row (loop free_tools) so
 * scripts/free-tool-cpl.mjs can report runs, leads and cost per lead per tool.
 */

const N8N_BASE = (process.env.N8N_WEBHOOK_BASE || 'https://boltcall-n8n.mangocoast-7cf06d98.eastus.azurecontainerapps.io/webhook').replace(/\/$/, '');

// Closed allowlist: the client names a tool, never a URL.
export const FREE_TOOLS: Record<string, { path: string; label: string }> = {
  ai_audit: { path: 'ai-audit', label: 'AI audit' },
  seo_aeo_audit: { path: 'seo-aeo-audit', label: 'SEO & AEO audit' },
  business_audit: { path: 'a2ecf792-bbad-4667-9223-fef18bfda0df', label: 'Business audit' },
  niche_tool: { path: 'niche-lead-magnet', label: 'Niche tool' },
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FORWARD_TIMEOUT_MS = 8000;
const MAX_BODY_BYTES = 20_000;

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

function json(headers: Record<string, string>, statusCode: number, body: Record<string, unknown>) {
  return { statusCode, headers, body: JSON.stringify(body) };
}

const handler: Handler = async (event) => {
  const origin = getRequestOrigin(event.headers as Record<string, string | undefined>);
  const cors = getV2CorsHeaders(origin, { methods: 'POST' });
  const headers = cors.headers;

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (origin && !cors.allowed) return json(headers, 403, { error: 'Origin not allowed' });
  if (event.httpMethod !== 'POST') return json(headers, 405, { error: 'Method not allowed' });
  if ((event.body?.length || 0) > MAX_BODY_BYTES) return json(headers, 413, { error: 'Request too large' });

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return json(headers, 400, { error: 'Invalid JSON' });
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return json(headers, 400, { error: 'Invalid JSON' });

  const tool = str(body.tool, 40);
  const target = FREE_TOOLS[tool];
  if (!target) return json(headers, 400, { error: 'Unknown tool' });
  const form = body.form && typeof body.form === 'object' && !Array.isArray(body.form) ? (body.form as Record<string, unknown>) : {};
  const email = str(form.email, 190).toLowerCase();
  if (!EMAIL_RE.test(email)) return json(headers, 400, { error: 'Enter a valid email' });

  const supabase = getServiceSupabase();
  const ip = getClientIp(event.headers as Record<string, string | undefined>);
  const limit = await consumePublicRateLimit(supabase, {
    bucket: 'free_tool_lead_ip',
    key: hashRateLimitKey([ip, email]),
    maxAttempts: 10,
    windowSeconds: 3600,
  });
  if (!limit.allowed) {
    return {
      statusCode: limit.statusCode,
      headers: { ...headers, ...(limit.retryAfterSeconds ? { 'Retry-After': String(limit.retryAfterSeconds) } : {}) },
      body: JSON.stringify({ error: 'Too many attempts. Try again later.' }),
    };
  }

  const lead = {
    email,
    name: str(form.contact_name ?? form.name, 150) || null,
    company_name: str(form.business_name ?? form.company_name, 150) || null,
    url: str(form.url ?? form.website_url, 500) || null,
    phone: str(form.phone, 30) || null,
    industry: str(form.industry ?? form.niche, 50) || null,
    source: tool,
  };
  const { data: saved, error: insertError } = await supabase.from('website_leads').insert(lead).select('id').maybeSingle();
  if (insertError) {
    // Do not lose it twice: forward anyway and tell Noam the save failed.
    console.error('[free-tool-lead] insert failed:', insertError);
    await notifyError('free-tool-lead: lead save failed', insertError.message || insertError, { tool, email });
  }

  let n8nStatus = 0;
  try {
    const res = await fetch(`${N8N_BASE}/${target.path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
      signal: AbortSignal.timeout(FORWARD_TIMEOUT_MS),
    });
    n8nStatus = res.status;
  } catch (err) {
    console.error(`[free-tool-lead] forward to ${target.path} failed:`, err);
  }
  const forwarded = n8nStatus >= 200 && n8nStatus < 300;

  const { error: logError } = await supabase.from('aios_event_log').insert({
    loop_name: 'free_tools',
    event_type: 'tool_lead',
    actor: 'boltcall.org',
    subject_id: saved?.id ? String(saved.id) : null,
    channel: tool,
    outcome: forwarded ? 'forwarded' : 'forward_failed',
    source: 'free-tool-lead',
    severity: 'info', // only value seen in this table; outcome carries the failure
    payload: { tool, n8n_status: n8nStatus, saved: !insertError },
  });
  if (logError) console.error('[free-tool-lead] event log failed:', logError);

  const summary = `${target.label}: ${lead.company_name || lead.url || 'no site'} · ${email}${lead.phone ? ` · ${lead.phone}` : ''}`;
  if (forwarded) {
    notifyInfo(`🧰 Free tool lead · ${summary}`).catch(() => {});
  } else {
    // The visitor is told their report is on the way; Noam fulfils it by hand.
    // One email per lead (notifyError's founder email is capped at 1/hour per context).
    const sent = await alertOwner(supabase, publicEnv('FOUNDER_UUID'), `Free tool lead needs a manual report: ${summary}`.slice(0, 150), [
      `The ${target.label} workflow did not start (n8n ${n8nStatus || 'unreachable'}). The lead is saved; send the report by hand.`,
      `Email: ${email}`,
      ...(lead.phone ? [`Phone: ${lead.phone}`] : []),
      ...(lead.company_name ? [`Business: ${lead.company_name}`] : []),
      ...(lead.url ? [`Website: ${lead.url}`] : []),
      `Form: ${JSON.stringify(form).slice(0, 2000)}`,
    ], { urgent: true });
    if (!sent) await notifyError('free-tool-lead: manual-report email not sent', `n8n ${n8nStatus}`, { tool, email });
  }

  if (insertError && !forwarded) return json(headers, 500, { error: 'Could not save your details right now' });
  return json(headers, 200, { ok: true, forwarded });
};

export const testHandler = handler;
export default withLegacyHandler(handler);
