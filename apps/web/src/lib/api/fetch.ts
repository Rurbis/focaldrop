import 'server-only';

import { ApiError } from './errors';

/** A fixed upstream, no persistent HTTP cache and no redirects carrying a JWT. */
export async function fetchFromApi(url: URL, options: RequestInit = {}): Promise<Response> {
  const signals = [AbortSignal.timeout(10_000)];
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
    if (error instanceof Error && error.name === 'TimeoutError') {
      throw new ApiError(504, 'API_TIMEOUT');
    }
    throw new ApiError(502, 'API_UNAVAILABLE');
  }
}
