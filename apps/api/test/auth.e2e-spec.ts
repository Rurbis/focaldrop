import type { PublicTenant } from '@focaldrop/shared';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import * as Sentry from '@sentry/nestjs';
import { exportJWK, generateKeyPair, SignJWT, UnsecuredJWT, type JWTPayload } from 'jose';
import request from 'supertest';
import type { App } from 'supertest/types.js';

import { AppModule } from '../src/app.module.js';
import { AUTH_OPTIONS, readAuthOptions } from '../src/auth/auth.options.js';
import { AuthRepository } from '../src/auth/auth.repository.js';
import { configureApp } from '../src/bootstrap.js';
import { SENTRY_DATA_COLLECTION } from '../src/constants/sentry.constants.js';
import { DatabaseService } from '../src/db/database.module.js';
import { readTenancyOptions, TENANCY_OPTIONS } from '../src/tenancy/tenancy.options.js';
import { TenancyRepository } from '../src/tenancy/tenancy.repository.js';
import { createSigningKey, signToken, startJwksServer, type SigningKey } from './helpers/jwks.js';

const userId = '3f0c8a52-6d1e-4b7a-9c2d-1e5f7a9b0c3d';
const alpha = {
  id: '0199e0a4-7c2b-7d3e-8f41-2a6b9c0d1e2f',
  slug: 'alpha',
  name: 'Alpha',
  status: 'active',
  timezone: 'America/Mexico_City',
  locale: 'es-MX',
  currency: 'MXN',
} satisfies PublicTenant;
const owner = { id: userId, fullName: 'Alpha Owner', role: 'owner' } as const;
const unauthorized = { statusCode: 401, message: 'Unauthorized' };

