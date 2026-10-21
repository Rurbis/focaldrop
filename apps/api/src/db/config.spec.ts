import { migrationsDatabaseUrl } from './config.js';

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
