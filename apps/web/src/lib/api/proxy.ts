import 'server-only';

import { normalizeTenantHost } from '@/features/tenancy/host';

import { ApiError, privateResponseHeaders } from './errors';
import { fetchFromApi } from './fetch';
import { getApiUrl } from './server-env';
import { getApiAccessToken } from './session';

// Nest's current JSON parser uses the Express default (100 KiB).
const MAX_BODY_BYTES = 100 * 1024;
const UNSAFE_SEGMENT_CHARACTER = /[^A-Za-z0-9_-]/;
const READ_METHODS = new Set(['GET', 'HEAD']);

function assertSameOrigin(request: Request, host: string): void {
  if (READ_METHODS.has(request.method)) return;
  const protocol = new URL(request.url).protocol;
  const expectedOrigin = new URL(`${protocol}//${host.trim()}`).origin;
  if (request.headers.get('origin') !== expectedOrigin) {
    throw new ApiError(403, 'INVALID_REQUEST_ORIGIN');
  }
}

async function readJsonBody(request: Request): Promise<ArrayBuffer | undefined> {
  if (READ_METHODS.has(request.method) || request.body === null) return undefined;
  const encoding = request.headers.get('content-encoding');
  if (encoding && encoding.trim().toLowerCase() !== 'identity') {
    throw new ApiError(415, 'UNSUPPORTED_CONTENT_ENCODING');
  }
  const contentType = request.headers.get('content-type');
  if (!contentType || !/^application\/json(?:\s*;|$)/i.test(contentType)) {
    throw new ApiError(415, 'JSON_BODY_REQUIRED');
  }
  const length = request.headers.get('content-length');
  if (length !== null) {
    if (!/^\d+$/.test(length)) throw new ApiError(400, 'INVALID_CONTENT_LENGTH');
    if (Number(length) > MAX_BODY_BYTES) throw new ApiError(413, 'REQUEST_BODY_TOO_LARGE');
  }
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY_BYTES) {
        await reader.cancel();
        throw new ApiError(413, 'REQUEST_BODY_TOO_LARGE');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body.buffer;
}

export async function proxyAdminRequest(
  request: Request,
  path: readonly string[],
): Promise<Response> {
  if (
    path[0] !== 'admin' ||
    !path.every((segment) => segment.length > 0 && !UNSAFE_SEGMENT_CHARACTER.test(segment))
  ) {
    throw new ApiError(404, 'ROUTE_NOT_FOUND');
  }
  const host = request.headers.get('host');
  const hostname = normalizeTenantHost(host);
  if (host === null) throw new ApiError(400, 'INVALID_TENANT_HOST');
  assertSameOrigin(request, host);
  // This bridge accepts browser sessions, never a caller-supplied Bearer token.
  // Reject an absent cookie before initializing Auth (also works without Auth
  // credentials in a fork's compiled-server integration test).
  if (!request.headers.get('cookie')) throw new ApiError(401, 'AUTHENTICATION_REQUIRED');
  const token = await getApiAccessToken();
  const body = await readJsonBody(request);
  const target = new URL(`/${path.join('/')}`, getApiUrl());
  target.search = new URL(request.url).search;
  const headers = new Headers({
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
    'X-Tenant-Host': hostname,
  });
  if (body !== undefined) {
    const contentType = request.headers.get('content-type');
    if (contentType) headers.set('Content-Type', contentType);
  }
  const upstream = await fetchFromApi(target, {
    method: request.method,
    headers,
    body,
    signal: request.signal,
  });
  const responseHeaders = new Headers(privateResponseHeaders);
  const contentType = upstream.headers.get('content-type');
  if (
    upstream.body !== null &&
    (!contentType || !/^application\/json(?:\s*;|$)/i.test(contentType))
  ) {
    await upstream.body.cancel();
    throw new ApiError(502, 'INVALID_API_RESPONSE');
  }
  if (contentType) responseHeaders.set('Content-Type', contentType);
  const retryAfter = upstream.headers.get('retry-after');
  if (retryAfter) responseHeaders.set('Retry-After', retryAfter);
  return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
}
