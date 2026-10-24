'use client';

import Link from 'next/link';
import { useActionState } from 'react';

import { FormMessage, linkClass, TextField } from '@/components/ui/form';
import { SubmitButton } from '@/components/ui/submit-button';
import { t } from '@/i18n/es-MX';

import { requestPasswordReset } from '../actions';
import { initialFormState } from '../form-state';

export function PasswordResetRequestForm() {
  const [state, formAction] = useActionState(requestPasswordReset, initialFormState);

  return (
    <form action={formAction} noValidate className="space-y-4">
      {state.status === 'error' && (
        <FormMessage tone="error">{t.auth.errors[state.error]}</FormMessage>
      )}
      {state.status === 'sent' ? (
        <FormMessage tone="success">{t.auth.forgot.sent}</FormMessage>
      ) : (
        <>
          <TextField
            label={t.auth.fields.email}
            name="email"
            type="email"
            autoComplete="email"
            required
            defaultValue={state.status === 'error' ? state.email : undefined}
          />
          <SubmitButton label={t.auth.forgot.submit} pendingLabel={t.auth.forgot.submitting} />
        </>
      )}
      <p className="text-center">
        <Link href="/admin/login" className={linkClass}>
          {t.auth.forgot.backToLogin}
        </Link>
      </p>
    </form>
  );
}
