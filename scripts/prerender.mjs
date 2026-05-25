/**
 * Build-time prerender script for Boltcall.
 *
 * After `vite build`, this script:
 *   1. Serves dist/ on a local port
 *   2. Visits each public route with Puppeteer
 *   3. Saves the fully-rendered HTML to dist/[route]/index.html
 *
 * Result: Netlify serves static HTML to all visitors (including AI bots).
 * React hydrates on the client, so the SPA still works for humans.
 */

import puppeteer from 'puppeteer-core';
import { createServer } from 'http';
import { readFile, writeFile, mkdir, access } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = join(__dirname, '..', 'dist');
let port = Number(process.env.PRERENDER_PORT) || 0;

// All public routes to prerender (no dashboard, auth, or dynamic routes)
const ROUTES = [
  // Core pages
  '/',
  '/about',
  '/pricing',
  '/personal-injury',
  '/contact',
  '/book-a-call',
  '/partners',
  '/help-center',
  '/documentation',
  '/api-documentation',
  '/ai-course',
  '/dpa',
  '/free-website',
  '/speed-test',
  '/giveaway',
  '/challenge',
  '/demo',
  '/drhazak',
  '/agent-architecture',
  // Lead magnets
  '/lead-magnet',
  '/lead-magnet/claude-code-overnight-kit',
  '/lead-magnet/ai-receptionist-buyers-guide',
  '/lead-magnet/speed-to-lead-stack',
  '/lead-response-scorecard',
  // Lead magnets & tools (top-level)
  '/seo-audit',
  '/ai-revenue-audit',
  '/ai-visibility-check',
  '/business-audit',
  '/ai-audit',
  '/seo-aeo-audit',
  '/conversion-rate-optimizer',
  '/funnel-optimizer',
  '/strike-ai',
  '/rank-on-google-offer',
  '/solar',
  '/solar-speed-playbook',
  '/solar-benchmark',
  '/solar-benchmark-2026',
  '/solar-roi-calculator',
  '/solar-speed-score',
  '/ai-readiness-scorecard',
  '/ai-receptionist-roi',
  '/speed-to-lead',
  '/speed-to-lead/statistics',
  '/ai-agent-comparison',
  // AI Guide
  '/ai-guide-for-businesses',
  '/ai-guide-for-businesses/level-1-understanding-ai',
  '/ai-guide-for-businesses/level-2-choosing-ai-tools',
  '/ai-guide-for-businesses/level-3-getting-started',
  // Feature pages
  '/features/ai-receptionist',
  '/features/instant-form-reply',
  '/features/sms-booking-assistant',
  '/features/automated-reminders',
  '/features/ai-follow-up-system',
  '/features/website-widget',
  '/features/lead-reactivation',
  '/features/smart-website',
  // Comparison pages
  '/comparisons',
  '/comparisons/call-centers-vs-boltcall',
  '/comparisons/receptionist-vs-boltcall',
  '/comparisons/voicemail-vs-boltcall',
  '/comparisons/answering-services-vs-boltcall',
  '/comparisons/crm-vs-boltcall',
  '/compare/boltcall-vs-podium',
  '/compare/boltcall-vs-gohighlevel',
  '/compare/boltcall-vs-birdeye',
  '/compare/boltcall-vs-emitrr',
  '/compare/boltcall-vs-calomation',
  '/compare/boltcall-vs-smith-ai',
  '/compare/boltcall-vs-goodcall',
  '/compare/boltcall-vs-callin',
  '/compare/boltcall-vs-lindy',
  '/compare/boltcall-vs-convin',
  '/compare/boltcall-vs-soundhound',
  '/compare/podium-alternatives',
  // Blog index
  '/blog',
  // Blog posts
  '/blog/the-new-reality-for-local-businesses',
  '/blog/why-speed-matters',
  '/blog/complete-guide-to-seo',
  '/blog/best-ai-receptionist-tools',
  '/blog/how-ai-receptionist-works',
  '/blog/what-is-ai-receptionist-guide',
  '/blog/is-ai-receptionist-worth-it',
  '/blog/how-to-make-ai-receptionist',
  '/blog/instant-lead-reply-guide',
  '/blog/setup-instant-lead-reply',
  '/blog/how-instant-lead-reply-works',
  '/blog/how-to-schedule-text',
  '/blog/automatic-google-reviews',
  '/blog/benefits-of-outsourced-reception-services',
  '/blog/phone-call-scripts',
  '/blog/understanding-live-answering-service-costs',
  '/blog/tips-for-professional-telephone-etiquette',
  '/blog/answering-service-scheduling',
  '/blog/top-10-ai-receptionist-agencies',
  '/blog/create-gemini-gem-business-assistant',
  '/blog/5-signs-you-need-ai-receptionist',
  '/blog/speed-to-lead-local-business',
  '/blog/ai-receptionist-cost-pricing',
  '/blog/ai-vs-human-receptionist',
  '/blog/ai-chatbot-vs-live-chat-phone-answering',
  '/blog/best-ai-receptionist-small-business',
  '/blog/ai-phone-answering-plumbers',
  '/blog/ai-phone-answering-dentists',
  '/blog/after-hours-lead-response-home-services',
  '/blog/ai-receptionist-for-law-firms',
  '/blog/speed-to-lead-for-law-firms',
  '/blog/best-after-hours-answering-service',
  '/blog/ai-chatbot-vs-live-chat-phone-comparison',
  '/blog/ai-receptionist-for-plumbers',
  '/blog/ai-receptionist-worth-it-roi',
  '/blog/missed-calls-statistics-local-business-2026',
  '/blog/how-to-set-up-ai-phone-answering-vet-clinic',
  '/blog/never-miss-a-call-after-business-hours',
  '/blog/whatsapp-appointment-booking-plumbers',
  '/blog/ai-receptionist-for-dentists',
  '/blog/best-ai-receptionist-home-services',
  '/blog/ai-agent-for-small-business-24-7-call-answering',
  '/blog/roofing-company-stop-losing-leads-missed-calls',
  '/blog/home-service-google-ads-lead-follow-up',
  '/blog/best-ai-answering-service-dental-medical-practice',
  '/blog/ai-receptionist-med-spas',
  '/blog/solar-ai-lead-response',
  '/blog/dental-ai-lead-response',
  '/blog/hvac-ai-lead-response',
  '/blog/ai-appointment-scheduling-hvac',
  '/blog/ai-answering-service-small-business',
  // Industry FAQ blog posts
  '/blog/ai-receptionist-hvac-faq',
  '/blog/ai-receptionist-dentist-faq',
  '/blog/ai-receptionist-plumber-faq',
  '/blog/ai-receptionist-lawyer-faq',
  '/blog/ai-receptionist-medspa-faq',
  '/blog/ai-receptionist-solar-faq',
  '/blog/ai-receptionist-vet-faq',
  '/blog/ai-receptionist-real-estate-agents',
  // Industry calculator tools
  '/tools/5-minute-response-playbook',
  '/tools/vet-clinic-revenue-calculator',
  '/tools/chiropractor-patient-recovery-calculator',
  '/tools/auto-repair-missed-call-calculator',
  '/tools/roofing-missed-lead-calculator',
  '/tools/dentist-chair-calculator',
  '/tools/hvac-overflow-calculator',
  '/tools/lawyer-intake-calculator',
  '/tools/medspa-rebooking-calculator',
  '/tools/plumber-revenue-calculator',
  '/tools/real-estate-speed-scorecard',
  '/tools/insurance-lead-response-scorecard',
  '/tools/cleaning-service-booking-calculator',
  '/tools/solar-profit-calculator',
  '/tools/solar-quote-generator',
  '/tools/solar-sales-closer',
  '/tools/landscaping-seasonal-revenue-calculator',
  // Newsletter
  '/newsletter',
  // Legal
  '/privacy-policy',
  '/terms-of-service',
];

