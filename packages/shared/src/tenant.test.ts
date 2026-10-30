import { describe, expect, it } from 'vitest';

import { PublicTenantSchema } from './tenant.js';

const tenant = {
  id: '0199e0a4-7c2b-7d3e-8f41-2a6b9c0d1e2f',
  slug: 'demo',
  name: 'Demo agency',
  status: 'active',
  timezone: 'America/Mexico_City',
  locale: 'es-MX',
  currency: 'MXN',
};

describe('PublicTenantSchema', () => {
  it('keeps the public contract and strips internal settings', () => {
    expect(
      PublicTenantSchema.parse({
        ...tenant,
        notificationEmail: 'private@example.invalid',
        notificationPreferences: { delivered: true },
        storagePolicyAcceptedAt: new Date(),
        retentionDays: 60,
      }),
    ).toEqual(tenant);
  });

  it('validates the agency identity and locale at runtime', () => {
    expect(PublicTenantSchema.safeParse({ ...tenant, id: 'not-a-uuid' }).success).toBe(false);
    expect(PublicTenantSchema.safeParse({ ...tenant, locale: 'en-US' }).success).toBe(false);
  });
});
