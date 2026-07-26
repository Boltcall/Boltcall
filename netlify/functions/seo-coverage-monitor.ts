import { Handler } from '@netlify/functions';
import { notifyError, notifyInfo } from './_shared/notify';

/**
 * seo-coverage-monitor.ts
 *
 * Daily live audit. Fetches boltcall.org sitemap.xml + a rolling sample of
 * /blog/* AEO articles. Alerts via Telegram when:
 *   - sitemap <lastmod> is >2 days stale (deploy hasn't run; new content dark)
 *   - any sampled article's canonical points to homepage (prerender missed it,
 *     Google will canonical-collapse the URL and it earns nothing)
 *
 * Runs at 07:12 daily. Silent on success.
 */

const BASE_URL = 'https://boltcall.org';
const HOMEPAGE_CANONICAL = `${BASE_URL}/`;
const STALE_DAY_THRESHOLD = 2;
const SAMPLE_SIZE = 8;

function extractBlogSlugs(sitemapXml: string): string[] {
  const locs = [...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  return locs
    .filter((u) => u.startsWith(`${BASE_URL}/blog/`))
    .map((u) => u.replace(`${BASE_URL}/blog/`, '').replace(/\/$/, ''));
}

function newestLastmodDays(xml: string): number | null {
  const dates = [...xml.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map((m) => m[1]).sort();
  if (dates.length === 0) return null;
  return Math.floor((Date.now() - new Date(dates.at(-1)!).getTime()) / 86400000);
}

async function checkArticle(slug: string): Promise<{ slug: string; problem?: string }> {
  try {
    const res = await fetch(`${BASE_URL}/blog/${slug}`, {
      signal: AbortSignal.timeout(6000),
      redirect: 'follow',
    });
    const html = await res.text();
    const canonical = html.match(/rel="canonical"\s+href="([^"]+)"/i)?.[1];
    if (canonical === HOMEPAGE_CANONICAL) {
      return { slug, problem: `canonical=/ (SPA shell — Google will collapse into homepage)` };
    }
    if (canonical && !canonical.includes(`/blog/${slug}`)) {
      return { slug, problem: `canonical=${canonical} (mismatched slug)` };
    }
    return { slug };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { slug, problem: `fetch failed: ${msg}` };
  }
}

export const handler: Handler = async () => {
  const sitemapRes = await fetch(`${BASE_URL}/sitemap.xml`, { signal: AbortSignal.timeout(5000) });
  if (!sitemapRes.ok) {
    await notifyError('seo-coverage-monitor', new Error(`sitemap fetch ${sitemapRes.status}`));
    return { statusCode: 500, body: 'sitemap unreachable' };
  }
  const xml = await sitemapRes.text();

  const alerts: string[] = [];

  const daysStale = newestLastmodDays(xml);
  if (daysStale !== null && daysStale > STALE_DAY_THRESHOLD) {
    alerts.push(`Sitemap <lastmod> is ${daysStale}d stale. New AEO content not deployed. Run: npm run build:prerender && netlify deploy --prod --dir=dist --no-build`);
  }

  const slugs = extractBlogSlugs(xml);
  const sample = slugs.sort(() => Math.random() - 0.5).slice(0, SAMPLE_SIZE);
  const results = await Promise.all(sample.map(checkArticle));
  const failed = results.filter((r) => r.problem);

  if (failed.length > 0) {
    alerts.push(
      `${failed.length}/${sample.length} sampled /blog/* pages serving SPA shell:\n` +
        failed.map((f) => `  • /blog/${f.slug} — ${f.problem}`).join('\n'),
    );
  }

  if (alerts.length > 0) {
    await notifyError('seo-coverage-monitor', new Error(alerts.join('\n\n')));
    return { statusCode: 200, body: `alerts=${alerts.length}` };
  }

  const summary = `seo-coverage OK: sitemap ${daysStale ?? '?'}d fresh, ${sample.length}/${slugs.length} sampled clean`;
  if (process.env.SEO_COVERAGE_INFO === '1') await notifyInfo(summary);
  return { statusCode: 200, body: summary };
};
