import { AgencySlugSchema } from '@focaldrop/shared';
import { z } from 'zod';

import type { AgencySpec } from './seed.js';
import { SafeError } from './safe-error.js';

const HostnameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(
    /^(?=.{1,253}$)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/,
  );

const ProvisionEnvSchema = z.object({
  PROVISION_TARGET: z.enum(['staging', 'production']),
  MIGRATIONS_DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
  SUPABASE_URL: z.url({ protocol: /^https$/ }),
  SUPABASE_SECRET_KEY: z.string().trim().min(1),
  AGENCY_SLUG: AgencySlugSchema,
  AGENCY_NAME: z.string().trim().min(1).max(120),
  AGENCY_HOSTNAME: HostnameSchema,
  OWNER_EMAIL: z.email().transform((email) => email.toLowerCase()),
  OWNER_NAME: z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.string().trim().min(1).max(120).optional(),
  ),
});

export interface ProvisionConfig {
  target: 'staging' | 'production';
  databaseUrl: string;
  authUrl: string;
  secretKey: string;
  spec: AgencySpec;
}

/**
 * Validates the provisioning destination and the agency data. Errors name the
 * variables only, never their values: the Actions logs of this repo are public.
 */
export function provisionConfig(env: NodeJS.ProcessEnv, args: readonly string[]): ProvisionConfig {
  const result = ProvisionEnvSchema.safeParse(env);
  if (!result.success) {
    const names = [...new Set(result.error.issues.map((issue) => issue.path.join('.')))];
    throw new SafeError(`Invalid provisioning configuration: ${names.join(', ')}.`);
  }
  const value = result.data;
  if (value.PROVISION_TARGET === 'production' && !args.includes('--confirm-production')) {
    throw new SafeError('Provisioning production requires --confirm-production.');
  }
  return {
    target: value.PROVISION_TARGET,
    databaseUrl: value.MIGRATIONS_DATABASE_URL,
    authUrl: value.SUPABASE_URL.replace(/\/$/, ''),
    secretKey: value.SUPABASE_SECRET_KEY,
    spec: {
      slug: value.AGENCY_SLUG,
      agencyName: value.AGENCY_NAME,
      hostname: value.AGENCY_HOSTNAME,
      // Staging runs on a host of the platform; production on the agency's own domain.
      domainKind: value.PROVISION_TARGET === 'staging' ? 'platform_subdomain' : 'custom',
      ownerEmail: value.OWNER_EMAIL,
      ownerName: value.OWNER_NAME ?? value.AGENCY_NAME,
    },
  };
}
