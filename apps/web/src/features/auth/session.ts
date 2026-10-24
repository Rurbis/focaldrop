import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';

/**
 * Claims of the signed-in user, or `null` without a valid session.
 *
 * `getClaims()` verifies the JWT signature locally with the project's public
 * keys (ES256, D121), so it needs no request to Supabase. It only answers "is
 * there a session"; what the user may do is decided by Nest (D57).
 */
export async function getSessionClaims() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return data?.claims ?? null;
}

/** Sends visitors without a session to the login page. */
export async function requireSession() {
  const claims = await getSessionClaims();
  if (!claims) redirect('/admin/login');
  return claims;
}
