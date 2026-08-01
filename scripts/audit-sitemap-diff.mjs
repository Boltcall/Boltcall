#!/usr/bin/env node
/**
 * Sitemap ⊆ prerender ⊆ live-routes audit.
 *
 * Enumerates:
 *   1. Public routes in src/routes/AppRoutes.tsx (top-level <Route path="/foo">
 *      entries, ignoring wildcards, dynamic params, and authed shells like
 *      /dashboard/*, /admin*, /auth/*, /setup*, /payment/*).
 *   2. Routes in scripts/generate-sitemap.mjs ROUTES.
 *   3. Routes in scripts/prerender.mjs.
 *
 * Reports:
 *   - live routes missing from sitemap
 *   - live routes missing from prerender
 *   - sitemap entries not in live routes (stale)
 *   - prerender entries not in live routes (stale)
 *
 * Refs: docs/v1-production-readiness-plan.md P1 (sitemap ⊆ prerender ⊆ live).
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');

const EXCLUDE_PREFIXES = [
  '/dashboard', '/admin', '/auth', '/setup',
  '/payment', '/checkout', '/reset-password', '/login', '/signup',
  // Demo / component playgrounds — not indexable.
  '/glass-demo', '/button-demo', '/logo-demo', '/metric-cards-demo',
  '/rocker-switch-demo', '/origin-button-demo', '/glow-horizon-demo',
  '/receptionist-demo', '/prototype', '/strike-ai', '/drhazak',
  // Preview shells for the V2 wizard.
  '/v2', '/voice-agent-setup',
  // Funnel steps behind a lead form — not indexable. Landing pages
  // (/speed-test itself, /challenge itself) are indexable; only their
  // deeper post-form sub-routes are excluded.
  '/challenge/call', '/challenge/winner',
  // Post-submit results screens.
  '/lead-response-scorecard/results', '/ai-revenue-calculator/results',
];

const EXCLUDE_SUFFIXES = ['/thank-you'];

function normalize(p) {
  if (!p) return null;
  const trimmed = p.trim();
  if (!trimmed.startsWith('/')) return null;
  if (trimmed.includes(':')) return null;      // dynamic
  if (trimmed.includes('*')) return null;      // wildcard
  return trimmed.replace(/\/$/, '') || '/';
}

function isExcluded(norm) {
  if (EXCLUDE_PREFIXES.some((p) => norm === p || norm.startsWith(p + '/'))) return true;
  if (EXCLUDE_SUFFIXES.some((s) => norm.endsWith(s))) return true;
  // Exclude deeper /speed-test/* sub-routes but let /speed-test through.
  if (norm.startsWith('/speed-test/')) return true;
  return false;
}

function extractAppRoutes() {
  const src = readFileSync(resolve(ROOT, 'src/routes/AppRoutes.tsx'), 'utf8');
  const rx = /<Route\s+path\s*=\s*"([^"]+)"/g;
  const out = new Set();
  let m;
  while ((m = rx.exec(src)) !== null) {
    const norm = normalize(m[1]);
    if (!norm) continue;
    if (isExcluded(norm)) continue;
    out.add(norm);
  }
  return out;
}

function extractSitemap() {
  const src = readFileSync(resolve(ROOT, 'scripts/generate-sitemap.mjs'), 'utf8');
  const rx = /path:\s*"([^"]+)"/g;
  const out = new Set();
  let m;
  while ((m = rx.exec(src)) !== null) {
    const norm = normalize(m[1]);
    if (norm) out.add(norm);
  }
  return out;
}

function extractPrerender() {
  const src = readFileSync(resolve(ROOT, 'scripts/prerender.mjs'), 'utf8');
  const rx = /['"](\/[a-zA-Z0-9\-\/]*)['"]/g;
  const out = new Set();
  let m;
  while ((m = rx.exec(src)) !== null) {
    const norm = normalize(m[1]);
    if (!norm) continue;
    if (isExcluded(norm)) continue;
    out.add(norm);
  }
  return out;
}

function diff(a, b) {
  return [...a].filter((x) => !b.has(x)).sort();
}

const live = extractAppRoutes();
const sitemap = extractSitemap();
const prerender = extractPrerender();

const liveNotInSitemap = diff(live, sitemap);
const liveNotInPrerender = diff(live, prerender);
const sitemapNotInLive = diff(sitemap, live);
const prerenderNotInLive = diff(prerender, live);

const report = {
  counts: {
    live: live.size,
    sitemap: sitemap.size,
    prerender: prerender.size,
  },
  liveMissingFromSitemap: liveNotInSitemap,
  liveMissingFromPrerender: liveNotInPrerender,
  stalePathsInSitemap: sitemapNotInLive,
  stalePathsInPrerender: prerenderNotInLive,
};

console.log(JSON.stringify(report, null, 2));

const brokenSubset = liveNotInSitemap.length + liveNotInPrerender.length + sitemapNotInLive.length + prerenderNotInLive.length;
if (brokenSubset > 0) {
  process.exit(1);
}
