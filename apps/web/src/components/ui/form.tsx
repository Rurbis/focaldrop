import type { InputHTMLAttributes, ReactNode } from 'react';

const focusRing =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900';

type TextFieldProps = {
  label: string;
  name: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'name' | 'id' | 'className'>;

/** Labelled input of the neutral panel design (D39). */
export function TextField({ label, name, ...input }: TextFieldProps) {
  const id = `field-${name}`;
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-neutral-800">
        {label}
      </label>
      <input
        id={id}
        name={name}
        className={`mt-1 block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-base text-neutral-900 ${focusRing}`}
        {...input}
      />
    </div>
  );
}

/** Form-level message. Errors are announced right away; confirmations politely. */
export function FormMessage({
  tone,
  children,
}: {
  tone: 'error' | 'success';
  children: ReactNode;
}) {
  return tone === 'error' ? (
    <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
      {children}
    </p>
  ) : (
    <p role="status" className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
      {children}
    </p>
  );
}

export const buttonClass =
  'inline-flex w-full items-center justify-center rounded-md bg-neutral-900 px-4 py-2 text-sm ' +
  'font-medium text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60 ' +
  focusRing;

export const linkClass = `rounded-sm text-sm font-medium text-neutral-700 underline underline-offset-4 hover:text-neutral-900 ${focusRing}`;
