import { fileURLToPath } from 'node:url';

import { migrate } from 'drizzle-orm/postgres-js/migrator';

import { createDatabase } from './database.js';

export async function migrateDatabase(url: string): Promise<void> {
  const { client, db } = createDatabase(url, 1);
  try {
    await migrate(db, {
      migrationsFolder: fileURLToPath(new URL('../../drizzle', import.meta.url)),
    });
  } finally {
    await client.end();
  }
}
