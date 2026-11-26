import type { AgencyMemberRole } from '@focaldrop/shared';
import { Inject, Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { requestMember } from './current-member.decorator.js';
import { AGENCY_ROLES } from './roles.decorator.js';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(@Inject(Reflector) private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const member = requestMember(context);
    const roles = this.reflector.getAllAndOverride<readonly AgencyMemberRole[]>(AGENCY_ROLES, [
      context.getHandler(),
      context.getClass(),
    ]);
    return roles === undefined || roles.includes(member.role);
  }
}
