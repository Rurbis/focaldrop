import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

// The same key pages as the visual tests, checked with axe-core against WCAG
// 2.2 A and AA (design plan §7). Each project runs them at its width and color
// scheme, so contrast is checked in light and dark. Automated checks find only
// part of the problems: keyboard and screen reader passes are still manual.
// https://playwright.dev/docs/accessibility-testing

const wcagTags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

async function expectNoViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(wcagTags)
    // The Next.js development indicator is not part of the product.
    .exclude('nextjs-portal')
    .analyze();

  // Readable on failure: the rule, its impact and where it fails.
  const violations = results.violations.map((violation) => ({
    rule: violation.id,
    impact: violation.impact,
    help: violation.help,
    targets: violation.nodes.map((node) => node.target.join(' ')),
  }));
  expect(violations).toEqual([]);

  // Guard the bar: contrast and the WCAG 2.2 target size rule did run. A rule
  // that ran shows up in one of these lists, even with nothing to check.
  const ran = [
    ...results.passes,
    ...results.violations,
    ...results.incomplete,
    ...results.inapplicable,
  ].map(({ id }) => id);
  expect(ran).toEqual(expect.arrayContaining(['color-contrast', 'target-size']));
}

test('public home', async ({ page }) => {
  await page.goto('/');
  await expectNoViolations(page);
});

test('panel login with the agency of the host', async ({ page }) => {
  await page.goto('/admin/login');
  // Scan after the agency name streams in, like the visual test.
  await expect(page.getByText('Estudio Alba').first()).toBeVisible();
  await expectNoViolations(page);
});

test('design system showcase', async ({ page }, testInfo) => {
  // The showcase already renders light and dark side by side (D136).
  test.skip(testInfo.project.use.colorScheme === 'dark', 'Covered by the light project.');
  await page.goto('/admin/ui');
  await expect(page.getByRole('heading', { name: 'Tipografía' }).first()).toBeVisible();
  await expectNoViolations(page);
});
