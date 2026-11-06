import type { AdminMe } from '@focaldrop/shared';
import { Controller, Get, Inject, UseGuards } from '@nestjs/common';

import { AuthGuard, CurrentUserId } from './auth.guard.js';
import { AuthService } from './auth.service.js';

@Controller('admin')
@UseGuards(AuthGuard)
export class AuthController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  @Get('me')
  getMe(@CurrentUserId() userId: string): Promise<AdminMe> {
    return this.auth.getMe(userId);
  }
}
