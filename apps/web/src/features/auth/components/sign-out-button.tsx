'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { t } from '@/i18n/es-MX';

import { signOut } from '../actions';

/**
 * «Salir»: ends the session on the server and opens the login from the
 * browser, so the login renders for the browser's real host and names its
 * agency, the same reason the forms open the panel themselves (see open-panel).
 */
export function SignOutButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="quiet"
      size="sm"
      isPending={isPending}
      onPress={() =>
        startTransition(async () => {
          await signOut();
          router.replace('/admin/login');
        })
      }
    >
      {t.admin.signOut}
    </Button>
  );
}
