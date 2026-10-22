'use client';

import type { ReactNode } from 'react';
import { Dialog, DialogTrigger, Heading, Modal, ModalOverlay } from 'react-aria-components';

import { Button, type ButtonProps } from './button';

export type ConfirmDialogProps = {
  /** Text of the button that opens the dialog. */
  trigger: ReactNode;
  triggerVariant?: ButtonProps['variant'];
  title: string;
  children: ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  /** `danger` for actions that delete or cannot be undone. */
  tone?: 'default' | 'danger';
  onConfirm: () => void;
};

/**
 * Asks before an important action. Focus starts on Cancel, so pressing Enter
 * by habit never confirms a destructive action; Escape and the backdrop close it.
 */
export function ConfirmDialog({
  trigger,
  triggerVariant = 'secondary',
  title,
  children,
  confirmLabel,
  cancelLabel,
  tone = 'default',
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <DialogTrigger>
      <Button variant={triggerVariant}>{trigger}</Button>
      <ModalOverlay
        isDismissable
        className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4"
      >
        <Modal className="w-full max-w-md rounded-ui bg-surface p-6 text-ink shadow-xl">
          <Dialog role="alertdialog" className="flex flex-col gap-4 outline-none">
            {({ close }) => (
              <>
                <Heading slot="title" className="text-title font-semibold">
                  {title}
                </Heading>
                <div className="text-body text-ink">{children}</div>
                <div className="flex flex-wrap justify-end gap-2">
                  <Button variant="secondary" autoFocus onPress={close}>
                    {cancelLabel}
                  </Button>
                  <Button
                    variant={tone === 'danger' ? 'danger' : 'primary'}
                    onPress={() => {
                      onConfirm();
                      close();
                    }}
                  >
                    {confirmLabel}
                  </Button>
                </div>
              </>
            )}
          </Dialog>
        </Modal>
      </ModalOverlay>
    </DialogTrigger>
  );
}
