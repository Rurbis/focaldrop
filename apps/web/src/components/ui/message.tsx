import type { ReactNode } from 'react';

const tones = {
  error: 'bg-danger-soft text-danger',
  warning: 'bg-warning-soft text-warning',
  success: 'bg-success-soft text-success',
  info: 'bg-accent-soft text-accent',
} as const;

/**
 * A message about the whole form or page. Errors are announced right away;
 * the other tones politely, when the reader is free.
 */
export function Message({ tone, children }: { tone: keyof typeof tones; children: ReactNode }) {
  return (
    <p
      role={tone === 'error' ? 'alert' : 'status'}
      className={`rounded-ui px-3.5 py-2.5 text-ui font-medium ${tones[tone]}`}
    >
      {children}
    </p>
  );
}
