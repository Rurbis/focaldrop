import { AuthRetryableFetchError } from '@supabase/supabase-js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError, errorResponse } from './errors';

const log = vi.fn();

beforeEach(() => {
  log.mockReset();
  vi.spyOn(console, 'error').mockImplementation(log);
});
afterEach(() => vi.restoreAllMocks());

describe('bridge error reporting', () => {
  it('records an unexpected failure without its diagnostic, stack or custom name', async () => {
    const failure = new Error('https://private.example.test/?token=private-token');
    failure.name = 'private-user@example.test';
    failure.cause = { cookie: 'private-cookie', body: 'private-body' };
    const response = errorResponse(failure);

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'INTERNAL_ERROR' });
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(log.mock.calls).toEqual([
      ['[api-bridge]', { status: 500, code: 'INTERNAL_ERROR', type: 'Error' }],
    ]);
  });

  it.each([
    [500, 'INVALID_API_CONFIGURATION'],
    [502, 'API_UNAVAILABLE'],
    [503, 'AUTH_UNAVAILABLE'],
    [504, 'API_TIMEOUT'],
  ])('records controlled server failure %s', (status, code) => {
    const response = errorResponse(new ApiError(status, code));
    expect(response.status).toBe(status);
    expect(log.mock.calls).toEqual([['[api-bridge]', { status, code, type: 'ApiError' }]]);
  });

  it('keeps only the allowlisted type of an Auth failure cause', async () => {
    const cause = new AuthRetryableFetchError('private Auth URL and token', 503);
    const response = errorResponse(new ApiError(503, 'AUTH_UNAVAILABLE', { cause }));
    expect(await response.json()).toEqual({ error: 'AUTH_UNAVAILABLE' });
    expect(log.mock.calls).toEqual([
      ['[api-bridge]', { status: 503, code: 'AUTH_UNAVAILABLE', type: 'AuthRetryableFetchError' }],
    ]);
  });

  it.each([400, 401, 403, 404, 413, 415, 429])('does not log expected %s responses', (status) => {
    expect(errorResponse(new ApiError(status, 'EXPECTED_FAILURE')).status).toBe(status);
    expect(log).not.toHaveBeenCalled();
  });

  it('does not serialize an unknown thrown value', () => {
    errorResponse({ message: 'private-user@example.test', token: 'private-token' });
    expect(log.mock.calls).toEqual([
      ['[api-bridge]', { status: 500, code: 'INTERNAL_ERROR', type: 'UnknownError' }],
    ]);
  });
});
