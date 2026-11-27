import Link from 'next/link';
import type { ComponentProps } from 'react';

/**
 * An inline link in running text or under a form: the accent's text color
 * with a cyan underline. In light the text is ink, since the cyan is too pale
 * for text there.
 */
export function TextLink({ className, ...props }: ComponentProps<typeof Link>) {
  return (
    <Link
      {...props}
      className={[
        'rounded-sm text-ui font-medium text-accent-ink underline decoration-accent decoration-2 underline-offset-4 hover:decoration-3',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    />
  );
}
