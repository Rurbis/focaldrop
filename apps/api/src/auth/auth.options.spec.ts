import { readAuthOptions } from './auth.options.js';

const stagingJwksUrl = 'https://abc.supabase.co/auth/v1/.well-known/jwks.json';

describe('readAuthOptions', () => {
  it.each(['development', 'test'] as const)(
    'uses the local Supabase CLI when %s has no JWKS URL',
    (NODE_ENV) => {
      expect(readAuthOptions({ NODE_ENV })).toEqual({
        jwksUrl: 'http://127.0.0.1:54321/auth/v1/.well-known/jwks.json',
        issuer: 'http://127.0.0.1:54321/auth/v1',
        audience: 'authenticated',
      });
    },
  );

  it('derives the issuer from the JWKS URL, because Supabase serves both from Auth', () => {
    expect(
      readAuthOptions({
        NODE_ENV: 'production',
        APP_ENV: 'staging',
        SUPABASE_JWKS_URL: stagingJwksUrl,
        SUPABASE_JWT_AUDIENCE: 'custom-audience',
      }),
    ).toEqual({
      jwksUrl: stagingJwksUrl,
      issuer: 'https://abc.supabase.co/auth/v1',
      audience: 'custom-audience',
    });
  });

  it.each(['staging', 'production'] as const)('refuses to run %s without keys', (APP_ENV) => {
    expect(() => readAuthOptions({ NODE_ENV: 'production', APP_ENV })).toThrow(
      /Invalid environment configuration: SUPABASE_JWKS_URL/,
    );
    expect(() =>
      readAuthOptions({ NODE_ENV: 'production', APP_ENV, SUPABASE_JWKS_URL: '' }),
    ).toThrow(/SUPABASE_JWKS_URL/);
  });
});
