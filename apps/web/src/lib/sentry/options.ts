import type * as Sentry from '@sentry/nextjs';

type SentryOptions = NonNullable<Parameters<typeof Sentry.init>[0]>;

// Same policy as the API (D86): Sentry 11 collects user info, cookies,
// headers, bodies and query strings by default, and none of it leaves the app.
export const SENTRY_DATA_COLLECTION = {
  userInfo: false,
  cookies: false,
  httpHeaders: false,
  httpBodies: [],
  urlQueryParams: false,
  genAI: { inputs: false, outputs: false },
  databaseQueryData: false,
  queues: false,
  graphQL: { document: false, variables: false },
  stackFrameVariables: false,
} satisfies NonNullable<SentryOptions['dataCollection']>;

// Browser options (src/instrumentation-client.ts adds the DSN). Without a DSN
// Sentry stays off, so local development and pull requests from forks never
// send events.
export const SENTRY_BASE_OPTIONS = {
  dataCollection: SENTRY_DATA_COLLECTION,
  // Errors only (D86): no performance tracing, Session Replay or logs.
  tracesSampleRate: 0,
} satisfies Partial<SentryOptions>;
