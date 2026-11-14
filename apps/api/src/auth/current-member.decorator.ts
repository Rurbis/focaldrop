import {
  createParamDecorator,
  InternalServerErrorException,
  type ExecutionContext,
} from '@nestjs/common';

import type { AuthenticatedRequest } from './auth.guard.js';
import type { Member } from './auth.repository.js';

export interface TenantRequest extends AuthenticatedRequest {
  member?: Member;
}

/** Fails closed if a controller forgets TenantGuard or runs the guards out of order. */
export function requestMember(context: ExecutionContext): Member {
  const { member } = context.switchToHttp().getRequest<TenantRequest>();
  if (!member) throw new InternalServerErrorException('Agency membership is unavailable.');
  return member;
}

export const CurrentMember = createParamDecorator((_data: unknown, context: ExecutionContext) =>
  requestMember(context),
);
