import { Buffer } from 'node:buffer';
import { timingSafeEqual } from 'node:crypto';

import { invalidateAgencyDomains } from '@/features/tenancy/server';
import { ApiError, errorResponse, privateResponseHeaders } from '@/lib/api/errors';
import { getCacheRevalidationSecret } from '@/lib/api/server-env';

/** Fixed tag, independent maintenance credential and no ambient cookie auth. */
export function POST(request: Request): Response {
  try {
    const secret = getCacheRevalidationSecret();
    if (!secret) throw new ApiError(404, 'ROUTE_NOT_FOUND');
    const expected = Buffer.from(`Bearer ${secret}`);
    const received = Buffer.from(request.headers.get('authorization') ?? '');
    if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
      throw new ApiError(401, 'AUTHENTICATION_REQUIRED');
    }
    invalidateAgencyDomains();
    return new Response(null, { status: 204, headers: privateResponseHeaders });
  } catch (error) {
    return errorResponse(error);
  }
}
