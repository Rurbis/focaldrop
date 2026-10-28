import 'server-only';

import { PublicTenantSchema, type PublicTenant } from '@focaldrop/shared';
import { revalidateTag, unstable_cache } from 'next/cache';

import { ApiError } from '@/lib/api/errors';
import { fetchFromApi } from '@/lib/api/fetch';
import { getApiUrl } from '@/lib/api/server-env';

import { normalizeTenantHost } from './host';

const AGENCY_DOMAINS_TAG = 'agency-domains';

async function fetchAgency(apiUrl: string, hostname: string): Promise<PublicTenant> {
  const response = await fetchFromApi(new URL('/public/tenant', apiUrl), {
    headers: { Accept: 'application/json', 'X-Tenant-Host': hostname },
  });
  if (response.status === 404) throw new ApiError(404, 'AGENCY_NOT_FOUND');
  if (response.status !== 200) throw new ApiError(502, 'INVALID_AGENCY_RESPONSE');
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new ApiError(502, 'INVALID_AGENCY_RESPONSE');
  }
  const result = PublicTenantSchema.safeParse(body);
  if (!result.success) throw new ApiError(502, 'INVALID_AGENCY_RESPONSE');
  if (result.data.status !== 'active') throw new ApiError(404, 'AGENCY_NOT_FOUND');
  return result.data;
}

// Both arguments are cache keys. Never pass cookies, claims or tokens here.
const getCachedAgency = unstable_cache(fetchAgency, ['agency-by-host-v1'], {
  tags: [AGENCY_DOMAINS_TAG],
  revalidate: 60,
});

export function getAgencyByHost(host: string | null): Promise<PublicTenant> {
  const hostname = normalizeTenantHost(host);
  return getCachedAgency(getApiUrl(), hostname);
}

/** Call only after authorizing maintenance or a future domain mutation. */
export function invalidateAgencyDomains(): void {
  revalidateTag(AGENCY_DOMAINS_TAG, { expire: 0 });
}
