#!/usr/bin/env node
/**
 * Cost per lead for each boltcall.org free tool, from the aios_event_log rows
 * netlify/functions/free-tool-lead.ts writes (loop free_tools).
 *
 *   node scripts/free-tool-cpl.mjs                         # last 30 days
 *   node scripts/free-tool-cpl.mjs --days 7 --cost ai_audit=0.18 --cost seo_aeo_audit=0.05
 *
 * Cost per run is what one report costs to produce (models, APIs). It lives in
 * n8n/Modal, not here, so pass it with --cost; unknown cost prints "?" rather
 * than a guess. Needs SUPABASE_URL + SUPABASE_SERVICE_KEY (env or .env).
 */
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

export function summarize(rows, costs = {}) {
  const byTool = new Map();
  for (const r of rows) {
    const t = r.channel || 'unknown';
    const s = byTool.get(t) || { tool: t, leads: 0, forwarded: 0, failed: 0 };
    s.leads++;
    if (r.outcome === 'forwarded') s.forwarded++;
    else s.failed++;
    byTool.set(t, s);
  }
  return [...byTool.values()]
    .map((s) => {
      const perRun = Number.isFinite(costs[s.tool]) ? costs[s.tool] : null;
      // Failed forwards never ran a report, so they cost nothing.
      const total = perRun == null ? null : perRun * s.forwarded;
      return { ...s, cost_per_run: perRun, total_cost: total, cost_per_lead: total == null || !s.leads ? null : total / s.leads };
    })
    .sort((a, b) => b.leads - a.leads);
}

export function parseCosts(argv) {
  const costs = {};
  argv.forEach((a, i) => {
    if (a !== '--cost') return;
    const [tool, usd] = String(argv[i + 1] || '').split('=');
    const n = Number(usd);
    if (tool && Number.isFinite(n) && n >= 0) costs[tool] = n;
  });
  return costs;
}

function envVar(name) {
  if (process.env[name]) return process.env[name];
  const env = fs.existsSync('.env') ? fs.readFileSync('.env', 'utf8') : '';
  return env.match(new RegExp(`^${name}=["']?([^"'\\r\\n]+)`, 'm'))?.[1];
}

async function main() {
  const argv = process.argv.slice(2);
  const days = Number(argv[argv.indexOf('--days') + 1]) || 30;
  const url = envVar('SUPABASE_URL');
  const key = envVar('SUPABASE_SERVICE_KEY') || envVar('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_KEY not set');
  const since = new Date(Date.now() - days * 864e5).toISOString();
  const res = await fetch(`${url}/rest/v1/aios_event_log?select=channel,outcome&loop_name=eq.free_tools&event_type=eq.tool_lead&ts=gte.${since}&limit=10000`, {
    headers: { apikey: key, authorization: `Bearer ${key}` },
  });
  if (!res.ok) throw new Error(`event log read failed: ${res.status}`);
  const usd = (n) => (n == null ? '?' : `$${n.toFixed(2)}`);
  const rows = summarize(await res.json(), parseCosts(argv));
  console.log(`Free tools, last ${days} days`);
  if (!rows.length) return console.log('No submissions yet.');
  console.table(rows.map((r) => ({
    tool: r.tool, leads: r.leads, reports_started: r.forwarded, failed: r.failed,
    cost_per_run: usd(r.cost_per_run), total_cost: usd(r.total_cost), cost_per_lead: usd(r.cost_per_lead),
  })));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err.message || err);
    process.exit(1);
  });
}
