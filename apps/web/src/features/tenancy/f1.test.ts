import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ token: vi.fn<() => Promise<string>>() }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/api/session', () => ({ getApiAccessToken: mocks.token }));

import { ApiError, errorResponse } from '@/lib/api/errors';
import { proxyAdminRequest } from '@/lib/api/proxy';
import { getApiUrl, getCacheRevalidationSecret } from '@/lib/api/server-env';

import { normalizeTenantHost } from './host';

const fetchMock = vi.fn<typeof fetch>();

function request(method = 'GET', extra: RequestInit = {}): Request {
  const headers = new Headers(extra.headers);
  headers.set('Host', 'agency.example.test');
  if (!headers.has('Cookie')) headers.set('Cookie', 'synthetic-session=fixture');
  return new Request('https://agency.example.test/api/admin/me?detail=1', {
    ...extra,
    method,
    headers,
  });
}

beforeEach(() => {
  mocks.token.mockReset();
  mocks.token.mockResolvedValue('verified-test-token');
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(Response.json({ ok: true }));
  vi.stubGlobal('fetch', fetchMock);
  vi.stubEnv('API_URL', 'https://api.example.test');
  vi.stubEnv('AGENCY_CACHE_REVALIDATION_SECRET', '');
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('tenant hosts', () => {
  it.each([
    ['AGENCY.example.test:3000', 'agency.example.test'],
    ['agency.example.test.', 'agency.example.test'],
    [' localhost:3000 ', 'localhost'],
    ['127.0.0.1:65535', '127.0.0.1'],
  ])('normalizes %s', (input, expected) => {
    expect(normalizeTenantHost(input)).toBe(expected);
  });
  it.each([
    null,
    '',
    'https://agency.example.test',
    'agency.example.test/path',
    'agency.example.test,other.example.test',
    'agency.example.test:0',
    'agency.example.test:65536',
    '-agency.example.test',
    'agency.example.test?query=1',
    '[::1]:3000',
    `${'a'.repeat(64)}.test`,
    'agency\n.example.test',
  ])('rejects %s', (input) => {
    expect(() => normalizeTenantHost(input)).toThrow(ApiError);
  });
});

describe('server configuration', () => {
  it('allows local HTTP', () => {
    vi.stubEnv('API_URL', 'http://127.0.0.1:3001');
    expect(getApiUrl()).toBe('http://127.0.0.1:3001');
  });
  it.each([
    '',
    'http://api.example.test',
    'http://127.0.0.1.attacker.test',
    'https://user:password@api.example.test',
    'https://api.example.test/another/path',
    'https://api.example.test/?target=other',
    'https://api.example.test/#fragment',
  ])('rejects an unsafe API base URL: %s', (value) => {
    vi.stubEnv('API_URL', value);
    expect(getApiUrl).toThrow(ApiError);
  });
  it('disables maintenance when no credential exists', () => {
    expect(getCacheRevalidationSecret()).toBeUndefined();
  });
  it.each(['short', 'a'.repeat(257), `${'a'.repeat(32)}\n`])(
    'rejects malformed maintenance configuration',
    (value) => {
      vi.stubEnv('AGENCY_CACHE_REVALIDATION_SECRET', value);
      expect(getCacheRevalidationSecret).toThrow(ApiError);
    },
  );
  it('returns only an error code, not configuration or exception details', async () => {
    const response = errorResponse(new Error('private diagnostic'));
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'INTERNAL_ERROR' });
    expect(response.headers.get('cache-control')).toBe('private, no-store');
  });
});

