import { test, expect } from '@playwright/test';
import { test as authTest } from '../fixtures/auth';

test.describe('Dashboard - Main Page', () => {
  test('redirects to login when not authenticated', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForURL(/\/login/);
    await expect(page).toHaveURL(/\/login/);
  });

  test('dashboard/* routes redirect to login when not authenticated', async ({ page }) => {
    await page.goto('/dashboard/agents');
    await page.waitForURL(/\/login/);
    await expect(page).toHaveURL(/\/login/);
  });
});

// Every sidebar route (src/components/dashboard/Sidebar.tsx NAV_GROUPS). Requires
// AUTH_EMAIL / AUTH_PASSWORD env vars — otherwise the fixture throws with setup instructions.
const DASHBOARD_ROUTES = [
  '/dashboard',
  '/dashboard/getting-started',
  '/dashboard/leads',
  '/dashboard/calls',
  '/dashboard/missed-calls',
  '/dashboard/messages',
  '/dashboard/reminders',
  '/dashboard/ai-receptionist',
  '/dashboard/sms',
  '/dashboard/whatsapp',
  '/dashboard/email',
  '/dashboard/chat-widget',
  '/dashboard/agents',
  '/dashboard/voice-library',
  '/dashboard/knowledge-base',
  '/dashboard/phone-numbers',
  '/dashboard/business',
  '/dashboard/analytics',
  '/dashboard/reputation',
  '/dashboard/integrations',
  '/dashboard/settings',
];

authTest.describe('Dashboard smoke (authenticated)', () => {
  authTest('shows dashboard page with sidebar navigation', async ({ authenticatedPage: page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('nav[aria-label="Main navigation"]')).toBeVisible();
  });

  for (const route of DASHBOARD_ROUTES) {
    authTest(`${route} loads without crashing`, async ({ authenticatedPage: page }) => {
      const consoleErrors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });
      page.on('pageerror', (err) => consoleErrors.push(err.message));

      const response = await page.goto(route);
      expect(response?.ok(), `${route} returned ${response?.status()}`).toBeTruthy();
      await expect(page).toHaveURL(new RegExp(route.replace(/\//g, '\\/')));
      await expect(page.locator('nav[aria-label="Main navigation"]')).toBeVisible();
      expect(consoleErrors, `console errors on ${route}: ${consoleErrors.join(' | ')}`).toEqual([]);
    });
  }
});
