import { AdminMeSchema, type AdminMe } from '@focaldrop/shared';
import { Inject, Injectable } from '@nestjs/common';

import { TenantContext } from '../tenancy/tenant.context.js';
import type { Member } from './auth.repository.js';

@Injectable()
export class AuthService {
  constructor(@Inject(TenantContext) private readonly context: TenantContext) {}

  getMe(member: Member): AdminMe {
    const agency = this.context.get();
    return AdminMeSchema.parse({
      profile: { id: member.id, fullName: member.fullName },
      agency,
      role: member.role,
    });
  }
}
