import { withSentryConfig } from '@sentry/nextjs/config';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // The panel and the galleries never need to tell visitors which framework runs them.
  poweredByHeader: false,
  // Links to routes that do not exist fail the type check.
  typedRoutes: true,
};

export default withSentryConfig(nextConfig, {
  org: 'focaldrop',
  project: 'web',
  // Source maps go to Sentry only when CI provides the organization token
  // (#22); without it the build skips the upload. They are deleted from the
  // build after uploading, so the browser never downloads them.
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  telemetry: false,
  // Tracing is off (D86), so route transitions need no hook.
  suppressOnRouterTransitionStartWarning: true,
});
