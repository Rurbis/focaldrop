import { Module } from '@nestjs/common';

import { DatabaseModule } from '../db/database.module.js';
import { TenancyModule } from '../tenancy/tenancy.module.js';
import { AccessTokenVerifier } from './access-token.verifier.js';
import { AuthController } from './auth.controller.js';
import { AuthGuard } from './auth.guard.js';
import { AUTH_OPTIONS, readAuthOptions } from './auth.options.js';
import { AuthRepository } from './auth.repository.js';
import { AuthService } from './auth.service.js';
import { RolesGuard } from './roles.guard.js';
import { TenantGuard } from './tenant.guard.js';

@Module({
  imports: [DatabaseModule, TenancyModule],
  controllers: [AuthController],
  providers: [
    AccessTokenVerifier,
    AuthGuard,
    TenantGuard,
    RolesGuard,
    AuthRepository,
    AuthService,
    { provide: AUTH_OPTIONS, useFactory: () => readAuthOptions() },
  ],
  // Nest instantiates controller guards in the consuming module too, so their
  // injected dependencies must be exported alongside them.
  exports: [AuthGuard, TenantGuard, RolesGuard, AccessTokenVerifier, AuthRepository],
})
export class AuthModule {}
