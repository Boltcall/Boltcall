import puppeteer from 'puppeteer-core';
import { createServer } from 'http';
import { readFile, access } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = join(__dirname, '..', '..', '..', 'dist');
const PORT = 45681;

const executablePath = process.env['PROGRAMFILES'] + '/Google/Chrome/Application/chrome.exe';
console.log('Chrome:', executablePath);
console.log('DIST:', DIST);

// Start the same SPA-aware static server as prerender.mjs
const server = await new Promise((resolve) => {
  const s = createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    let filePath = join(DIST, url.pathname);
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
  s.listen(PORT, () => resolve(s));
});
console.log(`Server started on port ${PORT}`);

const browser = await puppeteer.launch({
  headless: true,
  executablePath,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
});

const routes = [
  '/blog/how-to-set-up-ai-phone-answering-vet-clinic',
];

for (const route of routes) {
  console.log('\n' + '='.repeat(60));
  console.log('Testing:', route);
  const page = await browser.newPage();
  const errors = [];
  const warnings = [];
  const infos = [];
  page.on('pageerror', e => errors.push('PAGE ERR: ' + e.message));
  page.on('console', m => {
    const type = m.type();
    const text = m.text();
    if (type === 'error') errors.push('CONSOLE ERROR: ' + text);
    else if (type === 'warning') warnings.push('WARN: ' + text);
    else if (text.includes('Error') || text.includes('failed')) infos.push('INFO: ' + text);
  });
  await page.setRequestInterception(true);
  page.on('request', req => {
    if (['image', 'media', 'font'].includes(req.resourceType())) req.abort();
    else req.continue();
  });
  page.on('requestfailed', req => {
    if (!['image', 'media', 'font'].includes(req.resourceType())) {
      errors.push('REQUEST FAIL: ' + req.url() + ' — ' + req.failure()?.errorText);
    }
  });
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'language', { get: () => 'en' });
    Object.defineProperty(navigator, 'languages', { get: () => ['en'] });
    try { localStorage.setItem('i18nextLng', 'en'); } catch(e) {}
  });
  try {
    const t0 = Date.now();
    console.log('  → page.goto (networkidle0, 20s)...');
    await page.goto(`http://localhost:${PORT}` + route, { waitUntil: 'networkidle0', timeout: 20000 });
    console.log('  → networkidle0 after', Date.now() - t0, 'ms');
    const t1 = Date.now();
    console.log('  → waitForSelector #root > * (15s)...');
    await page.waitForSelector('#root > *', { timeout: 15000 });
    console.log('  → #root > * found after', Date.now() - t1, 'ms');
    console.log('  SUCCESS');
  } catch (e) {
    console.log('  FAILED:', e.message);
    const rootContent = await page.evaluate(() => {
      const root = document.getElementById('root');
      if (!root) return 'NO #root element';
      return `Children: ${root.children.length}, innerHTML length: ${root.innerHTML.length}, first 300: ${root.innerHTML.substring(0, 300)}`;
    });
    console.log('  #root state:', rootContent);
    const bodyTitle = await page.evaluate(() => document.title);
    console.log('  document.title:', bodyTitle);
  }
  for (const err of errors) console.log(' ', err);
  for (const w of warnings) console.log(' ', w);
  for (const i of infos) console.log(' ', i);
  await page.close();
}

await browser.close();
server.close();
console.log('\nDone.');
