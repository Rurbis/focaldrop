'use client';

import { useFormStatus } from 'react-dom';

import { Button } from './button';

/**
 * Submit button that shows progress and blocks double submits while the action
 * runs, and also while `busy`, such as when the next page is already loading.
 * React Aria keeps a pending button focusable and announces the wait.
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
    <Button
      type="submit"
      isPending={pending || busy}
      pendingLabel={pendingLabel}
      className="w-full"
    >
      {label}
    </Button>
  );
}
