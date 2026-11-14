import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Injectable,
  Module,
  NotFoundException,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';

import { AuthGuard, CurrentUserId } from '../../src/auth/auth.guard.js';
import { AuthModule } from '../../src/auth/auth.module.js';
import type { Member } from '../../src/auth/auth.repository.js';
import { CurrentMember } from '../../src/auth/current-member.decorator.js';
import { Roles } from '../../src/auth/roles.decorator.js';
import { RolesGuard } from '../../src/auth/roles.guard.js';
import { TenantGuard } from '../../src/auth/tenant.guard.js';
import { DatabaseModule, DatabaseService } from '../../src/db/database.module.js';
import { agencyDomains } from '../../src/db/schema/index.js';
import { TenantContext } from '../../src/tenancy/tenant.context.js';
import { TenantRepository } from '../../src/tenancy/tenant.repository.js';
import { TenancyModule } from '../../src/tenancy/tenancy.module.js';

// Test-only routes exercise the real guards and repository against an existing
// tenant-owned table. They are never imported by AppModule or shipped in dist.
const fields = {
  id: agencyDomains.id,
  agencyId: agencyDomains.agencyId,
  hostname: agencyDomains.hostname,
};
export type DomainWrite = { hostname: string; agencyId?: string };

@Injectable()
export class TestDomainsRepository extends TenantRepository<typeof agencyDomains> {
  constructor(
    @Inject(DatabaseService) database: DatabaseService,
    @Inject(TenantContext) context: TenantContext,
  ) {
    super(database, context, agencyDomains);
  }

  async list() {
    return this.selectForTenant(fields);
  }

  async find(id: string) {
    const [row] = await this.selectForTenant(fields, eq(agencyDomains.id, id)).limit(1);
    if (!row) throw new NotFoundException();
    return row;
  }

  async create(input: DomainWrite) {
    const [row] = await this.insertForTenant({ ...input, kind: 'custom' }).returning(fields);
    return row;
  }

  async update(id: string, input: DomainWrite) {
    const [row] = await this.updateForTenant(input, eq(agencyDomains.id, id)).returning(fields);
    if (!row) throw new NotFoundException();
    return row;
  }

  async remove(id: string) {
    const [row] = await this.deleteForTenant(eq(agencyDomains.id, id)).returning(fields);
    if (!row) throw new NotFoundException();
    return row;
  }
}

@Controller('admin/isolation-fixture/domains')
@UseGuards(AuthGuard, TenantGuard, RolesGuard)
@Roles('owner', 'staff')
export class TestDomainsController {
  constructor(@Inject(TestDomainsRepository) private readonly domains: TestDomainsRepository) {}

  @Get()
  list() {
    return this.domains.list();
  }

  @Get(':id')
  find(@Param('id') id: string) {
    return this.domains.find(id);
  }

  @Post()
  @Roles('owner')
  create(@Body() input: DomainWrite) {
    return this.domains.create(input);
  }

  @Patch(':id')
  @Roles('owner')
  update(@Param('id') id: string, @Body() input: DomainWrite) {
    return this.domains.update(id, input);
  }

  @Delete(':id')
  @Roles('owner')
  remove(@Param('id') id: string) {
    return this.domains.remove(id);
  }
}

@Controller('admin/isolation-fixture/guard-order')
export class TestGuardOrderController {
  @Get('user')
  @UseGuards(AuthGuard)
  user(@CurrentUserId() userId: string) {
    return { userId };
  }

  @Get('missing-user')
  missingUser(@CurrentUserId() userId: string) {
    return { userId };
  }

  @Get('missing-member')
  @UseGuards(AuthGuard)
  missingMember(@CurrentMember() member: Member) {
    return member;
  }
}

@Module({
  imports: [AuthModule, TenancyModule, DatabaseModule],
  controllers: [TestDomainsController, TestGuardOrderController],
  providers: [TestDomainsRepository],
})
export class TestTenantResourcesModule {}
