import { randomUUID } from 'node:crypto';

import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // The panel and the galleries never need to tell visitors which framework runs them.
  poweredByHeader: false,
  // Links to routes that do not exist fail the type check.
  typedRoutes: true,
  // R2 entries and D1 invalidation tags are partitioned by this build ID.
  generateBuildId: () => Promise.resolve(process.env.WEB_BUILD_ID ?? randomUUID()),
};

export default nextConfig;
