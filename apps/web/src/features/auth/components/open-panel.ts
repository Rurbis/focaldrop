'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import type { FormState } from '../form-state';

/**
 * Opens the panel from the browser once an action signed the user in.
 *
 * Not `redirect()` in the action: Next then fetches /admin by itself, and under
 * `next dev` or `next start` that request reaches the page with `localhost` as
 * its host, so the panel would load the agency of the wrong host.
 */
export function useOpenPanelWhenSignedIn(state: FormState): boolean {
  const router = useRouter();
  const signedIn = state.status === 'signed-in';
  useEffect(() => {
    if (signedIn) router.replace('/admin');
  }, [router, signedIn]);
  return signedIn;
}
