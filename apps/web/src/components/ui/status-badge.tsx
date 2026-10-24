import type { ReactNode } from 'react';

const tones = {
  accent: 'bg-accent-soft text-accent',
  neutral: 'bg-raised text-ink',
  muted: 'bg-raised text-ink-muted',
  danger: 'bg-danger-soft text-danger',
  warning: 'bg-warning-soft text-warning',
  success: 'bg-success-soft text-success',
} as const;

export type StatusTone = keyof typeof tones;

/** A short state label. The word carries the meaning; color only reinforces it. */
export function StatusBadge({ tone, children }: { tone: StatusTone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-caption font-semibold whitespace-nowrap ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
