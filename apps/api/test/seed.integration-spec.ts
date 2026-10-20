import { eq } from 'drizzle-orm';
import { v7 as uuidv7 } from 'uuid';

import { createDatabase } from '../src/db/database.js';
import { LOCAL_DEMO } from '../src/db/demo.js';
import { migrateDatabase } from '../src/db/migrate.js';
import { agencies, agencyDomains, agencyMembers, profiles } from '../src/db/schema/index.js';
import { seedDemo } from '../src/db/seed.js';
import { createTestDatabase } from './helpers/database.js';

describe('idempotent local demo data', () => {
  let fixture: Awaited<ReturnType<typeof createTestDatabase>>;
  let database: ReturnType<typeof createDatabase>;
  const userId = uuidv7();
  const auth = {
    async ensureOwner() {
      await fixture.client`INSERT INTO auth.users (id) VALUES (${userId}) ON CONFLICT DO NOTHING`;
      return { id: userId };
    },
  };

  beforeAll(async () => {
    fixture = await createTestDatabase();
    await migrateDatabase(fixture.url);
    database = createDatabase(fixture.url, 2);
  });
  afterAll(async () => {
    if (database) await database.client.end();
    if (fixture) await fixture.close();
  });

  it('creates one agency, domain, non-admin profile and owner membership across repeated/concurrent runs', async () => {
    const first = await seedDemo(database.db, auth);
    const results = await Promise.all([seedDemo(database.db, auth), seedDemo(database.db, auth)]);
    expect(results).toEqual([first, first]);
    expect(await database.db.select().from(agencies)).toHaveLength(1);
    expect(await database.db.select().from(agencyDomains)).toHaveLength(1);
    expect(await database.db.select().from(profiles)).toEqual([
      expect.objectContaining({ id: userId, isPlatformAdmin: false }),
    ]);
    expect(await database.db.select().from(agencyMembers)).toEqual([
      expect.objectContaining({ agencyId: first.agencyId, userId, role: 'owner' }),
    ]);
  });

  it('preserves local edits to demo agency data when run again', async () => {
    await database.db
      .update(agencies)
      .set({ name: 'Locally edited demo', notificationPreferences: { delivered: false } })
      .where(eq(agencies.slug, LOCAL_DEMO.slug));
    await seedDemo(database.db, auth);
    const [agency] = await database.db
      .select()
      .from(agencies)
      .where(eq(agencies.slug, LOCAL_DEMO.slug));
    expect(agency).toMatchObject({
      name: 'Locally edited demo',
      notificationPreferences: { delivered: false },
    });
  });

  it('refuses to take localhost away from another agency and rolls back its database changes', async () => {
    await fixture.client`TRUNCATE agency_members, agency_domains, profiles, agencies`;
    const [other] = await database.db
      .insert(agencies)
      .values({
        slug: 'other',
        name: 'Other synthetic agency',
        notificationEmail: 'other@example.invalid',
      })
      .returning();
    if (!other) throw new Error('Missing agency.');
    await database.db
      .insert(agencyDomains)
      .values({ agencyId: other.id, hostname: 'localhost', kind: 'custom', isPrimary: true });
    await expect(seedDemo(database.db, auth)).rejects.toThrow(/already assigned/);
    expect(await database.db.select().from(agencies)).toHaveLength(1);
    expect(await database.db.select().from(agencyMembers)).toHaveLength(0);
  });
});
