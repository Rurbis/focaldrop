import { z } from 'zod';

import { LOCAL_DEMO } from './demo.js';
import type { LocalSeedConfig } from './local-config.js';

const UserSchema = z.object({
  id: z.uuid(),
  email: z.string().optional(),
  app_metadata: z.record(z.string(), z.unknown()).optional(),
});

export function localAuthAdmin(config: LocalSeedConfig) {
  async function request(path: string, method = 'GET', body?: object): Promise<unknown> {
    const response = await fetch(`${config.authUrl}/auth/v1/admin/${path}`, {
      method,
      headers: {
        apikey: config.secretKey,
        Authorization: `Bearer ${config.secretKey}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
      redirect: 'error',
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok)
      throw new Error(`Local Auth administration failed (HTTP ${response.status}).`);
    return response.json();
  }

  return {
    async ensureOwner(): Promise<{ id: string }> {
      let owner: z.infer<typeof UserSchema> | undefined;
      for (let page = 1; ; page++) {
        const result = z
          .object({ users: z.array(UserSchema) })
          .parse(await request(`users?page=${page}&per_page=1000`));
        owner = result.users.find((user) => user.email?.toLowerCase() === LOCAL_DEMO.ownerEmail);
        if (owner || result.users.length < 1000) break;
      }
      if (owner && owner.app_metadata?.focaldrop_local_seed !== true) {
        throw new Error('The demo email already belongs to an account not created by this seed.');
      }
      const attributes = {
        email: LOCAL_DEMO.ownerEmail,
        password: LOCAL_DEMO.ownerPassword,
        email_confirm: true,
        app_metadata: { ...owner?.app_metadata, focaldrop_local_seed: true },
        user_metadata: { full_name: LOCAL_DEMO.ownerName },
      };
      return UserSchema.parse(
        await request(owner ? `users/${owner.id}` : 'users', owner ? 'PUT' : 'POST', attributes),
      );
    },
  };
}
