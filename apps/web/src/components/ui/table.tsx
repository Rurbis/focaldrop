'use client';

import {
  Cell as AriaCell,
  type CellProps,
  Column as AriaColumn,
  type ColumnProps,
  Row as AriaRow,
  type RowProps,
  Table as AriaTable,
  TableBody as AriaTableBody,
  type TableBodyProps,
  TableHeader,
  type TableProps,
} from 'react-aria-components';

/**
 * Data table with keyboard navigation between rows and cells. Wide tables scroll
 * inside their own box instead of pushing the page sideways on a phone. Wrap
 * free text that can come without spaces (gallery or file names) in a
 * `wrap-anywhere` span, so the table narrows instead of scrolling.
 */
export function Table(props: Omit<TableProps, 'className'>) {
  return (
    <div className="overflow-x-auto">
      <AriaTable {...props} className="w-full border-collapse text-ui tabular-nums" />
    </div>
  );
}

export { TableHeader };

export function Column({
  align = 'start',
  ...props
}: Omit<ColumnProps, 'className'> & { align?: 'start' | 'end' }) {
  return (
    <AriaColumn
      {...props}
      className={`border-b border-line px-2 py-2.5 font-medium text-ink-muted ${
        align === 'end' ? 'text-right' : 'text-left'
      }`}
    />
  );
}

export function TableBody<T extends object>(props: Omit<TableBodyProps<T>, 'className'>) {
  return <AriaTableBody {...props} />;
}

export function Row<T extends object>(props: Omit<RowProps<T>, 'className'>) {
  return <AriaRow {...props} className="data-hovered:bg-raised/40" />;
}

export function Cell({
  align = 'start',
  ...props
}: Omit<CellProps, 'className'> & { align?: 'start' | 'end' }) {
  return (
    <AriaCell
      {...props}
      className={`border-b border-line px-2 py-3 ${align === 'end' ? 'text-right' : ''}`}
    />
  );
}
