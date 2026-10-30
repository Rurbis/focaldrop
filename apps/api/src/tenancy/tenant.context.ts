import type { PublicTenant } from '@focaldrop/shared';
import { Inject, Injectable, InternalServerErrorException } from '@nestjs/common';
import { ClsService, type ClsStore } from 'nestjs-cls';

interface TenantStore extends ClsStore {
  tenant?: PublicTenant;
}

@Injectable()
export class TenantContext {
  constructor(@Inject(ClsService) private readonly cls: ClsService<TenantStore>) {}

  run(tenant: PublicTenant, callback: () => void): void {
    this.cls.runWith({ tenant }, callback);
  }

  get(): PublicTenant {
    const tenant = this.cls.get('tenant');
    if (!tenant) throw new InternalServerErrorException('Tenant context is unavailable.');
    return tenant;
  }
}
