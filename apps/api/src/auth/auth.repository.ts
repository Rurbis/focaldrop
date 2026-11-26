import type { AgencyMemberRole } from '@focaldrop/shared';
import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';

import { DatabaseService } from '../db/database.module.js';
import { agencyMembers, profiles } from '../db/schema/index.js';
import { TenantContext } from '../tenancy/tenant.context.js';
import { TenantRepository } from '../tenancy/tenant.repository.js';

export interface Member {
  id: string;
  fullName: string;
  role: AgencyMemberRole;
}

@Injectable()
export class AuthRepository extends TenantRepository<typeof agencyMembers> {
  constructor(
    @Inject(DatabaseService) database: DatabaseService,
    @Inject(TenantContext) context: TenantContext,
  ) {
    super(database, context, agencyMembers);
  }

  async findMember(userId: string): Promise<Member | undefined> {
    const [member] = await this.selectForTenant(
      { id: profiles.id, fullName: profiles.fullName, role: agencyMembers.role },
      eq(agencyMembers.userId, userId),
    )
      .innerJoin(profiles, eq(agencyMembers.userId, profiles.id))
      .limit(1);
    return member;
  }
}
