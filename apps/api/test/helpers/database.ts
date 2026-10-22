import { randomUUID } from 'node:crypto';

import postgres from 'postgres';

/** Each integration suite owns a disposable database, never the developer's data. */
export async function createTestDatabase() {
  const connection = process.env.TEST_DATABASE_URL;
  if (!connection) {
    throw new Error(
      'Integration tests require TEST_DATABASE_URL, with CREATEDB (mandatory in CI).',
    );
  }
  const url = new URL(connection);
  if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) {
    throw new Error('Integration tests only accept a PostgreSQL server on loopback.');
  }
  const name = `focaldrop_test_${randomUUID().replaceAll('-', '')}`;
  const admin = postgres(connection, { max: 1, prepare: false, onnotice: () => {} });
  await admin.unsafe(`CREATE DATABASE "${name}"`);
  url.pathname = `/${name}`;
  const client = postgres(url.toString(), { max: 1, prepare: false, onnotice: () => {} });
  const close = async () => {
    await client.end();
    try {
      await admin.unsafe(`DROP DATABASE "${name}" WITH (FORCE)`);
    } finally {
      await admin.end();
    }
  };
  try {
    // Plain Postgres in CI has no Supabase installation. Only this fixture owns
    // the minimal external Auth table/roles required by the real foreign key.
    await client.unsafe(`
      CREATE SCHEMA auth;
      CREATE TABLE auth.users (id uuid PRIMARY KEY);
      DO $$ BEGIN CREATE ROLE anon NOLOGIN;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      DO $$ BEGIN CREATE ROLE authenticated NOLOGIN;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      DO $$ BEGIN CREATE ROLE service_role NOLOGIN;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      -- Reproduce Supabase's permissive defaults so REVOKE is actually exercised.
      ALTER DEFAULT PRIVILEGES IN SCHEMA public
        GRANT ALL ON TABLES TO anon, authenticated, service_role;
    `);
  } catch (error) {
    await close();
    throw error;
  }
  return { url: url.toString(), client, close };
}
