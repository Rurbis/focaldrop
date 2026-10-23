import type { PublicTenant } from '@focaldrop/shared';
import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';

import { DatabaseService } from '../db/database.module.js';
import { agencies, agencyDomains } from '../db/schema/index.js';

const publicColumns = {
  id: agencies.id,
  slug: agencies.slug,
  name: agencies.name,
  status: agencies.status,
  timezone: agencies.timezone,
  locale: agencies.locale,
  currency: agencies.currency,
};

@Injectable()
export class TenancyRepository {
  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}

  // This lookup discovers agency_id; subsequent private repositories must require it.
  async findByHostname(hostname: string): Promise<PublicTenant | undefined> {
    const [tenant] = await this.database.db
      .select(publicColumns)
      .from(agencyDomains)
      .innerJoin(agencies, eq(agencyDomains.agencyId, agencies.id))
      .where(eq(agencyDomains.hostname, hostname))
      .limit(1);
    return tenant;
  }

  async findBySlug(slug: string): Promise<PublicTenant | undefined> {
    const [tenant] = await this.database.db
      .select(publicColumns)
      .from(agencies)
      .where(eq(agencies.slug, slug))
      .limit(1);
    return tenant;
  }
}
