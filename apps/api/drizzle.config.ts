import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema/platform.ts',
  out: './drizzle',
  schemaFilter: ['public'],
});
