import { test, expect } from '@playwright/test';

test.describe('Login page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('renders with correct title', async ({ page }) => {
    await expect(page).toHaveTitle(/Login/i);
  });

  test('renders with email and password fields', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[placeholder="Password"]')).toBeVisible();
  });

  test('shows LOGIN submit button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /login/i })).toBeVisible();
  });

  test('shows social login options', async ({ page }) => {
    await expect(page.getByText('Or continue with')).toBeVisible();
    await expect(page.getByTitle('Google')).toBeVisible();
    await expect(page.getByTitle('Microsoft')).toBeVisible();
    await expect(page.getByTitle('Facebook')).toBeVisible();
  });

  test('form validates empty fields on submit', async ({ page }) => {
    await page.getByRole('button', { name: /login/i }).click();
    await expect(page.getByText('Please enter a valid email address')).toBeVisible();
    await expect(page.getByText('Password must be at least 6 characters')).toBeVisible();
  });

  test('form validates invalid email', async ({ page }) => {
    await page.locator('input[type="email"]').fill('not-an-email');
    await page.locator('input[placeholder="Password"]').fill('123456');
    await page.getByRole('button', { name: /login/i }).click();
    await expect(page.getByText('Please enter a valid email address')).toBeVisible();
  });

  test('form validates short password', async ({ page }) => {
    await page.locator('input[type="email"]').fill('test@example.com');
    await page.locator('input[placeholder="Password"]').fill('12');
    await page.getByRole('button', { name: /login/i }).click();
    await expect(page.getByText('Password must be at least 6 characters')).toBeVisible();
  });

  test('has forgot password link', async ({ page }) => {
    await expect(page.getByText('Forgot password?')).toBeVisible();
  });

  test('can switch to signup mode', async ({ page }) => {
    // The auth-switch component allows toggling between login and signup
    const signupLink = page.getByRole('button', { name: 'Sign Up' }).first();
    await expect(signupLink).toBeVisible();
  });
});

test.describe('Signup page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/signup');
  });

  test('renders with correct title', async ({ page }) => {
    await expect(page).toHaveTitle(/Sign Up/i);
  });

  test('renders with email and password fields', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Sign up' })).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[placeholder="Password"]')).toBeVisible();
  });

  test('shows SIGN UP submit button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /sign up/i })).toBeVisible();
  });

  test('shows social signup options', async ({ page }) => {
    await expect(page.getByText('Or continue with')).toBeVisible();
  });

  test('form validates empty fields on submit', async ({ page }) => {
    await page.getByRole('button', { name: /sign up/i }).click();
    await expect(page.getByText('Please enter a valid email address')).toBeVisible();
    await expect(page.getByText('Password must be at least 6 characters')).toBeVisible();
  });

  test('can switch to login mode', async ({ page }) => {
    const loginLink = page.getByRole('button', { name: 'Sign In' }).first();
    await expect(loginLink).toBeVisible();
  });
});
