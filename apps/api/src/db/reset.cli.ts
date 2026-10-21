import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { loadLocalSeedConfig } from './local-config.js';
import { migrateDatabase } from './migrate.js';
import { seedLocalDatabase } from './seed-local.js';

try {
  // Validate before the destructive CLI operation; never use linked/cloud reset.
  const config = loadLocalSeedConfig();
  const pnpm = process.env.npm_execpath;
  if (!pnpm) throw new Error('Run this command through pnpm db:reset.');
  const result = spawnSync(
    process.execPath,
    [pnpm, 'exec', 'supabase', 'db', 'reset', '--local', '--workdir', 'infra'],
    {
      cwd: fileURLToPath(new URL('../../../../', import.meta.url)),
      stdio: 'inherit',
    },
  );
  if (result.error || result.status !== 0)
    throw new Error('Local Supabase reset failed; migrations and seed were not run.');
  await migrateDatabase(config.databaseUrl);
  await seedLocalDatabase(config);
  console.info('Local Supabase reset, migrated and seeded.');
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Local reset failed.');
  process.exitCode = 1;
}
