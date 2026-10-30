import 'server-only';

import { PublicTenantSchema, type PublicTenant } from '@focaldrop/shared';

import { ApiError } from '@/lib/api/errors';
import { fetchFromApi } from '@/lib/api/fetch';
import { getApiUrl } from '@/lib/api/server-env';

import { normalizeTenantHost } from './host';

export async function getAgencyByHost(host: string | null): Promise<PublicTenant> {
  const hostname = normalizeTenantHost(host);
  const response = await fetchFromApi(new URL('/public/tenant', getApiUrl()), {
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
