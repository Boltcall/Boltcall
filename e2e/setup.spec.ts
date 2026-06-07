import { test, expect } from '@playwright/test';

test.describe('Setup wizard', () => {
  test('renders public setup wizard when not authenticated', async ({ page }) => {
    await page.goto('/setup');
    await expect(page.getByText('Step 1 of 2: Personal Profile')).toBeVisible();
  });

  test('setup/loading redirects to login when not authenticated', async ({ page }) => {
    await page.goto('/setup/loading');
    await page.waitForURL(/\/login/);
    await expect(page).toHaveURL(/\/login/);
  });

  test.describe('Setup wizard steps (auth required)', () => {
    // These tests require authentication to access the setup page.
    // The setup wizard has 3 steps: Your Business, Location, Review & Launch
    // To run: set up AUTH_EMAIL and AUTH_PASSWORD env vars or use a test account

    test.skip('renders step 1 - Your Business when authenticated', async () => {
      // Would verify:
      // - "Your Business" step title visible
      // - Business name input field
      // - Industry selector with options (Dentist, Med Spa, Plumber, etc.)
      // - Next button
    });

    test.skip('renders step 2 - Location when authenticated', async () => {
      // Would verify:
      // - "Location" step title visible
      // - Country selector with options (United States, United Kingdom, etc.)
      // - Address fields
    });

    test.skip('renders step 3 - Review & Launch when authenticated', async () => {
      // Would verify:
      // - "Review & Launch" step title visible
      // - Summary of entered information
      // - Launch button
    });
  });
});
