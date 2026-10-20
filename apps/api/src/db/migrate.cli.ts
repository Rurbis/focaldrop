import { loadApiEnvFile } from '../config/load-env.js';
import { migrationsDatabaseUrl } from './config.js';
import { migrateDatabase } from './migrate.js';

try {
  loadApiEnvFile();
  await migrateDatabase(migrationsDatabaseUrl());
  console.info('Database migrations applied.');
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Database migration failed.');
  process.exitCode = 1;
}
