import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';

import { validateEnv, type Env } from './env.js';

export function loadApiEnvFile(): void {
  const envFile = new URL('../../.env', import.meta.url);

  if (existsSync(envFile)) {
    loadEnvFile(envFile);
  }
}

export function loadEnv(): Env {
  loadApiEnvFile();
  return validateEnv(process.env);
}
