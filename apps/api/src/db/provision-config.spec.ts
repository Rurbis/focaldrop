import { provisionConfig } from './provision-config.js';

const staging = {
  PROVISION_TARGET: 'staging',
  MIGRATIONS_DATABASE_URL:
    'postgresql://postgres.ref:synthetic@pooler.example.invalid:5432/postgres',
  SUPABASE_URL: 'https://ref.supabase.example.invalid/',
  SUPABASE_SECRET_KEY: 'sb_secret_synthetic-test-only',
  AGENCY_SLUG: 'synthetic-agency',
  AGENCY_NAME: 'Synthetic Agency',
  AGENCY_HOSTNAME: 'Focaldrop-Web-Staging.example.invalid',
  OWNER_EMAIL: 'Owner@Example.invalid',
};

describe('provisioning configuration', () => {
  it('builds the staging agency on a platform host with normalized values', () => {
    expect(provisionConfig(staging, [])).toEqual({
      target: 'staging',
      databaseUrl: staging.MIGRATIONS_DATABASE_URL,
      authUrl: 'https://ref.supabase.example.invalid',
      secretKey: staging.SUPABASE_SECRET_KEY,
      spec: {
        slug: 'synthetic-agency',
        agencyName: 'Synthetic Agency',
        hostname: 'focaldrop-web-staging.example.invalid',
        domainKind: 'platform_subdomain',
        ownerEmail: 'owner@example.invalid',
        ownerName: 'Synthetic Agency',
      },
    });
  });

  it('uses OWNER_NAME when present', () => {
    expect(provisionConfig({ ...staging, OWNER_NAME: 'Synthetic Owner' }, []).spec.ownerName).toBe(
      'Synthetic Owner',
    );
  });

  it('refuses production without explicit confirmation', () => {
    const production = { ...staging, PROVISION_TARGET: 'production' };
    expect(() => provisionConfig(production, [])).toThrow(/--confirm-production/);
    expect(provisionConfig(production, ['--confirm-production']).spec.domainKind).toBe('custom');
  });

  it('names invalid variables without printing their values', () => {
    const invalid = {
      ...staging,
      PROVISION_TARGET: 'local',
      SUPABASE_URL: 'http://127.0.0.1:54321',
      AGENCY_SLUG: 'Not A Slug',
      OWNER_EMAIL: 'secret-but-invalid',
    };
    expect(() => provisionConfig(invalid, [])).toThrow(
      'Invalid provisioning configuration: PROVISION_TARGET, SUPABASE_URL, AGENCY_SLUG, OWNER_EMAIL.',
    );
    expect(() => provisionConfig(invalid, [])).not.toThrow(/secret-but-invalid|Not A Slug/);
  });

  it('requires every value', () => {
    expect(() => provisionConfig({}, [])).toThrow(/PROVISION_TARGET.*OWNER_EMAIL/);
  });
});
