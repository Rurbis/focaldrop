import * as Sentry from '@sentry/nextjs';

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === 'nodejs' || process.env.NEXT_RUNTIME === 'edge') {
    await import('./lib/sentry/server');
  }
}

// Reports errors of Server Components, Server Actions and route handlers.
export const onRequestError = Sentry.captureRequestError;
