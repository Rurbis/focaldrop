import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { NewPasswordForm } from '@/features/auth/components/new-password-form';
import { getSessionClaims } from '@/features/auth/session';
import { t } from '@/i18n/es-MX';

export const metadata: Metadata = {
  title: t.auth.reset.title,
};

// Reached from the recovery link, which signs the user in (/admin/auth/confirm).
export default async function ResetPasswordPage() {
  if (!(await getSessionClaims())) redirect('/admin/login?error=link');

  return (
    <>
      <h1 className="text-page font-semibold tracking-tight text-balance">{t.auth.reset.title}</h1>
      <p className="mt-1.5 mb-7 text-body text-ink-muted">{t.auth.reset.intro}</p>
      <NewPasswordForm />
    </>
  );
}
