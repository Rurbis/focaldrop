import { describe, expect, it } from 'vitest';

import { AdminMeSchema } from './admin.js';

const me = {
  profile: { id: '3f0c8a52-6d1e-4b7a-9c2d-1e5f7a9b0c3d', fullName: 'Demo Owner' },
  agency: {
    id: '0199e0a4-7c2b-7d3e-8f41-2a6b9c0d1e2f',
    slug: 'demo',
    name: 'Demo agency',
    status: 'active',
    timezone: 'America/Mexico_City',
    locale: 'es-MX',
    currency: 'MXN',
  },
  role: 'owner',
};

describe('AdminMeSchema', () => {
  it('keeps the contract and strips internal settings', () => {
    const parsed = AdminMeSchema.parse({
      ...me,
      profile: { ...me.profile, isPlatformAdmin: true },
      agency: { ...me.agency, notificationEmail: 'private@example.invalid' },
    });

    expect(parsed).toEqual(me);
  });

  it.each([
    ['an unknown role', { ...me, role: 'admin' }],
    ['an empty name', { ...me, profile: { ...me.profile, fullName: ' ' } }],
    ['a profile ID that is not a UUID', { ...me, profile: { ...me.profile, id: 'demo' } }],
    ['a missing agency', { profile: me.profile, role: me.role }],
  ])('rejects %s', (_name, input) => {
    expect(AdminMeSchema.safeParse(input).success).toBe(false);
  });
});
