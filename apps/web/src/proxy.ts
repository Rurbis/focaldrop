import type { NextRequest } from 'next/server';

import { updateSession } from '@/lib/supabase/proxy';

// Only refreshes the Supabase session (D40). The public site and the galleries
// never need it, so it runs on the panel alone.
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: ['/admin/:path*'],
};
