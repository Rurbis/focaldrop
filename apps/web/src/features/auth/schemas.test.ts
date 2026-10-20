import { describe, expect, it } from 'vitest';

import { PASSWORD_MAX_BYTES, PASSWORD_MIN_LENGTH } from './password-policy';
import { messageFor, NewPasswordSchema, PasswordResetRequestSchema, SignInSchema } from './schemas';

function errorKey(result: { success: boolean; error?: Parameters<typeof messageFor>[0] }) {
  if (result.success || !result.error) throw new Error('expected a validation error');
  return messageFor(result.error);
}

describe('SignInSchema', () => {
  it('accepts an email and any non-empty password', () => {
    expect(SignInSchema.safeParse({ email: 'owner@example.test', password: 'x' }).success).toBe(
      true,
    );
  });

  it('asks for a valid email first', () => {
    expect(errorKey(SignInSchema.safeParse({ email: 'not-an-email', password: '' }))).toBe(
      'invalidEmail',
    );
  });

  it('asks for the password when it is empty', () => {
    expect(errorKey(SignInSchema.safeParse({ email: 'owner@example.test', password: '' }))).toBe(
      'missingPassword',
    );
  });
});

describe('PasswordResetRequestSchema', () => {
  it('rejects a malformed email', () => {
    expect(errorKey(PasswordResetRequestSchema.safeParse({ email: 'owner@' }))).toBe(
      'invalidEmail',
    );
  });
});

describe('NewPasswordSchema', () => {
  const valid = 'a'.repeat(PASSWORD_MIN_LENGTH);

  it('accepts matching passwords of the minimum length', () => {
    expect(NewPasswordSchema.safeParse({ password: valid, confirm: valid }).success).toBe(true);
  });

  it('rejects passwords shorter than the minimum', () => {
    const short = 'a'.repeat(PASSWORD_MIN_LENGTH - 1);
    expect(errorKey(NewPasswordSchema.safeParse({ password: short, confirm: short }))).toBe(
      'passwordTooShort',
    );
  });

  it('rejects passwords longer than bcrypt reads, counting bytes', () => {
    // 'ñ' takes 2 bytes in UTF-8: 37 of them are 74 bytes but only 37 characters.
    const long = 'ñ'.repeat(PASSWORD_MAX_BYTES / 2 + 1);
    expect(errorKey(NewPasswordSchema.safeParse({ password: long, confirm: long }))).toBe(
      'passwordTooLong',
    );
  });

  it('rejects a confirmation that does not match', () => {
    expect(errorKey(NewPasswordSchema.safeParse({ password: valid, confirm: `${valid}b` }))).toBe(
      'passwordMismatch',
    );
  });
});
