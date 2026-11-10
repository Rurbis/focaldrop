import 'server-only';

import { headers } from 'next/headers';

import { getAdminHome } from '@/features/admin/me';

/**
 * The agency of the signed-in member, in the top bar. It reuses the page's
 * request (getAdminHome is cached per render) and shows nothing when the panel
 * could not load the member: the bar never names an agency the page can't show.
 */
export async function AgencyName() {
  const home = await getAdminHome((await headers()).get('host'));
  if (home.status !== 'ready') return null;
  return (
    <span className="max-w-[12rem] truncate text-ui text-ink-muted sm:max-w-[20rem]">
      {home.me.agency.name}
    </span>
  );
}
