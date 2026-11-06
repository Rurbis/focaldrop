import 'server-only';

import { isAuthError, isAuthRetryableFetchError } from '@supabase/supabase-js';

import { createClient } from '@/lib/supabase/server';

import { ApiError } from './errors';

export async function getApiAccessToken(): Promise<string> {
  const supabase = await createClient();
  try {
    // Reading the cookie is not authentication: verify that exact token below.
    const sessionResult = await supabase.auth.getSession();
    if (sessionResult.error) throw sessionResult.error;
    const token = sessionResult.data.session?.access_token;
    if (!token) throw new ApiError(401, 'AUTHENTICATION_REQUIRED');
    const claimsResult = await supabase.auth.getClaims(token);
    if (claimsResult.error) throw claimsResult.error;
    if (!claimsResult.data?.claims) throw new ApiError(401, 'AUTHENTICATION_REQUIRED');
    return token;
  } catch (error) {
    // A temporary Auth outage must not send a valid session back to login.
    if (isAuthRetryableFetchError(error)) {
      throw new ApiError(503, 'AUTH_UNAVAILABLE', { cause: error });
    }
    if (isAuthError(error)) throw new ApiError(401, 'AUTHENTICATION_REQUIRED');
    throw error;
  }
}
