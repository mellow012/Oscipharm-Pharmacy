"use client";

import { useMemo, useState } from "react";
import { useActionState } from "react";
import { createAroniumProductLink, deleteAroniumProductLink } from "@/features/catalog/lib/aronium-actions";
import type { AroniumLinkActionState, StaffCatalogCategory } from "@/features/catalog/types";

const initialState: AroniumLinkActionState = {};

function formatCurrency(value: string | null) {
    if (!value) return "—";
    const numeric = Number(value);
    return Number.isFinite(numeric) ? `MK ${numeric.toLocaleString("en-MW")}` : value;
}

function AroniumLinkForm({ variantId, allowsLooseSale, branchId }: { variantId: string; allowsLooseSale: boolean; branchId: string }) {
    const [state, formAction, pending] = useActionState(createAroniumProductLink, initialState);

    return (
        <form action={formAction} className="mt-4 rounded border border-border bg-surface p-3">
            <input type="hidden" name="variantId" value={variantId} />
            <input type="hidden" name="branchId" value={branchId} />
            <div className="grid gap-3 sm:grid-cols-[1fr_160px_auto] sm:items-end">
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

function DeleteLinkForm({ linkId, branchId }: { linkId: string; branchId: string }) {
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

export function StaffCatalogWorkspace({
    categories,
    branchId,
    branches,
    role,
}: {
    categories: StaffCatalogCategory[];
    branchId: string;
    branches: Array<{ id: string; name: string }>;
    role: "ADMIN" | "BRANCH_MANAGER";
}) {
    const [query, setQuery] = useState("");

    const filteredCategories = useMemo(() => {
        const term = query.trim().toLowerCase();
        if (!term) return categories;

        return categories
            .map((category) => ({
                ...category,
                ingredients: category.ingredients
                    .map((ingredient) => ({
                        ...ingredient,
                        variants: ingredient.variants.filter((variant) => {
                            const haystack = [
                                category.name,
                                ingredient.name,
                                variant.brandName,
                                variant.strength ?? "",
                                ...variant.aroniumProductLinks.map((link) => `${link.aroniumCode} ${link.mode}`),
                            ]
                                .join(" ")
                                .toLowerCase();
                            return haystack.includes(term);
                        }),
                    }))
                    .filter((ingredient) => ingredient.variants.length > 0),
            }))
            .filter((category) => category.ingredients.length > 0);
    }, [categories, query]);

    return (
        <main className="mx-auto min-h-screen w-full max-w-6xl px-5 py-6 sm:px-8 sm:py-8">
            <div className="mb-8 flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="mb-2 font-mono text-xs uppercase tracking-[0.18em] text-warn">Staff catalog</p>
                    <h1 className="text-4xl text-ink">Catalog overview</h1>
                </div>
                <div className="flex items-center gap-3">
                    {role === "ADMIN" && branches.length > 0 ? (
                        <label className="text-xs uppercase tracking-[0.08em] text-muted">
                            Branch
                            <select defaultValue={branchId} className="ml-2 border border-border bg-white px-3 py-2 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/15" onChange={(event) => {
                                const next = event.target.value;
                                if (next) window.location.href = `/staff/catalog?branchId=${encodeURIComponent(next)}`;
                            }}>
                                {branches.map((branch) => (
                                    <option key={branch.id} value={branch.id}>{branch.name}</option>
                                ))}
                            </select>
                        </label>
                    ) : null}
                </div>
            </div>

            <div className="mb-8 max-w-xl">
                <label className="block text-xs uppercase tracking-[0.08em] text-muted">
                    Search catalog
                    <input
                        type="search"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Search ingredient, brand, code..."
                        className="mt-2 w-full border border-border bg-white px-4 py-3 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                    />
                </label>
            </div>

            <div className="space-y-8">
                {filteredCategories.map((category) => (
                    <section key={category.id} className="rounded border border-border bg-white p-5">
                        <div className="mb-5 flex items-end justify-between border-b border-border pb-3">
                            <h2 className="text-2xl text-ink">{category.name}</h2>
                            <span className="font-mono text-[0.68rem] uppercase tracking-[0.14em] text-muted">
                                {category.ingredients.reduce((total, ingredient) => total + ingredient.variants.length, 0)} variants
                            </span>
                        </div>

                        <div className="space-y-6">
                            {category.ingredients.map((ingredient) => (
                                <div key={ingredient.id} className="border-l border-border pl-4">
                                    <h3 className="mb-4 text-xl text-ink">{ingredient.name}</h3>
                                    <div className="space-y-4">
                                        {ingredient.variants.map((variant) => (
                                            <article key={variant.id} className="rounded border border-border bg-surface p-4">
                                                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                                    <div>
                                                        <div className="flex flex-wrap items-center gap-3">
                                                            <h4 className="text-lg font-semibold text-ink">{variant.brandName}</h4>
                                                            {variant.strength ? <span className="text-sm text-muted">{variant.strength}</span> : null}
                                                            <span className={`inline-flex items-center rounded-full border px-2 py-1 text-[0.65rem] font-medium uppercase tracking-[0.1em] ${variant.isActive ? "border-success/30 bg-success/10 text-success" : "border-danger/30 bg-danger/10 text-danger"}`}>
                                                                {variant.isActive ? "Active" : "Inactive"}
                                                            </span>
                                                        </div>
                                                        <p className="mt-1 text-sm text-muted">{variant.packSize} {variant.unitLabel}s per pack</p>
                                                    </div>

                                                    <div className="grid gap-3 text-sm sm:grid-cols-3 lg:min-w-[380px]">
                                                        <div>
                                                            <div className="text-[0.65rem] uppercase tracking-[0.08em] text-muted">Pack price</div>
                                                            <div className="mt-1 font-medium text-ink">{formatCurrency(variant.pricePerPack)}</div>
                                                        </div>
                                                        <div>
                                                            <div className="text-[0.65rem] uppercase tracking-[0.08em] text-muted">Unit price</div>
                                                            <div className="mt-1 font-medium text-ink">{variant.allowsLooseSale ? formatCurrency(variant.pricePerUnit) : "Pack only"}</div>
                                                        </div>
                                                        <div>
                                                            <div className="text-[0.65rem] uppercase tracking-[0.08em] text-muted">Total stock</div>
                                                            <div className="mt-1 font-medium text-ink">{variant.stock} units</div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="mt-4 border-t border-border pt-4">
                                                    <div className="mb-2 flex items-center justify-between gap-3">
                                                        <h5 className="text-sm font-semibold uppercase tracking-[0.08em] text-muted">Aronium codes</h5>
                                                        <span className="font-mono text-[0.65rem] uppercase tracking-[0.08em] text-muted">{variant.aroniumProductLinks.length} linked</span>
                                                    </div>
                                                    {variant.aroniumProductLinks.length > 0 ? (
                                                        <ul className="mb-4 space-y-2">
                                                            {variant.aroniumProductLinks.map((link) => (
                                                                <li key={link.id} className="flex items-center justify-between gap-3 rounded border border-border bg-white px-3 py-2 text-sm">
                                                                    <span>
                                                                        <span className="font-medium text-ink">{link.aroniumCode}</span>
                                                                        <span className="ml-2 text-muted">({link.mode})</span>
                                                                    </span>
                                                                    <DeleteLinkForm linkId={link.id} branchId={branchId} />
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    ) : (
                                                        <p className="mb-4 text-sm text-muted">No Aronium codes linked yet.</p>
                                                    )}
                                                    <AroniumLinkForm variantId={variant.id} allowsLooseSale={variant.allowsLooseSale} branchId={branchId} />
                                                </div>
                                            </article>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                ))}

                {filteredCategories.length === 0 ? (
                    <div className="rounded border border-dashed border-border bg-surface p-10 text-center text-muted">
                        No variants match your search.
                    </div>
                ) : null}
            </div>
        </main>
    );
}
