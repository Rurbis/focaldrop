import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    // Roles are cluster-wide even though each suite owns a separate database.
    fileParallelism: false,
    include: ['test/**/*.integration-spec.ts'],
    hookTimeout: 30_000,
    testTimeout: 15_000,
  },
});
