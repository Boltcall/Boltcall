import { test, expect } from '@playwright/test';

test.describe('Public page navigation', () => {
  test('homepage loads without errors', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Boltcall/i);
    await expect(page.locator('h1')).toBeVisible();
  });

  test('can navigate to /pricing', async ({ page }) => {
    await page.goto('/pricing');
    await expect(page).toHaveTitle(/Pricing/i);
    await expect(page.locator('h1')).toContainText('Pricing');
  });

  test('can navigate to /about', async ({ page }) => {
    await page.goto('/about');
    await expect(page).toHaveTitle(/About Boltcall/i);
    await expect(page.locator('h1')).toContainText('About');
    await expect(page.locator('h1')).toContainText('Boltcall');
  });

  test('can navigate to /contact', async ({ page }) => {
    await page.goto('/contact');
    await expect(page).toHaveTitle(/Contact/i);
    await expect(page.locator('h1')).toContainText('Contact Us');
  });

  test('can navigate to /blog', async ({ page }) => {
    await page.goto('/blog');
    await expect(page).toHaveTitle(/Blog/i);
  });

  test('can navigate to /demo', async ({ page }) => {
    await page.goto('/demo');
    await expect(page).toHaveTitle(/How Boltcall Works/i);
  });

  test('can navigate to /comparisons', async ({ page }) => {
    await page.goto('/comparisons');
    await expect(page).toHaveTitle(/Comparisons/i);
  });

  test('can navigate to /help-center', async ({ page }) => {
    await page.goto('/help-center');
    await expect(page.locator('h1').first()).toBeVisible();
  });

  test('can navigate to /privacy-policy', async ({ page }) => {
    await page.goto('/privacy-policy');
    await expect(page.locator('h1').first()).toBeVisible();
  });

  test('can navigate to /terms-of-service', async ({ page }) => {
    await page.goto('/terms-of-service');
    await expect(page.locator('h1').first()).toBeVisible();
  });

  test('can navigate to /documentation', async ({ page }) => {
    await page.goto('/documentation');
    await expect(page.locator('h1').first()).toBeVisible();
  });

  test('can navigate to /login', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveTitle(/Login/i);
  });

  test('can navigate to /signup', async ({ page }) => {
    await page.goto('/signup');
    await expect(page).toHaveTitle(/Sign Up/i);
  });

  test('feature routes load without errors', async ({ page }) => {
    const featureRoutes = [
      '/features/ai-receptionist',
      '/features/instant-form-reply',
      '/features/sms-booking-assistant',
      '/features/automated-reminders',
      '/features/ai-follow-up-system',
      '/features/website-widget',
      '/features/lead-reactivation',
      '/features/smart-website',
    ];
    for (const route of featureRoutes) {
      await page.goto(route);
      await expect(page.locator('h1').first()).toBeVisible();
    }
  });

  test('404 page shows for invalid routes', async ({ page }) => {
    await page.goto('/this-route-does-not-exist-at-all');
    await expect(page).toHaveTitle(/404/i);
    await expect(page.getByText('Page Not Found')).toBeVisible();
    await expect(page.getByText('Return to Homepage')).toBeVisible();
  });

  test('404 page Return to Homepage button works', async ({ page }) => {
    await page.goto('/nonexistent-page-xyz');
    await expect(page.getByText('Page Not Found')).toBeVisible();
    await page.getByText('Return to Homepage').click();
    await expect(page).toHaveURL('/');
  });
});
