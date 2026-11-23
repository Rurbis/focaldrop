import { type ReactNode, Suspense } from 'react';

import { requireSession } from '@/features/auth/session';
import { AgencyName } from '@/features/panel/light-table/agency-name';
import { LightTableShell } from '@/features/panel/light-table/panel-shell';

// Layout of the admin panel (D39), the same for every agency. Every page under
// it needs a session; without one the visitor goes to the login page.
// "Mesa de luz" is the only design for now; the others arrive with the
// per-person choice of panel design (A3, #53).
export default async function PanelLayout({ children }: Readonly<{ children: ReactNode }>) {
  await requireSession();

  return (
    <LightTableShell
      agency={
        <Suspense fallback={null}>
          <AgencyName />
        </Suspense>
      }
    >
      {children}
    </LightTableShell>
  );
}
