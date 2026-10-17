"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { StaffCatalogDetailSheet } from "@/features/catalog/components/StaffCatalogDetailSheet";
import { StaffCatalogSidebar } from "@/features/catalog/components/StaffCatalogSidebar";
import { StaffCatalogVariantList, type StaffCatalogIngredientGroup, type StaffCatalogVariantRow } from "@/features/catalog/components/StaffCatalogVariantList";
import type { StaffCatalogCategory, StaffCatalogUncategorizedVariant } from "@/features/catalog/types";

export function StaffCatalogWorkspace({
    categories,
    uncategorizedVariants,
    branchId,
    branches,
    role,
}: {
    categories: StaffCatalogCategory[];
    uncategorizedVariants: StaffCatalogUncategorizedVariant[];
    branchId: string;
    branches: Array<{ id: string; name: string }>;
    role: "ADMIN" | "BRANCH_MANAGER";
}) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
    const [creatingVariant, setCreatingVariant] = useState(false);

    const rawCategory = searchParams.get("category") ?? "all";
    const searchText = searchParams.get("query") ?? "";
    const notLinkedOnly = searchParams.get("notLinked") === "1";
    const pageParam = Number(searchParams.get("page") ?? "1");
    const currentCategory = rawCategory === "all" || rawCategory === "uncategorized" ? rawCategory : rawCategory;

    const allRows = useMemo<StaffCatalogVariantRow[]>(() => [
        ...categories.flatMap((category) => category.ingredients.flatMap((ingredient) => ingredient.variants.map((variant) => ({
        id: variant.id,
        categoryId: category.id,
        categoryName: category.name,
        ingredientId: ingredient.id,
        ingredientName: ingredient.name,
        brandName: variant.brandName,
        strength: variant.strength,
        packSize: variant.packSize,
        unitLabel: variant.unitLabel,
        allowsLooseSale: variant.allowsLooseSale,
        isActive: variant.isActive,
        pricePerPack: variant.pricePerPack,
        pricePerUnit: variant.pricePerUnit,
        stock: variant.stock,
        aroniumProductLinks: variant.aroniumProductLinks,
        })))),
        ...uncategorizedVariants.map((variant) => ({
            id: variant.id,
            categoryId: null,
            categoryName: null,
            ingredientId: variant.ingredient?.id ?? null,
            ingredientName: variant.ingredient?.name ?? null,
            brandName: variant.brandName,
            strength: variant.strength,
            packSize: variant.packSize,
            unitLabel: variant.unitLabel,
            allowsLooseSale: variant.allowsLooseSale,
            isActive: variant.isActive,
            pricePerPack: variant.pricePerPack,
            pricePerUnit: variant.pricePerUnit,
            stock: variant.stock,
            aroniumProductLinks: variant.aroniumProductLinks,
        })),
    ], [categories, uncategorizedVariants]);

    const categorySummaries = useMemo(() => {
        const result = [{ id: "all", name: "All", count: allRows.length }];
        categories.forEach((category) => {
            result.push({
                id: category.id,
                name: category.name,
                count: category.ingredients.reduce((total, ingredient) => total + ingredient.variants.length, 0),
            });
        });
        const uncategorizedCount = uncategorizedVariants.length;
        if (uncategorizedCount > 0) result.push({ id: "uncategorized", name: "Uncategorized", count: uncategorizedCount });
        return result;
    }, [allRows.length, categories, uncategorizedVariants.length]);

    const filteredRows = useMemo(() => {
        const search = searchText.trim().toLowerCase();

        return allRows.filter((row) => {
            if (search) {
                const haystack = [
                    row.ingredientName ?? "",
                    row.brandName,
                    row.strength ?? "",
                    row.categoryName ?? "",
                    ...row.aroniumProductLinks.map((link) => `${link.aroniumCode} ${link.mode}`),
                ].join(" ").toLowerCase();
                if (!haystack.includes(search)) return false;
            } else if (currentCategory === "uncategorized") {
                if (row.categoryId !== null) return false;
            } else if (currentCategory !== "all" && row.categoryId !== currentCategory) {
                return false;
            }

            if (notLinkedOnly && row.aroniumProductLinks.length > 0) return false;
            return true;
        });
    }, [allRows, currentCategory, notLinkedOnly, searchText]);

    const pageSize = 25;
    const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
    const safePage = Math.min(Math.max(Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1, 1), totalPages);

    useEffect(() => {
        if (safePage !== pageParam) {
            const params = new URLSearchParams(searchParams.toString());
            params.set("page", String(safePage));
            router.replace(`${pathname}?${params.toString()}`, { scroll: false });
        }
    }, [pageParam, pathname, router, safePage, searchParams]);

    const visibleRows = filteredRows.slice((safePage - 1) * pageSize, safePage * pageSize);
    const selectedVariant = allRows.find((row) => row.id === selectedVariantId) ?? null;

    const updateParams = (updates: Record<string, string | null>) => {
        const params = new URLSearchParams(searchParams.toString());
        Object.entries(updates).forEach(([key, value]) => {
            if (value === null || value === "") {
                params.delete(key);
            } else {
                params.set(key, value);
            }
        });
        if (!params.has("page") && !updates.page) {
            params.set("page", "1");
        }
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    };

    const onCategoryChange = (categoryId: string) => {
        updateParams({ category: categoryId === "all" ? "all" : categoryId, page: "1" });
    };

    const onSearchChange = (nextValue: string) => {
        const trimmed = nextValue.trim();
        updateParams({ query: trimmed || null, page: "1" });
    };

    const onNotLinkedToggle = () => {
        updateParams({ notLinked: notLinkedOnly ? null : "1", page: "1" });
    };

    const onPrevPage = () => {
        if (safePage > 1) updateParams({ page: String(safePage - 1) });
    };

    const onNextPage = () => {
        if (safePage < totalPages) updateParams({ page: String(safePage + 1) });
    };

    const ingredientGroups = useMemo(() => {
        const groups = new Map<string, StaffCatalogIngredientGroup>();
        visibleRows.forEach((row) => {
            const key = `${row.categoryId ?? "uncategorized"}:${row.ingredientId ?? row.id}`;
            const group = groups.get(key) ?? {
                ingredientName: row.ingredientName ?? row.brandName,
                categoryName: row.categoryName ?? "Uncategorized",
                rows: [],
            };
            group.rows.push(row);
            groups.set(key, group);
        });
        return Array.from(groups.values()).sort((a, b) => a.ingredientName.localeCompare(b.ingredientName));
    }, [visibleRows]);

    return (
        <main className="mx-auto min-h-screen w-full max-w-7xl px-5 py-6 sm:px-8 sm:py-8">
            <div className="mb-8 flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="mb-2 font-mono text-xs uppercase tracking-[0.18em] text-warn">Staff catalog</p>
                    <h1 className="text-4xl text-ink">Catalog overview</h1>
                </div>
                <div className="flex flex-wrap items-center gap-3">
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
                    <button type="button" onClick={() => { setSelectedVariantId(null); setCreatingVariant(true); }} className="border border-primary bg-primary px-4 py-2 text-sm font-medium text-primary-fg">Add variant</button>
                </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[260px_minmax(0,1fr)]">
                <StaffCatalogSidebar
                    categories={categorySummaries}
                    selectedCategory={currentCategory}
                    onSelect={onCategoryChange}
                />

                <section>
                    <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                        <label className="block w-full max-w-xl">
                            <span className="text-xs uppercase tracking-[0.08em] text-muted">Search catalog</span>
                            <input
                                type="search"
                                value={searchText}
                                onChange={(event) => onSearchChange(event.target.value)}
                                placeholder="Ingredient, brand, strength or Aronium code"
                                className="mt-2 w-full border border-border bg-white px-4 py-3 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                            />
                        </label>

                        <button
                            type="button"
                            onClick={onNotLinkedToggle}
                            aria-pressed={notLinkedOnly}
                            className={`inline-flex items-center justify-center rounded-full border px-4 py-2 text-xs font-medium uppercase tracking-[0.08em] transition ${
                                notLinkedOnly ? "border-primary bg-primary text-primary-fg" : "border-border bg-surface text-ink hover:border-primary/40 hover:text-primary"
                            }`}
                        >
                            Not linked to Aronium
                        </button>
                    </div>

                    {filteredRows.length === 0 ? (
                        <div className="rounded border border-dashed border-border bg-surface p-10 text-center">
                            <p className="text-lg text-ink">
                                {searchText
                                    ? "No variants match your search."
                                    : notLinkedOnly
                                        ? "Every variant in this view is linked to Aronium."
                                        : currentCategory !== "all"
                                            ? "No variants in this category yet."
                                            : "No variants in the catalog yet."}
                            </p>
                            <p className="mt-2 text-sm text-muted">
                                {searchText
                                    ? "Try another ingredient, brand, strength or Aronium code."
                                    : notLinkedOnly
                                        ? "Clear the filter to view linked variants."
                                        : currentCategory !== "all"
                                            ? "This category does not currently contain any variants."
                                            : "Add a variant to get started."}
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
                                <div className="text-sm text-muted">
                                    Showing {filteredRows.length === 0 ? 0 : ((safePage - 1) * pageSize) + 1}-{Math.min(safePage * pageSize, filteredRows.length)} of {filteredRows.length}
                                </div>
                                <div className="flex items-center gap-3">
                                    <button type="button" onClick={onPrevPage} disabled={safePage === 1} className="border border-border px-3 py-1.5 text-sm text-ink disabled:cursor-not-allowed disabled:opacity-40">Previous</button>
                                    <button type="button" onClick={onNextPage} disabled={safePage >= totalPages} className="border border-border px-3 py-1.5 text-sm text-ink disabled:cursor-not-allowed disabled:opacity-40">Next</button>
                                </div>
                            </div>

                            <StaffCatalogVariantList groups={ingredientGroups} searchText={searchText} onSelect={setSelectedVariantId} />
                        </>
                    )}
                </section>
            </div>

            {selectedVariant || creatingVariant || selectedVariantId !== null ? (
                <StaffCatalogDetailSheet
                    variant={selectedVariant}
                    branchId={branchId}
                    categories={categories}
                    onSaved={(variantId) => {
                        setCreatingVariant(false);
                        setSelectedVariantId(variantId);
                        router.refresh();
                    }}
                    onClose={() => { setSelectedVariantId(null); setCreatingVariant(false); }}
                />
            ) : null}
        </main>
    );
}
