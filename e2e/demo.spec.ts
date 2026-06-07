import { test, expect } from '@playwright/test';

test.describe('Demo flow page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/demo');
  });

  test('page loads with correct title', async ({ page }) => {
    await expect(page).toHaveTitle(/How Boltcall Works/i);
  });

  test('shows "How Boltcall Works" heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /How Boltcall Works/i })).toBeVisible();
  });

  test('shows subtitle description', async ({ page }) => {
    await expect(
      page.getByText('Every channel flows into one AI agent')
    ).toBeVisible();
  });

  test('toggle button switches between horizontal and vertical layouts', async ({ page }) => {
    const toggleButton = page.getByRole('button', { name: /Switch to Vertical/i });
    await expect(toggleButton).toBeVisible();

    await toggleButton.click();
    await expect(page.getByRole('button', { name: /Switch to Horizontal/i })).toBeVisible();

    await page.getByRole('button', { name: /Switch to Horizontal/i }).click();
    await expect(page.getByRole('button', { name: /Switch to Vertical/i })).toBeVisible();
  });

  test('source nodes are visible - Phone', async ({ page }) => {
    await expect(page.getByText('Phone').first()).toBeVisible();
    await expect(page.getByText('Incoming calls')).toBeVisible();
  });

  test('source nodes are visible - Email', async ({ page }) => {
    await expect(page.getByText('Email').first()).toBeVisible();
    await expect(page.getByText('Form submissions')).toBeVisible();
  });

  test('source nodes are visible - SMS', async ({ page }) => {
    await expect(page.getByText('SMS').first()).toBeVisible();
    await expect(page.getByText('Text messages')).toBeVisible();
  });

  test('source nodes are visible - Ads', async ({ page }) => {
    await expect(page.getByText('Ads', { exact: true })).toBeVisible();
    await expect(page.getByText('Lead ads')).toBeVisible();
  });

  test('source nodes are visible - Website', async ({ page }) => {
    await expect(page.getByText('Website').first()).toBeVisible();
    await expect(page.getByText('Chat widget')).toBeVisible();
  });

  test('output nodes are visible - Calendar', async ({ page }) => {
    await expect(page.getByText('Calendar')).toBeVisible();
    await expect(page.getByText('Book appointments')).toBeVisible();
  });

  test('output nodes are visible - Notifications', async ({ page }) => {
    await expect(page.getByText('Notifications')).toBeVisible();
    await expect(page.getByText('Alert the owner')).toBeVisible();
  });

  test('output nodes are visible - Phone transfer', async ({ page }) => {
    await expect(page.getByText('Transfer to human')).toBeVisible();
  });

  test('center Boltcall AI Agent node is visible', async ({ page }) => {
    await expect(page.getByText('Boltcall').first()).toBeVisible();
    await expect(page.getByText('AI Agent', { exact: true })).toBeVisible();
  });
});
