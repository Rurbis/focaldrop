import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Resolves the `@/` alias from tsconfig.json, the same way Next does.
  resolve: { tsconfigPaths: true },
  test: {
    include: ['src/**/*.test.ts'],
  },
});
