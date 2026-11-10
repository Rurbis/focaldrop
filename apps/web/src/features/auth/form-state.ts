import type { AuthErrorKey } from './errors';

/** What a Server Action of the auth forms answers to the form. */
export type FormState =
  | { status: 'idle' }
  | { status: 'error'; error: AuthErrorKey; email?: string }
  | { status: 'sent' }
  // Signed in: the form opens the panel itself (see useOpenPanelWhenSignedIn).
  | { status: 'signed-in' };

export const initialFormState: FormState = { status: 'idle' };
