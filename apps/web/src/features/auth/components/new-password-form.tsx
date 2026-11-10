'use client';

import { useActionState } from 'react';

import { Message } from '@/components/ui/message';
import { SubmitButton } from '@/components/ui/submit-button';
import { TextField } from '@/components/ui/text-field';
import { t } from '@/i18n/es-MX';

import { updatePassword } from '../actions';
import { initialFormState } from '../form-state';
import { PASSWORD_MIN_LENGTH } from '../password-policy';
import { useOpenPanelWhenSignedIn } from './open-panel';

export function NewPasswordForm() {
  const [state, formAction] = useActionState(updatePassword, initialFormState);
  const signedIn = useOpenPanelWhenSignedIn(state);

  return (
    <form action={formAction} noValidate className="flex flex-col gap-4">
      {state.status === 'error' && <Message tone="error">{t.auth.errors[state.error]}</Message>}
      <TextField
        label={t.auth.fields.newPassword}
        name="password"
        type="password"
        autoComplete="new-password"
        minLength={PASSWORD_MIN_LENGTH}
        isRequired
        validationBehavior="aria"
      />
      <TextField
        label={t.auth.fields.confirmPassword}
        name="confirm"
        type="password"
        autoComplete="new-password"
        minLength={PASSWORD_MIN_LENGTH}
        isRequired
        validationBehavior="aria"
      />
      <SubmitButton
        label={t.auth.reset.submit}
        pendingLabel={t.auth.reset.submitting}
        busy={signedIn}
      />
    </form>
  );
}
