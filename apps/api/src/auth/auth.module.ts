import { Module } from '@nestjs/common';

import { DatabaseModule } from '../db/database.module.js';
import { TenancyModule } from '../tenancy/tenancy.module.js';
import { AccessTokenVerifier } from './access-token.verifier.js';
import { AuthController } from './auth.controller.js';
import { AuthGuard } from './auth.guard.js';
import { AUTH_OPTIONS, readAuthOptions } from './auth.options.js';
import { AuthRepository } from './auth.repository.js';
import { AuthService } from './auth.service.js';

@Module({
  imports: [DatabaseModule, TenancyModule],
  controllers: [AuthController],
  providers: [
    AccessTokenVerifier,
    AuthGuard,
    AuthRepository,
    AuthService,
    { provide: AUTH_OPTIONS, useFactory: () => readAuthOptions() },
  ],
})
export class AuthModule {}
