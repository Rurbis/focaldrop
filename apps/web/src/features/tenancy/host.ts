import { ApiError } from '@/lib/api/errors';

/** Matches Nest's DNS/IPv4 rules without importing its HTTP exceptions. */
export function normalizeTenantHost(value: string | null): string {
  if (value === null) throw new ApiError(400, 'INVALID_TENANT_HOST');
  const match = /^([^:]+)(?::(\d{1,5}))?$/.exec(value.trim());
  const hostname = match?.[1]?.toLowerCase().replace(/\.$/, '');
  const port = match?.[2];
  const validLabels = hostname
    ?.split('.')
    .every((label) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label));
  if (
    !hostname ||
    hostname.length > 253 ||
    /[^a-z0-9.-]/.test(hostname) ||
    !validLabels ||
    (port !== undefined && (Number(port) < 1 || Number(port) > 65535))
  ) {
    throw new ApiError(400, 'INVALID_TENANT_HOST');
  }
  return hostname;
}
