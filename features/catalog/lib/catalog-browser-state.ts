import { searchCatalogProducts } from "./fuzzy-search.ts";
import type { PublicAvailabilityStatus } from "./public-availability.ts";

export type CatalogBrowserProduct = {
    id: string;
    brandName: string;
    ingredientName?: string | null;
    strength?: string | null;
    form?: string | null;
    packLabel?: string | null;
    categoryName: string | null;
    availability: PublicAvailabilityStatus;
    pricePerPack: number | null;
    hasMultiplePrices: boolean;
    branches: Array<{ id: string; status: PublicAvailabilityStatus; pricePerPack: number | null }>;
};

export type CatalogBrowserFilters = {
    search: string;
    branchId: string;
    category: string;
    sort: "name" | "price";
};

export type CatalogFilterUrlKey = "search" | "branch" | "category" | "sort";

export function filterCatalogProducts<T extends CatalogBrowserProduct>(products: T[], filters: CatalogBrowserFilters): T[] {
    const available = products.flatMap((product) => {
        const branch = filters.branchId ? product.branches.find((item) => item.id === filters.branchId) : null;
        const availability = filters.branchId ? branch?.status : product.availability;
        if (!availability || availability === "out-of-stock") return [];
        return [{
            ...product,
            availability,
            pricePerPack: filters.branchId ? branch?.pricePerPack ?? null : product.pricePerPack,
            hasMultiplePrices: filters.branchId ? false : product.hasMultiplePrices,
        }];
    });
    const byCategory = available.filter((product) => !filters.category || product.categoryName === filters.category);
    const searched = searchCatalogProducts(byCategory, filters.search);

    return searched.sort((left, right) => {
        if (filters.sort === "price" && !filters.search.trim()) {
            if (left.pricePerPack === null) return right.pricePerPack === null ? left.brandName.localeCompare(right.brandName) : 1;
            if (right.pricePerPack === null) return -1;
            return left.pricePerPack - right.pricePerPack || left.brandName.localeCompare(right.brandName);
        }
        return left.brandName.localeCompare(right.brandName);
    });
}

export function buildCatalogFilterUrl(currentUrl: string, key: CatalogFilterUrlKey, value: string): string {
    const url = new URL(currentUrl);
    if (value) url.searchParams.set(key, value);
    else url.searchParams.delete(key);
    return `${url.pathname}${url.search}${url.hash}`;
}

export function readCatalogFilters(search: string): CatalogBrowserFilters {
    const params = new URLSearchParams(search);
    return {
        search: params.get("search") ?? "",
        branchId: params.get("branch") ?? "",
        category: params.get("category") ?? "",
        sort: params.get("sort") === "price" ? "price" : "name",
    };
}