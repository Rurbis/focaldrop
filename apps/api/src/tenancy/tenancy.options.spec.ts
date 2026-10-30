import { readTenancyOptions } from './tenancy.options.js';

describe('tenancy options', () => {
  it.each(['development', 'test'])('allows fallback in %s', (NODE_ENV) => {
    expect(readTenancyOptions({ NODE_ENV, DEFAULT_AGENCY_SLUG: 'demo' })).toEqual({
      environment: NODE_ENV,
      defaultSlug: 'demo',
    });
  });

  it.each(['development', 'test', 'staging'])(
    'allows fallback in APP_ENV=%s with NODE_ENV=production',
    (APP_ENV) => {
      expect(
        readTenancyOptions({ NODE_ENV: 'production', APP_ENV, DEFAULT_AGENCY_SLUG: 'demo' }),
      ).toEqual({ environment: APP_ENV, defaultSlug: 'demo' });
    },
  );

  it('rejects production fallback even when Sentry is labeled staging', () => {
    expect(() =>
      readTenancyOptions({
        NODE_ENV: 'production',
        SENTRY_ENVIRONMENT: 'staging',
        DEFAULT_AGENCY_SLUG: 'demo',
      }),
    ).toThrow(/DEFAULT_AGENCY_SLUG/);
  });

  it('keeps an unspecified deployment environment strict with a production runtime', () => {
    expect(
      readTenancyOptions({
        NODE_ENV: 'production',
        SENTRY_ENVIRONMENT: 'staging',
      }),
    ).toEqual({ environment: 'production', defaultSlug: undefined });
  });

  it.each([undefined, ''])('allows no default agency (%s)', (DEFAULT_AGENCY_SLUG) => {
    expect(
      readTenancyOptions({ NODE_ENV: 'development', DEFAULT_AGENCY_SLUG }).defaultSlug,
    ).toBeUndefined();
  });

  it.each([
    {},
    { NODE_ENV: 'staging' },
    { NODE_ENV: 'production', APP_ENV: 'preview' },
    { NODE_ENV: 'development', DEFAULT_AGENCY_SLUG: 'Invalid Slug' },
  ])('rejects invalid configuration without printing its values', (input) => {
    expect(() => readTenancyOptions(input)).toThrow(/Invalid environment configuration/);
  });
});
