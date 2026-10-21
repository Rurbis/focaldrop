import { existsSync, readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';

import { loadApiEnvFile } from '../config/load-env.js';

function assertLocalUrl(value: string, kind: 'database' | 'auth'): void {
  const url = new URL(value);
  const database = kind === 'database';
  const valid =
    ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) &&
    url.port === (database ? '54322' : '54321') &&
    (database ? ['postgres:', 'postgresql:'].includes(url.protocol) : url.protocol === 'http:') &&
    (database ? url.pathname === '/postgres' : ['', '/'].includes(url.pathname)) &&
    !url.search &&
    !url.hash;
  if (!valid)
    throw new Error('Seed/reset only accepts the local Supabase ports and postgres database.');
}

export function localSeedConfig(input: NodeJS.ProcessEnv, cli: NodeJS.ProcessEnv = {}) {
  if (input.NODE_ENV !== 'development') {
    throw new Error(
      'Seed/reset requires NODE_ENV=development; staging and production are forbidden.',
    );
  }
  const databaseUrl =
    input.MIGRATIONS_DATABASE_URL ??
    cli.DB_URL ??
    'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
  const authUrl = input.SUPABASE_URL ?? cli.API_URL ?? 'http://127.0.0.1:54321';
  assertLocalUrl(databaseUrl, 'database');
  assertLocalUrl(authUrl, 'auth');
  if (input.DATABASE_URL) assertLocalUrl(input.DATABASE_URL, 'database');
  if (new URL(databaseUrl).username !== 'postgres') {
    throw new Error('Local seed/reset requires the local postgres administrator connection.');
  }
  const secretKey =
    input.SUPABASE_SECRET_KEY?.trim() || cli.SECRET_KEY?.trim() || cli.SERVICE_ROLE_KEY?.trim();
  if (!secretKey)
    throw new Error('Generate infra/supabase/.env.local from supabase status before seeding.');
  return {
    databaseUrl,
    authUrl: authUrl.replace(/\/$/, ''),
    secretKey,
    publicKey: cli.PUBLISHABLE_KEY || cli.ANON_KEY,
  };
}

export type LocalSeedConfig = ReturnType<typeof localSeedConfig>;

export function loadLocalSeedConfig(): LocalSeedConfig {
  loadApiEnvFile();
  const file = new URL('../../../../infra/supabase/.env.local', import.meta.url);
  const cli = existsSync(file) ? parseEnv(readFileSync(file, 'utf8')) : {};
  return localSeedConfig(process.env, cli);
}
