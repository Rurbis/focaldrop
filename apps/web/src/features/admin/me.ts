import 'server-only';

import { AdminMeSchema, type AdminMe } from '@focaldrop/shared';

import { normalizeTenantHost } from '@/features/tenancy/host';
import { ApiError, reportApiError } from '@/lib/api/errors';
import { fetchFromApi } from '@/lib/api/fetch';
import { getApiUrl } from '@/lib/api/server-env';
import { getApiAccessToken } from '@/lib/api/session';

export type AdminHome =
  | { status: 'ready'; me: AdminMe }
  | { status: 'signed-out' }
  | { status: 'unknown-agency' }
  | { status: 'no-access' }
  | { status: 'unavailable' };

/** The signed-in member for the panel's home, read from Nest server to server (D62). */
export async function getAdminHome(host: string | null): Promise<AdminHome> {
  try {
    const hostname = normalizeTenantHost(host);
    const token = await getApiAccessToken();
    const response = await fetchFromApi(new URL('/admin/me', getApiUrl()), {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
        'X-Tenant-Host': hostname,
      },
    });
    if (response.status !== 200) {
      await response.body?.cancel();
      if (response.status === 401) return { status: 'signed-out' };
      if (response.status === 403) return { status: 'no-access' };
      if (response.status === 404) return { status: 'unknown-agency' };
      throw new ApiError(response.status >= 500 ? response.status : 502, 'INVALID_ME_RESPONSE');
    }
    const me = AdminMeSchema.safeParse(await response.json().catch(() => undefined));
    if (!me.success) throw new ApiError(502, 'INVALID_ME_RESPONSE');
    return { status: 'ready', me: me.data };
  } catch (error) {
    // Only signing in again helps. An Auth outage is a 503 and lands below.
    if (error instanceof ApiError && error.status === 401) return { status: 'signed-out' };
    reportApiError(error);
    return { status: 'unavailable' };
  }
}
