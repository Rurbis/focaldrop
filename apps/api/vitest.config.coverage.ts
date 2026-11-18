import { defineConfig, mergeConfig } from 'vitest/config';

import config from './vitest.config.js';

// Unit + HTTP tests run once and enforce the critical guard budget in CI (D107).
export default mergeConfig(
  config,
  defineConfig({
    test: {
      include: ['src/**/*.spec.ts', 'test/**/*.e2e-spec.ts'],
      coverage: {
        provider: 'v8',
        include: ['src/auth/*.guard.ts'],
        thresholds: { perFile: true, statements: 90, branches: 90, functions: 90, lines: 90 },
      },
    },
  }),
);
