#!/usr/bin/env node
/**
 * Backfill the lead-value post-call analysis fields onto every live Retell
 * agent (new agents get them from retell-agents getDefaultAgentConfig).
 * Adds only fields an agent is missing; never removes or edits existing ones.
 *
 *   node scripts/sync-retell-value-fields.mjs           # dry run, prints the plan
 *   node scripts/sync-retell-value-fields.mjs --apply   # writes to Retell
 *
 * Needs RETELL_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY in the environment or .env.
 */
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import Retell from 'retell-sdk';
import VALUE_FIELDS from '../netlify/functions/_shared/value-analysis-fields.json' with { type: 'json' };

export function mergeAnalysisFields(existing, additions = VALUE_FIELDS) {
  const current = Array.isArray(existing) ? existing : [];
  const names = new Set(current.map((f) => f?.name));
  const missing = additions.filter((f) => !names.has(f.name));
  return { merged: [...current, ...missing], added: missing.map((f) => f.name) };
}

function envVar(name) {
  if (process.env[name]) return process.env[name];
  const env = fs.existsSync('.env') ? fs.readFileSync('.env', 'utf8') : '';
  return env.match(new RegExp(`^${name}=["']?([^"'\\r\\n]+)`, 'm'))?.[1];
}

// Only agents a Boltcall tenant owns (agents table); the Retell account also
// holds demo/challenge/other-project agents this must not touch.
async function boltcallAgentIds() {
  const url = envVar('SUPABASE_URL');
  const key = envVar('SUPABASE_SERVICE_KEY') || envVar('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_KEY not set');
  const res = await fetch(`${url}/rest/v1/agents?select=retell_agent_id&retell_agent_id=not.is.null`, {
    headers: { apikey: key, authorization: `Bearer ${key}` },
  });
  if (!res.ok) throw new Error(`agents lookup failed: ${res.status}`);
  return new Set((await res.json()).map((r) => r.retell_agent_id));
}

async function main() {
  const apply = process.argv.includes('--apply');
  const key = envVar('RETELL_API_KEY');
  if (!key) throw new Error('RETELL_API_KEY not set');
  const owned = await boltcallAgentIds();
  const client = new Retell({ apiKey: key });
  // list() pages (the API returns ~100 per call despite the documented 1000).
  const all = [];
  for (let page = [], last = null; ; last = page.at(-1)) {
    page = await client.agent.list({
      is_latest: true,
      ...(last ? { pagination_key: last.agent_id, pagination_key_version: last.version } : {}),
    });
    const seen = new Set(all.map((a) => `${a.agent_id}:${a.version}`));
    const fresh = page.filter((a) => !seen.has(`${a.agent_id}:${a.version}`));
    if (!fresh.length) break; // empty page, or the API ignored the cursor
    all.push(...fresh);
  }
  const agents = all.filter((a) => owned.has(a.agent_id));
  // Keep the newest version per agent_id in case the API returns several.
  const latest = new Map();
  for (const a of agents) {
    const prev = latest.get(a.agent_id);
    if (!prev || (a.version ?? 0) > (prev.version ?? 0)) latest.set(a.agent_id, a);
  }
  let changed = 0;
  for (const agent of latest.values()) {
    const { merged, added } = mergeAnalysisFields(agent.post_call_analysis_data);
    if (!added.length) continue;
    changed++;
    console.log(`${apply ? 'update' : 'would update'} ${agent.agent_id} (${agent.agent_name || 'unnamed'}): +${added.join(', ')}`);
    if (apply) await client.agent.update(agent.agent_id, { post_call_analysis_data: merged });
  }
  console.log(`${latest.size} agents, ${changed} ${apply ? 'updated' : 'need the fields (dry run; pass --apply)'}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err.message || err);
    process.exit(1);
  });
}
