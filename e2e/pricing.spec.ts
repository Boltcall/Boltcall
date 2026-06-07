import { test, expect } from '@playwright/test';

test.describe('Pricing Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/pricing');
  });

  test('page loads with correct title', async ({ page }) => {
    await expect(page).toHaveTitle(/Pricing/i);
  });

  test('has an h1 for SEO', async ({ page }) => {
    // The h1 is sr-only for accessibility/SEO
    await expect(page.locator('h1')).toContainText('Pricing');
  });

  test('header and footer are present', async ({ page }) => {
    await expect(page.locator('header').first()).toBeVisible();
    await expect(page.locator('footer')).toBeVisible();
  });

  test('shows Starter plan', async ({ page }) => {
    await expect(page.getByText('Starter').first()).toBeVisible();
  });

  test('shows Pro plan', async ({ page }) => {
    await expect(page.getByText('Pro').first()).toBeVisible();
  });

  test('shows Ultimate plan', async ({ page }) => {
    await expect(page.getByText('Ultimate').first()).toBeVisible();
  });

  test('displays pricing features', async ({ page }) => {
    await expect(page.getByText('AI receptionist').first()).toBeVisible();
    await expect(page.getByText('Missed call text-back').first()).toBeVisible();
    await expect(page.getByText('Instant lead reply').first()).toBeVisible();
  });

  test('plan cards show token amounts', async ({ page }) => {
    await expect(page.getByText('1,000 tokens/mo').first()).toBeVisible();
    await expect(page.getByText('3,000 tokens/mo').first()).toBeVisible();
  });

  test('pricing section has "Pricing That" heading text', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Pricing\s*That\s*Scales\s*With\s*You/i })).toBeVisible();
  });
});
