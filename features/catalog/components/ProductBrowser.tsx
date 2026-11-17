"use client";

import Link from "next/link";
import { Phone } from "lucide-react";
import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { InPlaceFilter } from "@/features/shared/components/InPlaceFilter";
import { buildNextQueryString } from "@/features/shared/lib/query-string";
import { CatalogProductCard, type CatalogProduct } from "@/features/catalog/components/CatalogProductCard";
import { searchCatalogProducts } from "@/features/catalog/lib/fuzzy-search";
import { pluralizeLabel } from "@/lib/plural";

type Category = { name: string };
type Branch = Pick<CatalogProduct["branches"][number], "id" | "name" | "location" | "contactNumber">;

export function ProductBrowser({ categories, products, branches }: {
    categories: Category[];
    products: CatalogProduct[];
    branches: Branch[];
}) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const search = searchParams.get("search") ?? "";
    const activeCategory = searchParams.get("category") ?? "all";
    const activeBranchId = searchParams.get("branch") ?? "all";
    const sort = searchParams.get("sort") === "price" ? "price" : "name";
    const selectedBranch = branches.find((branch) => branch.id === activeBranchId);

    function updateQuery(key: string, value: string) {
        const query = buildNextQueryString(searchParams.toString(), key, value);
        router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    }

    const filteredProducts = useMemo(() => {
        const available = products.flatMap((product) => {
            const branch = selectedBranch ? product.branches.find((item) => item.id === selectedBranch.id) : null;
            const availability = selectedBranch ? branch?.status : product.availability;
            if (!availability || availability === "out-of-stock") return [];
            return [{
                ...product,
                availability,
                pricePerPack: selectedBranch ? branch?.pricePerPack ?? null : product.pricePerPack,
                hasMultiplePrices: selectedBranch ? false : product.hasMultiplePrices,
            }];
        });
        const byCategory = available.filter((product) => activeCategory === "all" || product.categoryName === activeCategory);
        const searched = searchCatalogProducts(byCategory, search);
        if (sort === "price" && !search.trim()) {
            return searched.sort((left, right) => {
                if (left.pricePerPack === null) return right.pricePerPack === null ? left.brandName.localeCompare(right.brandName) : 1;
                if (right.pricePerPack === null) return -1;
                return left.pricePerPack - right.pricePerPack || left.brandName.localeCompare(right.brandName);
            });
        }
        return searched;
    }, [activeCategory, products, search, selectedBranch, sort]);

    return (
        <section id="products" aria-labelledby="catalog-products-heading" className="min-w-0 py-7 sm:py-9">
            <header className="mb-5 border-b border-outline-variant pb-4">
                <p className="font-eyebrow text-eyebrow uppercase text-secondary">Browse by need</p>
                <h2 id="catalog-products-heading" className="mt-2 font-display text-headline-md text-primary">Find what you need, quickly.</h2>
            </header>
            <div className="sticky top-0 z-30 -mx-5 border-y border-outline-variant bg-background/95 px-5 py-3 backdrop-blur sm:-mx-8 sm:px-8">
                <div className="grid min-w-0 gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                    <InPlaceFilter
                        name="search"
                        label="Search products"
                        value={search}
                        debounceMs={250}
                        placeholder="Name, ingredient, strength or pack"
                        clearable
                        inputAttributes={{ enterKeyHint: "search", autoComplete: "off", autoCorrect: "off", spellCheck: false }}
                        preservedParams={{ category: activeCategory === "all" ? undefined : activeCategory, branch: activeBranchId === "all" ? undefined : activeBranchId, sort: sort === "name" ? undefined : sort }}
                        controlClassName="mt-1 min-h-14 w-full rounded border border-outline-variant bg-surface-container-lowest py-3 font-body-md text-base text-on-surface placeholder:text-on-surface-variant focus:border-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                        submitClassName="mt-space-xs min-h-11 border border-primary px-space-md font-label-sm text-label-sm text-primary hover:bg-primary-fixed/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    />
                    <label className="flex min-h-11 items-center gap-3 border border-outline-variant bg-surface-container-lowest px-3 font-label-md text-label-md text-on-surface">
                        <span>Sort</span>
                        <select value={sort} onChange={(event) => updateQuery("sort", event.target.value === "name" ? "" : event.target.value)} className="min-h-11 min-w-36 bg-transparent pr-2 text-base focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
                            <option value="name">Name A-Z</option>
                            <option value="price">Price: low to high</option>
                        </select>
                    </label>
                </div>
                <nav aria-label="Filter by branch" className="-mx-1 mt-3 flex min-w-0 gap-2 overflow-x-auto px-1 pb-1">
                    <button type="button" aria-pressed={!selectedBranch} onClick={() => updateQuery("branch", "")} className={`min-h-11 shrink-0 border px-4 font-label-md text-label-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${!selectedBranch ? "border-primary bg-primary text-on-primary" : "border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:border-primary"}`}>All branches</button>
                    {branches.map((branch) => (
                        <button key={branch.id} type="button" aria-pressed={selectedBranch?.id === branch.id} onClick={() => updateQuery("branch", branch.id)} className={`min-h-11 shrink-0 border px-4 font-label-md text-label-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${selectedBranch?.id === branch.id ? "border-primary bg-primary text-on-primary" : "border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:border-primary"}`}>
                            {branch.name}
                        </button>
                    ))}
                </nav>
            </div>
            {selectedBranch ? (
                <aside className="mt-4 flex flex-wrap items-center justify-between gap-3 border-l-2 border-secondary bg-surface-container-low px-4 py-4" aria-label="Selected branch">
                    <div className="min-w-0">
                        <h3 className="font-label-md text-label-md text-on-surface">{selectedBranch.name}</h3>
                        <p className="mt-1 text-body-sm text-on-surface-variant">{selectedBranch.location}</p>
                    </div>
                    {selectedBranch.contactNumber ? <a href={`tel:${selectedBranch.contactNumber}`} className="inline-flex min-h-11 items-center gap-2 bg-primary px-4 font-label-md text-label-md text-on-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"><Phone aria-hidden="true" size={16} />Call</a> : null}
                </aside>
            ) : null}
            {categories.length ? (
                <nav aria-label="Filter by category" className="flex min-w-0 flex-wrap gap-2 border-b border-outline-variant py-4">
                    <button type="button" aria-pressed={activeCategory === "all"} onClick={() => updateQuery("category", "")} className={`min-h-11 border px-4 font-label-md text-label-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${activeCategory === "all" ? "border-primary bg-primary text-on-primary" : "border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:border-primary"}`}>All products</button>
                    {categories.map((category) => <button key={category.name} type="button" aria-pressed={activeCategory === category.name} onClick={() => updateQuery("category", category.name)} className={`min-h-11 border px-4 font-label-md text-label-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${activeCategory === category.name ? "border-primary bg-primary text-on-primary" : "border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:border-primary"}`}>{category.name}</button>)}
                </nav>
            ) : null}
            <div className="flex min-h-12 flex-wrap items-center justify-between gap-2 py-3">
                <p aria-live="polite" className="font-label-md text-label-md text-on-surface-variant">{filteredProducts.length} {pluralizeLabel(filteredProducts.length, "product")}</p>
            </div>
            {filteredProducts.length ? (
                <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {filteredProducts.map((product) => <CatalogProductCard key={product.id} product={product} />)}
                </div>
            ) : (
                <div className="border border-dashed border-outline-variant bg-surface-container-low px-5 py-7">
                    <p className="text-body-md text-on-surface-variant">{search.trim() ? "No available products match. Call your branch to ask." : selectedBranch ? "No products are listed for this branch yet. Call to ask." : "No available products are listed for this category yet."}</p>
                    <Link href="/catalog#branches" className="mt-3 inline-flex min-h-11 items-center font-label-md text-label-md font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Find a branch</Link>
                </div>
            )}
        </section>
    );
}