"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { adjustBatchQuantity } from "@/features/inventory/lib/actions";
import { validateStockCorrectionInput } from "@/features/inventory/lib/stock-adjustment";
import { ConfirmDialog } from "@/features/shared/components/ConfirmDialog";
import { FormField, FormInput } from "@/features/shared/components/FormField";
import { NoticeBanner } from "@/features/shared/components/NoticeBanner";
import type { ActionState } from "@/features/inventory/types";

const initialState: ActionState = {};

export function BatchQuantityAdjustment({
  batchId,
  batchNumber,
  productName,
  currentUnits,
  packSize,
}: {
  batchId: string;
  batchNumber: string | null;
  productName: string;
  currentUnits: number;
  packSize: number;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(adjustBatchQuantity, initialState);
  const [open, setOpen] = useState(false);
  const [expectedUnits, setExpectedUnits] = useState(currentUnits);
  const [countedUnits, setCountedUnits] = useState(String(currentUnits));
  const [reason, setReason] = useState("");
  const validation = validateStockCorrectionInput({ expectedUnits, countedUnits, reason });
  const batchLabel = batchNumber?.trim() || "No batch number";
  const parsedCount = /^\d+$/.test(countedUnits) ? Number(countedUnits) : null;
  const validCount = parsedCount !== null && Number.isSafeInteger(parsedCount) ? parsedCount : null;

  useEffect(() => {
    if (state.success) {
      setOpen(false);
      router.refresh();
    }
  }, [router, state]);

  function setDialogOpen(nextOpen: boolean) {
    if (nextOpen) {
      setExpectedUnits(currentUnits);
      setCountedUnits(String(currentUnits));
      setReason("");
    }
    setOpen(nextOpen);
  }

  const afterText = validCount !== null ? `${validCount} units` : "—";
  const deltaText = validCount !== null
    ? `${validCount - expectedUnits >= 0 ? "+" : ""}${validCount - expectedUnits} units`
    : "—";

  return (
    <Dialog.Root open={open} onOpenChange={setDialogOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="min-h-11 border border-primary px-space-sm font-label-sm text-label-sm text-primary hover:bg-primary hover:text-on-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Adjust
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[80] bg-on-surface/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[81] max-h-[90vh] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto border border-outline-variant bg-surface-container-lowest p-space-md shadow-modal focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:p-space-lg">
          <Dialog.Title className="font-headline-md text-headline-md text-primary">
            Adjust batch stock
          </Dialog.Title>
          <Dialog.Description className="mt-space-xs font-body-sm text-body-sm text-on-surface-variant">
            Count in units. Pack size: {packSize} units per pack.
          </Dialog.Description>

          <form ref={formRef} action={formAction} className="mt-space-md space-y-space-md">
            <input type="hidden" name="batchId" value={batchId} />
            <input type="hidden" name="expectedUnits" value={expectedUnits} />
            <div className="border-l-2 border-outline-variant bg-surface-container-low px-space-md py-space-sm">
              <p className="font-label-md text-label-md text-on-surface">{productName}</p>
              <p className="mt-space-xs font-body-sm text-body-sm text-on-surface-variant">
                Batch: {batchLabel}
              </p>
              <p className="mt-space-xs font-table-cell text-table-cell tabular-nums text-on-surface">
                System quantity: {expectedUnits} units
              </p>
            </div>

            <FormField id={`counted-units-${batchId}`} label="Counted on shelf (units)" required>
              {(fieldProps) => (
                <FormInput
                  {...fieldProps}
                  name="countedUnits"
                  type="number"
                  min="0"
                  step="1"
                  value={countedUnits}
                  onChange={(event) => setCountedUnits(event.target.value)}
                />
              )}
            </FormField>
            <FormField id={`count-reason-${batchId}`} label="Reason" required>
              {(fieldProps) => (
                <FormInput
                  {...fieldProps}
                  name="reason"
                  type="text"
                  maxLength={200}
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                />
              )}
            </FormField>

            <p className="font-body-sm text-body-sm tabular-nums text-on-surface-variant">
              Before: {expectedUnits} units · After: {afterText} · Change: {deltaText}
            </p>
            {state.error ? <NoticeBanner tone="danger">{state.error}</NoticeBanner> : null}

            <div className="flex flex-wrap justify-end gap-space-sm">
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="min-h-11 border border-outline-variant px-space-md font-label-md text-label-md text-on-surface-variant focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  Cancel
                </button>
              </Dialog.Close>
              <ConfirmDialog
                trigger={
                  <button
                    type="button"
                    disabled={pending || !validation.ok}
                    className="min-h-11 bg-primary px-space-md font-label-md text-label-md text-on-primary disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    Review adjustment
                  </button>
                }
                title="Confirm stock adjustment?"
                description={`Batch ${batchLabel}: change ${expectedUnits} units to ${validation.ok ? validation.value.countedUnits : "—"} units. Reason: ${validation.ok ? validation.value.reason : "—"}.`}
                confirmLabel="Confirm adjustment"
                onConfirm={() => formRef.current?.requestSubmit()}
              />
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}