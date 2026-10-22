import { sql } from 'drizzle-orm';

import { createDatabase } from './database.js';
import { localAuthAdmin } from './local-auth.js';
import type { LocalSeedConfig } from './local-config.js';
import { seedDemo } from './seed.js';

export async function seedLocalDatabase(config: LocalSeedConfig) {
  const { db, client } = createDatabase(config.databaseUrl, 1);
  try {
    const result = await seedDemo(db, localAuthAdmin(config));
    // Fixed synthetic password; the public migration deliberately contains none.
    await db.execute(sql.raw("ALTER ROLE app_api PASSWORD 'focaldrop_local_api'"));
    return result;
  } finally {
    await client.end();
  }
}
