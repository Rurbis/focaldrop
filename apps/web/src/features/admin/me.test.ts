import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ token: vi.fn<() => Promise<string>>() }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/api/session', () => ({ getApiAccessToken: mocks.token }));

import { ApiError } from '@/lib/api/errors';

import { getAdminHome } from './me';

const me = {
  profile: { id: '3f0c8a52-6d1e-4b7a-9c2d-1e5f7a9b0c3d', fullName: 'Agency Owner' },
  agency: {
    id: '0199e0a4-7c2b-7d3e-8f41-2a6b9c0d1e2f',
    slug: 'agency',
    name: 'Agency',
    status: 'active',
    timezone: 'America/Mexico_City',
    locale: 'es-MX',
    currency: 'MXN',
  },
  role: 'owner',
};
const fetchMock = vi.fn<typeof fetch>();
const log = vi.fn();

beforeEach(() => {
  mocks.token.mockReset().mockResolvedValue('verified-test-token');
  fetchMock.mockReset().mockResolvedValue(Response.json(me));
  vi.stubGlobal('fetch', fetchMock);
  vi.stubEnv('API_URL', 'https://api.example.test');
  log.mockReset();
  vi.spyOn(console, 'error').mockImplementation(log);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('getAdminHome', () => {
  it('asks Nest for the member of the normalized host with the verified token only', async () => {
    fetchMock.mockResolvedValue(
      Response.json({ ...me, profile: { ...me.profile, isPlatformAdmin: true } }),
    );

    await expect(getAdminHome('AGENCY.example.test:3000')).resolves.toEqual({
      status: 'ready',
      me,
    });

    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url instanceof URL ? url.href : url).toBe('https://api.example.test/admin/me');
    const headers = new Headers(init?.headers);
    expect(headers.get('authorization')).toBe('Bearer verified-test-token');
    expect(headers.get('x-tenant-host')).toBe('agency.example.test');
    expect(headers.has('cookie')).toBe(false);
    expect(init?.redirect).toBe('manual');
  });

  it.each([
    [401, 'signed-out'],
    [403, 'no-access'],
    [404, 'unknown-agency'],
  ] as const)('maps an API %s to %s without logging it', async (status, expected) => {
    fetchMock.mockResolvedValue(Response.json({ statusCode: status }, { status }));

    await expect(getAdminHome('agency.example.test')).resolves.toEqual({ status: expected });
    expect(log).not.toHaveBeenCalled();
  });

  it('sends a missing or invalid session to sign in again', async () => {
    mocks.token.mockRejectedValue(new ApiError(401, 'AUTHENTICATION_REQUIRED'));

    await expect(getAdminHome('agency.example.test')).resolves.toEqual({ status: 'signed-out' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('keeps the session during an Auth outage and records it', async () => {
    mocks.token.mockRejectedValue(new ApiError(503, 'AUTH_UNAVAILABLE'));

    await expect(getAdminHome('agency.example.test')).resolves.toEqual({ status: 'unavailable' });
    expect(log.mock.calls).toEqual([
      ['[api-bridge]', { status: 503, code: 'AUTH_UNAVAILABLE', type: 'ApiError' }],
    ]);
  });

  it.each([
    ['an API 500', () => Promise.resolve(Response.json({}, { status: 500 })), 500],
    ['a body outside the contract', () => Promise.resolve(Response.json({ role: 'admin' })), 502],
    ['a body that is not JSON', () => Promise.resolve(new Response('<html>')), 502],
    ['an unreachable API', () => Promise.reject(new TypeError('fetch failed')), 502],
  ])('shows a temporary error for %s and records it', async (_name, answer, status) => {
    fetchMock.mockImplementation(answer);

    await expect(getAdminHome('agency.example.test')).resolves.toEqual({ status: 'unavailable' });
    expect(log).toHaveBeenCalledTimes(1);
    expect(log.mock.calls[0]?.[1]).toMatchObject({ status });
  });

  it('rejects an invalid host before reading the session', async () => {
    await expect(getAdminHome('evil.example.test/path')).resolves.toEqual({
      status: 'unavailable',
    });
    expect(mocks.token).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
