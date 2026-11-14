import Link from 'next/link';
import type { ReactNode } from 'react';

import { Logo, LogoSymbol } from '@/components/brand/logo';
import { SignOutButton } from '@/features/auth/components/sign-out-button';
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
      <a
        href="#panel-main"
        className="sr-only rounded-ui bg-surface px-4 py-2 text-ui font-semibold text-ink focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-10"
      >
        {t.admin.skipToContent}
      </a>
      <header className="flex h-16 shrink-0 items-center gap-4 pr-2 pl-4 sm:h-[4.25rem] sm:gap-12 sm:pr-8 sm:pl-10">
        <Link href="/admin" aria-label={t.admin.logoHome} className="rounded-sm">
          <LogoSymbol className="h-7.5 w-auto sm:hidden" />
          <Logo className="hidden h-6.5 w-auto sm:block" />
        </Link>
        <PanelNav />
        {/* Phone: the agency follows the symbol, as the bar's title. Wider:
            it sits muted beside «Salir», after the sections. */}
        <div className="flex min-w-0 flex-1 items-center justify-end gap-1.5 sm:ml-auto sm:flex-none">
          {agency}
          <SignOutButton />
        </div>
      </header>
      <main
        id="panel-main"
        tabIndex={-1}
        className="light-table mx-2.5 outline-none flex-1 rounded-t-ui px-5 pt-8 pb-12 sm:mx-auto sm:w-full sm:max-w-[62.5rem] sm:px-18 sm:pt-13"
      >
        {children}
      </main>
    </div>
  );
}
