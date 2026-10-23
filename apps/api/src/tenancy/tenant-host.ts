import { BadRequestException } from '@nestjs/common';

/** DNS names/IPv4 match agency_domains; literal IPv6 is not stored in that table. */
export function normalizeTenantHost(value: string | string[] | undefined): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') throw new BadRequestException('Invalid tenant host.');

  const match = /^([^:]+)(?::(\d{1,5}))?$/.exec(value.trim());
  const hostname = match?.[1]?.toLowerCase().replace(/\.$/, '');
  const port = match?.[2];
  const validLabels = hostname
    ?.split('.')
    .every((label) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label));

  if (
    !hostname ||
    hostname.length > 253 ||
    !validLabels ||
    (port !== undefined && (Number(port) < 1 || Number(port) > 65535))
  ) {
    throw new BadRequestException('Invalid tenant host.');
  }
  return hostname;
}
