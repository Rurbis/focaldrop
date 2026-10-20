import { z } from 'zod';

const DatabaseUrlSchema = z.url({ protocol: /^postgres(ql)?$/ });

export function migrationsDatabaseUrl(input: NodeJS.ProcessEnv = process.env): string {
  const value = input.MIGRATIONS_DATABASE_URL ?? input.DATABASE_URL;
  const result = DatabaseUrlSchema.safeParse(value);
  if (!result.success) {
    throw new Error(
      'Set MIGRATIONS_DATABASE_URL (or DATABASE_URL) to a PostgreSQL session connection.',
    );
  }
  return result.data;
}
