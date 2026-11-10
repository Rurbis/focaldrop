import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { SignInForm } from '@/features/auth/components/sign-in-form';
import { getSessionClaims } from '@/features/auth/session';
import { t } from '@/i18n/es-MX';

export const metadata: Metadata = {
  title: t.auth.login.title,
};

export default async function LoginPage({ searchParams }: PageProps<'/admin/login'>) {
  // /admin/auth/confirm sends people here with ?error=link when a recovery link
  // is invalid or expired, and the panel with ?error=session when Nest rejected
  // a session that Supabase still accepts. That one must not bounce back to /admin.
  const { error } = await searchParams;
  if (error !== 'session' && (await getSessionClaims())) redirect('/admin');

  return (
    <>
      <h1 className="text-xl font-semibold tracking-tight">{t.auth.login.title}</h1>
      <p className="mt-1 mb-6 text-sm text-neutral-600">{t.auth.login.intro}</p>
      <SignInForm
        notice={error === 'link' ? 'linkInvalid' : error === 'session' ? 'sessionEnded' : null}
      />
    </>
  );
}
