import type { PublicTenant } from '@focaldrop/shared';
import { Controller, Get, Header, Inject } from '@nestjs/common';

import { TenantContext } from './tenant.context.js';

@Controller('public')
export class TenancyController {
  constructor(@Inject(TenantContext) private readonly context: TenantContext) {}

  @Get('tenant')
  @Header('Cache-Control', 'no-store')
  getTenant(): PublicTenant {
    return this.context.get();
  }
}
