"use client";

import type { ReactElement } from "react";
import * as AlertDialog from "@radix-ui/react-alert-dialog";

export function ConfirmDialog({
  trigger,
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  onConfirm,
}: {
  trigger?: ReactElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger ? <AlertDialog.Trigger asChild>{trigger}</AlertDialog.Trigger> : null}
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-[80] bg-on-surface/40" />
        <AlertDialog.Content className="fixed left-1/2 top-1/2 z-[81] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 border border-outline-variant bg-surface-container-lowest p-space-lg shadow-modal focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:p-space-xl">
          <AlertDialog.Title className="font-headline-md text-headline-md text-primary">
            {title}
          </AlertDialog.Title>
          <AlertDialog.Description className="mt-space-sm font-body-md text-body-md text-on-surface-variant">
            {description}
          </AlertDialog.Description>
          <div className="mt-space-lg flex flex-wrap justify-end gap-space-sm">
            <AlertDialog.Cancel className="min-h-11 border border-outline-variant bg-surface-container-lowest px-space-md font-label-md text-label-md text-on-surface-variant hover:bg-surface-container-low">
              {cancelLabel}
            </AlertDialog.Cancel>
            <AlertDialog.Action
              onClick={onConfirm}
              className={`min-h-11 px-space-md font-label-md text-label-md ${destructive ? "bg-status-danger text-white hover:bg-status-danger-text" : "bg-primary text-on-primary hover:bg-primary-container"}`}
            >
              {confirmLabel}
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
