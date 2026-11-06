import { validateServerEnv } from '../config/env.js';

export const AUTH_OPTIONS = Symbol('AUTH_OPTIONS');

// The Supabase CLI's default port, so a local checkout needs no extra setting.
const LOCAL_JWKS_URL = 'http://127.0.0.1:54321/auth/v1/.well-known/jwks.json';

export interface AuthOptions {
  jwksUrl: string;
  issuer: string;
  audience: string;
}

export function readAuthOptions(input: NodeJS.ProcessEnv = process.env): AuthOptions {
  const env = validateServerEnv(input);
  const jwksUrl = env.SUPABASE_JWKS_URL ?? LOCAL_JWKS_URL;

  return {
    jwksUrl,
    issuer: jwksUrl.replace('/.well-known/jwks.json', ''),
    audience: env.SUPABASE_JWT_AUDIENCE ?? 'authenticated',
  };
}
