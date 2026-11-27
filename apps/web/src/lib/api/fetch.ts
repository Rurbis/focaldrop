import 'server-only';

import { ApiError } from './errors';

export const API_TIMEOUT_MS = 20_000;
export const API_GET_MAX_RETRIES = 1;
export const API_RETRY_DELAY_MS = 250;

export interface FetchFromApiConfig {
  timeoutMs?: number;
  maxGetRetries?: number;
  retryDelayMs?: number;
}

function isRetryableMethod(method: string | undefined): boolean {
  // Only pure GET is retried; mutations forwarded by the /api/admin/* bridge
  // (D148) can still be running in Nest after a web timeout.
  return (method ?? 'GET').toUpperCase() === 'GET';
}

function waitForRetry(delayMs: number, signal?: AbortSignal | null): Promise<boolean> {
  if (signal?.aborted) return Promise.resolve(false);
  if (delayMs <= 0) return Promise.resolve(true);
  return new Promise<boolean>((resolve) => {
    const onAbort = () => {
      clearTimeout(timer);
      resolve(false);
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve(true);
    }, delayMs);
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

/**
 * Fetches Nest with no persistent cache, no JWT-carrying redirects, and a single
 * bounded retry on transient transport failures for idempotent GET requests.
 */
export async function fetchFromApi(
  url: URL,
  options: RequestInit = {},
  config: FetchFromApiConfig = {},
): Promise<Response> {
  const timeoutMs = config.timeoutMs ?? API_TIMEOUT_MS;
  const maxRetries = isRetryableMethod(options.method)
    ? (config.maxGetRetries ?? API_GET_MAX_RETRIES)
    : 0;
  const retryDelayMs = config.retryDelayMs ?? API_RETRY_DELAY_MS;

  for (let attempt = 0; ; attempt += 1) {
    const signals = [AbortSignal.timeout(timeoutMs)];
    if (options.signal) signals.push(options.signal);

    try {
      const response = await fetch(url, {
        ...options,
        cache: 'no-store',
        redirect: 'manual',
        signal: AbortSignal.any(signals),
      });
      if (response.status >= 300 && response.status < 400) {
        await response.body?.cancel();
        throw new ApiError(502, 'UNEXPECTED_API_REDIRECT');
      }
      return response;
    } catch (error) {
      if (error instanceof ApiError) throw error;

      if (attempt < maxRetries && !options.signal?.aborted) {
        if (await waitForRetry(retryDelayMs, options.signal)) continue;
      }

      if (!options.signal?.aborted && error instanceof Error && error.name === 'TimeoutError') {
        throw new ApiError(504, 'API_TIMEOUT', { cause: error });
      }
      throw new ApiError(502, 'API_UNAVAILABLE', { cause: error });
    }
  }
}
