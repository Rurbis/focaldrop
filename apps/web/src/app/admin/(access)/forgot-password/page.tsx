import type { Metadata } from 'next';

import { PasswordResetRequestForm } from '@/features/auth/components/password-reset-request-form';
import { t } from '@/i18n/es-MX';

export const metadata: Metadata = {
  title: t.auth.forgot.title,
};

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="text-page font-semibold tracking-tight text-balance">{t.auth.forgot.title}</h1>
      <p className="mt-1.5 mb-7 text-body text-ink-muted">{t.auth.forgot.intro}</p>
      <PasswordResetRequestForm />
    </>
  );
}
