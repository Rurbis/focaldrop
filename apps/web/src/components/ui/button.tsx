'use client';

import type { ReactNode } from 'react';
import {
  Button as AriaButton,
  type ButtonProps as AriaButtonProps,
  composeRenderProps,
} from 'react-aria-components';

const base =
  'inline-flex items-center justify-center gap-2 rounded-ui font-semibold transition-colors ' +
  'cursor-pointer data-disabled:cursor-not-allowed data-disabled:opacity-60 data-pending:cursor-progress';

const variants = {
  primary: 'bg-accent text-on-accent data-hovered:bg-accent/90 data-pressed:bg-accent/80',
  secondary: 'bg-raised text-ink data-hovered:bg-raised/70 data-pressed:bg-raised/50',
  quiet: 'bg-transparent text-ink data-hovered:bg-raised data-pressed:bg-raised/70',
  danger: 'bg-danger text-on-danger data-hovered:bg-danger/90 data-pressed:bg-danger/80',
} as const;

// 44 px is the comfortable touch target; 36 px only for dense rows.
const sizes = {
  md: 'min-h-11 px-4 text-ui',
  sm: 'min-h-9 px-3 text-ui',
} as const;

export type ButtonProps = AriaButtonProps & {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  /** Text shown while `isPending`; the button stays focusable and announces the wait. */
  pendingLabel?: ReactNode;
};

export function Button({
  variant = 'primary',
  size = 'md',
  pendingLabel,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <AriaButton
      {...props}
      className={composeRenderProps(className, (custom) =>
        [base, sizes[size], variants[variant], custom].filter(Boolean).join(' '),
      )}
    >
      {composeRenderProps(children, (child, { isPending }) =>
        isPending && pendingLabel ? pendingLabel : child,
      )}
    </AriaButton>
  );
}
