import { Module, RequestMethod, type MiddlewareConsumer, type NestModule } from '@nestjs/common';
import { ClsModule } from 'nestjs-cls';

import { DatabaseModule } from '../db/database.module.js';
import { TenantContext } from './tenant.context.js';
import { TenantMiddleware } from './tenant.middleware.js';
import { TenancyController } from './tenancy.controller.js';
import { readTenancyOptions, TENANCY_OPTIONS } from './tenancy.options.js';
import { TenancyRepository } from './tenancy.repository.js';
import { TenancyService } from './tenancy.service.js';

@Module({
  imports: [DatabaseModule, ClsModule.forRoot()],
  controllers: [TenancyController],
  providers: [
    TenancyRepository,
    TenancyService,
    TenantContext,
    TenantMiddleware,
    { provide: TENANCY_OPTIONS, useFactory: readTenancyOptions },
  ],
  exports: [TenantContext],
})
export class TenancyModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(TenantMiddleware)
      .forRoutes(
        { path: 'public', method: RequestMethod.ALL },
        { path: 'public/*path', method: RequestMethod.ALL },
        { path: 'admin', method: RequestMethod.ALL },
        { path: 'admin/*path', method: RequestMethod.ALL },
      );
  }
}
