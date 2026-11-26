'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { t } from '@/i18n/es-MX';

import { isCurrentSection, panelSections } from '../nav';

/**
 * Sections as text links beside the logo; the current one is underlined in
 * the accent. On phones it shows only when there is more than one section;
 * milestone 1 adds the menu that holds them there.
 */
export function PanelNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label={t.admin.nav.label}
      className={panelSections.length > 1 ? 'flex' : 'hidden sm:flex'}
    >
      <ul className="flex gap-7">
        {panelSections.map((section) => {
          const current = isCurrentSection(pathname, section.href);
          return (
            <li key={section.href}>
              <Link
                href={section.href}
                aria-current={current ? 'page' : undefined}
                className={`rounded-sm text-ui ${
                  current
                    ? 'font-semibold text-ink underline decoration-accent decoration-2 underline-offset-[0.6rem]'
                    : 'font-medium text-ink-muted hover:text-ink'
                }`}
              >
                {section.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
