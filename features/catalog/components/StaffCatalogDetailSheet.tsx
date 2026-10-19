"use client";

import { useEffect, useRef, useState } from "react";
import { pluralizeLabel } from "@/lib/plural";
import { useActionState } from "react";
import { createAroniumProductLink, deleteAroniumProductLink } from "@/features/catalog/lib/aronium-actions";
import { StaffVariantForm } from "@/features/catalog/components/StaffVariantForm";
import type { StaffCatalogCategory } from "@/features/catalog/types";
import type { AroniumLinkActionState } from "@/features/catalog/types";

const initialState: AroniumLinkActionState = {};

function formatCurrency(value: string | null) {
    if (!value) return "—";
    const numeric = Number(value);
    return Number.isFinite(numeric) ? `MK ${numeric.toLocaleString("en-MW")}` : value;
}

function AroniumForm({ variantId, allowsLooseSale, branchId }: { variantId: string; allowsLooseSale: boolean; branchId: string }) {
    const [state, formAction, pending] = useActionState(createAroniumProductLink, initialState);

    return (
        <form action={formAction} className="mt-4 rounded border border-border bg-surface p-3">
            <input type="hidden" name="variantId" value={variantId} />
            <input type="hidden" name="branchId" value={branchId} />
            <div className="grid gap-3 sm:grid-cols-[1fr_140px_auto] sm:items-end">
                <label className="text-xs uppercase tracking-[0.08em] text-muted">
                    Aronium code
                    <input name="aroniumCode" required placeholder="e.g. 3" maxLength={100} className="mt-2 w-full border border-border bg-white px-3 py-2 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/15" />
                </label>
                <label className="text-xs uppercase tracking-[0.08em] text-muted">
                    Mode
                    <select name="mode" defaultValue="PACK" className="mt-2 w-full border border-border bg-white px-3 py-2 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/15">
                        <option value="PACK">PACK</option>
                        {allowsLooseSale ? <option value="UNIT">UNIT</option> : null}
                    </select>
                </label>
                <button type="submit" disabled={pending} className="inline-flex min-h-[42px] items-center justify-center border border-primary px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-primary transition hover:bg-primary hover:text-primary-fg disabled:cursor-wait disabled:opacity-60">
                    {pending ? "Saving..." : "Add code"}
                </button>
            </div>
            {state.error ? <p role="alert" className="mt-3 text-sm text-danger">{state.error}</p> : null}
            {state.success ? <p role="status" className="mt-3 text-sm text-primary">{state.success}</p> : null}
        </form>
    );
}

function DeleteAroniumForm({ linkId, branchId }: { linkId: string; branchId: string }) {
    const [state, formAction, pending] = useActionState(deleteAroniumProductLink, initialState);

    return (
        <form action={formAction} className="inline-block">
            <input type="hidden" name="linkId" value={linkId} />
            <input type="hidden" name="branchId" value={branchId} />
            <button type="submit" disabled={pending} className="text-xs font-medium text-danger underline underline-offset-2 transition hover:text-danger/80 disabled:cursor-wait disabled:opacity-60">
                {pending ? "Removing..." : "Remove"}
            </button>
            {state.error ? <div className="mt-2 text-xs text-danger">{state.error}</div> : null}
            {state.success ? <div className="mt-2 text-xs text-primary">{state.success}</div> : null}
        </form>
    );
}

