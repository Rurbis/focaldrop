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
  // Plain files in public/ are served by Workers Static Assets without running
  // the Worker; icons under src/app would be Next routes rendered on each fetch.
  // Browsers that read SVG icons pick icon.svg; the rest fall back to the ICO.
  // A single size on the ICO keeps Chrome from preferring it over the SVG.
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '32x32' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: { url: '/apple-touch-icon.png', sizes: '180x180' },
  },
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
