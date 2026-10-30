import { z } from 'zod';

import { SafeError } from './safe-error.js';

export const AuthUserSchema = z.object({
  id: z.uuid(),
  email: z.string().optional(),
  app_metadata: z.record(z.string(), z.unknown()).optional(),
});

export type AuthUser = z.infer<typeof AuthUserSchema>;
export type AuthAdminRequest = (path: string, method?: string, body?: object) => Promise<unknown>;

/** Supabase Auth administration API with a secret (or legacy service role) key. */
export function authAdminRequest(authUrl: string, secretKey: string): AuthAdminRequest {
  return async (path, method = 'GET', body) => {
    const response = await fetch(`${authUrl}/auth/v1/admin/${path}`, {
      method,
      headers: {
        apikey: secretKey,
        // Modern secret keys are not JWTs; the gateway resolves the apikey.
        ...(secretKey.startsWith('sb_secret_') ? {} : { Authorization: `Bearer ${secretKey}` }),
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
      redirect: 'error',
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new SafeError(`Auth administration failed (HTTP ${response.status}).`);
    return response.json();
  };
}

export async function findUserByEmail(
  request: AuthAdminRequest,
  email: string,
): Promise<AuthUser | undefined> {
  for (let page = 1; ; page++) {
    const result = z
      .object({ users: z.array(AuthUserSchema) })
      .parse(await request(`users?page=${page}&per_page=1000`));
    const user = result.users.find((candidate) => candidate.email?.toLowerCase() === email);
    if (user || result.users.length < 1000) return user;
  }
}
