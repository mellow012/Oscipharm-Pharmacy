"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type Category = { id: string; name: string };
type Product = {
    id: string;
    brandName: string;
    strength: string | null;
    unitLabel: string;
    ingredientName: string;
    categoryId: string;
    stock: number;
    pricePerPack: string | null;
};

type ProductBrowserProps = {
    categories: Category[];
    products: Product[];
};

export function ProductBrowser({ categories, products }: ProductBrowserProps) {
    const [activeCategory, setActiveCategory] = useState("all");
    const [search, setSearch] = useState("");
    const filteredProducts = useMemo(() => {
        const query = search.trim().toLowerCase();
        return products.filter((product) => {
            const matchesCategory = activeCategory === "all" || product.categoryId === activeCategory;
            const matchesSearch = !query || [product.ingredientName, product.brandName, product.strength]
                .filter(Boolean)
                .join(" ")
                .toLowerCase()
                .includes(query);
            return matchesCategory && matchesSearch;
        });
    }, [activeCategory, products, search]);

    return (
        <section className="border-b border-border py-10 sm:py-14">
            <div className="mb-6 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="mb-3 font-mono text-xs uppercase tracking-[0.16em] text-warn">Browse by need</p>
                    <h2 className="text-3xl text-ink">Find what you need, quickly.</h2>
                </div>
                <label className="relative block w-full sm:max-w-xs">
                    <span className="sr-only">Search products</span>
                    <span aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-mono text-sm text-warn">/</span>
                    <input
                        type="search"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search products"
                        className="w-full border border-border bg-surface py-3 pl-9 pr-4 text-sm text-ink outline-none transition placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/15"
                    />
                </label>
            </div>
            <div className="mb-8 flex gap-2 overflow-x-auto pb-2">
                <button
                    type="button"
                    onClick={() => setActiveCategory("all")}
                    className={`shrink-0 border px-4 py-2 text-sm transition ${activeCategory === "all" ? "border-primary bg-primary text-primary-fg" : "border-border bg-surface text-muted hover:border-primary hover:text-primary"}`}
                >
                    All products
                </button>
                {categories.map((category) => (
                    <button
                        key={category.id}
                        type="button"
                        onClick={() => setActiveCategory(category.id)}
                        className={`shrink-0 border px-4 py-2 text-sm transition ${activeCategory === category.id ? "border-primary bg-primary text-primary-fg" : "border-border bg-surface text-muted hover:border-primary hover:text-primary"}`}
                    >
                        {category.name}
                    </button>
                ))}
            </div>
            <p className="mb-4 font-mono text-xs uppercase tracking-[0.14em] text-muted">{filteredProducts.length} products shown</p>
            {filteredProducts.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredProducts.map((product) => (
                        <Link
                            key={product.id}
                            href={`/catalog/${product.categoryId}`}
                            className="group border border-border bg-surface p-5 transition hover:-translate-y-1 hover:border-primary hover:shadow-sm"
                        >
                            <div className="mb-8 flex items-start justify-between gap-3">
                                <span className="font-mono text-[0.68rem] uppercase tracking-[0.14em] text-warn">In stock</span>
                                <span className="font-mono text-xs text-muted">{product.stock} {product.unitLabel}s</span>
                            </div>
                            <p className="font-mono text-xs uppercase tracking-[0.12em] text-muted">{product.ingredientName}</p>
                            <h3 className="mt-2 text-2xl text-ink group-hover:text-primary">{product.brandName}</h3>
                            <div className="mt-2 flex items-end justify-between gap-3">
                                <p className="text-sm text-muted">{product.strength ?? "Standard strength"}</p>
                                {product.pricePerPack ? <p className="font-mono text-sm text-warn">from {product.pricePerPack}</p> : null}
                            </div>
                        </Link>
                    ))}
                </div>
            ) : (
                <p className="border border-dashed border-border px-5 py-8 text-muted">No products match that search.</p>
            )}
        </section>
    );
}
