import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';

import { AdminHomeView } from '@/features/admin/components/admin-home';
import { getAdminHome } from '@/features/admin/me';
import { t } from '@/i18n/es-MX';

export const metadata: Metadata = {
  title: t.admin.home.title,
};

export default async function AdminHomePage() {
  const home = await getAdminHome((await headers()).get('host'));
  // The login page does not bounce this error back here, so no redirect loop.
  if (home.status === 'signed-out') redirect('/admin/login?error=session');
  if (home.status === 'unknown-agency') notFound();

  return <AdminHomeView home={home} />;
}