describe('GET /admin/me (e2e)', () => {
  const events: Sentry.ErrorEvent[] = [];
  const findMember = vi.fn<AuthRepository['findMember']>();
  let app: INestApplication<App>;
  let key: SigningKey;
  let jwks: Awaited<ReturnType<typeof startJwksServer>>;

  const claims = (): JWTPayload => ({
    sub: userId,
    aud: 'authenticated',
    iss: jwks.issuer,
    exp: Math.floor(Date.now() / 1000) + 3600,
  });
  const getMe = (token?: string) => {
    const call = request(app.getHttpServer())
      .get('/admin/me')
      .set('X-Tenant-Host', 'alpha.example.com');
    return token === undefined ? call : call.set('Authorization', `Bearer ${token}`);
  };

  beforeAll(async () => {
    key = await createSigningKey('current');
    Sentry.init({
      dsn: 'https://public@example.invalid/1',
      dataCollection: SENTRY_DATA_COLLECTION,
      tracesSampleRate: 0,
      beforeSend(event) {
        events.push(event);
        return event;
      },
      // Keep verification entirely local; no events are sent to Sentry.
      transport: () => ({
        send: () => Promise.resolve({ statusCode: 200 }),
        flush: () => Promise.resolve(true),
      }),
    });
  });

  beforeEach(async () => {
    events.length = 0;
    findMember.mockReset().mockResolvedValue(owner);
    jwks = await startJwksServer([key.jwk]);

    const fixture = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(DatabaseService)
      .useValue({})
      .overrideProvider(TENANCY_OPTIONS)
      .useValue(readTenancyOptions({ NODE_ENV: 'production', APP_ENV: 'production' }))
      .overrideProvider(TenancyRepository)
      .useValue({
        findByHostname: (hostname: string) =>
          Promise.resolve(hostname === 'alpha.example.com' ? alpha : undefined),
        findBySlug: () => Promise.resolve(undefined),
      })
      .overrideProvider(AUTH_OPTIONS)
      .useValue(readAuthOptions({ NODE_ENV: 'test', SUPABASE_JWKS_URL: jwks.url }))
      .overrideProvider(AuthRepository)
      .useValue({ findMember })
      .compile();

    const nestApp = fixture.createNestApplication<NestExpressApplication>({ logger: false });
    configureApp(nestApp);
    app = nestApp;
    await app.init();
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await app.close();
    await jwks.close();
  });

  afterAll(async () => {
    await Sentry.close(2000);
  });

  it('returns the profile, the agency of the host and the role, uncached', async () => {
    await getMe(await signToken(key, claims()))
      .expect(200)
      .expect('Cache-Control', 'no-store')
      .expect({
        profile: { id: userId, fullName: owner.fullName },
        agency: alpha,
        role: 'owner',
      });

    expect(findMember).toHaveBeenCalledExactlyOnceWith(userId);
  });

  it.each([
    ['no header', undefined],
    ['another scheme', 'Basic c29tZW9uZTpzZWNyZXQ='],
    ['a scheme without a token', 'Bearer'],
    ['two values', 'Bearer one two'],
    ['something that is not a JWT', 'Bearer not-a-jwt'],
  ])('answers 401 to %s', async (_name, header) => {
    const call = request(app.getHttpServer())
      .get('/admin/me')
      .set('X-Tenant-Host', 'alpha.example.com');
    if (header) void call.set('Authorization', header);

    await call.expect(401).expect(unauthorized);
    expect(findMember).not.toHaveBeenCalled();
  });

  it.each<[string, () => Promise<string>]>([
    [
      'an expired token',
      () => signToken(key, { ...claims(), exp: Math.floor(Date.now() / 1000) - 1 }),
    ],
    // jose only checks `exp` when the token has it.
    ['a token that never expires', () => signToken(key, { ...claims(), exp: undefined })],
    ['another audience', () => signToken(key, { ...claims(), aud: 'anon' })],
    ['another issuer', () => signToken(key, { ...claims(), iss: 'https://evil.example/auth/v1' })],
    ['a token without a user', () => signToken(key, { ...claims(), sub: undefined })],
    // Would otherwise reach Postgres as an invalid uuid and answer 500.
    ['a user ID that is not a UUID', () => signToken(key, { ...claims(), sub: 'demo' })],
    ['a key that the JWKS does not publish', () => signToken(key, claims(), 'unknown')],
    [
      'a forged signature under a published key ID',
      async () => signToken(await createSigningKey(key.kid), claims()),
    ],
    [
      'an HMAC signed with the public key',
      () =>
        new SignJWT(claims())
          .setProtectedHeader({ alg: 'HS256', kid: key.kid })
          .sign(new TextEncoder().encode(JSON.stringify(key.jwk))),
    ],
    ['an unsigned token', () => Promise.resolve(new UnsecuredJWT(claims()).encode())],
  ])('answers 401 to %s, without saying why', async (_name, sign) => {
    await getMe(await sign())
      .expect(401)
      .expect(unauthorized);

    await Sentry.flush(2000);
    expect(events).toHaveLength(0);
    expect(findMember).not.toHaveBeenCalled();
  });

  it('answers 401 to another algorithm, even under a key that the JWKS publishes', async () => {
    const { privateKey, publicKey } = await generateKeyPair('ES384', { extractable: true });
    jwks.setKeys([
      key.jwk,
      { ...(await exportJWK(publicKey)), kid: 'es384', alg: 'ES384', use: 'sig' },
    ]);
    const token = await new SignJWT(claims())
      .setProtectedHeader({ alg: 'ES384', kid: 'es384' })
      .sign(privateKey);

    await getMe(token).expect(401).expect(unauthorized);
  });

  it('answers 403 to a valid account that does not belong to the agency of the host', async () => {
    findMember.mockResolvedValue(undefined);

    await getMe(await signToken(key, claims()))
      .expect(403)
      .expect({ statusCode: 403, message: 'Forbidden' });
  });

  it('answers 404 to an unknown host before reading any key', async () => {
    await request(app.getHttpServer())
      .get('/admin/me')
      .set('X-Tenant-Host', 'missing.example.com')
      .set('Authorization', `Bearer ${await signToken(key, claims())}`)
      .expect(404);

    expect(jwks.requests()).toBe(0);
  });

  it('caches the keys between requests', async () => {
    const token = await signToken(key, claims());
    await getMe(token).expect(200);
    await getMe(token).expect(200);
    await getMe(token).expect(200);

    expect(jwks.requests()).toBe(1);
  });

  it('does not let unknown key IDs turn into requests to Supabase', async () => {
    await getMe(await signToken(key, claims(), 'unknown-1')).expect(401);
    await getMe(await signToken(key, claims(), 'unknown-2')).expect(401);
    await getMe(await signToken(key, claims(), 'unknown-3')).expect(401);

    expect(jwks.requests()).toBe(1);
  });

  it('accepts a rotated key without a restart', async () => {
    await getMe(await signToken(key, claims())).expect(200);

    const rotated = await createSigningKey('rotated');
    jwks.setKeys([key.jwk, rotated.jwk]);
    const token = await signToken(rotated, claims());
    await getMe(token).expect(401);

    // jose asks for the keys again once its 30-second cooldown is over.
    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 31_000);
    await getMe(token).expect(200);
  });

  // A 401 would send every signed-in user to the login page during an outage.
  it.each<[string, () => Promise<void> | void]>([
    ['answers with an error', () => jwks.setStatus(503)],
    ['cannot be reached', () => jwks.close()],
  ])('answers 500 and reports it when the JWKS %s', async (_name, breakJwks) => {
    await breakJwks();

    await getMe(await signToken(key, claims()))
      .expect(500)
      .expect({ statusCode: 500, message: 'Internal server error' });

    await Sentry.flush(2000);
    expect(events).toHaveLength(1);
    expect(findMember).not.toHaveBeenCalled();
  });
});
