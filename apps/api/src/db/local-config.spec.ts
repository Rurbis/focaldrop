import { localSeedConfig } from './local-config.js';

const input = { NODE_ENV: 'development', SUPABASE_SECRET_KEY: 'synthetic-test-key' };

describe('local seed/reset destination checks', () => {
  it('prefers the modern CLI secret when both key formats are available', () => {
    expect(
      localSeedConfig(
        { NODE_ENV: 'development' },
        { SECRET_KEY: 'modern-local-only', SERVICE_ROLE_KEY: 'legacy-local-only' },
      ).secretKey,
    ).toBe('modern-local-only');
  });

  it('keeps an explicitly configured secret ahead of CLI keys', () => {
    expect(
      localSeedConfig(input, {
        SECRET_KEY: 'modern-local-only',
        SERVICE_ROLE_KEY: 'legacy-local-only',
      }).secretKey,
    ).toBe(input.SUPABASE_SECRET_KEY);
  });

  it('uses local CLI credentials without requiring them in the app env', () => {
    expect(
      localSeedConfig(
        { NODE_ENV: 'development' },
        {
          API_URL: 'http://127.0.0.1:54321',
          DB_URL: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
          SERVICE_ROLE_KEY: 'local-only',
        },
      ),
    ).toMatchObject({ authUrl: 'http://127.0.0.1:54321', secretKey: 'local-only' });
  });

  it.each(['production', 'test', undefined])(
    'refuses NODE_ENV=%s before opening a connection',
    (NODE_ENV) => {
      expect(() => localSeedConfig({ ...input, NODE_ENV })).toThrow(/NODE_ENV=development/);
    },
  );

  it.each([
    'postgresql://postgres:password@db.example.invalid:54322/postgres',
    'postgresql://postgres:password@localhost.evil.invalid:54322/postgres',
    'postgresql://postgres:password@127.0.0.1:5432/postgres',
    'postgresql://postgres:password@127.0.0.1:54322/another_project',
    'postgresql://postgres:password@127.0.0.1:54322/postgres?host=db.example.invalid',
    'postgresql://app_api:password@127.0.0.1:54322/postgres',
  ])('refuses an unrelated migration destination: %s', (MIGRATIONS_DATABASE_URL) => {
    expect(() => localSeedConfig({ ...input, MIGRATIONS_DATABASE_URL })).toThrow();
  });

  it('does not ignore a remote runtime connection when migrations use local defaults', () => {
    expect(() =>
      localSeedConfig({
        ...input,
        DATABASE_URL: 'postgresql://app_api:password@db.example.invalid:6543/postgres',
      }),
    ).toThrow(/local Supabase/);
  });

  it.each([
    'https://project.supabase.co',
    'http://localhost:54321/auth',
    'http://localhost:54321?redirect=elsewhere',
  ])('refuses a non-local Auth destination: %s', (SUPABASE_URL) => {
    expect(() => localSeedConfig({ ...input, SUPABASE_URL })).toThrow(/local Supabase/);
  });
});
