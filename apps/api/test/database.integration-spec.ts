import { drizzle } from 'drizzle-orm/postgres-js';
import { v7 as uuidv7 } from 'uuid';

import { migrateDatabase } from '../src/db/migrate.js';
import { agencies, agencyDomains } from '../src/db/schema/index.js';
import { createTestDatabase } from './helpers/database.js';

describe('platform migrations on a fresh PostgreSQL database', () => {
  let fixture: Awaited<ReturnType<typeof createTestDatabase>>;

  beforeAll(async () => {
    fixture = await createTestDatabase();
    await migrateDatabase(fixture.url);
  });

  afterAll(async () => {
    if (fixture) await fixture.close();
  });

  async function insertAgency() {
    const [agency] = await drizzle(fixture.client)
      .insert(agencies)
      .values({
        slug: `demo-${uuidv7()}`,
        name: 'Synthetic agency',
        notificationEmail: 'demo@example.invalid',
      })
      .returning();
    if (!agency) throw new Error('Expected an inserted agency.');
    return agency;
  }

  it('creates only the four milestone-0 tables, with RLS and prepared columns', async () => {
    const tables = await fixture.client<{ tablename: string; rowsecurity: boolean }[]>`
      SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename
    `;
    expect(tables).toEqual([
      { tablename: 'agencies', rowsecurity: true },
      { tablename: 'agency_domains', rowsecurity: true },
      { tablename: 'agency_members', rowsecurity: true },
      { tablename: 'profiles', rowsecurity: true },
    ]);
    const columns = await fixture.client<{ column_name: string; data_type: string }[]>`
      SELECT column_name, data_type FROM information_schema.columns
      WHERE table_schema = 'public' AND column_name IN ('verified_at', 'storage_policy_accepted_at')
      ORDER BY column_name
    `;
    expect(columns).toEqual([
      { column_name: 'storage_policy_accepted_at', data_type: 'timestamp with time zone' },
      { column_name: 'verified_at', data_type: 'timestamp with time zone' },
    ]);
  });

  it('generates application UUID v7 IDs and applies the platform defaults', async () => {
    const agency = await insertAgency();
    expect(agency.id).toMatch(/^[\da-f]{8}-[\da-f]{4}-7[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/);
    expect(agency).toMatchObject({
      status: 'active',
      locale: 'es-MX',
      currency: 'MXN',
      retentionDays: 60,
      notificationPreferences: {},
    });
    expect(agency.createdAt).toBeInstanceOf(Date);
  });

  it('enforces enum checks, positive retention and hostname normalization', async () => {
    const agency = await insertAgency();
    await expect(
      fixture.client`UPDATE agencies SET status = 'deleted' WHERE id = ${agency.id}`,
    ).rejects.toMatchObject({ code: '23514' });
    await expect(
      fixture.client`UPDATE agencies SET retention_days = 0 WHERE id = ${agency.id}`,
    ).rejects.toMatchObject({ code: '23514' });
    await expect(
      fixture.client`INSERT INTO agency_domains (id, agency_id, hostname, kind) VALUES (${uuidv7()}, ${agency.id}, 'UPPER.example', 'custom')`,
    ).rejects.toMatchObject({ code: '23514' });
  });

  it('allows one primary domain per agency and no duplicate hostnames', async () => {
    const agency = await insertAgency();
    const other = await insertAgency();
    const hostname = `${agency.id}.example.invalid`;
    const db = drizzle(fixture.client);
    await db
      .insert(agencyDomains)
      .values({ agencyId: agency.id, hostname, kind: 'custom', isPrimary: true });
    await expect(
      fixture.client`INSERT INTO agency_domains (id, agency_id, hostname, kind, is_primary) VALUES (${uuidv7()}, ${agency.id}, 'other.example.invalid', 'custom', true)`,
    ).rejects.toMatchObject({ code: '23505' });
    await expect(
      fixture.client`INSERT INTO agency_domains (id, agency_id, hostname, kind) VALUES (${uuidv7()}, ${other.id}, ${hostname}, 'custom')`,
    ).rejects.toMatchObject({ code: '23505' });
  });

  it('keeps profile IDs tied to Auth and cascades account deletion through membership', async () => {
    const agency = await insertAgency();
    const userId = uuidv7();
    await expect(
      fixture.client`INSERT INTO profiles (id, full_name) VALUES (${userId}, 'Synthetic owner')`,
    ).rejects.toMatchObject({ code: '23503' });
    await fixture.client`INSERT INTO auth.users (id) VALUES (${userId})`;
    await fixture.client`INSERT INTO profiles (id, full_name) VALUES (${userId}, 'Synthetic owner')`;
    await fixture.client`INSERT INTO agency_members (agency_id, user_id, role) VALUES (${agency.id}, ${userId}, 'owner')`;
    await expect(
      fixture.client`INSERT INTO agency_members (agency_id, user_id, role) VALUES (${agency.id}, ${userId}, 'owner')`,
    ).rejects.toMatchObject({ code: '23505' });
    await expect(
      fixture.client`UPDATE agency_members SET role = 'admin' WHERE user_id = ${userId}`,
    ).rejects.toMatchObject({ code: '23514' });
    await fixture.client`DELETE FROM auth.users WHERE id = ${userId}`;
    expect(await fixture.client`SELECT id FROM profiles WHERE id = ${userId}`).toHaveLength(0);
    expect(
      await fixture.client`SELECT user_id FROM agency_members WHERE user_id = ${userId}`,
    ).toHaveLength(0);
  });

  it.each(['anon', 'authenticated'])('denies direct data access to %s', async (role) => {
    await expect(
      fixture.client.begin(async (tx) => {
        await tx.unsafe(`SET LOCAL ROLE ${role}`);
        await tx`SELECT * FROM agencies`;
      }),
    ).rejects.toMatchObject({ code: '42501' });
  });

  it('grants app_api CRUD through layer-0 policies without superuser or RLS bypass', async () => {
    const [role] = await fixture.client<
      { rolsuper: boolean; rolbypassrls: boolean; rolcreaterole: boolean; rolcanlogin: boolean }[]
    >`
      SELECT rolsuper, rolbypassrls, rolcreaterole, rolcanlogin FROM pg_roles WHERE rolname = 'app_api'
    `;
    expect(role).toEqual({
      rolsuper: false,
      rolbypassrls: false,
      rolcreaterole: false,
      rolcanlogin: true,
    });
    const id = uuidv7();
    await fixture.client.begin(async (tx) => {
      await tx.unsafe('SET LOCAL ROLE app_api');
      await tx`INSERT INTO agencies (id, slug, name, notification_email) VALUES (${id}, ${`api-${id}`}, 'API test', 'api@example.invalid')`;
      expect(await tx`SELECT id FROM agencies WHERE id = ${id}`).toHaveLength(1);
      await tx`UPDATE agencies SET name = 'Updated' WHERE id = ${id}`;
      await tx`DELETE FROM agencies WHERE id = ${id}`;
    });
    const policies =
      await fixture.client`SELECT tablename FROM pg_policies WHERE schemaname = 'public' AND roles = ARRAY['app_api']::name[]`;
    expect(policies).toHaveLength(4);
  });

  it('can rerun the migration command without changing the applied history', async () => {
    await migrateDatabase(fixture.url);
    expect(await fixture.client`SELECT id FROM drizzle.__drizzle_migrations`).toHaveLength(1);
  });
});
