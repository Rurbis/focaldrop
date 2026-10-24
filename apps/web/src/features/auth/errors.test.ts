import { describe, expect, it } from 'vitest';

import { t } from '@/i18n/es-MX';

import { authErrorKey } from './errors';

describe('authErrorKey', () => {
  it.each([
    ['invalid_credentials', 'invalidCredentials'],
    ['email_not_confirmed', 'emailNotConfirmed'],
    ['over_request_rate_limit', 'tooManyRequests'],
    ['over_email_send_rate_limit', 'tooManyRequests'],
    ['weak_password', 'weakPassword'],
    ['same_password', 'samePassword'],
    ['otp_expired', 'linkInvalid'],
  ] as const)('maps the Supabase code %s to a Spanish message', (code, key) => {
    expect(authErrorKey({ code })).toBe(key);
    expect(t.auth.errors[key]).toBeTruthy();
  });

  it('falls back to the generic message for unknown or missing codes', () => {
    expect(authErrorKey({ code: 'something_new' })).toBe('unexpected');
    expect(authErrorKey({})).toBe('unexpected');
  });

  it('does not treat inherited object keys as known codes', () => {
    expect(authErrorKey({ code: 'toString' })).toBe('unexpected');
  });
});
