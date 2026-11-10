import Link from 'next/link';
import type { ReactNode } from 'react';

import { Logo, LogoSymbol } from '@/components/brand/logo';
import { Button } from '@/components/ui/button';
import { signOut } from '@/features/auth/actions';
import { t } from '@/i18n/es-MX';

import { PanelNav } from './panel-nav';

/**
 * Frame of the "Mesa de luz" panel design (A3, #53): a top bar in the dim
 * room and every page on one lit table that never moves. It owns only the
 * frame; pages bring their content, so other designs can wrap the same pages.
 */
export function LightTableShell({
  agency,
  children,
}: Readonly<{ agency: ReactNode; children: ReactNode }>) {
  return (
    <div className="flex min-h-dvh flex-col bg-room">
      <header className="flex h-16 shrink-0 items-center gap-4 pr-2 pl-4 sm:h-[4.25rem] sm:gap-12 sm:pr-8 sm:pl-10">
        <Link href="/admin" aria-label={t.admin.logoHome} className="rounded-sm">
          <LogoSymbol className="h-7.5 w-auto sm:hidden" />
          <Logo className="hidden h-6.5 w-auto sm:block" />
        </Link>
        <PanelNav />
        <div className="ml-auto flex min-w-0 items-center gap-1.5">
          {agency}
          <form action={signOut}>
            <Button type="submit" variant="quiet" size="sm">
              {t.admin.signOut}
            </Button>
          </form>
        </div>
      </header>
      <main className="light-table mx-2.5 flex-1 rounded-t-ui px-5 pt-8 pb-12 sm:mx-auto sm:w-full sm:max-w-[62.5rem] sm:px-18 sm:pt-13">
        {children}
      </main>
    </div>
  );
}
