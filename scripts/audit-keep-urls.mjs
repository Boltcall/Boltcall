#!/usr/bin/env node
/**
 * audit-keep-urls.mjs
 *
 * One-off audit. For every URL in the KEEP list (66 URLs from Phase 1
 * triage), count inbound link references using the same regex as
 * seo-precommit-check.mjs. Reports anything <3 (the gate threshold) so
 * we know which pages still need manual link additions before deploy.
 *
 * Run after Phase 3 internal-linking sweep to verify coverage.
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC_DIR = resolve(__dirname, '../src');

const KEEP_URLS = [
  // Core (5)
  '/about', '/contact', '/book-a-call', '/help-center', '/partners',
  // Solar (3)
  '/solar', '/solar-benchmark', '/solar-speed-playbook',
  // Lead magnets (15)
  '/seo-audit', '/seo-aeo-audit', '/business-audit', '/lead-magnet',
  '/lead-magnet/ai-receptionist-buyers-guide', '/lead-magnet/claude-code-overnight-kit',
  '/free-website', '/giveaway', '/lead-response-scorecard', '/ai-readiness-scorecard',
  '/ai-visibility-check', '/funnel-optimizer', '/rank-on-google-offer',
  '/voice-agent-setup', '/speed-test/offer',
  // Pillars (4)
  '/blog', '/speed-to-lead/statistics',
  '/ai-guide-for-businesses/level-1-understanding-ai',
  '/ai-guide-for-businesses/level-2-choosing-ai-tools',
  '/ai-guide-for-businesses/level-3-getting-started',
  // Features (2)
  '/features/lead-reactivation', '/features/website-widget',
  // Calculators (5)
  '/tools/5-minute-response-playbook', '/tools/dentist-chair-calculator',
  '/tools/medspa-rebooking-calculator', '/tools/real-estate-speed-scorecard',
  '/tools/solar-profit-calculator', '/tools/solar-quote-generator',
  // Comparisons (5: hub + 4 direct)
  '/comparisons',
  '/compare/boltcall-vs-birdeye', '/compare/boltcall-vs-gohighlevel',
  '/compare/boltcall-vs-smith-ai',
  // Blog (24 KEEP)
  '/blog/missed-calls-statistics-local-business-2026',
  '/blog/speed-to-lead-local-business',
  '/blog/best-ai-receptionist-tools',
  '/blog/ai-vs-human-receptionist',
  '/blog/best-ai-receptionist-home-services',
  '/blog/how-ai-receptionist-works',
  '/blog/never-miss-a-call-after-business-hours',
  '/blog/hvac-ai-lead-response',
  '/blog/whatsapp-appointment-booking-plumbers',
  '/blog/roofing-company-stop-losing-leads-missed-calls',
  '/blog/best-after-hours-answering-service',
  '/blog/after-hours-lead-response-home-services',
  '/blog/ai-agent-for-small-business-24-7-call-answering',
  '/blog/ai-answering-service-small-business',
  '/blog/ai-appointment-scheduling-hvac',
  '/blog/ai-phone-answering-dentists',
  '/blog/ai-receptionist-for-plumbers',
  '/blog/best-ai-answering-service-dental-medical-practice',
  '/blog/create-gemini-gem-business-assistant',
  '/blog/home-service-google-ads-lead-follow-up',
  '/blog/how-to-set-up-ai-phone-answering-vet-clinic',
  '/blog/5-signs-you-need-ai-receptionist',
  '/blog/setup-instant-lead-reply',
  '/blog/is-ai-receptionist-worth-it',
  '/blog/ai-chatbot-vs-live-chat-phone-comparison',
];

let corpus = null;
function loadCorpus() {
  if (corpus) return corpus;
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
  corpus = files.map(f => ({ file: f, content: readFileSync(f, 'utf8') }));
  return corpus;
}

function countInboundLinks(routePath) {
  if (routePath === '/') return Infinity;
  const esc = routePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const directLink = new RegExp(`(?:to|href)=(?:"|')${esc}(?:["'?#/]|\\\\)`, 'g');
  const arrayHref = new RegExp(`(?:href|path|slug|url)\\s*:\\s*(?:"|')${esc}(?:["'?#/]|\\\\)`, 'g');
  let count = 0;
  for (const { content } of loadCorpus()) {
    const a = content.match(directLink);
    const b = content.match(arrayHref);
    if (a) count += a.length;
    if (b) count += b.length;
  }
  return count;
}

function listSources(routePath) {
  const esc = routePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const directLink = new RegExp(`(?:to|href)=(?:"|')${esc}(?:["'?#/]|\\\\)`, 'g');
  const arrayHref = new RegExp(`(?:href|path|slug|url)\\s*:\\s*(?:"|')${esc}(?:["'?#/]|\\\\)`, 'g');
  const hits = [];
  for (const { file, content } of loadCorpus()) {
    const a = (content.match(directLink) || []).length;
    const b = (content.match(arrayHref) || []).length;
    const total = a + b;
    if (total > 0) hits.push({ file: file.replace(SRC_DIR, 'src'), count: total });
  }
  return hits;
}

const results = KEEP_URLS.map(url => ({
  url,
  count: countInboundLinks(url),
  sources: listSources(url),
}));

const failing = results.filter(r => r.count < 3);
const passing = results.filter(r => r.count >= 3);

console.log(`KEEP URLs total:    ${KEEP_URLS.length}`);
console.log(`Passing (>=3 links): ${passing.length}`);
console.log(`Failing (<3 links):  ${failing.length}`);
console.log('');

if (failing.length > 0) {
  console.log('FAILING URLs:');
  for (const r of failing) {
    console.log(`  ${r.url} -> ${r.count} link(s)`);
    for (const s of r.sources) {
      console.log(`    ${s.file} (${s.count})`);
    }
  }
  console.log('');
}

console.log('PASSING summary:');
for (const r of passing) {
  console.log(`  ${r.url}: ${r.count}`);
}
