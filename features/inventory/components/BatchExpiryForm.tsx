"use client";

import { useActionState } from "react";
import { updateBatchExpiry } from "@/features/inventory/lib/actions";
import type { ActionState } from "@/features/inventory/types";

const initialState: ActionState = {};

export function BatchExpiryForm({ batchId, expiryDate }: { batchId: string; expiryDate: Date | string }) {
  const [state, formAction, pending] = useActionState(updateBatchExpiry, initialState);
  const dateValue = new Date(expiryDate).toISOString().slice(0, 10);

  return (
    <form action={formAction} className="mt-2 flex flex-wrap items-center gap-2">
      <input type="hidden" name="batchId" value={batchId} />
      <label className="sr-only" htmlFor={`expiry-${batchId}`}>Edit batch expiry</label>
      <input id={`expiry-${batchId}`} name="expiryDate" type="date" required defaultValue={dateValue} className="border border-border bg-white px-2 py-1 text-xs text-ink" />
      <button type="submit" disabled={pending} aria-label="Save expiry date" title="Save expiry date" className="border border-primary px-2 py-1 text-xs font-medium text-primary disabled:opacity-50">{pending ? "Saving" : "Save"}</button>
      {state.error ? <span role="alert" className="text-xs text-danger">{state.error}</span> : null}
      {state.success ? <span role="status" className="text-xs text-primary">{state.success}</span> : null}
    </form>
  );
}
