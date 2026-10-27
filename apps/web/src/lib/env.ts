import { z } from 'zod';

const PublicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url({ protocol: /^https?$/ }),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().trim().min(1),
});

export type PublicEnv = z.infer<typeof PublicEnvSchema>;

let cached: PublicEnv | undefined;

/**
 * Supabase settings of the web app (Phase 2 §4.3), validated on first use.
 *
 * Validation is lazy so `next build` works without them (CI has no Supabase);
 * a request that needs them fails with a clear message instead of a half-working
 * login. Next only inlines `NEXT_PUBLIC_*` variables read by their full name.
 */
export function getPublicEnv(): PublicEnv {
  cached ??= PublicEnvSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
  return cached;
}
