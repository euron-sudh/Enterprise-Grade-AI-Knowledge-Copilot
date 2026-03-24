import { expect, test } from '@playwright/test';

test.describe('Authentication flows', () => {
  test.describe('Login page', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/login');
    });

    test('renders login form with all elements', async ({ page }) => {
      await expect(page.getByText('Welcome back')).toBeVisible();
      await expect(page.getByLabel(/email address/i)).toBeVisible();
      await expect(page.getByLabel(/password/i)).toBeVisible();
      await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
    });

    test('shows OAuth buttons', async ({ page }) => {
      await expect(page.getByRole('button', { name: /google/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /microsoft/i })).toBeVisible();
    });

    test('shows validation errors on empty submit', async ({ page }) => {
      await page.getByRole('button', { name: /sign in/i }).click();
      await expect(page.getByText(/enter a valid email/i)).toBeVisible();
    });

    test('shows error for invalid email format', async ({ page }) => {
      await page.getByLabel(/email/i).fill('not-an-email');
      await page.getByRole('button', { name: /sign in/i }).click();
      await expect(page.getByText(/enter a valid email/i)).toBeVisible();
    });

    test('shows password required error', async ({ page }) => {
      await page.getByLabel(/email/i).fill('valid@example.com');
      await page.getByRole('button', { name: /sign in/i }).click();
      await expect(page.getByText(/password is required/i)).toBeVisible();
    });

    test('links to register page', async ({ page }) => {
      await page.getByRole('link', { name: /sign up/i }).click();
      await expect(page).toHaveURL(/\/register/);
    });

    test('links to forgot password page', async ({ page }) => {
      await page.getByRole('link', { name: /forgot password/i }).click();
      await expect(page).toHaveURL(/\/forgot-password/);
    });

    test('submits valid credentials', async ({ page }) => {
      // Mock successful auth API response
      await page.route('**/auth/login', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            user: {
              id: 'u1',
              name: 'Test User',
              email: 'test@example.com',
              role: 'member',
              organizationId: 'org-1',
              organizationName: 'Test Org',
              mfaEnabled: false,
              mfaMethods: [],
              preferences: { theme: 'system', language: 'en', notifications: {}, defaultModel: 'gpt-4o', sidebarCollapsed: false },
              createdAt: new Date().toISOString(),
              lastLoginAt: new Date().toISOString(),
            },
            accessToken: 'test-access-token',
            refreshToken: 'test-refresh-token',
            expiresIn: 3600,
          }),
        });
      });

      await page.getByLabel(/email/i).fill('test@example.com');
      await page.getByLabel(/password/i).fill('Password1');
      await page.getByRole('button', { name: /sign in/i }).click();

      // Should redirect after successful login
      // (In real e2e tests with actual backend, verify redirect to /chat)
    });
  });

  test.describe('Register page', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/register');
    });

    test('renders registration form', async ({ page }) => {
      await expect(page.getByText('Create your account')).toBeVisible();
      await expect(page.getByLabel(/full name/i)).toBeVisible();
      await expect(page.getByLabel(/work email/i)).toBeVisible();
      await expect(page.getByLabel(/^password$/i)).toBeVisible();
      await expect(page.getByLabel(/confirm password/i)).toBeVisible();
    });

    test('validates all required fields', async ({ page }) => {
      await page.getByRole('button', { name: /create account/i }).click();
      await expect(page.getByText(/name must be at least/i)).toBeVisible();
    });

    test('validates email format', async ({ page }) => {
      await page.getByLabel(/full name/i).fill('Test User');
      await page.getByLabel(/work email/i).fill('bad-email');
      await page.getByRole('button', { name: /create account/i }).click();
      await expect(page.getByText(/enter a valid email/i)).toBeVisible();
    });

    test('validates password strength', async ({ page }) => {
      await page.getByLabel(/full name/i).fill('Test User');
      await page.getByLabel(/work email/i).fill('test@example.com');
      await page.getByLabel(/^password$/i).fill('weakpass');
      await page.getByRole('button', { name: /create account/i }).click();
      await expect(
        page.getByText(/must contain at least one uppercase/i)
      ).toBeVisible();
    });

    test('validates password confirmation match', async ({ page }) => {
      await page.getByLabel(/full name/i).fill('Test User');
      await page.getByLabel(/work email/i).fill('test@example.com');
      await page.getByLabel(/^password$/i).fill('Password1');
      await page.getByLabel(/confirm password/i).fill('DifferentPass1');
      await page.getByRole('button', { name: /create account/i }).click();
      await expect(page.getByText(/passwords do not match/i)).toBeVisible();
    });

    test('links back to login', async ({ page }) => {
      await page.getByRole('link', { name: /sign in/i }).click();
      await expect(page).toHaveURL(/\/login/);
    });
  });

  test.describe('Forgot password page', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/forgot-password');
    });

    test('renders forgot password form', async ({ page }) => {
      await expect(page.getByText('Reset your password')).toBeVisible();
      await expect(page.getByLabel(/email address/i)).toBeVisible();
      await expect(page.getByRole('button', { name: /send reset link/i })).toBeVisible();
    });

    test('validates email', async ({ page }) => {
      await page.getByRole('button', { name: /send reset link/i }).click();
      await expect(page.getByText(/enter a valid email/i)).toBeVisible();
    });

    test('shows success state after submission', async ({ page }) => {
      await page.route('**/auth/password-reset/request', async (route) => {
        await route.fulfill({ status: 200, body: '{}' });
      });

      await page.getByLabel(/email/i).fill('test@example.com');
      await page.getByRole('button', { name: /send reset link/i }).click();
      await expect(page.getByText(/check your email/i)).toBeVisible();
    });
  });
});
