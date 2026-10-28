/** Expected failures of the server-side bridge; codes never include upstream data. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
  ) {
    super(code);
    this.name = 'ApiError';
  }
}

export const privateResponseHeaders = {
  'Cache-Control': 'private, no-store',
  'X-Content-Type-Options': 'nosniff',
};

export function errorResponse(error: unknown): Response {
  const failure = error instanceof ApiError ? error : new ApiError(500, 'INTERNAL_ERROR');
  return Response.json(
    { error: failure.code },
    { status: failure.status, headers: privateResponseHeaders },
  );
}
