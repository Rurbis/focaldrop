import { z } from 'zod';

import type { AuthErrorKey } from './errors';
import { PASSWORD_MAX_BYTES, PASSWORD_MIN_LENGTH } from './password-policy';

// Schemas carry no interface text (D120): `messageFor` turns the first issue
// into a dictionary key.
const email = z.email().max(254);

export const SignInSchema = z.object({
  email,
  password: z.string().min(1),
});

export const PasswordResetRequestSchema = z.object({ email });

export const NewPasswordSchema = z
  .object({
    password: z
      .string()
      .min(PASSWORD_MIN_LENGTH)
      .refine((value) => new TextEncoder().encode(value).length <= PASSWORD_MAX_BYTES),
    confirm: z.string(),
  })
  .refine((value) => value.password === value.confirm, { path: ['confirm'] });

/** First validation problem of a form, as a dictionary key. */
export function messageFor(error: z.ZodError): AuthErrorKey {
  const issue = error.issues[0];
  const field = issue?.path[0];

  if (field === 'email') return 'invalidEmail';
  if (field === 'confirm') return 'passwordMismatch';
  if (field === 'password') {
    if (issue?.code === 'too_small') {
      return issue.minimum === 1 ? 'missingPassword' : 'passwordTooShort';
    }
    return 'passwordTooLong';
  }
  return 'unexpected';
}
