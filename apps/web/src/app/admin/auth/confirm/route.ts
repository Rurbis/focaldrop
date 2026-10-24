import { redirect } from 'next/navigation';
import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { createClient } from '@/lib/supabase/server';

const RecoveryLinkSchema = z.object({
  token_hash: z.string().min(1),
  type: z.literal('recovery'),
});

/**
 * Target of the password recovery email (infra/supabase/templates/recovery.html).
 *
 * The link carries a one-time token hash instead of a PKCE code, so it works on
 * any device, not only in the browser that asked for it. Verifying it signs the
 * user in, and the next page asks for the new password. There is no `next`
 * parameter: the destination is fixed, so the link cannot become an open redirect.
 */
export async function GET(request: NextRequest) {
  const parsed = RecoveryLinkSchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) redirect('/admin/login?error=link');

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp(parsed.data);
  if (error) redirect('/admin/login?error=link');

  redirect('/admin/reset-password');
}
