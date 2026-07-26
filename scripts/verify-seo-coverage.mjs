#!/usr/bin/env node
/**
 * verify-seo-coverage.mjs
 *
 * Postbuild gate. Runs after `vite build && prerender`. Fails if any
 * published AEO article shipped as an SPA shell (canonical=/) or is missing
 * from dist. Catches the failure mode where an MD file exists but
 * prerender silently skipped it — leaving Google to canonical-collapse the
 * URL into the homepage.
 *
 * Also warns if the live sitemap's <lastmod> is stale vs. today, meaning
 * new pages exist in the repo but no one has run `netlify deploy` since.
 *
 * Overrides: SEO_VERIFY_SKIP=1 (skip entirely). Non-zero exit blocks the
 * pipeline that invoked it.
 */

import { existsSync, readdirSync, readFileSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = resolve(__dirname, '../dist');
const AEO_DIR = resolve(__dirname, '../src/content/aeo');
const HOMEPAGE_CANONICAL = 'https://boltcall.org/';

if (process.env.SEO_VERIFY_SKIP === '1') {
  console.log('⚠ verify-seo-coverage skipped via SEO_VERIFY_SKIP=1');
  process.exit(0);
}

function parseFrontmatter(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return {};
  const out = {};
  for (const line of m[1].split(/\r?\n/)) {
    const i = line.indexOf(':');
    if (i <= 0) continue;
    out[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, '');
  }
  return out;
}

function publishedSlugs() {
  if (!existsSync(AEO_DIR)) return [];
  return readdirSync(AEO_DIR, { withFileTypes: true })
    .filter((e) => e.isFile() && /\.mdx?$/i.test(e.name))
    .map((e) => {
      const fm = parseFrontmatter(readFileSync(join(AEO_DIR, e.name), 'utf8'));
      return { slug: fm.slug || e.name.replace(/\.mdx?$/i, ''), status: fm.status || 'draft' };
    })
    .filter((r) => r.status === 'published')
    .map((r) => r.slug);
}

function verifyDist() {
  const slugs = publishedSlugs();
  const problems = [];

  for (const slug of slugs) {
    const path = join(DIST, 'blog', slug, 'index.html');
    if (!existsSync(path)) {
      problems.push({ slug, reason: 'missing from dist (prerender skipped it)' });
      continue;
    }
    const html = readFileSync(path, 'utf8');
    const canonical = html.match(/rel="canonical"\s+href="([^"]+)"/i)?.[1];
    if (!canonical) {
      problems.push({ slug, reason: 'no canonical tag in prerendered HTML' });
    } else if (canonical === HOMEPAGE_CANONICAL) {
      problems.push({ slug, reason: `canonical=${canonical} (page rendered as SPA shell — will be collapsed into homepage by Google)` });
    } else if (!canonical.includes(`/blog/${slug}`)) {
      problems.push({ slug, reason: `canonical=${canonical} (does not match slug — misconfigured)` });
    }
  }

  return { total: slugs.length, problems };
}

async function checkLiveSitemapFreshness() {
  try {
    const res = await fetch('https://boltcall.org/sitemap.xml', { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const xml = await res.text();
    const dates = [...xml.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map((m) => m[1]);
    if (dates.length === 0) return null;
    const newest = dates.sort().at(-1);
    const daysStale = Math.floor((Date.now() - new Date(newest).getTime()) / 86400000);
    return { newest, daysStale };
  } catch {
    return null;
  }
}

async function verifyLive() {
  const slugs = publishedSlugs();
  const problems = [];
  console.log(`verify-seo-coverage (live): checking ${slugs.length} articles on boltcall.org`);
  for (const slug of slugs) {
    const url = `https://boltcall.org/blog/${slug}`;
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(8000), redirect: 'follow' });
      const html = await res.text();
      const canonical = html.match(/rel="canonical"\s+href="([^"]+)"/i)?.[1];
      const title = html.match(/<title>([^<]+)<\/title>/i)?.[1] ?? '';
      if (canonical === HOMEPAGE_CANONICAL) {
        problems.push({ slug, reason: `LIVE canonical=${canonical} — Google will collapse into homepage` });
      } else if (title.includes('Speed-to-Lead Software for Local Service Businesses')) {
        problems.push({ slug, reason: `LIVE title is generic homepage title — SPA shell served, prerender missing` });
      }
    } catch (e) {
      problems.push({ slug, reason: `LIVE fetch failed: ${e.message}` });
    }
  }
  return { total: slugs.length, problems };
}

const mode = process.argv.includes('--live') ? 'live' : 'dist';
const { total, problems } = mode === 'live' ? await verifyLive() : verifyDist();

console.log(`verify-seo-coverage (${mode}): ${total} published AEO articles`);

if (problems.length > 0) {
  console.error('');
  console.error(`✗ verify-seo-coverage FAILED — ${problems.length}/${total} article(s) will not index correctly:`);
  console.error('');
  for (const p of problems) {
    console.error(`  /blog/${p.slug}`);
    console.error(`    → ${p.reason}`);
  }
  console.error('');
  console.error(`Common causes:`);
  console.error(`  • Prerender crashed silently for these routes (check prerender.mjs logs)`);
  console.error(`  • Puppeteer navigation timed out (raise timeout or reduce parallelism)`);
  console.error(`  • React route missing — verify /blog/:slug catchall renders AeoMarkdownArticlePage`);
  console.error('');
  console.error(`Override (use sparingly): SEO_VERIFY_SKIP=1 npm run build:prerender`);
  process.exit(1);
}

console.log(`✓ All ${total} articles prerendered with valid canonicals.`);

const live = await checkLiveSitemapFreshness();
if (live && live.daysStale > 7) {
  console.log('');
  console.log(`⚠ Live sitemap <lastmod> = ${live.newest} (${live.daysStale} days stale)`);
  console.log(`  New content will not reach Google until you deploy. Run:`);
  console.log(`  netlify deploy --prod --dir=dist --no-build`);
}
