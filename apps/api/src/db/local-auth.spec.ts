import { vi } from 'vitest';

import { localAuthAdmin } from './local-auth.js';
import { localSeedConfig } from './local-config.js';

describe('local Auth administration credentials', () => {
  afterEach(() => vi.unstubAllGlobals());

  it.each([
    { secret: 'sb_secret_synthetic-test-only', authorization: null },
    {
      secret: 'eyJ.synthetic.legacy-test-only',
      authorization: 'Bearer eyJ.synthetic.legacy-test-only',
    },
  ])(
    'provisions the owner using the supported headers for $secret',
    async ({ secret, authorization }) => {
      const user = {
        id: '018f0000-0000-7000-8000-000000000001',
        email: 'owner@focaldrop.test',
        app_metadata: { focaldrop_local_seed: true },
      };
      const request = vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(Response.json({ users: [user] }))
        .mockResolvedValueOnce(Response.json(user));
      vi.stubGlobal('fetch', request);

      const admin = localAuthAdmin(
        localSeedConfig({ NODE_ENV: 'development', SUPABASE_SECRET_KEY: secret }),
      );
      await expect(admin.ensureOwner()).resolves.toMatchObject({ id: user.id });
      expect(request).toHaveBeenCalledTimes(2);
      for (const [url, options] of request.mock.calls) {
        expect(url).toMatch(/^http:\/\/127\.0\.0\.1:54321\/auth\/v1\/admin\/users/);
        const headers = new Headers(options?.headers);
        expect(headers.get('apikey')).toBe(secret);
        expect(headers.get('authorization')).toBe(authorization);
      }
    },
  );
});
