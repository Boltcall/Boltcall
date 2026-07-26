import { test, expect } from '@playwright/test';

// Reset-password flow. Real recovery-email round-trip needs a live inbox and is
// covered in the live-verification checklist. This spec pins the deterministic
// UI branches: the /reset-password no-session render (Phase 2 P2.3) and the
// /login "Forgot password?" success banner (P1 auth copy branching).

test.describe('/reset-password no session', () => {
  test('shows "Reset link expired" + Back to login when hit without recovery token', async ({ page }) => {
    await page.goto('/reset-password');
    await expect(page.getByRole('heading', { name: /reset link expired/i })).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText(/invalid or has expired/i)).toBeVisible();
    const back = page.getByRole('link', { name: /back to login/i });
    await expect(back).toBeVisible();
    await back.click();
    await expect(page).toHaveURL(/\/login/);
  });

  test('AuthRedirectRecovery does NOT hijack /reset-password (P1 regression)', async ({ page }) => {
    // Prior bug: a stale `pendingAuthRedirect` in localStorage + recovery hash
    // could steal the /reset-password route. Simulate stale state, load the
    // page, assert we still land on the reset-password expired-branch UI.
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('pendingAuthRedirect', '/dashboard');
    });
    await page.goto('/reset-password');
    await expect(page.getByRole('heading', { name: /reset link expired/i })).toBeVisible({ timeout: 8_000 });
    await expect(page).toHaveURL(/\/reset-password/);
  });
});

test.describe('/login forgot-password flow', () => {
  test('clicking "Forgot password?" without email shows validation error', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: /forgot password/i }).click();
    await expect(page.getByText(/enter your email above first/i)).toBeVisible({ timeout: 4_000 });
  });

  test('submitting valid email surfaces success banner (Supabase call intercepted)', async ({ page }) => {
    // Intercept the Supabase recover call so this runs without a real inbox
    // and doesn't queue emails to random addresses on live infra.
    await page.route('**/auth/v1/recover**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }),
    );
    await page.goto('/login');
    await page.locator('input[type="email"]').fill('reset-target@example.com');
    await page.getByRole('button', { name: /forgot password/i }).click();
    await expect(page.getByText(/password reset email sent/i)).toBeVisible({ timeout: 8_000 });
  });
});
