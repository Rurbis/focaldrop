import { defineConfig } from '@playwright/test';

const port = 3320;
const apiPort = 3321;
const desktop = { width: 1280, height: 800 };
const mobile = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true };

// Visual tests (#52). They run on Linux only, in the official Playwright image,
// locally through `test:visual:docker` and in CI, so the references match.
export default defineConfig({
  testDir: './e2e',
  // No platform suffix: every reference comes from the same Linux image.
  snapshotPathTemplate: '{testDir}/__screenshots__/{arg}-{projectName}{ext}',
  forbidOnly: Boolean(process.env.CI),
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  expect: {
    toHaveScreenshot: { stylePath: './e2e/screenshot.css' },
  },
  use: {
    // Chromium resolves *.localhost to the loopback, so the page sends a real
    // tenant host that the synthetic API knows, with no hosts file changes.
    baseURL: `http://alpha.localhost:${port}`,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop-light', use: { viewport: desktop, colorScheme: 'light' } },
    { name: 'desktop-dark', use: { viewport: desktop, colorScheme: 'dark' } },
    { name: 'mobile-light', use: { ...mobile, colorScheme: 'light' } },
    { name: 'mobile-dark', use: { ...mobile, colorScheme: 'dark' } },
  ],
  webServer: [
    {
      command: 'node e2e/synthetic-api.mjs',
      url: `http://127.0.0.1:${apiPort}/health`,
      env: { VISUAL_API_PORT: String(apiPort) },
    },
    {
      // The design system showcase only exists in development (D136).
      command: `pnpm exec next dev --port ${port}`,
      url: `http://127.0.0.1:${port}/`,
      timeout: 180_000,
      env: {
        API_URL: `http://127.0.0.1:${apiPort}`,
        NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321',
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_visual_test',
        NEXT_TELEMETRY_DISABLED: '1',
      },
    },
  ],
});
