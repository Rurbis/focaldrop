import { Inject, Injectable, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

import { TenantContext } from './tenant.context.js';
import { TenancyService } from './tenancy.service.js';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(
    @Inject(TenancyService) private readonly tenancy: TenancyService,
    @Inject(TenantContext) private readonly context: TenantContext,
  ) {}

  async use(request: Request, response: Response, next: NextFunction): Promise<void> {
    // Errors also vary by tenant header; shared HTTP caches must never reuse them.
    response.setHeader('Cache-Control', 'no-store');
    try {
      const tenant = await this.tenancy.resolve(request.headers['x-tenant-host']);
      this.context.run(tenant, () => next());
    } catch (error) {
      next(error);
    }
  }
}
