import { PublicTenantSchema, type PublicTenant } from '@focaldrop/shared';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { sql } from 'drizzle-orm';
import request from 'supertest';
import type { App } from 'supertest/types.js';

import { AppModule } from '../src/app.module.js';
import { createDatabase } from '../src/db/database.js';
import { DatabaseService } from '../src/db/database.module.js';
import { migrateDatabase } from '../src/db/migrate.js';
import { agencies, agencyDomains } from '../src/db/schema/index.js';
import { TENANCY_OPTIONS } from '../src/tenancy/tenancy.options.js';
import { TenancyRepository } from '../src/tenancy/tenancy.repository.js';
import { createTestDatabase } from './helpers/database.js';

const describeWithDatabase = describe.skipIf(!process.env.TEST_DATABASE_URL && !process.env.CI);

describeWithDatabase('tenant resolution against real PostgreSQL', () => {
  let fixture: Awaited<ReturnType<typeof createTestDatabase>>;
  let database: ReturnType<typeof createDatabase>;
  let alpha: PublicTenant;
  let beta: PublicTenant;

  beforeAll(async () => {
    fixture = await createTestDatabase();
    await migrateDatabase(fixture.url);
    database = createDatabase(fixture.url, 1);
    const rows = await database.db
      .insert(agencies)
      .values([
        { slug: 'alpha', name: 'Alpha', notificationEmail: 'private-alpha@example.invalid' },
        { slug: 'beta', name: 'Beta', notificationEmail: 'private-beta@example.invalid' },
      ])
      .returning();
    if (!rows[0] || !rows[1]) throw new Error('Expected two synthetic agencies.');
    alpha = PublicTenantSchema.parse(rows[0]);
    beta = PublicTenantSchema.parse(rows[1]);
    await database.db.insert(agencyDomains).values([
      { agencyId: alpha.id, hostname: 'alpha.example.com', kind: 'custom', isPrimary: true },
      { agencyId: alpha.id, hostname: 'alias.example.com', kind: 'custom' },
      { agencyId: beta.id, hostname: 'beta.example.com', kind: 'platform_subdomain' },
    ]);
  });

  afterAll(async () => {
    if (database) await database.client.end();
    if (fixture) await fixture.close();
  });

  it('resolves domains and aliases with app_api permissions, without exposing private settings', async () => {
    const rollback = new Error('Roll back temporary role membership.');
    await expect(
      database.db.transaction(async (tx) => {
        await tx.execute(sql.raw('GRANT app_api TO CURRENT_USER WITH INHERIT FALSE, SET TRUE'));
        await tx.execute(sql.raw('SET LOCAL ROLE app_api'));
        const module = await Test.createTestingModule({
          providers: [TenancyRepository, { provide: DatabaseService, useValue: { db: tx } }],
        }).compile();
        try {
          const repository = module.get(TenancyRepository);
          expect(await repository.findByHostname('alpha.example.com')).toEqual(alpha);
          expect(await repository.findByHostname('alias.example.com')).toEqual(alpha);
          expect(await repository.findByHostname('beta.example.com')).toEqual(beta);
          expect(await repository.findByHostname('missing.example.com')).toBeUndefined();
          expect(await repository.findBySlug('alpha')).toEqual(alpha);
          expect(await repository.findBySlug('missing')).toBeUndefined();
          // Parameterized lookups cannot be turned into a predicate by their input.
          expect(await repository.findByHostname("' OR true --")).toBeUndefined();
        } finally {
          await module.close();
        }
        throw rollback;
      }),
    ).rejects.toBe(rollback);
  });

  it('serves the real HTTP endpoint using the runtime role and the migrated schema', async () => {
    const rollback = new Error('Roll back HTTP test role membership.');
    await expect(
      database.db.transaction(async (tx) => {
        await tx.execute(sql.raw('GRANT app_api TO CURRENT_USER WITH INHERIT FALSE, SET TRUE'));
        await tx.execute(sql.raw('SET LOCAL ROLE app_api'));
        const module = await Test.createTestingModule({ imports: [AppModule] })
          .overrideProvider(DatabaseService)
          .useValue({ db: tx })
          .overrideProvider(TENANCY_OPTIONS)
          .useValue({ environment: 'production' })
          .compile();
        const app: INestApplication<App> = module.createNestApplication({ logger: false });
        try {
          await app.init();
          await request(app.getHttpServer())
            .get('/public/tenant')
            .set('X-Tenant-Host', 'ALPHA.EXAMPLE.COM:3000')
            .expect(200)
            .expect(alpha);
          await request(app.getHttpServer())
            .get('/public/tenant')
            .set('X-Tenant-Host', 'beta.example.com')
            .expect(200)
            .expect(beta);
          await request(app.getHttpServer())
            .get('/public/tenant')
            .set('X-Tenant-Host', 'missing.example.com')
            .expect(404);
        } finally {
          await app.close();
        }
        throw rollback;
      }),
    ).rejects.toBe(rollback);
  });
});
