import {
  createParamDecorator,
  Inject,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import type { Request } from 'express';

import { AccessTokenVerifier } from './access-token.verifier.js';

export interface AuthenticatedRequest extends Request {
  userId?: string;
}

const BEARER_TOKEN = /^Bearer (\S+)$/i;

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(AccessTokenVerifier) private readonly tokens: Pick<AccessTokenVerifier, 'verify'>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = BEARER_TOKEN.exec(request.headers.authorization ?? '')?.[1];
    if (!token) throw new UnauthorizedException();

    request.userId = await this.tokens.verify(token);
    return true;
  }
}

/** The user that `AuthGuard` verified. Without the guard it fails instead of being empty. */
export const CurrentUserId = createParamDecorator(
  (_data: unknown, context: ExecutionContext): string => {
    const { userId } = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!userId) throw new InternalServerErrorException('Authenticated user is unavailable.');
    return userId;
  },
);
