// Entry of the Cloudflare Worker (wrangler.jsonc `main`): the handler that
// OpenNext generates, wrapped with Sentry so server errors reach it (#22).
// Wrangler bundles this file, not Next, so `NEXT_PUBLIC_*` values are not
// inlined here: deploy-web.yml passes the DSN as a Worker variable instead.
import * as Sentry from '@sentry/nextjs/cloudflare';

// @ts-expect-error -- `cf:build` generates .open-next/worker.js, untyped.
import handler from './.open-next/worker.js';
import { SENTRY_BASE_OPTIONS } from './src/lib/sentry/options';

interface Env {
  SENTRY_DSN?: string;
  SENTRY_ENVIRONMENT?: string;
}

export default Sentry.withSentry(
  (env: Env) => ({
    ...SENTRY_BASE_OPTIONS,
    dsn: env.SENTRY_DSN || undefined,
    environment: env.SENTRY_ENVIRONMENT,
  }),
  handler,
);
