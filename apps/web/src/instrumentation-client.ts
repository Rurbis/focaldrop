import * as Sentry from '@sentry/nextjs';

import { SENTRY_BASE_OPTIONS } from '@/lib/sentry/options';

// Browser errors of the public site, the galleries and the panel. Next inlines
// both variables at build time (deploy-web.yml sets them per environment).
Sentry.init({
  ...SENTRY_BASE_OPTIONS,
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT,
});
