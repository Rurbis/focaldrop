import {
  ForbiddenException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { AuthRepository } from './auth.repository.js';
import type { TenantRequest } from './current-member.decorator.js';
import { TenantAccess } from './tenant-access.decorator.js';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(
    @Inject(AuthRepository) private readonly repository: Pick<AuthRepository, 'findMember'>,
    @Inject(Reflector) private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<TenantRequest>();
    if (!request.userId) {
      throw new InternalServerErrorException('Authenticated user is unavailable.');
    }
    const member = await this.repository.findMember(request.userId);
    if (!member) {
      const policy = this.reflector.getAllAndOverride(TenantAccess, [
        context.getHandler(),
        context.getClass(),
      ]);
      if (policy?.onMissingMembership === 'forbidden') throw new ForbiddenException();
      throw new NotFoundException();
    }
    request.member = member;
    return true;
  }
}