export function StaffCatalogDetailSheet({
    variant,
    branchId,
    categories,
    onSaved,
    onClose,
}: {
    variant: {
        id: string;
        categoryId: string | null;
        ingredientId: string | null;
        brandName: string;
        strength: string | null;
        packSize: number;
        unitLabel: string;
        allowsLooseSale: boolean;
        isActive: boolean;
        pricePerPack: string | null;
        pricePerUnit: string | null;
        stock: number;
        aroniumProductLinks: Array<{ id: string; aroniumCode: string; mode: "PACK" | "UNIT" }>;
    } | null;
    branchId: string;
    categories: StaffCatalogCategory[];
    onSaved: (variantId: string) => void;
    onClose: () => void;
}) {
    const [editing, setEditing] = useState(!variant);
    const panelRef = useRef<HTMLDivElement | null>(null);
    const previousFocusRef = useRef<HTMLElement | null>(null);

    useEffect(() => {
        previousFocusRef.current = document.activeElement as HTMLElement | null;
        panelRef.current?.focus();

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") onClose();
        };

        window.addEventListener("keydown", onKeyDown);
        return () => {
            window.removeEventListener("keydown", onKeyDown);
            previousFocusRef.current?.focus();
        };
    }, [onClose]);

    return (
        <div className="fixed inset-0 z-50 bg-black/40 p-3 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="variant-detail-title">
            <div className="flex h-full items-end justify-end sm:items-center">
                <div
                    ref={panelRef}
                    tabIndex={-1}
                    className="h-full w-full overflow-y-auto rounded-t-2xl border border-border bg-white p-4 shadow-2xl outline-none sm:h-auto sm:max-h-[90vh] sm:w-[560px] sm:rounded-2xl"
                >
                    <div className="mb-4 flex items-start justify-between gap-4 border-b border-border pb-4">
                        <div>
                            <p className="text-[0.65rem] font-medium uppercase tracking-[0.12em] text-muted">Staff catalog</p>
                            <h3 id="variant-detail-title" className="mt-2 text-2xl text-ink">{editing ? variant ? "Edit variant" : "Add variant" : variant?.brandName}</h3>
                            {!editing && variant ? <p className="mt-1 text-sm text-muted">{variant.strength ?? "Standard strength"}</p> : null}
                        </div>
                        <button type="button" onClick={onClose} className="rounded border border-border px-2 py-1 text-sm text-muted hover:text-primary">Close</button>
                    </div>

                    {editing ? (
                        <StaffVariantForm
                            categories={categories}
                            branchId={branchId}
                            variant={variant}
                            onCancel={() => variant ? setEditing(false) : onClose()}
                            onSaved={(variantId) => {
                                setEditing(false);
                                onSaved(variantId);
                            }}
                        />
                    ) : variant ? <>
                        <div className="mb-4 flex justify-end">
                            <button type="button" onClick={() => setEditing(true)} className="border border-primary px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-primary hover:bg-primary hover:text-primary-fg">Edit</button>
                        </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded border border-border bg-surface p-3">
                            <div className="text-[0.65rem] uppercase tracking-[0.08em] text-muted">Pack size</div>
                            <div className="mt-2 font-medium text-ink">{variant.packSize} {pluralizeLabel(variant.packSize, variant.unitLabel)}</div>
                        </div>
                        <div className="rounded border border-border bg-surface p-3">
                            <div className="text-[0.65rem] uppercase tracking-[0.08em] text-muted">Status</div>
                            <div className="mt-2 inline-flex items-center rounded-full border px-2 py-1 text-[0.65rem] font-medium uppercase tracking-[0.1em] text-ink">
                                {variant.isActive ? "Active" : "Inactive"}
                            </div>
                        </div>
                        <div className="rounded border border-border bg-surface p-3">
                            <div className="text-[0.65rem] uppercase tracking-[0.08em] text-muted">Pack price</div>
                            <div className="mt-2 font-medium text-ink">{formatCurrency(variant.pricePerPack)}</div>
                        </div>
                        <div className="rounded border border-border bg-surface p-3">
                            <div className="text-[0.65rem] uppercase tracking-[0.08em] text-muted">Unit price</div>
                            <div className="mt-2 font-medium text-ink">{variant.allowsLooseSale ? formatCurrency(variant.pricePerUnit) : "Pack only"}</div>
                        </div>
                    </div>

                    <div className="mt-5 rounded border border-border bg-surface p-3">
                        <div className="flex items-center justify-between gap-3">
                            <div className="text-sm font-semibold uppercase tracking-[0.08em] text-muted">Total stock</div>
                            <div className="text-lg font-medium text-ink">{variant.stock} units</div>
                        </div>
                    </div>

                    <div className="mt-6">
                        <div className="mb-2 flex items-center justify-between gap-3">
                            <h4 className="text-sm font-semibold uppercase tracking-[0.08em] text-muted">Aronium codes</h4>
                            <span className="font-mono text-[0.62rem] uppercase tracking-[0.08em] text-muted">{variant.aroniumProductLinks.length} {pluralizeLabel(variant.aroniumProductLinks.length, "code")} linked</span>
                        </div>

                        {variant.aroniumProductLinks.length > 0 ? (
                            <ul className="space-y-2">
                                {variant.aroniumProductLinks.map((link) => (
                                    <li key={link.id} className="flex items-center justify-between gap-3 rounded border border-border bg-white px-3 py-2 text-sm">
                                        <span>
                                            <span className="font-medium text-ink">{link.aroniumCode}</span>
                                            <span className="ml-2 text-muted">({link.mode})</span>
                                        </span>
                                        <DeleteAroniumForm linkId={link.id} branchId={branchId} />
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="mb-4 text-sm text-muted">No Aronium codes linked yet.</p>
                        )}

                        <AroniumForm variantId={variant.id} allowsLooseSale={variant.allowsLooseSale} branchId={branchId} />
                    </div>
                    </> : null}
                </div>
            </div>
        </div>
    );
}
