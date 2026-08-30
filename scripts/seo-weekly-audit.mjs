#!/usr/bin/env node
/**
 * seo-weekly-audit.mjs
 *
 * Weekly deep SEO/AEO audit of boltcall.org. Runs from the GitHub Action
 * seo-weekly-audit.yml (Sunday 22:00 UTC). Complements the daily http+regex
 * smoke test (AIOS routine seo-daily-monitor) — that one catches drift
 * between deep runs; this one measures perf, schema, and content signals.
 *
 * Output:
 *  - .seo-baseline/latest.json          # replaced every run
 *  - .seo-baseline/history/YYYY-WW.json # append-only weekly snapshot
 *  - .seo-baseline/latest-report.md     # human-readable diff
 *  - console:  exit 0 if pass, exit 1 if regressed
 *
 * The workflow opens/updates a GitHub issue when exit=1.
 *
 * Deps at runtime: playwright (@playwright/test) — installed in the workflow.
 * Chromium ships with the runner; no separate install step in the yml.
 *
 * Env: none required. Domain fixed to boltcall.org (change BASE if needed).
 *
 * ponytail: single-file script, no build step. Extend by adding a
 * `check_*` function + wiring it into runAudit().
 */

import { chromium } from 'playwright';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = 'https://boltcall.org';
const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const BASELINE_DIR = resolve(REPO_ROOT, '.seo-baseline');
const BASELINE_LATEST = resolve(BASELINE_DIR, 'latest.json');

const PAGES = [
  { key: 'home', path: '/' },
  { key: 'pricing', path: '/pricing/' },
  { key: 'about', path: '/about/' },
  { key: 'industries-lawyer', path: '/industries/lawyer-answering-service/' },
  { key: 'features-ai-receptionist', path: '/features/ai-receptionist/' },
  { key: 'compare-podium', path: '/compare/boltcall-vs-podium/' },
  { key: 'compare-smith-ai', path: '/compare/boltcall-vs-smith-ai/' },
  { key: 'compare-gohighlevel', path: '/compare/boltcall-vs-gohighlevel/' },
  { key: 'blog-index', path: '/blog/' },
  { key: 'blog-top10', path: '/blog/top-10-ai-receptionist-agencies' },
  { key: 'blog-law-firms', path: '/blog/speed-to-lead-for-law-firms/' },
  { key: 'tools-lawyer-calc', path: '/tools/lawyer-intake-calculator/' },
  { key: 'integrations-squarespace', path: '/integrations/squarespace/' },
];

// Perf regression thresholds — reported vs previous baseline. Absolute LCP
// >8s is a hard fail regardless of baseline (the site is currently around
// 5-6s so this is loose; tighten as perf improves).
const HARD_LCP_MS = 8000;
const LCP_REGRESSION_MS = 1500; // getting worse by 1.5s week-over-week = alert

function firstMatch(html, re) {
  const m = html.match(re);
  return m ? m[1].trim() : null;
}

function extractSchemaTypes(html) {
  const blocks = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  const types = [];
  let parseErrors = 0;
  for (const m of blocks) {
    try {
      const parsed = JSON.parse(m[1]);
      const push = (d) => {
        if (d && typeof d === 'object' && d['@type']) {
          const t = Array.isArray(d['@type']) ? d['@type'][0] : d['@type'];
          types.push(String(t));
        }
      };
      if (Array.isArray(parsed)) parsed.forEach(push);
      else if (parsed && Array.isArray(parsed['@graph'])) parsed['@graph'].forEach(push);
      else push(parsed);
    } catch { parseErrors++; }
  }
  return { types, parseErrors, blocks: blocks.length };
}

function countBy(arr) {
  return arr.reduce((acc, x) => ((acc[x] = (acc[x] || 0) + 1), acc), {});
}

