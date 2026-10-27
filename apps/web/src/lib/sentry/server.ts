import * as Sentry from '@sentry/nextjs';

import { SENTRY_BASE_OPTIONS } from './options';

// Server-side Sentry for `next dev` and `next start` on Node.js. On Cloudflare
// the Worker entry (worker.ts) creates the client, and this call only applies
// the build-time release.
Sentry.init({
  ...SENTRY_BASE_OPTIONS,
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT,
});
