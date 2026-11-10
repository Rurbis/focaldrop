'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { t } from '@/i18n/es-MX';

/** Renders the page again on the server, without reloading the whole document. */
export function RetryButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="secondary"
      isPending={isPending}
      pendingLabel={t.admin.home.retrying}
      onPress={() => startTransition(() => router.refresh())}
    >
      {t.admin.home.retry}
    </Button>
  );
}
