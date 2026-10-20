import type { AuthErrorKey } from './errors';

/** What a Server Action of the auth forms answers to the form. */
export type FormState =
  | { status: 'idle' }
  | { status: 'error'; error: AuthErrorKey; email?: string }
  | { status: 'sent' };

export const initialFormState: FormState = { status: 'idle' };
