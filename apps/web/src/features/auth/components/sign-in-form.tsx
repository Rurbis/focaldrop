'use client';

import { useActionState } from 'react';

import { Message } from '@/components/ui/message';
import { SubmitButton } from '@/components/ui/submit-button';
import { TextField } from '@/components/ui/text-field';
import { TextLink } from '@/components/ui/text-link';
import { t } from '@/i18n/es-MX';

import { signIn } from '../actions';
import { initialFormState } from '../form-state';
import { useOpenPanelWhenSignedIn } from './open-panel';

export function SignInForm({ notice }: { notice: 'linkInvalid' | 'sessionEnded' | null }) {
  const [state, formAction] = useActionState(signIn, initialFormState);
  const signedIn = useOpenPanelWhenSignedIn(state);
  const error = state.status === 'error' ? state.error : signedIn ? null : notice;

  return (
    // noValidate and validationBehavior="aria": the server validates and answers
    // in Spanish from the dictionary, instead of the browser in its own language.
    <form action={formAction} noValidate className="flex flex-col gap-4">
      {error && <Message tone="error">{t.auth.errors[error]}</Message>}
      <TextField
        label={t.auth.fields.email}
        name="email"
        type="email"
        autoComplete="email"
        isRequired
        validationBehavior="aria"
        defaultValue={state.status === 'error' ? state.email : undefined}
      />
      <TextField
        label={t.auth.fields.password}
        name="password"
        type="password"
        autoComplete="current-password"
        isRequired
        validationBehavior="aria"
      />
      <SubmitButton
        label={t.auth.login.submit}
        pendingLabel={t.auth.login.submitting}
        busy={signedIn}
      />
      <p className="text-center">
        <TextLink href="/admin/forgot-password">{t.auth.login.forgotLink}</TextLink>
      </p>
    </form>
  );
}
