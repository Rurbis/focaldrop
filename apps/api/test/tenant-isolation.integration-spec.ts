import { randomUUID } from 'node:crypto';

import type { INestApplication } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { eq, sql } from 'drizzle-orm';
import request from 'supertest';
import type { App } from 'supertest/types.js';

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
import { TestTenantResourcesModule } from './helpers/tenant-resources.js';

const describeWithDatabase = describe.skipIf(!process.env.TEST_DATABASE_URL && !process.env.CI);
const resourcePath = '/admin/isolation-fixture/domains';

describeWithDatabase('tenant isolation with real PostgreSQL, app_api and signed JWTs', () => {
  const alphaOwner = randomUUID();
  const alphaStaff = randomUUID();
  const betaOwner = randomUUID();
  const bothAgencies = randomUUID();
  let fixture: Awaited<ReturnType<typeof createTestDatabase>>;
  let database: ReturnType<typeof createDatabase>;
  let jwks: Awaited<ReturnType<typeof startJwksServer>>;
  let key: SigningKey;
  let alphaId: string;
  let betaId: string;
  let alphaDomain: string;
  let betaDomain: string;

  const tokenFor = (sub: string) =>
    signToken(key, {
      sub,
      aud: 'authenticated',
      iss: jwks.issuer,
      exp: Math.floor(Date.now() / 1000) + 3600,
      role: 'owner',
      app_metadata: { role: 'owner', isPlatformAdmin: true },
    });

  beforeAll(async () => {
    key = await createSigningKey('tenant-integration');
    jwks = await startJwksServer([key.jwk]);
    fixture = await createTestDatabase();
    await migrateDatabase(fixture.url);
    database = createDatabase(fixture.url, 1);
    const tenants = await database.db
      .insert(agencies)
      .values([
        { slug: 'alpha', name: 'Alpha', notificationEmail: 'alpha@example.invalid' },
        { slug: 'beta', name: 'Beta', notificationEmail: 'beta@example.invalid' },
      ])
      .returning({ id: agencies.id });
    if (!tenants[0] || !tenants[1]) throw new Error('Expected two synthetic agencies.');
    alphaId = tenants[0].id;
    betaId = tenants[1].id;
    const domains = await database.db
      .insert(agencyDomains)
      .values([
        { agencyId: alphaId, hostname: 'alpha.example.com', kind: 'custom' },
        { agencyId: betaId, hostname: 'beta.example.com', kind: 'custom' },
      ])
      .returning({ id: agencyDomains.id });
    if (!domains[0] || !domains[1]) throw new Error('Expected two synthetic domains.');
    alphaDomain = domains[0].id;
    betaDomain = domains[1].id;
    for (const id of [alphaOwner, alphaStaff, betaOwner, bothAgencies]) {
      await fixture.client`INSERT INTO auth.users (id) VALUES (${id})`;
    }
    await database.db.insert(profiles).values([
      { id: alphaOwner, fullName: 'Alpha Owner', isPlatformAdmin: true },
      { id: alphaStaff, fullName: 'Alpha Staff' },
      { id: betaOwner, fullName: 'Beta Owner' },
      { id: bothAgencies, fullName: 'Member of both agencies' },
    ]);
    await database.db.insert(agencyMembers).values([
      { agencyId: alphaId, userId: alphaOwner, role: 'owner' },
      { agencyId: alphaId, userId: alphaStaff, role: 'staff' },
      { agencyId: betaId, userId: betaOwner, role: 'owner' },
      { agencyId: alphaId, userId: bothAgencies, role: 'owner' },
      { agencyId: betaId, userId: bothAgencies, role: 'staff' },
    ]);
  });

  afterAll(async () => {
    if (database) await database.client.end();
    if (fixture) await fixture.close();
    if (jwks) await jwks.close();
  });

  async function withApp(
    check: (app: INestApplication<App>, revoke: (userId: string) => Promise<void>) => Promise<void>,
  ) {
    const rollback = new Error('Rollback tenant isolation test.');
    await expect(
      database.db.transaction(async (tx) => {
        await tx.execute(sql.raw('GRANT app_api TO CURRENT_USER WITH INHERIT FALSE, SET TRUE'));
        await tx.execute(sql.raw('SET LOCAL ROLE app_api'));
        const module = await Test.createTestingModule({
          imports: [AppModule, TestTenantResourcesModule],
        })
          .overrideProvider(DatabaseService)
          .useValue({ db: tx })
          .overrideProvider(TENANCY_OPTIONS)
          .useValue(readTenancyOptions({ NODE_ENV: 'production', APP_ENV: 'production' }))
          .overrideProvider(AUTH_OPTIONS)
          .useValue(readAuthOptions({ NODE_ENV: 'test', SUPABASE_JWKS_URL: jwks.url }))
          .compile();
        const app = module.createNestApplication<NestExpressApplication>({ logger: false });
        try {
          configureApp(app);
          await app.init();
          await check(app, async (userId) => {
            await tx.delete(agencyMembers).where(eq(agencyMembers.userId, userId));
          });
        } finally {
          await app.close();
        }
        throw rollback;
      }),
    ).rejects.toBe(rollback);
  }

  async function call(
    app: INestApplication<App>,
    method: 'get' | 'post' | 'patch' | 'delete',
    host: string,
    userId: string,
    path = resourcePath,
    body?: Record<string, unknown>,
  ) {
    const pending = request(app.getHttpServer())
      [method](path)
      .set('X-Tenant-Host', host)
      .set('Authorization', `Bearer ${await tokenFor(userId)}`);
    return body ? pending.send(body) : pending;
  }

  it('lists and reads only the agency of the request, for owners and staff', async () => {
    await withApp(async (app) => {
      for (const user of [alphaOwner, alphaStaff]) {
        const list = await call(app, 'get', 'alpha.example.com', user);
        expect(list.status).toBe(200);
        expect(list.body).toEqual([
          { id: alphaDomain, agencyId: alphaId, hostname: 'alpha.example.com' },
        ]);
      }
      const beta = await call(
        app,
        'get',
        'beta.example.com',
        betaOwner,
        `${resourcePath}/${betaDomain}`,
      );
      expect(beta.status).toBe(200);
      expect(beta.body).toMatchObject({ id: betaDomain, agencyId: betaId });
    });
  });

  it.each(['get', 'patch', 'delete'] as const)(
    'returns the same 404 for a foreign or absent resource on %s, without modifying it',
    async (method) => {
      await withApp(async (app) => {
        const body = { hostname: 'forged.example.com', agencyId: betaId, role: 'owner' };
        const foreign = await call(
          app,
          method,
          'alpha.example.com',
          alphaOwner,
          `${resourcePath}/${betaDomain}`,
          body,
        );
        const absent = await call(
          app,
          method,
          'alpha.example.com',
          alphaOwner,
          `${resourcePath}/${randomUUID()}`,
          body,
        );
        expect(foreign.status).toBe(404);
        expect(foreign.body).toEqual(absent.body);
        const intact = await call(
          app,
          'get',
          'beta.example.com',
          betaOwner,
          `${resourcePath}/${betaDomain}`,
        );
        expect(intact.status).toBe(200);
        expect(intact.body).toMatchObject({ hostname: 'beta.example.com', agencyId: betaId });
      });
    },
  );

  it('hides resources when the host is switched to the other agency, even for a platform admin', async () => {
    await withApp(async (app) => {
      // alphaOwner has is_platform_admin=true in the real profiles table.
      const hidden = await call(
        app,
        'get',
        'beta.example.com',
        alphaOwner,
        `${resourcePath}/${betaDomain}`,
      );
      expect(hidden.status).toBe(404);
      const me = await call(app, 'get', 'beta.example.com', alphaOwner, '/admin/me');
      expect(me.status).toBe(403);
    });
  });

  it('pins inserts and updates to the context despite an agencyId in the body', async () => {
    await withApp(async (app) => {
      const created = await call(app, 'post', 'alpha.example.com', alphaOwner, resourcePath, {
        hostname: 'new-alpha.example.com',
        agencyId: betaId,
      });
      expect(created.status).toBe(201);
      expect(created.body).toMatchObject({ hostname: 'new-alpha.example.com', agencyId: alphaId });
      const updated = await call(
        app,
        'patch',
        'alpha.example.com',
        alphaOwner,
        `${resourcePath}/${alphaDomain}`,
        {
          hostname: 'updated-alpha.example.com',
          agencyId: betaId,
        },
      );
      expect(updated.status).toBe(200);
      expect(updated.body).toMatchObject({
        id: alphaDomain,
        hostname: 'updated-alpha.example.com',
        agencyId: alphaId,
      });
      const deleted = await call(
        app,
        'delete',
        'alpha.example.com',
        alphaOwner,
        `${resourcePath}/${alphaDomain}`,
      );
      expect(deleted.status).toBe(200);
      expect(deleted.body).toMatchObject({ id: alphaDomain, agencyId: alphaId });
    });
  });

  it('reads the role in the selected agency instead of a forged JWT/body role', async () => {
    await withApp(async (app) => {
      const staff = await call(
        app,
        'patch',
        'alpha.example.com',
        alphaStaff,
        `${resourcePath}/${alphaDomain}`,
        {
          hostname: 'staff-write.example.com',
          role: 'owner',
          agencyId: alphaId,
        },
      );
      expect(staff.status).toBe(403);
      const permitted = await call(
        app,
        'patch',
        'alpha.example.com',
        bothAgencies,
        `${resourcePath}/${alphaDomain}`,
        {
          hostname: 'owner-write.example.com',
        },
      );
      expect(permitted.status).toBe(200);
      const denied = await call(
        app,
        'patch',
        'beta.example.com',
        bothAgencies,
        `${resourcePath}/${betaDomain}`,
        {
          hostname: 'staff-write.example.com',
        },
      );
      expect(denied.status).toBe(403);
    });
  });

  it('keeps both tenant contexts separate under concurrent requests', async () => {
    await withApp(async (app) => {
      const requests = Array.from({ length: 12 }, async (_, i) => {
        const isAlpha = i % 2 === 0;
        const response = await call(
          app,
          'get',
          isAlpha ? 'alpha.example.com' : 'beta.example.com',
          bothAgencies,
          '/admin/me',
        );
        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({
          agency: { id: isAlpha ? alphaId : betaId },
          role: isAlpha ? 'owner' : 'staff',
        });
      });
      await Promise.all(requests);
    });
  });

  it('checks a revoked membership again on the next request', async () => {
    await withApp(async (app, revoke) => {
      expect(
        (await call(app, 'get', 'alpha.example.com', alphaOwner, `${resourcePath}/${alphaDomain}`))
          .status,
      ).toBe(200);
      await revoke(alphaOwner);
      expect(
        (await call(app, 'get', 'alpha.example.com', alphaOwner, `${resourcePath}/${alphaDomain}`))
          .status,
      ).toBe(404);
      expect((await call(app, 'get', 'alpha.example.com', alphaOwner, '/admin/me')).status).toBe(
        403,
      );
    });
  });
});
