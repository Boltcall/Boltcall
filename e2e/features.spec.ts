import { test, expect } from '@playwright/test';

test.describe('Feature Pages', () => {
  test('AI Receptionist page loads', async ({ page }) => {
    await page.goto('/features/ai-receptionist');
    await expect(page).toHaveTitle(/AI Receptionist/i);
    await expect(page.locator('h1')).toContainText('AI Receptionist');
    await expect(page.locator('header').first()).toBeVisible();
    await expect(page.locator('footer')).toBeVisible();
  });

  test('AI Receptionist page has hero content', async ({ page }) => {
    await page.goto('/features/ai-receptionist');
    await expect(page.getByText('Never Miss a Call')).toBeVisible();
    await expect(page.getByText('Your AI receptionist answers calls 24/7')).toBeVisible();
  });

  test('Instant Form Reply page loads', async ({ page }) => {
    await page.goto('/features/instant-form-reply');
    await expect(page).toHaveTitle(/Instant Lead Response/i);
    await expect(page.locator('h1').first()).toBeVisible();
    await expect(page.locator('header').first()).toBeVisible();
  });

  test('SMS Booking Assistant page loads', async ({ page }) => {
    await page.goto('/features/sms-booking-assistant');
    await expect(page).toHaveTitle(/SMS Booking Assistant/i);
    await expect(page.locator('h1').first()).toBeVisible();
    await expect(page.locator('header').first()).toBeVisible();
  });

  test('Automated Reminders page loads', async ({ page }) => {
    await page.goto('/features/automated-reminders');
    await expect(page).toHaveTitle(/Automated.*Reminders/i);
    await expect(page.locator('h1').first()).toBeVisible();
    await expect(page.locator('header').first()).toBeVisible();
  });

  test('AI Follow-Up System page loads', async ({ page }) => {
    await page.goto('/features/ai-follow-up-system');
    await expect(page).toHaveTitle(/AI Follow-Up/i);
    await expect(page.locator('h1').first()).toBeVisible();
    await expect(page.locator('header').first()).toBeVisible();
  });

  test('Website Chat & Voice Widget page loads', async ({ page }) => {
    await page.goto('/features/website-widget');
    await expect(page).toHaveTitle(/Website Chat/i);
    await expect(page.locator('h1').first()).toBeVisible();
    await expect(page.locator('header').first()).toBeVisible();
  });

  test('Lead Reactivation page loads', async ({ page }) => {
    await page.goto('/features/lead-reactivation');
    await expect(page).toHaveTitle(/Lead Reactivation/i);
    await expect(page.locator('h1').first()).toBeVisible();
    await expect(page.locator('header').first()).toBeVisible();
  });

  test('Smart Website page loads', async ({ page }) => {
    await page.goto('/features/smart-website');
    await expect(page).toHaveTitle(/Smart Website/i);
    await expect(page.locator('h1').first()).toBeVisible();
    await expect(page.locator('header').first()).toBeVisible();
  });

  test('all feature pages have footer', async ({ page }) => {
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
      await expect(page.locator('footer')).toBeVisible();
    }
  });
});
