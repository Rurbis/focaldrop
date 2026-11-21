import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

import { migrateDatabase } from '../src/db/migrate.js';
import { createTestDatabase } from './helpers/database.js';

const describeWithDatabase = describe.skipIf(!process.env.TEST_DATABASE_URL && !process.env.CI);
const tsx = createRequire(import.meta.url).resolve('tsx/cli');

describeWithDatabase('provisioning CLI output', () => {
  let fixture: Awaited<ReturnType<typeof createTestDatabase>>;

  beforeAll(async () => {
    fixture = await createTestDatabase();
    await migrateDatabase(fixture.url);
  });
  afterAll(async () => {
    if (fixture) await fixture.close();
  });

  it('prints a fixed message, without agency data, when the database rejects the insert', async () => {
    // Drizzle puts the SQL and its parameters in the error message (#71 review).
    await fixture.client.unsafe(`
      CREATE FUNCTION reject_agency() RETURNS trigger LANGUAGE plpgsql
        AS $$ BEGIN RAISE EXCEPTION 'synthetic rejection'; END $$;
      CREATE TRIGGER reject_agency BEFORE INSERT ON agencies
        FOR EACH ROW EXECUTE FUNCTION reject_agency();
    `);
    const secrets = {
      AGENCY_SLUG: 'synthetic-secret-slug',
      AGENCY_NAME: '  Synthetic Secret Agency  ',
      OWNER_EMAIL: 'Synthetic-Owner@Example.INVALID',
    };
    const result = spawnSync(process.execPath, [tsx, 'src/db/provision.cli.ts'], {
      cwd: fileURLToPath(new URL('..', import.meta.url)),
      encoding: 'utf8',
      env: {
        PATH: process.env.PATH,
        PROVISION_TARGET: 'staging',
        MIGRATIONS_DATABASE_URL: fixture.url,
        // Never reached: the insert fails before the owner is created.
        SUPABASE_URL: 'https://auth.example.invalid',
        SUPABASE_SECRET_KEY: 'sb_secret_synthetic-test-only',
        AGENCY_HOSTNAME: 'staging.example.invalid',
        ...secrets,
      },
    });

    const output = `${result.stdout}${result.stderr}`.toLowerCase();
    expect(result.status).toBe(1);
    expect(output).toContain('provisioning failed: unexpected database or network error.');
    for (const value of [...Object.values(secrets), secrets.AGENCY_NAME.trim()]) {
      expect(output).not.toContain(value.toLowerCase());
    }
    expect(output).not.toContain('insert into');
  });
});
