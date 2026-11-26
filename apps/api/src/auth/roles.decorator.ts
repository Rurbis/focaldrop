import type { AgencyMemberRole } from '@focaldrop/shared';
import { SetMetadata } from '@nestjs/common';

export const AGENCY_ROLES = Symbol('agency-roles');

/** Roles come from agency_members, never from JWT metadata or the request body. */
export const Roles = (...roles: [AgencyMemberRole, ...AgencyMemberRole[]]) =>
  SetMetadata(AGENCY_ROLES, roles);
