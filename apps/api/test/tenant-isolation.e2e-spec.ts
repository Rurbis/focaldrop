import type { PublicTenant } from '@focaldrop/shared';
import type { INestApplication } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';

import { AppModule } from '../src/app.module.js';
import { AUTH_OPTIONS, readAuthOptions } from '../src/auth/auth.options.js';
import { AuthRepository, type Member } from '../src/auth/auth.repository.js';
import { configureApp } from '../src/bootstrap.js';
import { DatabaseService } from '../src/db/database.module.js';
import { TenantContext } from '../src/tenancy/tenant.context.js';
import { readTenancyOptions, TENANCY_OPTIONS } from '../src/tenancy/tenancy.options.js';
import { TenancyRepository } from '../src/tenancy/tenancy.repository.js';
import { createSigningKey, signToken, startJwksServer, type SigningKey } from './helpers/jwks.js';
import { TestDomainsRepository, TestTenantResourcesModule } from './helpers/tenant-resources.js';

const ownerId = '3f0c8a52-6d1e-4b7a-9c2d-1e5f7a9b0c3d';
const staffId = '1199e0a4-7c2b-4d3e-8f41-2a6b9c0d1e2f';
const outsiderId = '2199e0a4-7c2b-4d3e-8f41-2a6b9c0d1e2f';
const alpha = {
  id: '0199e0a4-7c2b-7d3e-8f41-2a6b9c0d1e2f',
  slug: 'alpha',
  name: 'Alpha',
  status: 'active',
  timezone: 'America/Mexico_City',
  locale: 'es-MX',
  currency: 'MXN',
} satisfies PublicTenant;
const beta: PublicTenant = { ...alpha, id: '0199e0a4-7c2b-7d3e-8f41-2a6b9c0d1e30', slug: 'beta' };
const base = '/admin/isolation-fixture';

describe('tenant and role guards over HTTP', () => {
  let app: INestApplication<App>;
  let context: TenantContext;
  let key: SigningKey;
  let jwks: Awaited<ReturnType<typeof startJwksServer>>;
  const findMember = vi.fn<AuthRepository['findMember']>();
  const find = vi.fn().mockResolvedValue({ id: 'resource', hostname: 'private.example.com' });

  const tokenFor = (sub: string) =>
    signToken(key, {
      sub,
      aud: 'authenticated',
      iss: jwks.issuer,
      exp: Math.floor(Date.now() / 1000) + 3600,
      // These forged privileges must never override the database membership.
      role: 'owner',
      app_metadata: { role: 'owner', isPlatformAdmin: true },
    });
  const get = async (path: string, userId = ownerId, host = 'alpha.example.com') =>
    request(app.getHttpServer())
      .get(base + path)
      .set('X-Tenant-Host', host)
      .set('Authorization', `Bearer ${await tokenFor(userId)}`);

  beforeAll(async () => {
    key = await createSigningKey('isolation');
    jwks = await startJwksServer([key.jwk]);
    const fixture = await Test.createTestingModule({
      imports: [AppModule, TestTenantResourcesModule],
    })
      .overrideProvider(DatabaseService)
      .useValue({})
      .overrideProvider(TENANCY_OPTIONS)
      .useValue(readTenancyOptions({ NODE_ENV: 'production', APP_ENV: 'production' }))
      .overrideProvider(TenancyRepository)
      .useValue({
        findByHostname: (host: string) =>
          Promise.resolve(
            host === 'alpha.example.com' ? alpha : host === 'beta.example.com' ? beta : undefined,
          ),
        findBySlug: () => Promise.resolve(undefined),
      })
      .overrideProvider(AUTH_OPTIONS)
      .useValue(readAuthOptions({ NODE_ENV: 'test', SUPABASE_JWKS_URL: jwks.url }))
      .overrideProvider(AuthRepository)
      .useValue({ findMember })
      .overrideProvider(TestDomainsRepository)
      .useValue({ find })
      .compile();
    context = fixture.get(TenantContext);
    const nestApp = fixture.createNestApplication<NestExpressApplication>({ logger: false });
    configureApp(nestApp);
    app = nestApp;
    await app.init();
  });

  beforeEach(() => {
    find.mockClear();
    findMember.mockReset().mockImplementation((id) => {
      let role: Member['role'] | undefined;
      if (id === ownerId) role = context.get().id === alpha.id ? 'owner' : 'staff';
      if (id === staffId && context.get().id === alpha.id) role = 'staff';
      return Promise.resolve(role ? { id, role, fullName: 'Synthetic member' } : undefined);
    });
  });

  afterAll(async () => {
    if (app) await app.close();
    if (jwks) await jwks.close();
  });

  it.each([ownerId, staffId])('lets a member read a protected resource: %s', async (userId) => {
    expect((await get('/domains/resource', userId)).status).toBe(200);
    expect(findMember).toHaveBeenCalledExactlyOnceWith(userId);
    expect(find).toHaveBeenCalledExactlyOnceWith('resource');
  });

  it('hides private resources from a non-member before calling the resource repository', async () => {
    const response = await get('/domains/resource', outsiderId);
    expect(response.status).toBe(404);
    expect(find).not.toHaveBeenCalled();
  });

  it('keeps the explicit 403 contract of /admin/me', async () => {
    const response = await request(app.getHttpServer())
      .get('/admin/me')
      .set('X-Tenant-Host', 'alpha.example.com')
      .set('Authorization', `Bearer ${await tokenFor(outsiderId)}`);
    expect(response.status).toBe(403);
  });

  it.each(['post', 'patch', 'delete'] as const)(
    'rejects a staff %s despite elevated roles in the JWT and body',
    async (method) => {
      const response = await request(app.getHttpServer())
        [method](base + '/domains' + (method === 'post' ? '' : '/resource'))
        .set('X-Tenant-Host', 'alpha.example.com')
        .set('Authorization', `Bearer ${await tokenFor(staffId)}`)
        .send({ role: 'owner', agencyId: beta.id, hostname: 'forged.example.com' });
      expect(response.status).toBe(403);
    },
  );

  it('uses the role of the current agency for a user who belongs to two agencies', async () => {
    expect((await get('/domains/resource', ownerId, 'beta.example.com')).status).toBe(200);
    const response = await request(app.getHttpServer())
      .delete(base + '/domains/resource')
      .set('X-Tenant-Host', 'beta.example.com')
      .set('Authorization', `Bearer ${await tokenFor(ownerId)}`);
    expect(response.status).toBe(403);
  });

  it('does not query memberships when authentication fails', async () => {
    const response = await request(app.getHttpServer())
      .get(base + '/domains/resource')
      .set('X-Tenant-Host', 'alpha.example.com');
    expect(response.status).toBe(401);
    expect(findMember).not.toHaveBeenCalled();
    expect(find).not.toHaveBeenCalled();
  });

  it('passes the token subject to CurrentUserId', async () => {
    expect((await get('/guard-order/user')).body).toEqual({ userId: ownerId });
  });

  it.each(['missing-user', 'missing-member'])(
    'fails closed when a controller omits a required guard: %s',
    async (path) => {
      const response = await get('/guard-order/' + path);
      expect(response.status).toBe(500);
      expect(findMember).not.toHaveBeenCalled();
      expect(find).not.toHaveBeenCalled();
    },
  );
});
