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
  // Dev tooling and funnel entry points -- live routes, deliberately not indexed.
  '/dev-login', '/loading-demo', '/start',
  // Thin internal architecture diagram -- deliberately not indexed.
  '/agent-architecture',
  // Client-side <Navigate> to /pricing -- a redirect _redirects cannot see.
  '/free-website-package/pricing',
];

/**
 * Every path that public/_redirects sends somewhere else. Those Route entries
 * often still exist so the client can resolve deep links, but the canonical URL
 * is the redirect target -- a sitemap must never list a URL that redirects.
 * Parsed rather than hardcoded so new redirects are excluded automatically.
 */
const REDIRECT_SOURCES = new Set(
  readFileSync(resolve(ROOT, 'public/_redirects'), 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => line.split(/\s+/))
    .filter((parts) => parts.length >= 2 && /^3\d\d!?$/.test(parts[2] ?? '301'))
    .map((parts) => parts[0].replace(/\/$/, ''))
    .filter((from) => from.startsWith('/') && !from.includes('*') && !from.includes(':')),
);

const EXCLUDE_SUFFIXES = ['/thank-you'];

// Live + prerendered routes deliberately kept OUT of the sitemap (2026-08-29
// audit round 2): GSC showed the whole {industry}-lead-response-time cluster and
// the non-legal industry stubs as "Discovered - currently not indexed" for 90+
// days. Pages stay up for direct traffic; the sitemap just stops asking Google
// to prioritize them. Listed here so this gate does not treat the opt-out as
// drift. Remove an entry to re-list it.
const SITEMAP_OPTOUT = new Set([
  '/blog/commercial-cleaning-lead-response-time',
  '/blog/commercial-roofing-lead-response-time',
  '/blog/electrician-lead-response-time',
  '/blog/emergency-plumber-answering-service',
  '/blog/garage-door-lead-response-time',
  '/blog/home-service-lead-response-time',
  '/blog/hvac-answering-service',
  '/blog/hvac-lead-response-time',
  '/blog/lead-response-time-benchmark',
  '/blog/locksmith-lead-response-time',
  '/blog/missed-call-text-back-small-business',
  '/blog/pest-control-lead-response-time',
  '/blog/plumbing-lead-response-time',
  '/blog/solar-lead-response-time',
  '/blog/speed-to-lead-for-plumbers',
]);

function normalize(p) {
  if (!p) return null;
  const trimmed = p.trim();
  if (!trimmed.startsWith('/')) return null;
  if (trimmed.includes(':')) return null;      // dynamic
  if (trimmed.includes('*')) return null;      // wildcard
  return trimmed.replace(/\/$/, '') || '/';
}

function isExcluded(norm) {
  if (REDIRECT_SOURCES.has(norm)) return true;
  if (EXCLUDE_PREFIXES.some((p) => norm === p || norm.startsWith(p + '/'))) return true;
  if (EXCLUDE_SUFFIXES.some((s) => norm.endsWith(s))) return true;
  // Exclude deeper /speed-test/* sub-routes but let /speed-test through.
  if (norm.startsWith('/speed-test/')) return true;
  return false;
}

function extractAppRoutes() {
  const raw = readFileSync(resolve(ROOT, 'src/routes/AppRoutes.tsx'), 'utf8');
  // Strip comments first. A commented-out <Route> is a DELETED page, but the
  // bare regex matched inside comments and counted it as live -- which let a
  // dead URL sit in sitemap.xml while this audit reported everything in sync.
  const src = raw
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
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

const liveNotInSitemap = diff(live, sitemap).filter((p) => !SITEMAP_OPTOUT.has(p));
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

const brokenSubset = liveNotInSitemap.length + liveNotInPrerender.length + sitemapNotInLive.length + prerenderNotInLive.length;

if (brokenSubset > 0) {
  console.log(JSON.stringify(report, null, 2));
}

if (brokenSubset > 0) {
  console.error(
    '\nsitemap/prerender drift: ' + brokenSubset + ' route(s) out of sync.\n' +
    'Every live public route must appear in BOTH scripts/generate-sitemap.mjs\n' +
    'and scripts/prerender.mjs. A route in the sitemap but not prerendered is\n' +
    'served as an SPA shell and reads as a dead or duplicate page to Google.',
  );
  process.exit(1);
}

console.log(`sitemap/prerender audit OK - ${live.size} live routes in sync.`);
