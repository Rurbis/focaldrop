'use client';

import { useEffect } from 'react';

// TEMPORARY (#22): proves in the PR preview that browser errors reach Sentry.
// Removed before review.
export default function SentryCheckPage() {
  useEffect(() => {
    setTimeout(() => {
      throw new Error('Sentry check: temporary error from the #22 preview');
    }, 0);
  }, []);

  return <p>Sentry check</p>;
}
