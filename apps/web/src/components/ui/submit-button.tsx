'use client';

import { useFormStatus } from 'react-dom';

import { buttonClass } from './form';

/**
 * Submit button that shows progress and blocks double submits while the action
 * runs, and also while `busy`, such as when the next page is already loading.
 */
export function SubmitButton({
  label,
  pendingLabel,
  busy = false,
}: {
  label: string;
  pendingLabel: string;
  busy?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending || busy} className={buttonClass}>
      {pending || busy ? pendingLabel : label}
    </button>
  );
}
