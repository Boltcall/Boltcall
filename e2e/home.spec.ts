import { test, expect, type Page } from '@playwright/test';

const scrollThroughPage = async (page: Page) => {
  let previousHeight = 0;
  for (let pass = 0; pass < 4; pass += 1) {
    const scrollHeight = await page.evaluate(() => document.body.scrollHeight);
    const step = await page.evaluate(() => Math.max(300, window.innerHeight * 0.7));

    for (let y = 0; y <= scrollHeight; y += step) {
      await page.evaluate((nextY) => window.scrollTo(0, nextY), y);
      await page.waitForTimeout(120);
    }

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(300);

    const nextHeight = await page.evaluate(() => document.body.scrollHeight);
    if (nextHeight === previousHeight) break;
    previousHeight = nextHeight;
  }
};

test.describe('Homepage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('page loads and shows title', async ({ page }) => {
    await expect(page).toHaveTitle(/Boltcall/);
  });

  test('hero heading is visible', async ({ page }) => {
    const heading = page.locator('h1');
    await expect(heading).toBeVisible();
    await expect(heading).toContainText('NEVER');
    await expect(heading).toContainText('MISS');
  });

  test('hero subheadline is visible', async ({ page }) => {
    await expect(
      page.getByText('The all-in-one speed-to-lead system for law firms.')
    ).toBeVisible();
  });

  test('navigation links are visible', async ({ page }) => {
    const header = page.locator('header').first();
    await expect(header.getByText('Pricing', { exact: true })).toBeVisible();
    await expect(header.getByText('Contact', { exact: true })).toBeVisible();
  });

  test('CTA buttons exist', async ({ page }) => {
    // Hero CTA is now a website-audit URL form (replaced "See How It Works").
    await expect(page.getByRole('button', { name: /get my free audit|get audit/i })).toBeVisible();
    // Header's primary CTA replaced "Start For Free" with "Get Started".
    await expect(page.getByRole('link', { name: 'Get Started' })).toBeVisible();
  });

  test('hero audit form submits and navigates to the audit page', async ({ page }) => {
    const urlInput = page.getByLabel('Your website URL');
    await expect(urlInput).toBeVisible();
    await urlInput.fill('example.com');
    await page.getByRole('button', { name: /get my free audit|get audit/i }).click();
    await page.waitForURL(/\/website-audit\?url=/);
  });

  test('Get Started link is present and clickable', async ({ page }) => {
    const getStarted = page.getByRole('link', { name: 'Get Started' });
    await expect(getStarted).toBeVisible();
    await expect(getStarted).toBeEnabled();
  });

  test('footer is present on homepage', async ({ page }) => {
    await scrollThroughPage(page);
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();
  });

  test('How It Works section loads', async ({ page }) => {
    // Scroll down to trigger lazy loading
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
    // Wait for "How It Works" section to appear
    await expect(page.getByText('How It Works').first()).toBeVisible({ timeout: 10000 });
  });

  test('Pricing section loads on homepage', async ({ page }) => {
    await scrollThroughPage(page);
    // The pricing section has plan names
    await expect(page.getByText('Starter').first()).toBeVisible({ timeout: 10000 });
  });

  test('FAQ section loads on homepage', async ({ page }) => {
    await scrollThroughPage(page);
    await expect(page.getByText('What exactly does Boltcall do?').first()).toBeVisible({ timeout: 10000 });
  });
});
