import { test, expect } from '@playwright/test';

// Guards against Phase 1 P0.7 (`?setupCompleted=true` bypass) and the
// unauthenticated protected-route redirect. Anything an unauthed user tries
// to reach must land on /login; the setupCompleted URL flag must not skip
// the DB profile check.

const PROTECTED_ROUTES = [
  '/dashboard',
  '/dashboard/leads',
  '/dashboard/calls',
  '/dashboard/messages',
  '/dashboard/settings/plan-billing',
  '/dashboard/settings/general',
  '/setup/loading',
];

for (const path of PROTECTED_ROUTES) {
  test(`${path} redirects to /login when unauthenticated`, async ({ page }) => {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });
}

test('P0.7 regression — ?setupCompleted=true does not bypass ProtectedRoute', async ({ page }) => {
  // The old shortcut cached `boltcall_setup_complete=true` from the URL flag
  // and let the user reach an empty dashboard without a real business_profiles
  // row. Even with the flag pre-seeded, an unauth request must still hit login.
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('boltcall_setup_complete', 'true'));
  await page.goto('/dashboard?setupCompleted=true');
  await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
});

test('login redirect preserves attempted URL as ?redirect= (P2 UX)', async ({ page }) => {
  await page.goto('/dashboard/leads');
  await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  const url = new URL(page.url());
  const redirect = url.searchParams.get('redirect');
  // Either "?redirect=/dashboard/leads" or an encoded variant is acceptable.
  expect(redirect ?? '').toMatch(/dashboard\/leads/);
});
