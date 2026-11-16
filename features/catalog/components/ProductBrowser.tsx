"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { useEffect, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { InPlaceFilter } from "@/features/shared/components/InPlaceFilter";
import { buildNextQueryString } from "@/features/shared/lib/query-string";
import { CatalogProductCard, type CatalogProduct } from "@/features/catalog/components/CatalogProductCard";
import { pluralizeLabel } from "@/lib/plural";

type Category = { name: string };

export function ProductBrowser({ categories, products }: { categories: Category[]; products: CatalogProduct[] }) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const search = searchParams.get("search") ?? "";
    const activeCategory = searchParams.get("category") ?? "all";
    const inStockOnly = searchParams.get("stock") === "1";
    const sort = searchParams.get("sort") === "price" ? "price" : "name";

    useEffect(() => {
        function focusSearch(event: KeyboardEvent) {
            const target = event.target;
            const isEditing = target instanceof HTMLElement
                && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));
            if (event.key === "/" && !isEditing && !event.metaKey && !event.ctrlKey && !event.altKey) {
                event.preventDefault();
                document.getElementById("filter-search")?.focus();
            }
        }

        document.addEventListener("keydown", focusSearch);
        return () => document.removeEventListener("keydown", focusSearch);
    }, []);

    function updateQuery(key: string, value: string) {
        const query = buildNextQueryString(searchParams.toString(), key, value);
        router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    }

    const filteredProducts = useMemo(() => {
        const query = search.trim().toLowerCase();
        const filtered = products.filter((product) => {
            const matchesCategory = activeCategory === "all" || product.categoryName === activeCategory;
            const matchesSearch = !query || [product.ingredientName, product.brandName, product.strength]
                .filter(Boolean)
                .join(" ")
                .toLowerCase()
                .includes(query);
            return matchesCategory && matchesSearch && (!inStockOnly || product.availability !== "out-of-stock");
        });

        return filtered.sort((left, right) => {
            if (sort === "price") {
                if (left.pricePerPack === null) return right.pricePerPack === null ? left.brandName.localeCompare(right.brandName) : 1;
                if (right.pricePerPack === null) return -1;
                return left.pricePerPack - right.pricePerPack;
            }
            return left.brandName.localeCompare(right.brandName);
        });
    }, [activeCategory, inStockOnly, products, search, sort]);

    return (
        <section aria-labelledby="catalog-products-heading" className="py-7 sm:py-9">
            <header className="mb-6 border-b border-outline-variant pb-4">
                <p className="font-eyebrow text-eyebrow uppercase text-secondary">Browse by need</p>
                <h2 id="catalog-products-heading" className="mt-2 font-display text-headline-md text-primary">Find what you need, quickly.</h2>
            </header>

            <div className="grid gap-4 border-b border-outline-variant pb-5 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-end">
                <div className="min-w-0">
                    <div className="mb-2 flex items-center gap-2 text-on-surface-variant">
                        <Search aria-hidden="true" size={17} />
                        <span className="font-label-md text-label-md">Search and filter</span>
                        <span className="ml-auto font-body-sm text-body-sm">Press / to search</span>
                    </div>
                    <InPlaceFilter
                        name="search"
                        label="Search products"
                        value={search}
                        debounceMs={250}
                        placeholder="Name, ingredient or strength"
                        preservedParams={{ category: activeCategory === "all" ? undefined : activeCategory, stock: inStockOnly ? "1" : undefined, sort: sort === "name" ? undefined : sort }}
                        controlClassName="mt-space-xs min-h-11 w-full rounded border border-outline-variant bg-surface-container-lowest px-space-sm py-space-xs font-body-sm text-body-sm text-on-surface focus:border-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                        submitClassName="mt-space-xs min-h-11 border border-primary px-space-md font-label-sm text-label-sm text-primary hover:bg-primary-fixed/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    />
                </div>
                <label className="flex min-h-11 items-center gap-3 border border-outline-variant bg-surface-container-lowest px-3 font-label-md text-label-md text-on-surface">
                    <input type="checkbox" checked={inStockOnly} onChange={(event) => updateQuery("stock", event.target.checked ? "1" : "")} className="size-4 accent-primary" />
                    In stock only
                </label>
                <label className="flex min-h-11 items-center gap-3 border border-outline-variant bg-surface-container-lowest px-3 font-label-md text-label-md text-on-surface">
                    <span>Sort</span>
                    <select value={sort} onChange={(event) => updateQuery("sort", event.target.value === "name" ? "" : event.target.value)} className="min-h-11 min-w-36 bg-transparent pr-2 text-body-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
                        <option value="name">Name A–Z</option>
                        <option value="price">Price: low to high</option>
                    </select>
                </label>
            </div>

            {categories.length ? (
                <nav aria-label="Filter by category" className="flex flex-wrap gap-2 border-b border-outline-variant py-4">
                    <button type="button" aria-pressed={activeCategory === "all"} onClick={() => updateQuery("category", "")} className={`min-h-11 border px-4 font-label-md text-label-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${activeCategory === "all" ? "border-primary bg-primary text-on-primary" : "border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:border-primary"}`}>
                        All products
                    </button>
                    {categories.map((category) => (
                        <button key={category.name} type="button" aria-pressed={activeCategory === category.name} onClick={() => updateQuery("category", category.name)} className={`min-h-11 border px-4 font-label-md text-label-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${activeCategory === category.name ? "border-primary bg-primary text-on-primary" : "border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:border-primary"}`}>
                            {category.name}
                        </button>
                    ))}
                </nav>
            ) : null}

            <div className="flex min-h-12 flex-wrap items-center justify-between gap-2 py-3">
                <p aria-live="polite" className="font-label-md text-label-md text-on-surface-variant">
                    {filteredProducts.length} {pluralizeLabel(filteredProducts.length, "product")}
                </p>
            </div>
            {filteredProducts.length ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {filteredProducts.map((product) => (
                        <CatalogProductCard key={`${product.brandName}-${product.strength ?? ""}-${product.unitLabel}`} product={product} />
                    ))}
                </div>
            ) : (
                <div className="border border-dashed border-outline-variant bg-surface-container-low px-5 py-7">
                    <p className="text-body-md text-on-surface-variant">No products match those filters.</p>
                    <Link href="/catalog#branches" className="mt-3 inline-flex min-h-11 items-center font-label-md text-label-md font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                        Find a branch
                    </Link>
                </div>
            )}
        </section>
    );
}