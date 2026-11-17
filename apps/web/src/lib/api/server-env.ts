import 'server-only';

import { z } from 'zod';

import { ApiError } from './errors';

const ApiUrlSchema = z.url({ protocol: /^https?$/ }).pipe(
  z.string().refine((value) => {
    const url = new URL(value);
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    return (
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash &&
      url.pathname === '/' &&
      (url.protocol === 'https:' || local)
    );
  }),
);

/** Lazy validation keeps builds independent from runtime configuration. */
export function getApiUrl(): string {
  const result = ApiUrlSchema.safeParse(process.env.API_URL);
  if (!result.success) throw new ApiError(500, 'INVALID_API_CONFIGURATION');
  return new URL(result.data).origin;
}
