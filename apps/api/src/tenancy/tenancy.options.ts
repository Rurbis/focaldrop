import { AgencySlugSchema } from '@focaldrop/shared';
import { z } from 'zod';

export const TENANCY_OPTIONS = Symbol('TENANCY_OPTIONS');

const OptionsSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']),
  DEFAULT_AGENCY_SLUG: z.preprocess(
    (value) => (value === '' ? undefined : value),
    AgencySlugSchema.optional(),
  ),
});

export interface TenancyOptions {
  environment: 'development' | 'test' | 'production';
  defaultSlug?: string;
}

export function readTenancyOptions(input: NodeJS.ProcessEnv = process.env): TenancyOptions {
  const result = OptionsSchema.safeParse(input);
  if (!result.success) throw new Error('Invalid tenancy environment configuration.');

  return {
    environment: result.data.NODE_ENV,
    defaultSlug:
      result.data.NODE_ENV === 'production' ? undefined : result.data.DEFAULT_AGENCY_SLUG,
  };
}
