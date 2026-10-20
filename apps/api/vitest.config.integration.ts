import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['test/**/*.integration-spec.ts'],
    hookTimeout: 30_000,
    testTimeout: 15_000,
  },
});
