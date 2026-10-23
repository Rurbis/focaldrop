import { z } from 'zod';

import { AgencySchema } from './agency.js';

/** Public host resolution must never expose agency notification/account settings. */
export const PublicTenantSchema = AgencySchema.pick({
  id: true,
  slug: true,
  name: true,
  status: true,
  timezone: true,
  locale: true,
  currency: true,
});

export type PublicTenant = z.infer<typeof PublicTenantSchema>;
