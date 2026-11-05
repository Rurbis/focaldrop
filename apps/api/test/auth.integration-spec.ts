import { randomUUID } from 'node:crypto';

import { PublicTenantSchema, type PublicTenant } from '@focaldrop/shared';
import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { sql } from 'drizzle-orm';
import request from 'supertest';

import { AppModule } from '../src/app.module.js';
import { AUTH_OPTIONS, readAuthOptions } from '../src/auth/auth.options.js';
import { configureApp } from '../src/bootstrap.js';
import { createDatabase } from '../src/db/database.js';
import { DatabaseService } from '../src/db/database.module.js';
import { migrateDatabase } from '../src/db/migrate.js';
import { agencies, agencyDomains, agencyMembers, profiles } from '../src/db/schema/index.js';
import { readTenancyOptions, TENANCY_OPTIONS } from '../src/tenancy/tenancy.options.js';
import { createTestDatabase } from './helpers/database.js';
import { createSigningKey, signToken, startJwksServer, type SigningKey } from './helpers/jwks.js';

const describeWithDatabase = describe.skipIf(!process.env.TEST_DATABASE_URL && !process.env.CI);

describeWithDatabase('GET /admin/me against real PostgreSQL', () => {
  const alphaOwner = randomUUID();
  const alphaStaff = randomUUID();
  const betaOwner = randomUUID();
  const withoutProfile = randomUUID();
  let fixture: Awaited<ReturnType<typeof createTestDatabase>>;
  let database: ReturnType<typeof createDatabase>;
  let jwks: Awaited<ReturnType<typeof startJwksServer>>;
  let key: SigningKey;
  let alpha: PublicTenant;
  let beta: PublicTenant;

  const tokenFor = (sub: string) =>
    signToken(key, {
      sub,
      aud: 'authenticated',
      iss: jwks.issuer,
      exp: Math.floor(Date.now() / 1000) + 3600,
    });

  beforeAll(async () => {
    key = await createSigningKey('current');
    jwks = await startJwksServer([key.jwk]);
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
      { agencyId: beta.id, hostname: 'beta.example.com', kind: 'custom', isPrimary: true },
    ]);

    for (const id of [alphaOwner, alphaStaff, betaOwner, withoutProfile]) {
      await fixture.client`INSERT INTO auth.users (id) VALUES (${id})`;
    }
    await database.db.insert(profiles).values([
      { id: alphaOwner, fullName: 'Alpha Owner', isPlatformAdmin: true },
      { id: alphaStaff, fullName: 'Alpha Staff' },
      { id: betaOwner, fullName: 'Beta Owner' },
    ]);
    await database.db.insert(agencyMembers).values([
      { agencyId: alpha.id, userId: alphaOwner, role: 'owner' },
      { agencyId: alpha.id, userId: alphaStaff, role: 'staff' },
      { agencyId: beta.id, userId: betaOwner, role: 'owner' },
    ]);
  });

  afterAll(async () => {
    if (database) await database.client.end();
    if (fixture) await fixture.close();
    if (jwks) await jwks.close();
  });

  it('answers per membership in the agency of the host, with app_api permissions', async () => {
    const rollback = new Error('Roll back HTTP test role membership.');
    await expect(
      database.db.transaction(async (tx) => {
        await tx.execute(sql.raw('GRANT app_api TO CURRENT_USER WITH INHERIT FALSE, SET TRUE'));
        await tx.execute(sql.raw('SET LOCAL ROLE app_api'));
        const module = await Test.createTestingModule({ imports: [AppModule] })
          .overrideProvider(DatabaseService)
          .useValue({ db: tx })
          .overrideProvider(TENANCY_OPTIONS)
          .useValue(readTenancyOptions({ NODE_ENV: 'production', APP_ENV: 'production' }))
          .overrideProvider(AUTH_OPTIONS)
          .useValue(readAuthOptions({ NODE_ENV: 'test', SUPABASE_JWKS_URL: jwks.url }))
          .compile();
        const app = module.createNestApplication<NestExpressApplication>({ logger: false });
        const getMe = async (host: string, userId: string) =>
          request(app.getHttpServer())
            .get('/admin/me')
            .set('X-Tenant-Host', host)
            .set('Authorization', `Bearer ${await tokenFor(userId)}`);
        try {
          configureApp(app);
          await app.init();

          // The exact body also proves that isPlatformAdmin and the notification
          // email stay inside the API.
          const owner = await getMe('alpha.example.com', alphaOwner);
          expect(owner.status).toBe(200);
          expect(owner.body).toEqual({
            profile: { id: alphaOwner, fullName: 'Alpha Owner' },
            agency: alpha,
            role: 'owner',
          });

          const staff = await getMe('alpha.example.com', alphaStaff);
          expect(staff.status).toBe(200);
          expect(staff.body).toMatchObject({ role: 'staff', agency: { id: alpha.id } });

          const otherAgency = await getMe('beta.example.com', betaOwner);
          expect(otherAgency.status).toBe(200);
          expect(otherAgency.body).toMatchObject({ role: 'owner', agency: { id: beta.id } });

          expect((await getMe('alpha.example.com', betaOwner)).status).toBe(403);
          expect((await getMe('beta.example.com', alphaOwner)).status).toBe(403);
          expect((await getMe('alpha.example.com', withoutProfile)).status).toBe(403);
        } finally {
          await app.close();
        }
        throw rollback;
      }),
    ).rejects.toBe(rollback);
  });
});