async function auditPage(browser, page) {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 }, // mobile — Google's default crawler viewport
    userAgent: 'Mozilla/5.0 (compatible; boltcall-seo-audit/1.0; +https://boltcall.org)',
  });
  const p = await ctx.newPage();
  const url = `${BASE}${page.path}?_seo_weekly_audit=${Date.now()}`;
  const start = Date.now();
  const consoleErrors = [];
  p.on('pageerror', (err) => consoleErrors.push(String(err.message).slice(0, 200)));

  let response;
  let lcpMs = null;
  try {
    response = await p.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
    // Basic LCP via PerformanceObserver — cheap alternative to full Lighthouse.
    lcpMs = await p.evaluate(() => new Promise((resolve) => {
      let last = 0;
      const po = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.startTime > last) last = entry.startTime;
        }
      });
      try {
        po.observe({ type: 'largest-contentful-paint', buffered: true });
      } catch {}
      // Give it 2s to settle then report.
      setTimeout(() => { po.disconnect(); resolve(Math.round(last)); }, 2000);
    }));
  } catch (err) {
    await ctx.close();
    return { key: page.key, path: page.path, error: err.message, fetchMs: Date.now() - start };
  }

  const html = await p.content();
  const status = response ? response.status() : null;
  const title = firstMatch(html, /<title[^>]*>(.*?)<\/title>/is);
  const og = firstMatch(html, /property=["']og:title["'][^>]*content=["']([^"']+)/i);
  const canonical = firstMatch(html, /rel=["']canonical["'][^>]*href=["']([^"']+)/i);
  const h1raw = firstMatch(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const h1 = h1raw ? h1raw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : null;
  const h2Count = (html.match(/<h2\b/gi) || []).length;
  const wordCount = html.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
  const { types, parseErrors, blocks } = extractSchemaTypes(html);
  const schemaCounts = countBy(types);

  await ctx.close();

  return {
    key: page.key,
    path: page.path,
    status,
    fetchMs: Date.now() - start,
    lcpMs,
    title,
    og,
    canonical,
    h1: h1 ? h1.slice(0, 200) : null,
    h1Length: h1 ? h1.length : 0,
    h2Count,
    wordCount,
    schemaBlocks: blocks,
    schemaParseErrors: parseErrors,
    schemaCounts,
    consoleErrorCount: consoleErrors.length,
  };
}

async function auditSitemap() {
  const res = await fetch(`${BASE}/sitemap.xml?_seo_weekly_audit=${Date.now()}`);
  const xml = await res.text();
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const lastmods = [...xml.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map((m) => m[1]).sort();
  return {
    urlCount: urls.length,
    newestLastmod: lastmods.at(-1) || null,
    oldestLastmod: lastmods[0] || null,
  };
}

async function auditRobotsAndLlms() {
  const [r, l] = await Promise.all([
    fetch(`${BASE}/robots.txt?_seo_weekly_audit=${Date.now()}`),
    fetch(`${BASE}/llms.txt?_seo_weekly_audit=${Date.now()}`),
  ]);
  const [robots, llms] = await Promise.all([r.text(), l.text()]);
  const aiBots = ['GPTBot', 'ChatGPT-User', 'ClaudeBot', 'PerplexityBot', 'Google-Extended', 'anthropic-ai'];
  const aiBotsAllowed = aiBots.filter((b) => new RegExp(`User-agent:\\s*${b}[\\s\\S]{0,200}?Allow:\\s*/`, 'i').test(robots));
  return {
    robots: {
      status: r.status,
      bytes: robots.length,
      sitemapDeclared: /Sitemap:\s*https:\/\/boltcall\.org\/sitemap\.xml/i.test(robots),
      aiBotsAllowed,
      aiBotsMissing: aiBots.filter((b) => !aiBotsAllowed.includes(b)),
    },
    llms: {
      status: l.status,
      bytes: llms.length,
      lastUpdated: firstMatch(llms, /Last updated:\s*(\S+)/i),
      mentionsLawFirms: /law firms?/i.test(llms),
    },
  };
}

async function auditBadRoutes() {
  const routes = [
    { path: '/blog/definitely-not-a-real-slug-weekly-probe/', expect: 404 },
    { path: '/features', expect: 301 },
    { path: '/how-it-works', expect: 301 },
    { path: '/faq', expect: 301 },
  ];
  const results = [];
  for (const r of routes) {
    try {
      const res = await fetch(`${BASE}${r.path}?_seo_weekly_audit=${Date.now()}`, { redirect: 'manual' });
      results.push({ path: r.path, expect: r.expect, actual: res.status, ok: res.status === r.expect });
    } catch (err) {
      results.push({ path: r.path, expect: r.expect, actual: null, ok: false, error: err.message });
    }
  }
  return results;
}

function diffAgainstBaseline(current, previous) {
  const regressions = [];
  if (!previous) return { firstRun: true, regressions: [] };

  // Sitemap URL count drift more than ±20 = flag.
  if (Math.abs(current.sitemap.urlCount - previous.sitemap.urlCount) > 20) {
    regressions.push(`Sitemap URL count changed ${previous.sitemap.urlCount} → ${current.sitemap.urlCount}`);
  }

  // Per-page checks
  const prevByKey = Object.fromEntries((previous.pages || []).map((p) => [p.key, p]));
  for (const page of current.pages) {
    const prev = prevByKey[page.key];
    if (!prev) continue;

    if (page.status !== prev.status) {
      regressions.push(`${page.key}: status ${prev.status} → ${page.status}`);
    }
    if (page.title !== prev.title) {
      regressions.push(`${page.key}: title changed\n    was: "${prev.title}"\n    now: "${page.title}"`);
    }
    if (page.canonical !== prev.canonical) {
      regressions.push(`${page.key}: canonical changed ${prev.canonical} → ${page.canonical}`);
    }
    if ((page.schemaParseErrors || 0) > (prev.schemaParseErrors || 0)) {
      regressions.push(`${page.key}: JSON-LD parse errors ${prev.schemaParseErrors} → ${page.schemaParseErrors}`);
    }
    if (page.h1Length < Math.max(20, (prev.h1Length || 0) - 20)) {
      regressions.push(`${page.key}: H1 shortened ${prev.h1Length} → ${page.h1Length} chars (semantic H1 regression?)`);
    }
    for (const t of ['WebSite', 'Organization', 'SoftwareApplication', 'FAQPage']) {
      const nowN = (page.schemaCounts || {})[t] || 0;
      const prevN = (prev.schemaCounts || {})[t] || 0;
      if (nowN > prevN + 1) {
        regressions.push(`${page.key}: @type=${t} count ${prevN} → ${nowN} (schema dup regressed?)`);
      }
    }
    if (page.lcpMs != null && prev.lcpMs != null && page.lcpMs > prev.lcpMs + LCP_REGRESSION_MS) {
      regressions.push(`${page.key}: LCP ${prev.lcpMs}ms → ${page.lcpMs}ms (+${page.lcpMs - prev.lcpMs}ms)`);
    }
    if (page.lcpMs != null && page.lcpMs > HARD_LCP_MS) {
      regressions.push(`${page.key}: LCP ${page.lcpMs}ms exceeds hard limit ${HARD_LCP_MS}ms`);
    }
  }

  // Bad-route checks are absolute — any deviation is a regression.
  for (const r of current.badRoutes) {
    if (!r.ok) {
      regressions.push(`bad-route guard: ${r.path} expected ${r.expect}, got ${r.actual}`);
    }
  }

  // AI bot coverage — any bot dropping out is a regression.
  if (previous.robotsLlms?.robots?.aiBotsAllowed && current.robotsLlms.robots.aiBotsAllowed.length < previous.robotsLlms.robots.aiBotsAllowed.length) {
    const dropped = previous.robotsLlms.robots.aiBotsAllowed.filter((b) => !current.robotsLlms.robots.aiBotsAllowed.includes(b));
    regressions.push(`robots.txt: AI bots no longer allowed: ${dropped.join(', ')}`);
  }

  return { firstRun: false, regressions };
}

function renderReport(current, diff) {
  const lines = [];
  lines.push(`# SEO Weekly Audit — ${current.timestamp}`);
  lines.push('');
  lines.push(diff.firstRun ? '_First run — establishing baseline. No diff._' : `**Regressions:** ${diff.regressions.length}`);
  lines.push('');
  if (diff.regressions.length) {
    lines.push('## Regressions vs previous baseline');
    for (const r of diff.regressions) lines.push(`- ${r}`);
    lines.push('');
  }
  lines.push('## Sitemap');
  lines.push(`- URL count: ${current.sitemap.urlCount}`);
  lines.push(`- Newest lastmod: ${current.sitemap.newestLastmod}`);
  lines.push('');
  lines.push('## Robots / llms.txt');
  lines.push(`- Robots: ${current.robotsLlms.robots.status}, sitemap declared: ${current.robotsLlms.robots.sitemapDeclared}`);
  lines.push(`- AI bots allowed (${current.robotsLlms.robots.aiBotsAllowed.length}): ${current.robotsLlms.robots.aiBotsAllowed.join(', ')}`);
  lines.push(`- llms.txt: ${current.robotsLlms.llms.status}, last updated ${current.robotsLlms.llms.lastUpdated}, mentions law firms: ${current.robotsLlms.llms.mentionsLawFirms}`);
  lines.push('');
  lines.push('## Bad-route guards');
  for (const r of current.badRoutes) lines.push(`- ${r.path} expected ${r.expect}, actual ${r.actual} — ${r.ok ? 'OK' : 'FAIL'}`);
  lines.push('');
  lines.push('## Per-page snapshot');
  lines.push('| Page | Status | LCP (ms) | H1 chars | Schema blocks | Parse errs | WebSite×n | Org×n |');
  lines.push('|---|---:|---:|---:|---:|---:|---:|---:|');
  for (const p of current.pages) {
    const s = p.schemaCounts || {};
    lines.push(`| ${p.key} | ${p.status ?? '?'} | ${p.lcpMs ?? '?'} | ${p.h1Length} | ${p.schemaBlocks} | ${p.schemaParseErrors} | ${s.WebSite || 0} | ${s.Organization || 0} |`);
  }
  return lines.join('\n');
}

async function runAudit() {
  const browser = await chromium.launch();
  try {
    const [sitemap, robotsLlms, badRoutes, ...pages] = await Promise.all([
      auditSitemap(),
      auditRobotsAndLlms(),
      auditBadRoutes(),
      ...PAGES.map((p) => auditPage(browser, p)),
    ]);

    const current = {
      timestamp: new Date().toISOString(),
      base: BASE,
      sitemap,
      robotsLlms,
      badRoutes,
      pages,
    };

    let previous = null;
    if (existsSync(BASELINE_LATEST)) {
      previous = JSON.parse(await readFile(BASELINE_LATEST, 'utf8'));
    }

    const diff = diffAgainstBaseline(current, previous);
    const report = renderReport(current, diff);

    await mkdir(BASELINE_DIR, { recursive: true });
    await mkdir(resolve(BASELINE_DIR, 'history'), { recursive: true });
    await writeFile(BASELINE_LATEST, JSON.stringify(current, null, 2));
    await writeFile(resolve(BASELINE_DIR, 'latest-report.md'), report);

    // Weekly snapshot filename: YYYY-Www
    const d = new Date(current.timestamp);
    const startOfYear = new Date(d.getFullYear(), 0, 1);
    const week = Math.ceil(((d - startOfYear) / 86400000 + startOfYear.getDay() + 1) / 7);
    const snapPath = resolve(BASELINE_DIR, 'history', `${d.getFullYear()}-W${String(week).padStart(2, '0')}.json`);
    await writeFile(snapPath, JSON.stringify(current, null, 2));

    console.log(report);
    console.log('');
    console.log(`::set-output name=regressions::${diff.regressions.length}`);
    if (diff.regressions.length) {
      process.exitCode = 1;
    }
  } finally {
    await browser.close();
  }
}

runAudit().catch((err) => {
  console.error('audit failed:', err);
  process.exitCode = 2;
});
