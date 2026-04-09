import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const authFile = 'playwright-report/.auth/user.json';

test('authenticate demo user', async ({ page }) => {
  mkdirSync(dirname(authFile), { recursive: true });

  await page.goto('/login');

  await page.getByRole('button', { name: /demo user/i }).click();
  await page.waitForURL(/\/(home|chat)/, { timeout: 30000 });
  await expect(page).not.toHaveURL(/\/login/);

  await page.context().storageState({ path: authFile });
});