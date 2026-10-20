import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

import { getPublicEnv } from '@/lib/env';

import { sessionCookieOptions } from './cookies';

/**
 * Supabase client for Server Components, Server Actions and Route Handlers.
 *
 * The web app only talks to Supabase Auth from the server: there is no browser
 * client, and business data always goes through Nest (D57, D62).
 */
export async function createClient() {
  const cookieStore = await cookies();
  const env = getPublicEnv();

  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookieOptions: sessionCookieOptions,
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Server Components cannot set cookies. That is fine: proxy.ts
            // refreshes the session on every panel request (D40).
          }
        },
      },
    },
  );
}
