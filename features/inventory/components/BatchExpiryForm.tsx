"use client";

import { useActionState } from "react";
import { updateBatchExpiry } from "@/features/inventory/lib/actions";
import type { ActionState } from "@/features/inventory/types";
import { FormField, FormInput } from "@/features/shared/components/FormField";

const initialState: ActionState = {};

export function BatchExpiryForm({
  batchId,
  expiryDate,
}: {
  batchId: string;
  expiryDate: Date | string;
}) {
  const [state, formAction, pending] = useActionState(updateBatchExpiry, initialState);
  const dateValue = new Date(expiryDate).toISOString().slice(0, 10);

  return (
    <form action={formAction} className="mt-space-xs flex flex-wrap items-end gap-space-xs">
      <input type="hidden" name="batchId" value={batchId} />
      <FormField id={`expiry-${batchId}`} label="Edit batch expiry" error={state.error}>
        {(fieldProps) => (
          <FormInput
            {...fieldProps}
            name="expiryDate"
            type="date"
            required
            defaultValue={dateValue}
            className="min-h-11 w-auto px-space-sm text-xs"
          />
        )}
      </FormField>
      <button
        type="submit"
        disabled={pending}
        aria-label="Save expiry date"
        title="Save expiry date"
        className="min-h-11 border border-primary px-space-sm font-label-sm text-label-sm text-primary disabled:opacity-50"
      >
        {pending ? "Saving" : "Save"}
      </button>
      {state.success ? (
        <span role="status" className="text-xs text-primary">
          {state.success}
        </span>
      ) : null}
    </form>
  );
}
