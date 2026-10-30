import { migrationsDatabaseUrl, runtimeDatabaseUrl } from './config.js';

describe('runtimeDatabaseUrl', () => {
  it('uses only the runtime connection', () => {
    const url = 'postgresql://app_api:synthetic@localhost:54322/postgres';
    expect(runtimeDatabaseUrl({ DATABASE_URL: url })).toBe(url);
  });

  it.each([undefined, '', 'https://example.invalid', 'not-a-url'])(
    'rejects an invalid runtime URL (%s) even with administrator credentials',
    (DATABASE_URL) => {
      expect(() =>
        runtimeDatabaseUrl({
          DATABASE_URL,
          MIGRATIONS_DATABASE_URL: 'postgresql://postgres:synthetic@localhost:54322/postgres',
        }),
      ).toThrow('Set DATABASE_URL');
    },
  );
});

describe('migrationsDatabaseUrl', () => {
  const session = 'postgresql://postgres:local-only@127.0.0.1:54322/postgres';

  it('uses only the dedicated migrations connection', () => {
    expect(
      migrationsDatabaseUrl({
        MIGRATIONS_DATABASE_URL: session,
        DATABASE_URL: 'postgresql://app_api:local-only@127.0.0.1:6543/postgres',
      }),
    ).toBe(session);
  });

  it.each([undefined, '', 'https://example.invalid', 'not-a-url'])(
    'rejects a missing or invalid migrations URL (%s), even with a runtime URL',
    (value) => {
      expect(() =>
        migrationsDatabaseUrl({ MIGRATIONS_DATABASE_URL: value, DATABASE_URL: session }),
      ).toThrow('Set MIGRATIONS_DATABASE_URL');
    },
  );
});
