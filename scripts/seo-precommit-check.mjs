#!/usr/bin/env node
/**
 * seo-precommit-check.mjs
 *
 * Pre-publish gate. Runs as part of `npm run build:prerender` BEFORE the
 * Vite build. Blocks the build if any NEW route added to
 * scripts/generate-sitemap.mjs would ship as an orphan or as a known-bad
 * pattern (form-result/thank-you/results/report/login/demo).
 *
 * "New" = present in current ROUTES list but absent from
 * scripts/.gsc-url-cache.json (the snapshot of last-published URLs).
 *
 * Why this exists: domain-level quality is what Google uses to decide
 * crawl priority for "Discovered – currently not indexed". Publishing
 * orphan pages or pattern-matching low-value URLs (form thank-yous,
 * demo pages) drags the sitewide signal down. This gate blocks that.
 *
 * Existing routes are grandfathered. They are checked separately by
 * scripts/gsc-stuck-urls.mjs (run periodically) so we don't break the
 * build retroactively.
 *
 * Override: SEO_GATE_SKIP=1 npm run build:prerender (use sparingly,
 * leaves a record in CI logs).
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SITEMAP_GEN = resolve(__dirname, 'generate-sitemap.mjs');
const HEADERS_FILE = resolve(__dirname, '../public/_headers');
// Dedicated cache for the gate (separate from .gsc-url-cache.json so gsc-submit's
// invariants and the gate's invariants don't tangle).
const GATE_CACHE = resolve(__dirname, '.seo-gate-cache.json');
const SRC_DIR = resolve(__dirname, '../src');
const BASE_URL = 'https://boltcall.org';

const MIN_INBOUND_LINKS = 3;

// Patterns we never want in a sitemap. The page can still exist for users
// (e.g. /lead-magnet/thank-you renders the post-submission state) — it just
// shouldn't be a target for Google.
const FORM_RESULT_BLOCKLIST = [
  /\/thank-you$/,
  /\/results$/,
  /\/report$/,
  /\/login$/,
  /-demo$/,
];

if (process.env.SEO_GATE_SKIP === '1') {
  console.log('⚠ seo-precommit-check skipped via SEO_GATE_SKIP=1');
  process.exit(0);
}

// Extract route paths from generate-sitemap.mjs without executing it.
// The file uses a literal ROUTES = [ { path: "/...", ... }, ... ] array.
function extractRoutes() {
  const src = readFileSync(SITEMAP_GEN, 'utf8');
  const paths = [];
  // Match `path: "..."` or `path: '...'` inside the ROUTES literal.
  const re = /path:\s*["']([^"']+)["']/g;
  let m;
  while ((m = re.exec(src)) !== null) paths.push(m[1]);
  // De-dup while preserving order.
  return [...new Set(paths)];
}

function loadCache() {
  if (!existsSync(GATE_CACHE)) return null; // null = first run
  try {
    const data = JSON.parse(readFileSync(GATE_CACHE, 'utf8'));
    return new Set(data.knownRoutes || []);
  } catch {
    return new Set();
  }
}

function saveCache(routes) {
  writeFileSync(
    GATE_CACHE,
    JSON.stringify({ knownRoutes: [...routes].sort(), updatedAt: new Date().toISOString() }, null, 2)
  );
}

function matchesBlocklist(path) {
  return FORM_RESULT_BLOCKLIST.find(re => re.test(path));
}

function canonicalizeHeaderPath(path) {
  return path === '/' ? '/' : path.replace(/\/$/, '');
}

function extractNoindexHeaderRoutes() {
  if (!existsSync(HEADERS_FILE)) return [];

  const routes = [];
  let currentPath = null;

  for (const rawLine of readFileSync(HEADERS_FILE, 'utf8').split(/\r?\n/)) {
    const trimmed = rawLine.trim();

    if (!trimmed || trimmed.startsWith('#')) continue;

    if (!rawLine.startsWith(' ') && !rawLine.startsWith('\t')) {
      currentPath = trimmed;
      continue;
    }

    if (
      currentPath &&
      /^x-robots-tag:\s*noindex\b/i.test(trimmed) &&
      !currentPath.includes('*')
    ) {
      routes.push(canonicalizeHeaderPath(currentPath));
    }
  }

  return [...new Set(routes)];
}

function validateNoindexHeaders() {
  const badRoutes = extractNoindexHeaderRoutes().filter(path => !matchesBlocklist(path));

  if (badRoutes.length === 0) return;

  console.error('');
  console.error('✗ seo-precommit-check FAILED');
  console.error('');
  console.error('The following public routes are configured with X-Robots-Tag: noindex in public/_headers:');
  for (const path of badRoutes) console.error(`  ${path}`);
  console.error('');
  console.error('Only private funnel/result/login states should use header-level noindex.');
  console.error('Remove these routes from public/_headers before publishing.');
  process.exit(1);
}

// Walk src/ and concatenate all .tsx/.ts/.jsx/.js file contents once.
// Then count inbound link references via regex. Avoids shelling out, which
// mangles regex pipe chars on Windows.
let sourceCorpusCache = null;
function loadSourceCorpus() {
  if (sourceCorpusCache) return sourceCorpusCache;
  const files = [];
  function walk(dir) {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      const st = statSync(full);
      if (st.isDirectory()) {
        if (entry === 'node_modules' || entry === '.git' || entry === 'dist') continue;
        walk(full);
      } else if (/\.(tsx|ts|jsx|js)$/.test(entry)) {
        files.push(full);
      }
    }
  }
  walk(SRC_DIR);
  sourceCorpusCache = files.map(f => ({ file: f, content: readFileSync(f, 'utf8') }));
  return sourceCorpusCache;
}

function countInboundLinks(routePath) {
  if (routePath === '/') return Infinity; // root is linked everywhere
  const escapedPath = routePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Match four patterns of inbound link references:
  //   1. to="/foo"        — direct JSX literal     (Pricing, Comparisons, etc.)
  //   2. href="/foo"      — anchor JSX literal
  //   3. href: '/foo'     — array-driven (Footer's footerLinks pattern)
  //   4. path: '/foo'     — route-config arrays
  // All variants accept either single or double quotes. The path must be
  // terminated by the closing quote, or by /, ?, # (so /foo?utm=... still
  // counts as a link to /foo). Backslash terminator covers JSX escapes.
  const directLink = new RegExp(`(?:to|href)=(?:"|')${escapedPath}(?:["'?#/]|\\\\)`, 'g');
  const arrayHref = new RegExp(`(?:href|path|slug|url)\\s*:\\s*(?:"|')${escapedPath}(?:["'?#/]|\\\\)`, 'g');
  let count = 0;
  for (const { content } of loadSourceCorpus()) {
    const direct = content.match(directLink);
    const array = content.match(arrayHref);
    if (direct) count += direct.length;
    if (array) count += array.length;
  }
  return count;
}

function main() {
  const routes = extractRoutes();
  validateNoindexHeaders();
  const known = loadCache();

  // First run: initialize cache with all current routes and exit successfully.
  // Audits pre-existing violations as a non-blocking warning so they go on the
  // backlog rather than blocking today's build.
  if (known === null) {
    console.log(`seo-precommit-check: first run, initializing gate cache with ${routes.length} routes`);
    const preExisting = [];
    for (const path of routes) {
      const blocked = matchesBlocklist(path);
      if (blocked) {
        preExisting.push({ path, reason: `blocklist (${blocked})` });
        continue;
      }
      const inbound = countInboundLinks(path);
      if (inbound < MIN_INBOUND_LINKS) {
        preExisting.push({ path, reason: `${inbound} inbound link(s)` });
      }
    }
    if (preExisting.length > 0) {
      console.log('');
      console.log(`⚠ ${preExisting.length} pre-existing route(s) would not pass the gate today (grandfathered):`);
      for (const f of preExisting) console.log(`    ${f.path} — ${f.reason}`);
      console.log('');
      console.log('These are tracked separately as Phase 3 work. Future builds will');
      console.log('only block on routes added AFTER this initialization.');
    }
    saveCache(new Set(routes));
    console.log('');
    console.log(`✓ Gate cache written: ${GATE_CACHE}`);
    return;
  }

  const newRoutes = routes.filter(p => !known.has(p));

  console.log(`seo-precommit-check: ${routes.length} total routes, ${newRoutes.length} new`);

  if (newRoutes.length === 0) {
    console.log('✓ No new routes to check.');
    return;
  }

  const failures = [];

  for (const path of newRoutes) {
    const blocked = matchesBlocklist(path);
    if (blocked) {
      failures.push({
        path,
        reason: `Matches blocklist pattern ${blocked} (form/result/login/demo pages don't belong in the sitemap; remove from ROUTES in scripts/generate-sitemap.mjs)`,
      });
      continue;
    }

    const inbound = countInboundLinks(path);
    if (inbound < MIN_INBOUND_LINKS) {
      failures.push({
        path,
        reason: `Only ${inbound} inbound internal link${inbound === 1 ? '' : 's'} found in src/ (need >=${MIN_INBOUND_LINKS}). Add contextual links from authoritative hubs (homepage, /pricing, /blog, feature pages) before publishing.`,
      });
    }
  }

  if (failures.length === 0) {
    console.log(`✓ All ${newRoutes.length} new route(s) pass the gate.`);
    saveCache(new Set(routes));
    return;
  }

  console.error('');
  console.error('✗ seo-precommit-check FAILED');
  console.error('');
  for (const f of failures) {
    console.error(`  ${f.path}`);
    console.error(`    → ${f.reason}`);
    console.error('');
  }
  console.error(`Why this matters: Google's "Discovered - currently not indexed"`);
  console.error(`status fires when domain-level quality is too low for the URL count.`);
  console.error(`Orphan/template/form-result pages drag the sitewide signal down and`);
  console.error(`block crawl priority for the entire site. Fix the issues above before`);
  console.error(`adding the route to ROUTES in scripts/generate-sitemap.mjs.`);
  console.error('');
  console.error(`Override (use sparingly): SEO_GATE_SKIP=1 npm run build:prerender`);
  process.exit(1);
}

main();
