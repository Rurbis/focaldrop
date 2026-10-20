import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

import { getPublicEnv } from '@/lib/env';

import { sessionCookieOptions } from './cookies';

/**
 * Refreshes the Supabase session cookie and nothing else (D40).
 *
 * Access control is not done here: the panel layout checks the session, and Nest
 * decides permissions. Keeping the proxy this small keeps it fast on every panel
 * request.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });
  const env = getPublicEnv();

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookieOptions: sessionCookieOptions,
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
          // Cache headers from Supabase keep a response with a fresh session
          // cookie out of shared caches.
          for (const [key, value] of Object.entries(headers)) {
            response.headers.set(key, value);
          }
        },
      },
    },
  );

  // Nothing may run between creating the client and getClaims(): this call
  // refreshes an expired session, and skipping it logs users out at random.
  await supabase.auth.getClaims();

  return response;
}
