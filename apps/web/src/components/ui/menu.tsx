'use client';

import type { ReactNode } from 'react';
import {
  Menu as AriaMenu,
  MenuItem as AriaMenuItem,
  type MenuItemProps as AriaMenuItemProps,
  type MenuProps as AriaMenuProps,
  MenuTrigger,
  Popover,
} from 'react-aria-components';

import { Button, type ButtonProps } from './button';

type MenuProps<T> = Omit<AriaMenuProps<T>, 'className'> & {
  /** Visible text of the trigger, or its accessible name when it shows only an icon. */
  label: ReactNode;
  'aria-label'?: string;
  variant?: ButtonProps['variant'];
};

/** A button that opens a list of actions. Arrow keys move, Enter acts, Escape closes. */
export function Menu<T extends object>({
  label,
  'aria-label': ariaLabel,
  variant = 'quiet',
  ...props
}: MenuProps<T>) {
  return (
    <MenuTrigger>
      <Button variant={variant} aria-label={ariaLabel}>
        {label}
      </Button>
      {/* Floating layers are the only place a shadow is allowed (design plan §4). */}
      <Popover className="min-w-52 rounded-ui bg-surface p-1 shadow-lg ring-1 ring-line">
        <AriaMenu {...props} className="outline-none" />
      </Popover>
    </MenuTrigger>
  );
}

/**
 * One action of the menu. Hover and keyboard both tint the item; keyboard focus
 * also draws an inset accent ring, because the tint alone is too faint to see
 * (WCAG 2.4.7). The ring sits inside the item so it never covers its neighbors.
 */
export function MenuItem({
  tone = 'default',
  ...props
}: Omit<AriaMenuItemProps, 'className'> & { tone?: 'default' | 'danger' }) {
  return (
    <AriaMenuItem
      {...props}
      className={`flex min-h-10 cursor-pointer items-center rounded-ui px-3 text-ui outline-none data-focused:bg-raised data-focus-visible:outline-2 data-focus-visible:-outline-offset-2 data-focus-visible:outline-accent data-focus-visible:outline-solid ${
        tone === 'danger' ? 'text-danger' : 'text-ink'
      }`}
    />
  );
}
