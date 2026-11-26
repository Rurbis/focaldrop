import Link from 'next/link';
import type { ComponentProps } from 'react';

/** An inline link in running text or under a form, in the accent color. */
export function TextLink({ className, ...props }: ComponentProps<typeof Link>) {
  return (
    <Link
      {...props}
      className={[
        'rounded-sm text-ui font-medium text-accent underline decoration-1 underline-offset-4 hover:decoration-2',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    />
  );
}
