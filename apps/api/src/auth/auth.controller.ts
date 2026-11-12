import type { AdminMe } from '@focaldrop/shared';
import { Controller, Get, Inject, UseGuards } from '@nestjs/common';

import { AuthGuard } from './auth.guard.js';
import type { Member } from './auth.repository.js';
import { AuthService } from './auth.service.js';
import { CurrentMember } from './current-member.decorator.js';
import { Roles } from './roles.decorator.js';
import { RolesGuard } from './roles.guard.js';
import { TenantAccess } from './tenant-access.decorator.js';
import { TenantGuard } from './tenant.guard.js';

@Controller('admin')
@UseGuards(AuthGuard, TenantGuard, RolesGuard)
@Roles('owner', 'staff')
export class AuthController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  @Get('me')
  @TenantAccess({ onMissingMembership: 'forbidden' })
  getMe(@CurrentMember() member: Member): AdminMe {
    return this.auth.getMe(member);
  }
}
