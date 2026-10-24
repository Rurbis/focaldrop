import type { t } from '@/i18n/es-MX';

/** Key of a sign-in error message in the `es-MX` dictionary. */
export type AuthErrorKey = keyof typeof t.auth.errors;

// Supabase Auth error codes the panel can run into, mapped to Spanish messages.
// Anything else shows the generic message: the raw English text never reaches the UI.
// A Map, not an object literal, so codes like "toString" do not match inherited keys.
const SUPABASE_ERRORS = new Map<string, AuthErrorKey>([
  ['invalid_credentials', 'invalidCredentials'],
  ['email_not_confirmed', 'emailNotConfirmed'],
  ['over_request_rate_limit', 'tooManyRequests'],
  ['over_email_send_rate_limit', 'tooManyRequests'],
  ['weak_password', 'weakPassword'],
  ['same_password', 'samePassword'],
  ['otp_expired', 'linkInvalid'],
]);

export function authErrorKey(error: { code?: string | undefined }): AuthErrorKey {
  return SUPABASE_ERRORS.get(error.code ?? '') ?? 'unexpected';
}
