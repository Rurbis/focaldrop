import { z } from 'zod';

import { AgencyMemberRoleSchema } from './platform.js';
import { PublicTenantSchema } from './tenant.js';

/** The signed-in member as `GET /admin/me` returns it: never account settings. */
export const AdminMeSchema = z.object({
  profile: z.object({
    id: z.uuid(),
    fullName: z.string().trim().min(1).max(120),
  }),
  agency: PublicTenantSchema,
  role: AgencyMemberRoleSchema,
});

export type AdminMe = z.infer<typeof AdminMeSchema>;
