import type { Metadata } from 'next';
import { Instrument_Sans } from 'next/font/google';
import type { ReactNode } from 'react';

import { t } from '@/i18n/es-MX';

import './globals.css';

export const metadata: Metadata = {
  // Pages set only their own title; Next adds the platform name. A template
  // applies to child segments, so it lives here rather than in /admin.
  title: { template: `%s · ${t.platform.name}`, default: t.platform.name },
  description: t.home.description,
};

// The Focal Drop typeface (D135). next/font self-hosts it at build time, so no
// request reaches Google from the visitor's browser.
const instrumentSans = Instrument_Sans({
  subsets: ['latin'],
  variable: '--font-instrument-sans',
  display: 'swap',
});

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="es-MX" className={instrumentSans.variable}>
      <body>{children}</body>
    </html>
  );
}
