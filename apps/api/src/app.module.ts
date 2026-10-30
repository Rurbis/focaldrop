import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { SentryGlobalFilter, SentryModule } from '@sentry/nestjs/setup';

import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { TenancyModule } from './tenancy/tenancy.module.js';

@Module({
  imports: [SentryModule.forRoot(), TenancyModule],
  controllers: [AppController],
  providers: [{ provide: APP_FILTER, useClass: SentryGlobalFilter }, AppService],
})
export class AppModule {}
