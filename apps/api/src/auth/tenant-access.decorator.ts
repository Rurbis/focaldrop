import { Reflector } from '@nestjs/core';

/** Only the public-facing /admin/me contract distinguishes missing membership. */
export const TenantAccess = Reflector.createDecorator<{
  onMissingMembership: 'forbidden' | 'not-found';
}>();
