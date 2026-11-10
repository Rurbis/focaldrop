import { t } from '@/i18n/es-MX';

/**
 * Sections of the panel, the same for every panel design (A3). Only what works
 * today is listed: Galerías and Clientes join in milestone 1, never as dead links.
 */
export const panelSections = [{ href: '/admin', label: t.admin.nav.home }] as const;

export type PanelSection = (typeof panelSections)[number];

/**
 * Whether a section is the one on screen. The home matches only itself, so it
 * stops being current inside /admin/galleries; other sections cover their pages.
 */
export function isCurrentSection(pathname: string, href: string): boolean {
  if (href === '/admin') return pathname === '/admin' || pathname === '/admin/';
  return pathname === href || pathname.startsWith(`${href}/`);
}
