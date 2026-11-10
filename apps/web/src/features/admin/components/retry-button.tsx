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
      <svg
        viewBox="0 0 20 20"
        aria-hidden="true"
        className="size-4 fill-none stroke-current stroke-[2.25] [stroke-linecap:round] [stroke-linejoin:round]"
      >
        <path d="M15.6 8.2A6 6 0 1 0 16 11" />
        <path d="M16 4.5v3.8h-3.8" />
      </svg>
      {t.admin.home.retry}
    </Button>
  );
}
