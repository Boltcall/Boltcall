import puppeteer from 'puppeteer-core';

const executablePath = process.env['PROGRAMFILES'] + '/Google/Chrome/Application/chrome.exe';
const PORT = 45680;

const browser = await puppeteer.launch({
  headless: true,
  executablePath,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
});

const routes = [
  '/blog/how-to-set-up-ai-phone-answering-vet-clinic',
];

for (const route of routes) {
  console.log('\nTesting:', route);
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('PAGE ERR: ' + e.message));
  page.on('console', m => {
    if (m.type() === 'error') errors.push('CONSOLE: ' + m.text());
  });
  await page.setRequestInterception(true);
  page.on('request', req => {
    if (['image', 'media', 'font'].includes(req.resourceType())) req.abort();
    else req.continue();
  });
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'language', { get: () => 'en' });
    Object.defineProperty(navigator, 'languages', { get: () => ['en'] });
    try { localStorage.setItem('i18nextLng', 'en'); } catch(e) {}
  });
  try {
    await page.goto(`http://localhost:${PORT}` + route, { waitUntil: 'networkidle0', timeout: 20000 });
    await page.waitForSelector('#root > *', { timeout: 10000 });
    console.log('  SUCCESS');
  } catch (e) {
    console.log('  FAILED:', e.message);
    const rootHtml = await page.evaluate(
      () => document.getElementById('root')?.innerHTML || 'NO ROOT'
    );
    console.log('  #root (first 800):', rootHtml.substring(0, 800));
  }
  for (const err of errors) console.log(' ', err);
  await page.close();
}

await browser.close();
