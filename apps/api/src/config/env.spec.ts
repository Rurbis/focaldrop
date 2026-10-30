import { validateEnv } from './env.js';

describe('validateEnv', () => {
  it('converts PORT from a string to a number', () => {
    const env = validateEnv({
      NODE_ENV: 'development',
      PORT: '4000',
    });

    expect(env).toEqual({
      NODE_ENV: 'development',
      APP_ENV: 'development',
      PORT: 4000,
    });
  });

  it('defaults to port 3001 when PORT is missing', () => {
    const env = validateEnv({
      NODE_ENV: 'development',
    });

    expect(env.PORT).toBe(3001);
  });

  it('rejects a missing NODE_ENV', () => {
    expect(() => validateEnv({ PORT: '3001' })).toThrow(/NODE_ENV/);
  });

  it('rejects an invalid NODE_ENV', () => {
    expect(() =>
      validateEnv({
        NODE_ENV: 'developmnt',
        PORT: '3001',
      }),
    ).toThrow(/NODE_ENV/);
  });

  it.each(['papas', '0', '65536', '3001.5', ''])('rejects invalid PORT "%s"', (PORT) => {
    expect(() =>
      validateEnv({
        NODE_ENV: 'development',
        PORT,
      }),
    ).toThrow(/PORT/);
  });

  it('allows empty Sentry settings for local development', () => {
    const env = validateEnv({
      NODE_ENV: 'development',
      SENTRY_DSN: '',
      SENTRY_ENVIRONMENT: '',
    });

    expect(env.SENTRY_DSN).toBeUndefined();
    expect(env.SENTRY_ENVIRONMENT).toBeUndefined();
  });

  it('accepts a Sentry DSN and a separate deployment environment', () => {
    const env = validateEnv({
      NODE_ENV: 'production',
      SENTRY_DSN: 'https://public@example.invalid/1',
      SENTRY_ENVIRONMENT: 'staging',
    });

    expect(env.SENTRY_DSN).toBe('https://public@example.invalid/1');
    expect(env.SENTRY_ENVIRONMENT).toBe('staging');
  });

  it.each(['test', 'production'])('defaults APP_ENV to NODE_ENV=%s', (NODE_ENV) => {
    expect(validateEnv({ NODE_ENV }).APP_ENV).toBe(NODE_ENV);
  });

  it('allows a staging fallback with the production Node runtime', () => {
    const env = validateEnv({
      NODE_ENV: 'production',
      APP_ENV: 'staging',
      DEFAULT_AGENCY_SLUG: 'demo',
    });

    expect(env.APP_ENV).toBe('staging');
    expect(env.DEFAULT_AGENCY_SLUG).toBe('demo');
  });

  it.each([
    { NODE_ENV: 'production' },
    { NODE_ENV: 'production', APP_ENV: 'production' },
    { NODE_ENV: 'development', APP_ENV: 'production' },
    { NODE_ENV: 'production', SENTRY_ENVIRONMENT: 'staging' },
  ])('rejects a production default agency before startup (%j)', (input) => {
    expect(() => validateEnv({ ...input, DEFAULT_AGENCY_SLUG: 'demo' })).toThrow(
      /DEFAULT_AGENCY_SLUG: Must be unset when APP_ENV is production/,
    );
  });

  it.each([undefined, ''])(
    'allows production without a default agency (%s)',
    (DEFAULT_AGENCY_SLUG) => {
      expect(
        validateEnv({ NODE_ENV: 'production', APP_ENV: 'production', DEFAULT_AGENCY_SLUG })
          .DEFAULT_AGENCY_SLUG,
      ).toBeUndefined();
    },
  );

  it.each(['preview', 'stagin', '', 'Production'])('rejects invalid APP_ENV "%s"', (APP_ENV) => {
    expect(() => validateEnv({ NODE_ENV: 'production', APP_ENV })).toThrow(/APP_ENV/);
  });

  it.each(['not-a-url', 'ftp://public@example.invalid/1', 'https://example.invalid/1'])(
    'rejects an invalid Sentry DSN: %s',
    (SENTRY_DSN) => {
      expect(() => validateEnv({ NODE_ENV: 'production', SENTRY_DSN })).toThrow(/SENTRY_DSN/);
    },
  );
});
