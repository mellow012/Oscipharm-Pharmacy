"use client";

import { useActionState } from "react";
import { receiveBatch } from "@/features/inventory/lib/actions";
import type { ActionState, InventoryData } from "@/features/inventory/types";

const initialState: ActionState = {};

export function ReceiveBatchForm({ variants, branchId, includeBranchId }: { variants: InventoryData["variants"]; branchId: string; includeBranchId: boolean }) {
    const [state, formAction, pending] = useActionState(receiveBatch, initialState);

    return (
        <form action={formAction} className="border border-border bg-surface p-5 sm:p-6">
            <div className="mb-5">
                <p className="font-mono text-xs uppercase tracking-[0.16em] text-warn">Add stock</p>
                <h2 className="mt-2 text-2xl text-ink">Receive a new batch</h2>
            </div>
            {includeBranchId ? <input type="hidden" name="branchId" value={branchId} /> : null}
            <div className="space-y-4">
                <label className="block text-sm text-muted">
                    Product variant
                    <select name="variantId" required className="mt-2 w-full border border-border bg-white px-3 py-3 text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/15">
                        <option value="">Select a product</option>
                        {variants.map((variant) => (
                            <option key={variant.id} value={variant.id}>{variant.ingredient.name} · {variant.brandName} {variant.strength ?? ""}</option>
                        ))}
                    </select>
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block text-sm text-muted">
                        Quantity received (packs)
                        <input name="quantityReceived" type="number" min="1" step="1" required className="mt-2 w-full border border-border bg-white px-3 py-3 text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/15" />
                    </label>
                    <label className="block text-sm text-muted">
                        Expiry date
                        <input name="expiryDate" type="date" required className="mt-2 w-full border border-border bg-white px-3 py-3 text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/15" />
                    </label>
                </div>
                <label className="block text-sm text-muted">
                    Batch number <span className="text-xs">(optional)</span>
                    <input name="batchNumber" type="text" maxLength={80} className="mt-2 w-full border border-border bg-white px-3 py-3 text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/15" />
                </label>
                {state.error ? <p role="alert" className="border-l-4 border-danger bg-danger-bg px-3 py-2 text-sm text-danger">{state.error}</p> : null}
                {state.success ? <p role="status" className="border-l-4 border-primary bg-chip px-3 py-2 text-sm text-primary">{state.success}</p> : null}
                <button type="submit" disabled={pending} className="w-full bg-primary px-4 py-3 font-semibold text-primary-fg transition hover:bg-ink disabled:cursor-wait disabled:opacity-60">
                    {pending ? "Saving batch..." : "Receive batch"}
                </button>
            </div>
        </form>
    );
}