import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  // No page of the panel, the login included, may appear in search results.
  robots: { index: false, follow: false },
};

// The phone's browser bar takes the room's tone of Mesa de luz (A3), so the
// panel reads as one surface. Same values as the room token in globals.css.
// https://nextjs.org/docs/app/api-reference/functions/generate-viewport#themecolor
export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#e9e3da' },
    { media: '(prefers-color-scheme: dark)', color: '#141312' },
  ],
};

// The route groups inside give each kind of page its own layout: (access) for
// signing in and recovering the password, (panel) for everything that needs a session.
export default function AdminLayout({ children }: Readonly<{ children: ReactNode }>) {
  return children;
}
