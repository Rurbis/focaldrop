import { AdminMeSchema, type AdminMe } from '@focaldrop/shared';
import { ForbiddenException, Inject, Injectable } from '@nestjs/common';

import { TenantContext } from '../tenancy/tenant.context.js';
import { AuthRepository } from './auth.repository.js';

@Injectable()
export class AuthService {
  constructor(
    @Inject(AuthRepository) private readonly repository: Pick<AuthRepository, 'findMember'>,
    @Inject(TenantContext) private readonly context: TenantContext,
  ) {}

  async getMe(userId: string): Promise<AdminMe> {
    const agency = this.context.get();
    const member = await this.repository.findMember(agency.id, userId);
    // Not a 401: signing in again would not help. Not a 404 either: the agency of
    // a host is public, and the panel must tell this apart from an unknown host.
    if (!member) throw new ForbiddenException();

    return AdminMeSchema.parse({
      profile: { id: member.id, fullName: member.fullName },
      agency,
      role: member.role,
    });
  }
}
