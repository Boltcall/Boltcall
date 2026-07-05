#!/usr/bin/env node
/**
 * Enable Supabase Auth "Prevent use of leaked passwords" (HIBP) protection.
 *
 * P0.8 in docs/v1-production-readiness-plan.md — the Supabase advisor
 * `auth_leaked_password_protection` is currently OFF, which means signup
 * silently accepts already-breached passwords. This setting lives in the
 * dashboard (Authentication → Passwords → HIBP) or via the Supabase
 * Management API. There is no exposure through service-role.
 *
 * Usage:
 *   $env:SUPABASE_ACCESS_TOKEN = "sbp_..."   # (Windows PowerShell)
 *   node scripts/enable-hibp-protection.mjs
 *
 * The token is a Personal Access Token from
 * https://supabase.com/dashboard/account/tokens (Personal Access Tokens).
 *
 * Optional env:
 *   SUPABASE_PROJECT_REF (defaults to hbwogktdajorojljkjwg — the prod ref).
 *
 * The script:
 *   1. Reads current auth config via Management API.
 *   2. Toggles `password_hibp_enabled` (and `password_min_length` if lower
 *      than 8) to safe defaults.
 *   3. Prints the diff and exits non-zero on failure so it can be run in
 *      CI.
 *
 * Refs: docs/v1-production-readiness-plan.md P0.8
 */
const REF = process.env.SUPABASE_PROJECT_REF || 'hbwogktdajorojljkjwg';
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

if (!TOKEN) {
  console.error('SUPABASE_ACCESS_TOKEN not set. Grab a PAT from');
  console.error('  https://supabase.com/dashboard/account/tokens');
  console.error('and re-run. This script does not accept the service-role key —');
  console.error('project-level auth settings require a Management API PAT.');
  process.exit(2);
}

const BASE = 'https://api.supabase.com/v1';
const HEADERS = { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' };

async function getConfig() {
  const res = await fetch(`${BASE}/projects/${REF}/config/auth`, { headers: HEADERS });
  if (!res.ok) throw new Error(`GET auth config failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function patchConfig(patch) {
  const res = await fetch(`${BASE}/projects/${REF}/config/auth`, {
    method: 'PATCH',
    headers: HEADERS,
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(`PATCH auth config failed: ${res.status} ${await res.text()}`);
  return res.json();
}

const before = await getConfig();
const patch = {};
if (before.password_hibp_enabled !== true) patch.password_hibp_enabled = true;
if ((before.password_min_length || 0) < 8) patch.password_min_length = 8;

if (Object.keys(patch).length === 0) {
  console.log('Already good — password_hibp_enabled=true and min_length>=8.');
  process.exit(0);
}

const after = await patchConfig(patch);
console.log('Applied patch:', patch);
console.log('New hibp_enabled:', after.password_hibp_enabled);
console.log('New min_length:', after.password_min_length);
