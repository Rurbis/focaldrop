import type { CookieOptionsWithName } from '@supabase/ssr';

/**
 * Options of the Supabase session cookie.
 *
 * Supabase leaves it readable by JavaScript because its browser client needs it.
 * This app only uses Supabase from the server, so the cookie is `httpOnly`: a
 * script injected into a page cannot read the session (XSS). It travels only
 * over HTTPS outside local development.
 */
export const sessionCookieOptions: CookieOptionsWithName = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
};
