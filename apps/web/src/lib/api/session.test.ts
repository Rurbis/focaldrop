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
    { data: { session: { access_token: 'untrusted' } }, error: { message: 'failed' } },
  ])('rejects an absent or failed session before verifying claims', async (result) => {
    auth.getSession.mockResolvedValue(result);
    await expect(getApiAccessToken()).rejects.toMatchObject({ status: 401 });
    expect(auth.getClaims).not.toHaveBeenCalled();
  });
  it.each([
    { data: null, error: { message: 'Invalid token' } },
    { data: { claims: null }, error: null },
  ])('rejects an unverified cookie token', async (result) => {
    auth.getClaims.mockResolvedValue(result);
    await expect(getApiAccessToken()).rejects.toMatchObject({ status: 401 });
  });
});