describe('admin forwarding', () => {
  it('rejects a missing cookie before initializing Supabase', async () => {
    const unauthenticated = request();
    unauthenticated.headers.delete('Cookie');
    await expect(proxyAdminRequest(unauthenticated, ['admin', 'me'])).rejects.toMatchObject({
      status: 401,
    });
    expect(mocks.token).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('replaces browser credentials and tenant headers, preserving path and query', async () => {
    const response = await proxyAdminRequest(
      request('GET', {
        headers: {
          Authorization: 'Bearer browser-supplied',
          Cookie: 'private-cookie=value',
          'X-Tenant-Host': 'another.example.test',
          'X-Forwarded-Host': 'another.example.test',
        },
      }),
      ['admin', 'me'],
    );
    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0]!;
    const headers = new Headers(options?.headers);
    expect(url).toEqual(new URL('https://api.example.test/admin/me?detail=1'));
    expect(headers.get('Authorization')).toBe('Bearer verified-test-token');
    expect(headers.get('X-Tenant-Host')).toBe('agency.example.test');
    expect(headers.has('Cookie')).toBe(false);
    expect(headers.has('X-Forwarded-Host')).toBe(false);
    expect(options?.cache).toBe('no-store');
    expect(options?.redirect).toBe('manual');
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
  });
  it.each(['https://another.example.test', 'null', 'https://agency.example.test:444'])(
    'rejects a mutation with Origin %s',
    async (origin) => {
      await expect(
        proxyAdminRequest(
          request('POST', {
            headers: { Origin: origin, 'Content-Type': 'application/json' },
            body: '{}',
          }),
          ['admin', 'example'],
        ),
      ).rejects.toMatchObject({ status: 403 });
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );
  it('rejects a cookie-authenticated mutation with no Origin', async () => {
    await expect(proxyAdminRequest(request('DELETE'), ['admin', 'example'])).rejects.toMatchObject({
      status: 403,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('forwards an allowed JSON mutation', async () => {
    await proxyAdminRequest(
      request('POST', {
        headers: { Origin: 'https://agency.example.test', 'Content-Type': 'application/json' },
        body: '{"name":"Example"}',
      }),
      ['admin', 'example'],
    );
    const options = fetchMock.mock.calls[0]?.[1];
    expect(options?.method).toBe('POST');
    expect(new TextDecoder().decode(options?.body as ArrayBuffer)).toBe('{"name":"Example"}');
  });
  it('limits actual bytes even without a Content-Length header', async () => {
    await expect(
      proxyAdminRequest(
        request('POST', {
          headers: { Origin: 'https://agency.example.test', 'Content-Type': 'application/json' },
          body: 'x'.repeat(100 * 1024 + 1),
        }),
        ['admin', 'example'],
      ),
    ).rejects.toMatchObject({ status: 413 });
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it.each([
    [{ 'Content-Encoding': 'gzip', 'Content-Type': 'application/json' }, 415],
    [{ 'Content-Type': 'text/plain' }, 415],
    [{ 'Content-Type': 'application/json', 'Content-Length': '102401' }, 413],
    [{ 'Content-Type': 'application/json', 'Content-Length': 'invalid' }, 400],
  ] as const)('rejects unsupported bodies', async (headers, status) => {
    await expect(
      proxyAdminRequest(
        request('POST', {
          headers: { ...headers, Origin: 'https://agency.example.test' },
          body: '{}',
        }),
        ['admin', 'example'],
      ),
    ).rejects.toMatchObject({ status });
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it.each([
    ['admin', '..', 'internal'],
    ['admin', 'a/b'],
    ['admin', 'a\\b'],
    ['admin', '%2f'],
    ['admin', 'me\n'],
    ['internal', 'example'],
  ])('rejects unsafe or unexposed paths', async (...path) => {
    await expect(proxyAdminRequest(request(), path)).rejects.toMatchObject({ status: 404 });
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('does not follow an upstream redirect', async () => {
    fetchMock.mockResolvedValue(
      new Response(null, {
        status: 302,
        headers: { Location: 'https://another.example.test' },
      }),
    );
    await expect(proxyAdminRequest(request(), ['admin', 'me'])).rejects.toMatchObject({
      status: 502,
    });
  });
  it('does not serve upstream HTML or copy upstream cookies', async () => {
    fetchMock.mockResolvedValue(
      new Response('<html>unexpected</html>', {
        headers: { 'Content-Type': 'text/html', 'Set-Cookie': 'upstream=private' },
      }),
    );
    await expect(proxyAdminRequest(request(), ['admin', 'me'])).rejects.toMatchObject({
      status: 502,
    });
  });
  it('preserves API errors and rate-limit hints without cookies or CORS', async () => {
    fetchMock.mockResolvedValue(
      Response.json(
        { error: 'limited' },
        {
          status: 429,
          headers: {
            'Retry-After': '60',
            'Set-Cookie': 'upstream=private',
            'Access-Control-Allow-Origin': '*',
          },
        },
      ),
    );
    const response = await proxyAdminRequest(request(), ['admin', 'me']);
    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBe('60');
    expect(response.headers.has('Set-Cookie')).toBe(false);
    expect(response.headers.has('Access-Control-Allow-Origin')).toBe(false);
  });
  it('maps network failures without exposing diagnostics', async () => {
    fetchMock.mockRejectedValue(new TypeError('private upstream URL'));
    await expect(proxyAdminRequest(request(), ['admin', 'me'])).rejects.toMatchObject({
      status: 502,
      code: 'API_UNAVAILABLE',
    });
  });
  it('maps an upstream timeout to 504', async () => {
    fetchMock.mockRejectedValue(new DOMException('timeout', 'TimeoutError'));
    await expect(proxyAdminRequest(request(), ['admin', 'me'])).rejects.toMatchObject({
      status: 504,
      code: 'API_TIMEOUT',
    });
  });
  it('stops without a verified session', async () => {
    mocks.token.mockRejectedValue(new ApiError(401, 'AUTHENTICATION_REQUIRED'));
    await expect(proxyAdminRequest(request(), ['admin', 'me'])).rejects.toMatchObject({
      status: 401,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
