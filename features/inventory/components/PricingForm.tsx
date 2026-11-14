"use client";

import { useActionState } from "react";
import { updateBranchPrice } from "@/features/inventory/lib/actions";
import type { ActionState, InventoryData } from "@/features/inventory/types";
import { FormField, FormInput } from "@/features/shared/components/FormField";
import { NoticeBanner } from "@/features/shared/components/NoticeBanner";
import { StatusBadge } from "@/features/shared/components/StatusBadge";

const initialState: ActionState = {};

export function PricingForm({
  variant,
  branchId,
  includeBranchId,
}: {
  variant: InventoryData["variants"][number];
  branchId: string;
  includeBranchId: boolean;
}) {
  const [state, formAction, pending] = useActionState(updateBranchPrice, initialState);
  const price = variant.price;

  return (
    <form
      action={formAction}
      className="min-w-0 border border-outline-variant bg-surface-container-lowest p-space-md"
    >
      {includeBranchId ? <input type="hidden" name="branchId" value={branchId} /> : null}
      <input type="hidden" name="variantId" value={variant.id} />
      <div className="mb-space-md flex min-w-0 flex-col gap-space-sm sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-headline-sm text-headline-sm text-primary">
            {variant.ingredient?.name
              ? `${variant.ingredient.name} · ${variant.brandName}`
              : variant.brandName}
          </h3>
          <p className="mt-space-xs font-body-sm text-body-sm text-on-surface-variant">
            {variant.strength ?? "Standard strength"} · {variant.packSize} {variant.unitLabel}s per
            pack
          </p>
        </div>
        {!variant.allowsLooseSale ? (
          <StatusBadge tone="neutral">Pack sales only</StatusBadge>
        ) : null}
      </div>
      <div className="grid min-w-0 gap-space-md sm:grid-cols-2 2xl:grid-cols-3">
        <FormField id={`price-pack-${variant.id}`} label="Per pack" required>
          {(fieldProps) => (
            <FormInput
              {...fieldProps}
              name="pricePerPack"
              type="number"
              min="0"
              step="0.01"
              defaultValue={price?.pricePerPack ?? "0"}
            />
          )}
        </FormField>
        <FormField id={`price-unit-${variant.id}`} label={`Per ${variant.unitLabel}`} required>
          {(fieldProps) => (
            <FormInput
              {...fieldProps}
              name="pricePerUnit"
              type="number"
              min="0"
              step="0.01"
              required
              disabled={!variant.allowsLooseSale}
              defaultValue={variant.allowsLooseSale ? (price?.pricePerUnit ?? "0") : "0"}
            />
          )}
        </FormField>
        <FormField id={`reorder-${variant.id}`} label="Reorder at (units)">
          {(fieldProps) => (
            <FormInput
              {...fieldProps}
              name="reorderThreshold"
              type="number"
              min="0"
              step="1"
              defaultValue={price?.reorderThreshold ?? ""}
            />
          )}
        </FormField>
      </div>
      <div className="mt-space-md flex min-w-0 flex-col gap-space-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          {state.error ? <NoticeBanner tone="danger">{state.error}</NoticeBanner> : null}
          {state.success ? <NoticeBanner tone="info">{state.success}</NoticeBanner> : null}
        </div>
        <button
          type="submit"
          disabled={pending}
          className="min-h-11 shrink-0 border border-primary px-space-md font-label-md text-label-md text-primary transition hover:bg-primary hover:text-on-primary disabled:cursor-wait disabled:opacity-60"
        >
          {pending ? "Saving..." : "Save pricing"}
        </button>
      </div>
    </form>
  );
}
