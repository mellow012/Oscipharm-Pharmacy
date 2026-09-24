"use client";

import { useActionState } from "react";
import { updateBranchPrice } from "@/features/inventory/lib/actions";
import type { ActionState, InventoryData } from "@/features/inventory/types";

const initialState: ActionState = {};

export function PricingForm({ variant, branchId, includeBranchId }: { variant: InventoryData["variants"][number]; branchId: string; includeBranchId: boolean }) {
    const [state, formAction, pending] = useActionState(updateBranchPrice, initialState);
    const price = variant.price;

    return (
        <form action={formAction} className="border-t border-border py-5 first:border-t-0">
            {includeBranchId ? <input type="hidden" name="branchId" value={branchId} /> : null}
            <input type="hidden" name="variantId" value={variant.id} />
            <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                <div>
                    <h3 className="text-lg text-ink">{variant.ingredient.name} · {variant.brandName}</h3>
                    <p className="text-sm text-muted">{variant.strength ?? "Standard strength"} · {variant.packSize} {variant.unitLabel}s per pack</p>
                </div>
                {!variant.allowsLooseSale ? <span className="font-mono text-[0.65rem] uppercase tracking-[0.1em] text-muted">Pack sales only</span> : null}
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
                <label className="text-xs uppercase tracking-[0.08em] text-muted">
                    Per pack
                    <input name="pricePerPack" type="number" min="0" step="0.01" required defaultValue={price?.pricePerPack ?? "0"} className="mt-2 w-full border border-border bg-white px-3 py-2 text-sm normal-case tracking-normal text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/15" />
                </label>
                <label className="text-xs uppercase tracking-[0.08em] text-muted">
                    Per {variant.unitLabel}
                    <input name="pricePerUnit" type="number" min="0" step="0.01" required disabled={!variant.allowsLooseSale} defaultValue={variant.allowsLooseSale ? (price?.pricePerUnit ?? "0") : "0"} className="mt-2 w-full border border-border bg-white px-3 py-2 text-sm normal-case tracking-normal text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:bg-bg disabled:text-muted" />
                </label>
                <label className="text-xs uppercase tracking-[0.08em] text-muted">
                    Reorder at (units)
                    <input name="reorderThreshold" type="number" min="0" step="1" defaultValue={price?.reorderThreshold ?? ""} className="mt-2 w-full border border-border bg-white px-3 py-2 text-sm normal-case tracking-normal text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/15" />
                </label>
            </div>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm">{state.error ? <span role="alert" className="text-danger">{state.error}</span> : null}{state.success ? <span role="status" className="text-primary">{state.success}</span> : null}</div>
                <button type="submit" disabled={pending} className="border border-primary px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary hover:text-primary-fg disabled:cursor-wait disabled:opacity-60">
                    {pending ? "Saving..." : "Save pricing"}
                </button>
            </div>
        </form>
    );
}