// Simple static file server
function startServer() {
  return new Promise((resolve) => {
    const server = createServer(async (req, res) => {
      const url = new URL(req.url, `http://localhost:${port}`);
      let filePath = join(DIST, url.pathname);

      // Try exact file, then /index.html, then fall back to root index.html (SPA)
      for (const candidate of [filePath, join(filePath, 'index.html'), join(DIST, 'index.html')]) {
        try {
          await access(candidate);
          const content = await readFile(candidate);
          const ext = candidate.split('.').pop();
          const types = { html: 'text/html', js: 'application/javascript', css: 'text/css', json: 'application/json', png: 'image/png', svg: 'image/svg+xml', ico: 'image/x-icon', webmanifest: 'application/manifest+json' };
          res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' });
          res.end(content);
          return;
        } catch { continue; }
      }
      res.writeHead(404);
      res.end('Not found');
    });
    server.listen(port, () => {
      const address = server.address();
      if (address && typeof address === 'object') {
        port = address.port;
      }
      resolve(server);
    });
  });
}

async function prerender() {
  console.log(`Prerendering ${ROUTES.length} routes...\n`);

  const server = await startServer();
  // Resolve Chromium executable — use @sparticuz/chromium on CI, local Chrome otherwise
  let executablePath;
  if (process.env.NETLIFY || process.env.CI) {
    const chromium = await import('@sparticuz/chromium');
    executablePath = await chromium.default.executablePath();
    console.log(`Using @sparticuz/chromium: ${executablePath}`);
  } else {
    // Local dev — find system Chrome
    const { execSync } = await import('child_process');
    try {
      if (process.platform === 'win32') {
        const paths = [
          process.env['PROGRAMFILES'] + '\\Google\\Chrome\\Application\\chrome.exe',
          process.env['PROGRAMFILES(X86)'] + '\\Google\\Chrome\\Application\\chrome.exe',
          process.env['LOCALAPPDATA'] + '\\Google\\Chrome\\Application\\chrome.exe',
        ];
        const { existsSync } = await import('fs');
        executablePath = paths.find(p => existsSync(p));
      } else {
        executablePath = execSync('which chromium-browser || which chromium || which google-chrome-stable || which google-chrome', { encoding: 'utf8' }).trim();
      }
    } catch { /* fall through */ }
    if (!executablePath) {
      console.error('No Chrome/Chromium found locally. Install Chrome or run on Netlify CI.');
      process.exit(1);
    }
    console.log(`Using local Chrome: ${executablePath}`);
  }

  const launchOptions = {
    headless: true,
    executablePath,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  };

  const browser = await puppeteer.launch(launchOptions);

  let success = 0;
  let failed = 0;
  const retryRoutes = [];

  for (const route of ROUTES) {
    try {
      const page = await browser.newPage();

      // Block heavy resources that don't affect HTML content
      await page.setRequestInterception(true);
      page.on('request', (req) => {
        const type = req.resourceType();
        if (['image', 'media', 'font'].includes(type)) {
          req.abort();
        } else {
          req.continue();
        }
      });

      // Force English locale so prerendered pages always get lang="en"
      await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'language', { get: () => 'en' });
        Object.defineProperty(navigator, 'languages', { get: () => ['en'] });
        localStorage.setItem('i18nextLng', 'en');
      });

      await page.goto(`http://localhost:${port}${route}`, {
        waitUntil: 'networkidle0',
        timeout: 15000,
      });

      // Wait for React to render content
      await page.waitForSelector('#root > *', { timeout: 10000 });

      // Ensure lang="en" and correct og:url/canonical in prerendered output
      await page.evaluate((r) => {
        document.documentElement.lang = 'en';
        document.documentElement.dir = 'ltr';
        const canonUrl = 'https://boltcall.org' + (r === '/' ? '/' : r.replace(/\/?$/, '/'));
        const canonical = document.querySelector('link[rel="canonical"]');
        if (canonical) canonical.href = canonUrl;
        const ogUrl = document.querySelector('meta[property="og:url"]');
        if (ogUrl) ogUrl.setAttribute('content', canonUrl);
      }, route);

      // Get the full rendered HTML
      const html = await page.content();

      // Determine output path
      const outDir = route === '/'
        ? DIST
        : join(DIST, ...route.split('/').filter(Boolean));

      await mkdir(outDir, { recursive: true });
      await writeFile(join(outDir, 'index.html'), html);

      success++;
      process.stdout.write(`  [${success + failed}/${ROUTES.length}] ${route}\r`);

      await page.close();
    } catch (err) {
      failed++;
      process.stdout.write(`  FAIL: ${route} — ${err.message}\n`);
      retryRoutes.push(route);
    }
  }

  await browser.close();

  // Retry any failed routes with a fresh browser instance
  if (retryRoutes.length > 0) {
    process.stdout.write(`\nRetrying ${retryRoutes.length} failed routes with fresh browser...\n`);
    const retryBrowser = await puppeteer.launch(launchOptions);
    for (const route of retryRoutes) {
      try {
        const page = await retryBrowser.newPage();
        await page.setRequestInterception(true);
        page.on('request', (req) => {
          const type = req.resourceType();
          if (['image', 'media', 'font'].includes(type)) req.abort();
          else req.continue();
        });
        await page.evaluateOnNewDocument(() => {
          Object.defineProperty(navigator, 'language', { get: () => 'en' });
          Object.defineProperty(navigator, 'languages', { get: () => ['en'] });
          localStorage.setItem('i18nextLng', 'en');
        });
        await page.goto(`http://localhost:${port}${route}`, { waitUntil: 'networkidle0', timeout: 20000 });
        await page.waitForSelector('#root > *', { timeout: 15000 });
        await page.evaluate((r) => {
          document.documentElement.lang = 'en';
          document.documentElement.dir = 'ltr';
          const canonUrl = 'https://boltcall.org' + (r === '/' ? '/' : r.replace(/\/?$/, '/'));
          const canonical = document.querySelector('link[rel="canonical"]');
          if (canonical) canonical.href = canonUrl;
          const ogUrl = document.querySelector('meta[property="og:url"]');
          if (ogUrl) ogUrl.setAttribute('content', canonUrl);
        }, route);
        const html = await page.content();
        const outDir = route === '/' ? DIST : join(DIST, ...route.split('/').filter(Boolean));
        await mkdir(outDir, { recursive: true });
        await writeFile(join(outDir, 'index.html'), html);
        failed--;
        success++;
        process.stdout.write(`  RETRY OK: ${route}\n`);
        await page.close();
      } catch (err) {
        process.stdout.write(`  RETRY FAIL: ${route} — ${err.message}\n`);
      }
    }
    await retryBrowser.close();
  }

  server.close();

  console.log(`\nPrerender complete: ${success} success, ${failed} failed out of ${ROUTES.length} routes.`);

  // Don't fail the build for a few broken pages — log them and continue
  if (failed > 0 && failed > ROUTES.length * 0.2) {
    console.error('Too many failures (>20%). Failing build.');
    process.exit(1);
  }
}

prerender();
