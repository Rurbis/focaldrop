import { LOCAL_DEMO } from './demo.js';
import { loadLocalSeedConfig } from './local-config.js';
import { seedLocalDatabase } from './seed-local.js';

try {
  await seedLocalDatabase(loadLocalSeedConfig());
  console.info(
    `Local demo ready: agency ${LOCAL_DEMO.slug}, owner ${LOCAL_DEMO.ownerEmail}. Credentials: apps/api/README.md.`,
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Local seed failed.');
  process.exitCode = 1;
}
