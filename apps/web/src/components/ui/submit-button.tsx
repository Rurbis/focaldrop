'use client';

import { useFormStatus } from 'react-dom';

import { buttonClass } from './form';

/** Submit button that shows progress and blocks double submits while the action runs. */
export function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={buttonClass}>
      {pending ? pendingLabel : label}
    </button>
  );
}
