import type { ReactNode } from 'react';

import { t } from '@/i18n/es-MX';

// Centered card for the pages that give access to the panel: login and password recovery.
export default function AccessLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-neutral-50 px-4 py-12">
      <div className="w-full max-w-sm">
        <p className="mb-6 text-center text-lg font-semibold tracking-tight">{t.platform.name}</p>
        <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
          {children}
        </div>
      </div>
    </main>
  );
}
