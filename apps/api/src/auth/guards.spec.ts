import 'reflect-metadata';

import { SetMetadata, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host.js';

import { AuthGuard } from './auth.guard.js';
import type { Member } from './auth.repository.js';
import { requestMember, type TenantRequest } from './current-member.decorator.js';
import { AGENCY_ROLES, Roles } from './roles.decorator.js';
import { RolesGuard } from './roles.guard.js';
import { TenantAccess } from './tenant-access.decorator.js';
import { TenantGuard } from './tenant.guard.js';

const owner = { id: 'verified-user', fullName: 'Owner', role: 'owner' } satisfies Member;

@Roles('owner')
@TenantAccess({ onMissingMembership: 'forbidden' })
class RestrictedController {
  inherited() {}

  @Roles('staff')
  @TenantAccess({ onMissingMembership: 'not-found' })
  overridden() {}

  @Roles('owner', 'staff')
  either() {}

  @SetMetadata(AGENCY_ROLES, [])
  nobody() {}
}

class PlainController {
  read() {}
}

function context(
  request: Partial<TenantRequest>,
  controller: typeof PlainController | typeof RestrictedController = PlainController,
  handler = 'read',
) {
  return new ExecutionContextHost(
    [request],
    controller,
    Object.getOwnPropertyDescriptor(controller.prototype, handler)!.value as () => void,
  );
}

describe('AuthGuard', () => {
  const verify = vi.fn<(token: string) => Promise<string>>();
  const guard = new AuthGuard({ verify });

  beforeEach(() => {
    verify.mockReset().mockResolvedValue(owner.id);
  });

  it.each([undefined, '', 'Bearer', 'Basic token', 'Bearer one two'])(
    'rejects a missing or malformed bearer header: %s',
    async (authorization) => {
      await expect(guard.canActivate(context({ headers: { authorization } }))).rejects.toThrow(
        UnauthorizedException,
      );
      expect(verify).not.toHaveBeenCalled();
    },
  );

  it('stores only the verified token subject, ignoring user data in the body', async () => {
    const req = { headers: { authorization: 'bEaReR actual-token' }, body: { userId: 'forged' } };
    await expect(guard.canActivate(context(req))).resolves.toBe(true);
    expect(verify).toHaveBeenCalledExactlyOnceWith('actual-token');
    expect(req).toHaveProperty('userId', owner.id);
  });

  it('propagates token rejection without setting a user', async () => {
    verify.mockRejectedValue(new UnauthorizedException());
    const req = { headers: { authorization: 'Bearer invalid' } };
    await expect(guard.canActivate(context(req))).rejects.toThrow(UnauthorizedException);
    expect(req).not.toHaveProperty('userId');
  });
});

describe('TenantGuard', () => {
  const findMember = vi.fn<(userId: string) => Promise<Member | undefined>>();
  const guard = new TenantGuard({ findMember }, new Reflector());

  beforeEach(() => {
    findMember.mockReset().mockResolvedValue(owner);
  });

  it('fails closed if AuthGuard did not verify a user', async () => {
    await expect(guard.canActivate(context({ body: { userId: owner.id } }))).rejects.toMatchObject({
      status: 500,
    });
    expect(findMember).not.toHaveBeenCalled();
  });

  it('loads membership for the verified user and ignores body membership/roles', async () => {
    const req = { userId: owner.id, body: { agencyId: 'other', role: 'staff' } };
    await expect(guard.canActivate(context(req))).resolves.toBe(true);
    expect(findMember).toHaveBeenCalledExactlyOnceWith(owner.id);
    expect(req).toHaveProperty('member', owner);
  });

  it('hides private resources with 404 for non-members by default', async () => {
    findMember.mockResolvedValue(undefined);
    await expect(guard.canActivate(context({ userId: owner.id }))).rejects.toMatchObject({
      status: 404,
    });
  });

  it('supports the explicit 403 profile contract', async () => {
    findMember.mockResolvedValue(undefined);
    await expect(
      guard.canActivate(context({ userId: owner.id }, RestrictedController, 'inherited')),
    ).rejects.toMatchObject({ status: 403 });
  });

  it('lets method metadata override the class policy', async () => {
    findMember.mockResolvedValue(undefined);
    await expect(
      guard.canActivate(context({ userId: owner.id }, RestrictedController, 'overridden')),
    ).rejects.toMatchObject({ status: 404 });
  });

  it('does not grant membership during a repository outage', async () => {
    const failure = new Error('Database unavailable');
    findMember.mockRejectedValue(failure);
    const req = { userId: owner.id };
    await expect(guard.canActivate(context(req))).rejects.toBe(failure);
    expect(req).not.toHaveProperty('member');
  });
});

describe('RolesGuard and CurrentMember', () => {
  const guard = new RolesGuard(new Reflector());

  it('fails closed without TenantGuard, even when the route has no role restriction', () => {
    expect(() => guard.canActivate(context({ userId: owner.id }))).toThrow(
      'Agency membership is unavailable.',
    );
  });

  it('permits a verified member when no Roles metadata is defined', () => {
    expect(guard.canActivate(context({ member: owner }))).toBe(true);
    expect(requestMember(context({ member: owner }))).toBe(owner);
  });

  it('reads class role metadata', () => {
    expect(guard.canActivate(context({ member: owner }, RestrictedController, 'inherited'))).toBe(
      true,
    );
    expect(
      guard.canActivate(
        context({ member: { ...owner, role: 'staff' } }, RestrictedController, 'inherited'),
      ),
    ).toBe(false);
  });

  it('uses the method roles instead of the class roles', () => {
    expect(guard.canActivate(context({ member: owner }, RestrictedController, 'overridden'))).toBe(
      false,
    );
    expect(
      guard.canActivate(
        context({ member: { ...owner, role: 'staff' } }, RestrictedController, 'overridden'),
      ),
    ).toBe(true);
  });

  it.each(['owner', 'staff'] as const)('supports multiple permitted roles: %s', (role) => {
    expect(
      guard.canActivate(context({ member: { ...owner, role } }, RestrictedController, 'either')),
    ).toBe(true);
  });

  it('denies an empty allowed-role list', () => {
    expect(guard.canActivate(context({ member: owner }, RestrictedController, 'nobody'))).toBe(
      false,
    );
  });

  it('does not trust roles supplied in the request body', () => {
    expect(
      guard.canActivate(
        context(
          { member: { ...owner, role: 'staff' }, body: { role: 'owner', isPlatformAdmin: true } },
          RestrictedController,
          'inherited',
        ),
      ),
    ).toBe(false);
  });
});
