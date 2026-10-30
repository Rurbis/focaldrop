import { createDatabase } from './database.js';
import { provisionAuthAdmin } from './provision-auth.js';
import { provisionConfig } from './provision-config.js';
import { safeErrorMessage } from './safe-error.js';
import { provisionAgency } from './seed.js';

// Staging and production only; the local demo is `pnpm db:seed`. Reads no .env
// file, so a local configuration can never reach a remote database by accident.
try {
  const config = provisionConfig(process.env, process.argv.slice(2));
  const { db, client } = createDatabase(config.databaseUrl, 1);
  try {
    const result = await provisionAgency(db, provisionAuthAdmin(config), config.spec);
    console.info(
      `Agency ready in ${config.target}: agency ${result.agencyId}, owner ${result.ownerId}.`,
    );
  } finally {
    await client.end();
  }
} catch (error) {
  // Never error.message or its cause: Drizzle errors carry the SQL and the
  // agency data, and the Actions logs are public (#71).
  console.error(
    safeErrorMessage(error, 'Provisioning failed: unexpected database or network error.'),
  );
  process.exitCode = 1;
}
