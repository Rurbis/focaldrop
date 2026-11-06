/** Expected failures of the server-side bridge; codes never include upstream data. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    options?: ErrorOptions,
  ) {
    super(code, options);
    this.name = 'ApiError';
  }
}

export const privateResponseHeaders = {
  'Cache-Control': 'private, no-store',
  'X-Content-Type-Options': 'nosniff',
};

const ERROR_TYPES = new Set([
  'ApiError',
  'Error',
  'TypeError',
  'TimeoutError',
  'AbortError',
  'AuthRetryableFetchError',
]);

/** Only controlled codes and allowlisted types reach public-repo diagnostics. */
export function reportApiError(error: unknown): void {
  const failure = error instanceof ApiError ? error : new ApiError(500, 'INTERNAL_ERROR');
  if (failure.status < 500) return;
  const cause = error instanceof ApiError ? (error.cause ?? error) : error;
  const type =
    cause instanceof Error ? (ERROR_TYPES.has(cause.name) ? cause.name : 'Error') : 'UnknownError';
  console.error('[api-bridge]', { status: failure.status, code: failure.code, type });
}

export function errorResponse(error: unknown): Response {
  const failure = error instanceof ApiError ? error : new ApiError(500, 'INTERNAL_ERROR');
  reportApiError(error);
  return Response.json(
    { error: failure.code },
    { status: failure.status, headers: privateResponseHeaders },
  );
}
