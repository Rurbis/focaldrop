'use client';

import { useActionState } from 'react';

import { Message } from '@/components/ui/message';
import { SubmitButton } from '@/components/ui/submit-button';
import { TextField } from '@/components/ui/text-field';
import { TextLink } from '@/components/ui/text-link';
import { t } from '@/i18n/es-MX';

import { requestPasswordReset } from '../actions';
import { initialFormState } from '../form-state';

export function PasswordResetRequestForm() {
  const [state, formAction] = useActionState(requestPasswordReset, initialFormState);

  return (
    <form action={formAction} noValidate className="flex flex-col gap-4">
      {state.status === 'error' && <Message tone="error">{t.auth.errors[state.error]}</Message>}
      {state.status === 'sent' ? (
        <Message tone="success">{t.auth.forgot.sent}</Message>
      ) : (
        <>
          <TextField
            label={t.auth.fields.email}
            name="email"
            type="email"
            autoComplete="email"
            spellCheck={false}
            isRequired
            validationBehavior="aria"
            defaultValue={state.status === 'error' ? state.email : undefined}
          />
          <SubmitButton label={t.auth.forgot.submit} pendingLabel={t.auth.forgot.submitting} />
        </>
      )}
      <p className="text-center">
        <TextLink href="/admin/login">{t.auth.forgot.backToLogin}</TextLink>
      </p>
    </form>
  );
}
