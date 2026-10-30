import { validateEnv, type Env } from '../config/env.js';

export const TENANCY_OPTIONS = Symbol('TENANCY_OPTIONS');

export interface TenancyOptions {
  environment: Env['APP_ENV'];
  defaultSlug?: string;
}

export function readTenancyOptions(input: NodeJS.ProcessEnv = process.env): TenancyOptions {
  const env = validateEnv(input);

  return {
    environment: env.APP_ENV,
    defaultSlug: env.DEFAULT_AGENCY_SLUG,
  };
}
