'use client';

import { useActionState } from 'react';

import { FormMessage, TextField } from '@/components/ui/form';
import { SubmitButton } from '@/components/ui/submit-button';
import { t } from '@/i18n/es-MX';

import { updatePassword } from '../actions';
import { initialFormState } from '../form-state';
import { PASSWORD_MIN_LENGTH } from '../password-policy';

export function NewPasswordForm() {
  const [state, formAction] = useActionState(updatePassword, initialFormState);

  return (
    <form action={formAction} noValidate className="space-y-4">
      {state.status === 'error' && (
        <FormMessage tone="error">{t.auth.errors[state.error]}</FormMessage>
      )}
      <TextField
        label={t.auth.fields.newPassword}
        name="password"
        type="password"
        autoComplete="new-password"
        minLength={PASSWORD_MIN_LENGTH}
        required
      />
      <TextField
        label={t.auth.fields.confirmPassword}
        name="confirm"
        type="password"
        autoComplete="new-password"
        minLength={PASSWORD_MIN_LENGTH}
        required
      />
      <SubmitButton label={t.auth.reset.submit} pendingLabel={t.auth.reset.submitting} />
    </form>
  );
}
