import type { AgencyMemberRole } from '@focaldrop/shared';
import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';

import { DatabaseService } from '../db/database.module.js';
import { agencyMembers, profiles } from '../db/schema/index.js';

export interface Member {
  id: string;
  fullName: string;
  role: AgencyMemberRole;
}

@Injectable()
export class AuthRepository {
  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}

  async findMember(agencyId: string, userId: string): Promise<Member | undefined> {
    const [member] = await this.database.db
      .select({ id: profiles.id, fullName: profiles.fullName, role: agencyMembers.role })
      .from(agencyMembers)
      .innerJoin(profiles, eq(agencyMembers.userId, profiles.id))
      .where(and(eq(agencyMembers.agencyId, agencyId), eq(agencyMembers.userId, userId)))
      .limit(1);
    return member;
  }
}
