import { getAgencyByHost } from '@/features/tenancy/server';
import { ApiError, errorResponse, privateResponseHeaders } from '@/lib/api/errors';
import { proxyAdminRequest } from '@/lib/api/proxy';

type RouteContext = { params: Promise<{ path: string[] }> };

async function handle(request: Request, context: RouteContext): Promise<Response> {
  try {
    const { path } = await context.params;
    if (path.length === 2 && path[0] === 'public' && path[1] === 'tenant') {
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        return Response.json(
          { error: 'METHOD_NOT_ALLOWED' },
          { status: 405, headers: { ...privateResponseHeaders, Allow: 'GET, HEAD' } },
        );
      }
      const agency = await getAgencyByHost(request.headers.get('host'));
      return Response.json(agency, { headers: privateResponseHeaders });
    }
    if (path[0] === 'admin') return await proxyAdminRequest(request, path);
    throw new ApiError(404, 'ROUTE_NOT_FOUND');
  } catch (error) {
    return errorResponse(error);
  }
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;

export async function HEAD(request: Request, context: RouteContext): Promise<Response> {
  const response = await handle(request, context);
  await response.body?.cancel();
  return new Response(null, { status: response.status, headers: response.headers });
}
