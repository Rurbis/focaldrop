import assert from 'node:assert/strict';

import { z } from 'zod';

import { createDatabase } from '../src/db/database.js';
import { LOCAL_DEMO } from '../src/db/demo.js';
import { loadLocalSeedConfig } from '../src/db/local-config.js';
import { seedLocalDatabase } from '../src/db/seed-local.js';

const config = loadLocalSeedConfig();
assert(config.publicKey, 'Generate the local CLI environment file first.');
const first = await seedLocalDatabase(config);
assert.deepEqual(await seedLocalDatabase(config), first, 'Repeated seed must preserve IDs.');

const response = await fetch(`${config.authUrl}/auth/v1/token?grant_type=password`, {
  method: 'POST',
  headers: { apikey: config.publicKey, 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: LOCAL_DEMO.ownerEmail, password: LOCAL_DEMO.ownerPassword }),
  redirect: 'error',
  signal: AbortSignal.timeout(10_000),
});
assert.equal(response.status, 200, 'The seeded owner must be able to sign in.');
const session = z.object({ user: z.object({ id: z.uuid() }) }).parse(await response.json());
assert.equal(session.user.id, first.ownerId, 'The Auth account and profile must use the same ID.');

const runtimeUrl = new URL(config.databaseUrl);
runtimeUrl.username = 'app_api';
runtimeUrl.password = LOCAL_DEMO.apiPassword;
const { client } = createDatabase(runtimeUrl.toString(), 1);
const administrator = createDatabase(config.databaseUrl, 1).client;
try {
  const [access] = await administrator<{ accessible: number }[]>`
    SELECT count(*)::int AS accessible FROM pg_tables
    CROSS JOIN (VALUES ('anon'), ('authenticated'), ('service_role')) AS roles(name)
    WHERE schemaname = 'public'
      AND tablename IN ('agencies', 'agency_domains', 'profiles', 'agency_members')
      AND has_table_privilege(roles.name, format('%I.%I', schemaname, tablename), 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
  `;
  assert.equal(
    access?.accessible,
    0,
    'Supabase defaults must not leave direct client grants behind.',
  );
  const [row] = await client<{ agencies: number; domains: number; owners: number }[]>`
    SELECT (SELECT count(*)::int FROM agencies WHERE slug = 'demo') AS agencies,
           (SELECT count(*)::int FROM agency_domains WHERE hostname = 'localhost') AS domains,
           (SELECT count(*)::int FROM agency_members WHERE role = 'owner' AND user_id = ${first.ownerId}) AS owners
  `;
  assert.deepEqual(row, { agencies: 1, domains: 1, owners: 1 });
} finally {
  await client.end();
  await administrator.end();
}
console.info(
  'Local seed verified: stable IDs, unique demo data, owner login 200 and app_api access.',
);
