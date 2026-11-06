import { AuthApiError, AuthRetryableFetchError } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const auth = vi.hoisted(() => ({ getSession: vi.fn(), getClaims: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase/server', () => ({
  createClient: () => Promise.resolve({ auth }),
}));

import { getApiAccessToken } from './session';

beforeEach(() => {
  auth.getSession.mockReset();
  auth.getClaims.mockReset();
  auth.getSession.mockResolvedValue({
    data: { session: { access_token: 'test-token' } },
    error: null,
  });
  auth.getClaims.mockResolvedValue({ data: { claims: { sub: 'test-user' } }, error: null });
});

describe('API session token', () => {
  it('verifies the exact token it returns', async () => {
    await expect(getApiAccessToken()).resolves.toBe('test-token');
    expect(auth.getClaims).toHaveBeenCalledWith('test-token');
  });
  it.each([
    { data: { session: null }, error: null },
    {
      data: { session: { access_token: 'untrusted' } },
      error: new AuthApiError('Invalid session', 401, 'bad_jwt'),
    },
  ])('rejects an absent or failed session before verifying claims', async (result) => {
    auth.getSession.mockResolvedValue(result);
    await expect(getApiAccessToken()).rejects.toMatchObject({ status: 401 });
    expect(auth.getClaims).not.toHaveBeenCalled();
  });
  it.each([
    { data: null, error: new AuthApiError('Invalid token', 401, 'bad_jwt') },
    { data: { claims: null }, error: null },
  ])('rejects an unverified cookie token', async (result) => {
    auth.getClaims.mockResolvedValue(result);
    await expect(getApiAccessToken()).rejects.toMatchObject({ status: 401 });
  });

  it.each(['getSession', 'getClaims'] as const)(
    'returns 503 when %s reports a temporary Auth failure, then recovers',
    async (method) => {
      auth[method].mockResolvedValueOnce({
        data: method === 'getSession' ? { session: null } : null,
        error: new AuthRetryableFetchError('private Auth diagnostic', 503),
      });
      await expect(getApiAccessToken()).rejects.toMatchObject({
        status: 503,
        code: 'AUTH_UNAVAILABLE',
      });
      if (method === 'getSession') expect(auth.getClaims).not.toHaveBeenCalled();
      await expect(getApiAccessToken()).resolves.toBe('test-token');
    },
  );

  it.each(['getSession', 'getClaims'] as const)(
    'also maps a retryable exception from %s to 503',
    async (method) => {
      auth[method].mockRejectedValueOnce(new AuthRetryableFetchError('private network error', 0));
      await expect(getApiAccessToken()).rejects.toMatchObject({
        status: 503,
        code: 'AUTH_UNAVAILABLE',
      });
    },
  );

  it('does not turn unexpected failures into an invalid session', async () => {
    const failure = new TypeError('private diagnostic');
    auth.getClaims.mockRejectedValueOnce(failure);
    await expect(getApiAccessToken()).rejects.toBe(failure);
  });
});
