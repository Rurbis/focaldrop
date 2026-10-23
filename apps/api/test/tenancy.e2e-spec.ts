import type { PublicTenant } from '@focaldrop/shared';
import { Controller, Get, Inject, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';

import { AppModule } from '../src/app.module.js';
import { DatabaseService } from '../src/db/database.module.js';
import { TenantContext } from '../src/tenancy/tenant.context.js';
import { TENANCY_OPTIONS, type TenancyOptions } from '../src/tenancy/tenancy.options.js';
import { TenancyRepository } from '../src/tenancy/tenancy.repository.js';
import { TenancyModule } from '../src/tenancy/tenancy.module.js';

const alpha = {
  id: '0199e0a4-7c2b-7d3e-8f41-2a6b9c0d1e2f',
  slug: 'alpha',
  name: 'Alpha',
  status: 'active',
  timezone: 'America/Mexico_City',
  locale: 'es-MX',
  currency: 'MXN',
} satisfies PublicTenant;
const beta: PublicTenant = {
  ...alpha,
  id: '0199e0a4-7c2b-7d3e-8f41-2a6b9c0d1e30',
  slug: 'beta',
  name: 'Beta',
};

// Both requests must enter the controller before either resumes asynchronous work.
let arrivals = 0;
let release: () => void;
let bothArrived: Promise<void>;

@Controller('admin')
class ContextProbeController {
  constructor(@Inject(TenantContext) private readonly context: TenantContext) {}

  @Get('__test-context')
  async read() {
    const before = this.context.get().id;
    if (++arrivals === 2) release();
    await bothArrived;
    return { before, after: this.context.get().id };
  }

  @Get()
  root() {
    return { id: this.context.get().id };
  }
}

describe('tenancy HTTP and per-request context', () => {
  let app: INestApplication<App>;
  let options: TenancyOptions;
  const lookup = vi.fn<(hostname: string) => Promise<PublicTenant | undefined>>();

  beforeEach(async () => {
    options = { environment: 'production', defaultSlug: 'alpha' };
    arrivals = 0;
    bothArrived = new Promise<void>((resolve) => {
      release = resolve;
    });
    lookup
      .mockReset()
      .mockImplementation((hostname) =>
        Promise.resolve(
          hostname === 'alpha.example.com'
            ? alpha
            : hostname === 'beta.example.com'
              ? beta
              : undefined,
        ),
      );

    const fixture = await Test.createTestingModule({
      imports: [AppModule, TenancyModule],
      controllers: [ContextProbeController],
    })
      .overrideProvider(DatabaseService)
      .useValue({})
      .overrideProvider(TENANCY_OPTIONS)
      .useValue(options)
      .overrideProvider(TenancyRepository)
      .useValue({
        findByHostname: lookup,
        findBySlug: () => Promise.resolve(alpha),
      })
      .compile();

    app = fixture.createNestApplication({ logger: false });
    await app.init();
  });

  afterEach(async () => {
    if (app) await app.close();
  });

  it('returns the validated public contract and disables shared HTTP caching', async () => {
    await request(app.getHttpServer())
      .get('/public/tenant')
      .set('X-Tenant-Host', 'ALPHA.EXAMPLE.COM:3000')
      .expect('Cache-Control', 'no-store')
      .expect(200)
      .expect(alpha);
  });

  it('does not trust the API Host header as the original tenant host', async () => {
    await request(app.getHttpServer())
      .get('/public/tenant')
      .set('Host', 'alpha.example.com')
      .expect(404);
  });

  it.each([undefined, 'unknown.example.com'])(
    'returns 404 in production for %s',
    async (hostname) => {
      const call = request(app.getHttpServer()).get('/public/tenant');
      if (hostname) call.set('X-Tenant-Host', hostname);
      await call.expect('Cache-Control', 'no-store').expect(404);
    },
  );

  it.each(['https://alpha.example.com', 'alpha.example.com,beta.example.com'])(
    'returns 400 for malformed/duplicate forwarded hosts (%s)',
    async (hostname) => {
      await request(app.getHttpServer())
        .get('/public/tenant')
        .set('X-Tenant-Host', hostname)
        .expect(400);
      expect(lookup).not.toHaveBeenCalled();
    },
  );

  it('resolves local preview hosts through the configured default', async () => {
    options.environment = 'development';
    await request(app.getHttpServer())
      .get('/public/tenant')
      .set('X-Tenant-Host', 'preview.example.com')
      .expect(200)
      .expect(alpha);
  });

  it('propagates database failure as 500 instead of returning another agency', async () => {
    options.environment = 'development';
    lookup.mockRejectedValue(new Error('Synthetic database failure'));
    await request(app.getHttpServer())
      .get('/public/tenant')
      .set('X-Tenant-Host', 'alpha.example.com')
      .expect(500);
  });

  it('isolates interleaved concurrent requests and never retains context outside requests', async () => {
    await Promise.all([
      request(app.getHttpServer())
        .get('/admin/__test-context')
        .set('X-Tenant-Host', 'alpha.example.com')
        .expect(200)
        .expect({ before: alpha.id, after: alpha.id }),
      request(app.getHttpServer())
        .get('/admin/__test-context')
        .set('X-Tenant-Host', 'beta.example.com')
        .expect(200)
        .expect({ before: beta.id, after: beta.id }),
    ]);
    expect(() => app.get(TenantContext).get()).toThrow('Tenant context is unavailable.');
  });

  it('applies the middleware to the admin root as well as nested routes', async () => {
    await request(app.getHttpServer())
      .get('/admin')
      .set('X-Tenant-Host', 'alpha.example.com')
      .expect(200)
      .expect({ id: alpha.id });
    await request(app.getHttpServer()).get('/admin').expect(404);
  });

  it('keeps health independent from tenant headers and database queries', async () => {
    await request(app.getHttpServer())
      .get('/health')
      .set('X-Tenant-Host', 'https://invalid.example.com')
      .expect(200);
    expect(lookup).not.toHaveBeenCalled();
  });
});
