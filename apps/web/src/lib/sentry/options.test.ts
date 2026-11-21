import { describe, expect, it } from 'vitest';

import { SENTRY_BASE_OPTIONS, SENTRY_DATA_COLLECTION } from './options';

describe('Sentry options', () => {
  it('collects no personal data', () => {
    expect(SENTRY_DATA_COLLECTION).toEqual({
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
    });
  });

  it('reports errors only, without performance tracing', () => {
    expect(SENTRY_BASE_OPTIONS).toEqual({
      dataCollection: SENTRY_DATA_COLLECTION,
      tracesSampleRate: 0,
    });
  });
});
