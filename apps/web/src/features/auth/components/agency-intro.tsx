import 'server-only';

import { headers } from 'next/headers';

import { getAgencyByHost } from '@/features/tenancy/server';
import { t } from '@/i18n/es-MX';
import { ApiError, reportApiError } from '@/lib/api/errors';

/**
 * Names the agency of this host on the login page, so the owner knows which
 * panel they are entering. It streams in after the form: if the API is slow or
 * down, the page keeps the generic sentence and the form works the same.
 */
export async function AgencyIntro() {
  try {
    const agency = await getAgencyByHost((await headers()).get('host'));
    return t.auth.login.introFor(agency.name);
  } catch (error) {
    // An unknown host is expected; anything else is an outage worth a log line.
    if (!(error instanceof ApiError && error.status === 404)) reportApiError(error);
    return t.auth.login.intro;
  }
}
