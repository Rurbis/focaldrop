import 'server-only';

import { createClient } from '@/lib/supabase/server';

import { ApiError } from './errors';

export async function getApiAccessToken(): Promise<string> {
  const supabase = await createClient();
  // Reading the cookie is not authentication: verify that exact token below.
  const sessionResult = await supabase.auth.getSession();
  const token = sessionResult.data.session?.access_token;
  if (sessionResult.error || !token) throw new ApiError(401, 'AUTHENTICATION_REQUIRED');
  const claimsResult = await supabase.auth.getClaims(token);
  if (claimsResult.error || !claimsResult.data?.claims) {
    throw new ApiError(401, 'AUTHENTICATION_REQUIRED');
  }
  return token;
}
