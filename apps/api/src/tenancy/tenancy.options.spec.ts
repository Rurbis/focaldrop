import { readTenancyOptions } from './tenancy.options.js';

describe('tenancy options', () => {
  it.each(['development', 'test'])('allows fallback in %s', (NODE_ENV) => {
    expect(readTenancyOptions({ NODE_ENV, DEFAULT_AGENCY_SLUG: 'demo' })).toEqual({
      environment: NODE_ENV,
      defaultSlug: 'demo',
    });
  });

  it('ignores fallback in production, including staging builds', () => {
    expect(
      readTenancyOptions({
        NODE_ENV: 'production',
        SENTRY_ENVIRONMENT: 'staging',
        DEFAULT_AGENCY_SLUG: 'demo',
      }).defaultSlug,
    ).toBeUndefined();
  });

  it.each([undefined, ''])('allows no default agency (%s)', (DEFAULT_AGENCY_SLUG) => {
    expect(
      readTenancyOptions({ NODE_ENV: 'development', DEFAULT_AGENCY_SLUG }).defaultSlug,
    ).toBeUndefined();
  });

  it.each([
    {},
    { NODE_ENV: 'staging' },
    { NODE_ENV: 'development', DEFAULT_AGENCY_SLUG: 'Invalid Slug' },
  ])('rejects invalid configuration without printing its values', (input) => {
    expect(() => readTenancyOptions(input)).toThrow('Invalid tenancy environment configuration.');
  });
});
