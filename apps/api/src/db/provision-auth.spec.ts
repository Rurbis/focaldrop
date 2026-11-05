import { vi } from 'vitest';

import { provisionAuthAdmin } from './provision-auth.js';
import { provisionConfig } from './provision-config.js';

const config = provisionConfig(
  {
    PROVISION_TARGET: 'staging',
    MIGRATIONS_DATABASE_URL: 'postgresql://postgres:synthetic@pooler.example.invalid:5432/postgres',
    SUPABASE_URL: 'https://ref.supabase.example.invalid',
    SUPABASE_SECRET_KEY: 'sb_secret_synthetic-test-only',
    AGENCY_SLUG: 'synthetic-agency',
    AGENCY_NAME: 'Synthetic Agency',
    AGENCY_HOSTNAME: 'staging.example.invalid',
    OWNER_EMAIL: 'owner@example.invalid',
  },
  [],
);
const user = { id: '018f0000-0000-7000-8000-000000000002', email: 'owner@example.invalid' };

describe('provisioning Auth administration', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('creates a confirmed owner without a password when the email is new', async () => {
    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({ users: [] }))
      .mockResolvedValueOnce(Response.json(user));
    vi.stubGlobal('fetch', request);

    await expect(provisionAuthAdmin(config).ensureOwner()).resolves.toEqual(user);
    const [url, options] = request.mock.calls[1] ?? [];
    expect(url).toBe('https://ref.supabase.example.invalid/auth/v1/admin/users');
    expect(options?.method).toBe('POST');
    if (typeof options?.body !== 'string') throw new Error('Expected a JSON body.');
    const body: unknown = JSON.parse(options.body);
    expect(body).toEqual({
      email: 'owner@example.invalid',
      email_confirm: true,
      app_metadata: { focaldrop_provisioned: true },
      user_metadata: { full_name: 'Synthetic Agency' },
    });
    expect(body).not.toHaveProperty('password');
    expect(new Headers(options?.headers).get('apikey')).toBe(config.secretKey);
  });

  it('reuses an existing account without modifying it', async () => {
    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        Response.json({ users: [{ ...user, email: 'OWNER@example.invalid' }] }),
      );
    vi.stubGlobal('fetch', request);

    await expect(provisionAuthAdmin(config).ensureOwner()).resolves.toEqual({ id: user.id });
    expect(request).toHaveBeenCalledTimes(1);
  });
});
