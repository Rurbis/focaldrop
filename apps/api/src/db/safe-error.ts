/**
 * An error whose message is safe to print in public logs: it never contains
 * agency data, credentials, URLs or SQL. Database and network errors are not
 * safe (Drizzle puts the SQL and its parameters in the message), so the CLIs
 * print a fixed message for anything else.
 */
export class SafeError extends Error {
  override name = 'SafeError';
}

export function safeErrorMessage(error: unknown, fallback: string): string {
  return error instanceof SafeError ? error.message : fallback;
}
