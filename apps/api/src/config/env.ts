import { AgencySlugSchema } from '@focaldrop/shared';
import { z } from 'zod';

const EnvSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']),
    APP_ENV: z.enum(['development', 'test', 'staging', 'production']).optional(),
    DEFAULT_AGENCY_SLUG: z.preprocess(
      (value) => (value === '' ? undefined : value),
      AgencySlugSchema.optional(),
    ),
    PORT: z.coerce.number().int().min(1).max(65535).default(3001),
    SENTRY_DSN: z.preprocess(
      (value) => (value === '' ? undefined : value),
      z
        .url({ protocol: /^https?$/ })
        .pipe(
          z.string().refine((value) => {
            const dsn = new URL(value);
            return Boolean(dsn.username) && /\/\d+$/.test(dsn.pathname);
          }, 'Expected a Sentry DSN with a public key and project ID'),
        )
        .optional(),
    ),
    SENTRY_ENVIRONMENT: z.preprocess(
      (value) => (value === '' ? undefined : value),
      z.string().trim().min(1).optional(),
    ),
  })
  .transform((env) => ({ ...env, APP_ENV: env.APP_ENV ?? env.NODE_ENV }))
  .superRefine((env, context) => {
    if (env.APP_ENV === 'production' && env.DEFAULT_AGENCY_SLUG !== undefined) {
      context.addIssue({
        code: 'custom',
        path: ['DEFAULT_AGENCY_SLUG'],
        message: 'Must be unset when APP_ENV is production.',
      });
    }
  });

export type Env = z.infer<typeof EnvSchema>;

export function validateEnv(input: Record<string, unknown>): Env {
  const result = EnvSchema.safeParse(input);

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');

    throw new Error(`Invalid environment configuration: ${details}`);
  }

  return result.data;
}
