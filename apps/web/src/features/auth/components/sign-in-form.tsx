'use client';

import Link from 'next/link';
import { useActionState } from 'react';

import { FormMessage, linkClass, TextField } from '@/components/ui/form';
import { SubmitButton } from '@/components/ui/submit-button';
import { t } from '@/i18n/es-MX';

import { signIn } from '../actions';
import { initialFormState } from '../form-state';

export function SignInForm({ linkExpired }: { linkExpired: boolean }) {
  const [state, formAction] = useActionState(signIn, initialFormState);
  const error = state.status === 'error' ? state.error : linkExpired ? 'linkInvalid' : null;

  return (
    // noValidate: the server validates and answers in Spanish from the
    // dictionary, instead of the browser's messages in the browser's language.
    <form action={formAction} noValidate className="space-y-4">
      {error && <FormMessage tone="error">{t.auth.errors[error]}</FormMessage>}
      <TextField
        label={t.auth.fields.email}
        name="email"
        type="email"
        autoComplete="email"
        required
        defaultValue={state.status === 'error' ? state.email : undefined}
      />
      <TextField
        label={t.auth.fields.password}
        name="password"
        type="password"
        autoComplete="current-password"
        required
      />
      <SubmitButton label={t.auth.login.submit} pendingLabel={t.auth.login.submitting} />
      <p className="text-center">
        <Link href="/admin/forgot-password" className={linkClass}>
          {t.auth.login.forgotLink}
        </Link>
      </p>
    </form>
  );
}
