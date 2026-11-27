import { expect, test } from '@playwright/test';

// Key pages against reference images generated on Linux (#52). A difference
// fails the test and the report shows the expected, actual and diff images.
// Update the references only on purpose: pnpm --filter @focaldrop/web test:visual:update

test('public home', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveScreenshot('home.png', { fullPage: true });
});

test('panel login with the agency of the host', async ({ page }) => {
  await page.goto('/admin/login');
  // The agency name streams in after the synthetic API answers.
  await expect(page.getByText('Estudio Alba').first()).toBeVisible();
  await expect(page).toHaveScreenshot('login.png', { fullPage: true });
});

test('design system showcase', async ({ page }, testInfo) => {
  // The showcase already renders light and dark side by side (D136).
  test.skip(testInfo.project.use.colorScheme === 'dark', 'Covered by the light project.');
  await page.goto('/admin/ui');
  await expect(page.getByRole('heading', { name: 'Tipografía' }).first()).toBeVisible();
  await expect(page).toHaveScreenshot('showcase.png', { fullPage: true });
});
