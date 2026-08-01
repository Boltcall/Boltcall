import { test, expect } from '@playwright/test';
import { test as authTest } from '../../fixtures/auth';

test.describe('Dashboard Settings - Plan & Billing Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/settings/plan-billing');
  });

  test('redirects to login when not authenticated', async ({ page }) => {
    await expect(page).toHaveURL(/\/login/);
  });

  test('old /dashboard/settings/billing redirects', async ({ page }) => {
    await page.goto('/dashboard/settings/billing');
    // Redirects to plan-billing, then to login since not authenticated
    await expect(page).toHaveURL(/\/login/);
  });
});

authTest.describe('Plan & Billing (authenticated)', () => {
  authTest('shows current plan, price, and available plans grid', async ({ authenticatedPage: page }) => {
    await page.goto('/dashboard/settings/plan-billing');
    await expect(page.getByText('Current Plan', { exact: false })).toBeVisible();
    await expect(page.getByText('Plan Usage', { exact: false })).toBeVisible();
    await expect(page.getByText('Available Plans', { exact: false })).toBeVisible();
    // 3 self-serve tiers always rendered regardless of current plan
    await expect(page.getByText('Starter', { exact: false })).toBeVisible();
    await expect(page.getByText('Pro', { exact: false })).toBeVisible();
    await expect(page.getByText('Ultimate', { exact: false })).toBeVisible();
  });

  authTest('shows billing history tab with invoices or empty state', async ({ authenticatedPage: page }) => {
    await page.goto('/dashboard/settings/plan-billing');
    await page.getByRole('button', { name: /payment.*invoice/i }).click();
    await expect(page.getByText('Billing History', { exact: false })).toBeVisible();
    // Either a real invoice table or the empty state — both are valid outcomes
    // depending on the test account's subscription history.
    const hasInvoiceTable = await page.locator('table').isVisible().catch(() => false);
    const hasEmptyState = await page.getByText('No invoices yet').isVisible().catch(() => false);
    expect(hasInvoiceTable || hasEmptyState).toBeTruthy();
  });

  authTest('upgrade click on a non-current plan starts PayPal checkout redirect', async ({ authenticatedPage: page }) => {
    // ponytail: intercept the checkout call instead of letting it redirect to real
    // PayPal — this only proves the app *would* start checkout, no live order is created.
    await page.route('**/create-paypal-subscription', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ approvalUrl: 'https://paypal.test/approve' }) }),
    );
    await page.goto('/dashboard/settings/plan-billing');
    const upgradeButtons = page.getByRole('button', { name: /^upgrade$/i });
    if (await upgradeButtons.count() === 0) return; // account already on top tier
    await upgradeButtons.first().click();
    await page.waitForURL('https://paypal.test/approve', { timeout: 10_000 });
  });

  // NOT automated: the founder-only "Live PayPal test payment" button creates a
  // real $2.00 PayPal order (src/pages/dashboard/settings/PlanBillingPage.tsx:386).
  // Clicking it in CI would move real money on every run — verify manually only.
});
