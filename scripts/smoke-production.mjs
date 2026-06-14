import { spawnSync } from 'node:child_process';

const siteUrl = (process.env.SITE_URL || 'https://boltcall.org').replace(/\/+$/, '');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function fetchText(path, options = {}) {
  const url = path.startsWith('http') ? path : `${siteUrl}${path}`;
  const response = await fetch(url, options);
  const text = await response.text();
  return { url, response, text };
}

function titleOf(html) {
  return html.match(/<title>(.*?)<\/title>/i)?.[1]?.trim() || '';
}

async function checkHtmlPage(path, label) {
  const { url, response, text } = await fetchText(path);
  assert(response.status === 200, `${label} returned ${response.status}`);
  assert(!/Page not found|Application error|Internal Server Error/i.test(text), `${label} rendered an error body`);
  assert(titleOf(text), `${label} is missing a title tag`);
  assert(/name=["']description["']/i.test(text), `${label} is missing meta description`);
  return { label, url, status: response.status, title: titleOf(text).slice(0, 100) };
}

async function checkHomepageMeta() {
  const result = await checkHtmlPage('/', 'homepage');
  const { text } = await fetchText('/');
  assert(/property=["']og:title["']/i.test(text), 'homepage is missing og:title');
  const ogImage =
    text.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1] ||
    text.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)?.[1] ||
    '';
  assert(ogImage, 'homepage is missing og:image');
  const ogUrl = ogImage.startsWith('/') ? `${siteUrl}${ogImage}` : ogImage;
  const image = await fetch(ogUrl);
  assert(image.status === 200, `og:image returned ${image.status}`);
  return { ...result, ogImage: ogUrl, ogImageStatus: image.status };
}

async function checkSitemap() {
  const { url, response, text } = await fetchText('/sitemap.xml');
  const locCount = [...text.matchAll(/<loc>/g)].length;
  assert(response.status === 200, `sitemap returned ${response.status}`);
  assert(locCount >= 50, `sitemap has too few URLs: ${locCount}`);
  return { label: 'sitemap', url, status: response.status, locCount };
}

async function checkRobots() {
  const { url, response, text } = await fetchText('/robots.txt');
  assert(response.status === 200, `robots.txt returned ${response.status}`);
  assert(/Sitemap:/i.test(text), 'robots.txt is missing Sitemap directive');
  assert(!/Disallow:\s*\/\s*$/im.test(text), 'robots.txt blocks all crawlers');
  return { label: 'robots', url, status: response.status };
}

async function checkUnauthedHelpEndpoint() {
  const { url, response, text } = await fetchText('/.netlify/functions/saas-v2-help-ask', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question: 'health check' }),
  });
  assert(response.status === 401, `help endpoint unauthenticated check returned ${response.status}: ${text}`);
  return { label: 'v2-help-unauthenticated', url, status: response.status };
}

function runAuthenticatedHelpSmoke() {
  const child = spawnSync(process.execPath, ['scripts/smoke-v2-help-live.mjs'], {
    cwd: process.cwd(),
    env: { ...process.env, SITE_URL: siteUrl },
    encoding: 'utf8',
  });

  if (child.status !== 0) {
    throw new Error(
      [
        `authenticated help smoke failed with exit ${child.status}`,
        child.stdout.trim(),
        child.stderr.trim(),
      ]
        .filter(Boolean)
        .join('\n'),
    );
  }

  const lines = child.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const passedLine = lines.find((line) => line.includes('"status": "passed"'));
  assert(passedLine, `authenticated help smoke did not report passed:\n${child.stdout}`);

  return {
    label: 'v2-help-authenticated',
    status: 'passed',
    outputPreview: child.stdout.slice(0, 700),
  };
}

async function main() {
  const checks = [];
  checks.push(await checkHomepageMeta());
  checks.push(await checkSitemap());
  checks.push(await checkRobots());
  checks.push(await checkHtmlPage('/pricing/', 'pricing'));
  checks.push(await checkHtmlPage('/blog/why-speed-matters/', 'blog'));
  checks.push(await checkHtmlPage('/lead-magnet/', 'lead magnet'));
  checks.push(await checkHtmlPage('/v2/help', 'v2 help page'));
  checks.push(await checkUnauthedHelpEndpoint());
  checks.push(runAuthenticatedHelpSmoke());

  console.log(JSON.stringify({ status: 'passed', siteUrl, checks }, null, 2));
}

main().catch((err) => {
  console.error(JSON.stringify({ status: 'failed', siteUrl, error: err.message }, null, 2));
  process.exit(1);
});
