import { z } from 'zod';

const DatabaseUrlSchema = z.url({ protocol: /^postgres(ql)?$/ });

export function migrationsDatabaseUrl(input: NodeJS.ProcessEnv = process.env): string {
  const result = DatabaseUrlSchema.safeParse(input.MIGRATIONS_DATABASE_URL);
  if (!result.success) {
    throw new Error(
      'Set MIGRATIONS_DATABASE_URL to a PostgreSQL administrator/session connection.',
    );
  }
  return result.data;
}
