import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  // No page of the panel, the login included, may appear in search results.
  robots: { index: false, follow: false },
};

// The route groups inside give each kind of page its own layout: (access) for
// signing in and recovering the password, (panel) for everything that needs a session.
export default function AdminLayout({ children }: Readonly<{ children: ReactNode }>) {
  return children;
}
