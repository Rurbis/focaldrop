'use client';

import {
  TextField as AriaTextField,
  type TextFieldProps as AriaTextFieldProps,
  FieldError,
  Input,
  Label,
  Text,
} from 'react-aria-components';

export type TextFieldProps = Omit<AriaTextFieldProps, 'className' | 'children'> & {
  label: string;
  description?: string;
  /** Message for an invalid field; defaults to the browser's validation message. */
  errorMessage?: string;
  placeholder?: string;
};

/** Labelled input with its description and error, wired for screen readers. */
export function TextField({
  label,
  description,
  errorMessage,
  placeholder,
  ...props
}: TextFieldProps) {
  return (
    <AriaTextField {...props} className="flex flex-col gap-1.5">
      <Label className="text-ui font-medium">{label}</Label>
      <Input
        placeholder={placeholder}
        // 16 px text keeps iOS from zooming into the field.
        className="rounded-ui border border-field bg-surface px-3.5 py-3 text-body text-ink placeholder:text-ink-muted data-invalid:border-danger"
      />
      {description && (
        <Text slot="description" className="text-caption text-ink-muted">
          {description}
        </Text>
      )}
      <FieldError className="text-caption font-medium text-danger">{errorMessage}</FieldError>
    </AriaTextField>
  );
}
