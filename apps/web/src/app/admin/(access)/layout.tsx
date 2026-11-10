import type { ReactNode } from 'react';

import { Logo } from '@/components/brand/logo';
import { t } from '@/i18n/es-MX';

// Mesa de luz (A3): the access pages sit on the lit table in the middle of the
// dim room, the same surface that holds the work once inside the panel.
export default function AccessLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-room px-3 py-10 sm:px-4">
      <div className="light-table w-full max-w-[27.5rem] rounded-ui px-6 pt-8 pb-9 sm:px-11 sm:pt-10 sm:pb-10">
        <Logo title={t.platform.name} className="mb-9 h-6.5 w-auto" />
        {children}
      </div>
    </main>
  );
}
