import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { ApiError } from './errors';
import { API_GET_MAX_RETRIES, API_RETRY_DELAY_MS, API_TIMEOUT_MS, fetchFromApi } from './fetch';

const url = new URL('https://api.example.test/admin/me');
const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  fetchMock.mockReset().mockResolvedValue(Response.json({ ok: true }));
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('fetchFromApi', () => {
  it('uses the 20 s default timeout, disables caching, and rejects redirects', async () => {
    expect(API_TIMEOUT_MS).toBe(20_000);
    expect(API_GET_MAX_RETRIES).toBe(1);
    expect(API_RETRY_DELAY_MS).toBe(250);

    const timeoutSpy = vi.spyOn(AbortSignal, 'timeout');
    const response = await fetchFromApi(url);

    expect(response.status).toBe(200);
    expect(timeoutSpy).toHaveBeenCalledWith(20_000);
    const [, init] = fetchMock.mock.calls[0] ?? [];
    expect(init?.cache).toBe('no-store');
    expect(init?.redirect).toBe('manual');
  });

  it('retries an implicit GET once after a timeout and succeeds on the second attempt', async () => {
    fetchMock
      .mockRejectedValueOnce(new DOMException('timed out', 'TimeoutError'))
      .mockResolvedValueOnce(Response.json({ ok: true }));

    const response = await fetchFromApi(url, {}, { retryDelayMs: 0 });

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('retries an explicit GET once after a network failure and succeeds on recovery', async () => {
    fetchMock
      .mockRejectedValueOnce(new TypeError('fetch failed'))
      .mockResolvedValueOnce(Response.json({ ok: true }));

    const response = await fetchFromApi(url, { method: 'GET' }, { retryDelayMs: 0 });

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('maps repeated timeouts on GET to 504 API_TIMEOUT after exhausting the single retry', async () => {
    fetchMock.mockRejectedValue(new DOMException('timed out', 'TimeoutError'));

    await expect(fetchFromApi(url, {}, { retryDelayMs: 0 })).rejects.toMatchObject({
      status: 504,
      code: 'API_TIMEOUT',
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('maps repeated network failures on GET to 502 API_UNAVAILABLE after exhausting the retry', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));

    await expect(fetchFromApi(url, { method: 'get' }, { retryDelayMs: 0 })).rejects.toMatchObject({
      status: 502,
      code: 'API_UNAVAILABLE',
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it.each(['POST', 'PUT', 'PATCH', 'DELETE', 'HEAD'])(
    'never retries %s requests on timeout or network errors',
    async (method) => {
      fetchMock.mockRejectedValueOnce(new DOMException('timed out', 'TimeoutError'));
      await expect(fetchFromApi(url, { method }, { retryDelayMs: 0 })).rejects.toMatchObject({
        status: 504,
        code: 'API_TIMEOUT',
      });
      expect(fetchMock).toHaveBeenCalledTimes(1);

      fetchMock.mockReset();
      fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'));
      await expect(fetchFromApi(url, { method }, { retryDelayMs: 0 })).rejects.toMatchObject({
        status: 502,
        code: 'API_UNAVAILABLE',
      });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    },
  );

  it('does not retry when the caller aborts the request or aborts during backoff', async () => {
    const preAborted = new AbortController();
    preAborted.abort(new DOMException('Aborted', 'AbortError'));
    fetchMock.mockRejectedValueOnce(new DOMException('Aborted', 'AbortError'));

    await expect(
      fetchFromApi(url, { signal: preAborted.signal }, { retryDelayMs: 0 }),
    ).rejects.toMatchObject({
      status: 502,
      code: 'API_UNAVAILABLE',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    fetchMock.mockReset();
    const duringWait = new AbortController();
    fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'));
    const pending = fetchFromApi(url, { signal: duringWait.signal }, { retryDelayMs: 5_000 });
    await Promise.resolve();
    duringWait.abort(new DOMException('Aborted during wait', 'AbortError'));

    await expect(pending).rejects.toMatchObject({
      status: 502,
      code: 'API_UNAVAILABLE',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not retry upstream 5xx responses or 3xx redirects', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ error: 'busy' }, { status: 503 }));
    const serverError = await fetchFromApi(url, {}, { retryDelayMs: 0 });
    expect(serverError.status).toBe(503);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    fetchMock.mockReset();
    const cancel = vi.fn().mockResolvedValue(undefined);
    fetchMock.mockResolvedValueOnce({
      status: 302,
      body: { cancel },
    } as unknown as Response);

    await expect(fetchFromApi(url, {}, { retryDelayMs: 0 })).rejects.toEqual(
      new ApiError(502, 'UNEXPECTED_API_REDIRECT'),
    );
    expect(cancel).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
