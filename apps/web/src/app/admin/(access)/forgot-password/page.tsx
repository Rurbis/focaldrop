import type { Metadata } from 'next';

import { PasswordResetRequestForm } from '@/features/auth/components/password-reset-request-form';
import { t } from '@/i18n/es-MX';

export const metadata: Metadata = {
  title: t.auth.forgot.title,
};

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="text-xl font-semibold tracking-tight">{t.auth.forgot.title}</h1>
      <p className="mt-1 mb-6 text-sm text-neutral-600">{t.auth.forgot.intro}</p>
      <PasswordResetRequestForm />
    </>
  );
}
