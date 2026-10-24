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
      <h1 className="text-xl font-semibold tracking-tight">{t.auth.reset.title}</h1>
      <p className="mt-1 mb-6 text-sm text-neutral-600">{t.auth.reset.intro}</p>
      <NewPasswordForm />
    </>
  );
}
