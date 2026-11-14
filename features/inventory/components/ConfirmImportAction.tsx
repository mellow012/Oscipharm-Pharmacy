"use client";

import { ConfirmDialog } from "@/features/shared/components/ConfirmDialog";

export function ConfirmImportAction({
  label,
  title,
  description,
  disabled = false,
  onConfirm,
}: {
  label: string;
  title: string;
  description: string;
  disabled?: boolean;
  onConfirm: () => void;
}) {
  return (
    <ConfirmDialog
      trigger={
        <button
          type="button"
          disabled={disabled}
          className="min-h-11 bg-primary px-space-md font-label-md text-label-md text-on-primary disabled:opacity-50"
        >
          {label}
        </button>
      }
      title={title}
      description={description}
      confirmLabel={label}
      onConfirm={onConfirm}
    />
  );
}
