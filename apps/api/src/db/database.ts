import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import * as schema from './schema/index.js';

export function createDatabase(url: string, max = 10) {
  // Supabase's transaction pooler does not support session prepared statements.
  const client = postgres(url, { prepare: false, max });
  return { client, db: drizzle(client, { schema }) };
}
