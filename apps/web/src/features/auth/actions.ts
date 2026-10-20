'use server';

import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';

import { authErrorKey } from './errors';
import type { FormState } from './form-state';
import { messageFor, NewPasswordSchema, PasswordResetRequestSchema, SignInSchema } from './schemas';
import { getSessionClaims } from './session';

function field(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === 'string' ? value : '';
}

export async function signIn(_previous: FormState, formData: FormData): Promise<FormState> {
  const email = field(formData, 'email').trim();
  const parsed = SignInSchema.safeParse({ email, password: field(formData, 'password') });
  if (!parsed.success) return { status: 'error', error: messageFor(parsed.error), email };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { status: 'error', error: authErrorKey(error), email };

  redirect('/admin');
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  // Only this browser: other devices keep their session.
  await supabase.auth.signOut({ scope: 'local' });
  redirect('/admin/login');
}

export async function requestPasswordReset(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const email = field(formData, 'email').trim();
  const parsed = PasswordResetRequestSchema.safeParse({ email });
  if (!parsed.success) return { status: 'error', error: messageFor(parsed.error), email };

  // Supabase answers the same whether the address exists or not, and so does
  // the form: it never reveals which emails have an account. The link goes to
  // /admin/auth/confirm through the recovery email template.
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email);
  if (error) return { status: 'error', error: authErrorKey(error), email };

  return { status: 'sent' };
}

export async function updatePassword(_previous: FormState, formData: FormData): Promise<FormState> {
  const parsed = NewPasswordSchema.safeParse({
    password: field(formData, 'password'),
    confirm: field(formData, 'confirm'),
  });
  if (!parsed.success) return { status: 'error', error: messageFor(parsed.error) };

  // The recovery link signs the user in; without that session there is nothing to update.
  if (!(await getSessionClaims())) return { status: 'error', error: 'linkInvalid' };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { status: 'error', error: authErrorKey(error) };

  redirect('/admin');
}
