"use client";

import { useActionState } from "react";
import { receiveBatch } from "@/features/inventory/lib/actions";
import type { ActionState, InventoryData } from "@/features/inventory/types";
import { FormField, FormInput, FormSelect } from "@/features/shared/components/FormField";
import { NoticeBanner } from "@/features/shared/components/NoticeBanner";

const initialState: ActionState = {};

export function ReceiveBatchForm({
  variants,
  branchId,
  includeBranchId,
}: {
  variants: InventoryData["variants"];
  branchId: string;
  includeBranchId: boolean;
}) {
  const [state, formAction, pending] = useActionState(receiveBatch, initialState);

  return (
    <form
      action={formAction}
      className="min-w-0 border border-outline-variant bg-surface-container-lowest p-space-md sm:p-space-lg"
    >
      <div className="mb-space-md">
        <p className="font-eyebrow text-eyebrow uppercase text-secondary">Add stock</p>
        <h2 className="mt-space-xs font-headline-md text-headline-md text-primary">
          Receive a new batch
        </h2>
      </div>
      {includeBranchId ? <input type="hidden" name="branchId" value={branchId} /> : null}
      <div className="space-y-space-md">
        <FormField id="receive-variant" label="Product variant" required>
          {(fieldProps) => (
            <FormSelect {...fieldProps} name="variantId">
              <option value="">Select a product</option>
              {variants.map((variant) => (
                <option key={variant.id} value={variant.id}>
                  {variant.ingredient?.name ? `${variant.ingredient.name} · ` : ""}
                  {variant.brandName} {variant.strength ?? ""}
                </option>
              ))}
            </FormSelect>
          )}
        </FormField>
        <div className="grid min-w-0 gap-space-md sm:grid-cols-2">
          <FormField id="receive-quantity" label="Quantity received (packs)" required>
            {(fieldProps) => (
              <FormInput {...fieldProps} name="quantityReceived" type="number" min="1" step="1" />
            )}
          </FormField>
          <FormField id="receive-expiry" label="Expiry date" required>
            {(fieldProps) => <FormInput {...fieldProps} name="expiryDate" type="date" />}
          </FormField>
        </div>
        <FormField id="receive-batch-number" label="Batch number (optional)">
          {(fieldProps) => (
            <FormInput {...fieldProps} name="batchNumber" type="text" maxLength={80} />
          )}
        </FormField>
        {state.error ? <NoticeBanner tone="danger">{state.error}</NoticeBanner> : null}
        {state.success ? <NoticeBanner tone="info">{state.success}</NoticeBanner> : null}
        <button
          type="submit"
          disabled={pending}
          className="min-h-11 w-full bg-primary px-space-md font-label-md text-label-md text-on-primary transition hover:bg-primary-container disabled:cursor-wait disabled:opacity-60"
        >
          {pending ? "Saving batch..." : "Receive batch"}
        </button>
      </div>
    </form>
  );
}
