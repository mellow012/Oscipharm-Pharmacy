import assert from "node:assert/strict";
import test from "node:test";
import { buildCatalogFilterUrl, filterCatalogProducts, readCatalogFilters } from "./catalog-browser-state.ts";

const products = [
    { id: "amox", brandName: "Amoxicillin", categoryName: "Antibiotics", availability: "in-stock", pricePerPack: 4000, hasMultiplePrices: false, branches: [{ id: "a", status: "in-stock", pricePerPack: 4000 }, { id: "b", status: "out-of-stock", pricePerPack: null }] },
    { id: "panadol", brandName: "Panadol", categoryName: "Pain Relief", availability: "low-stock", pricePerPack: 5000, hasMultiplePrices: true, branches: [{ id: "a", status: "low-stock", pricePerPack: 5000 }, { id: "b", status: "in-stock", pricePerPack: 3000 }] },
    { id: "unavailable", brandName: "Unavailable", categoryName: "Pain Relief", availability: "out-of-stock", pricePerPack: null, hasMultiplePrices: false, branches: [{ id: "a", status: "out-of-stock", pricePerPack: null }] },
];

test("filters availability, branch, category, fuzzy search and sorting in memory", () => {
    assert.deepEqual(filterCatalogProducts(products, { search: "amoxcillin", branchId: "", category: "", sort: "name" }).map((product) => product.id), ["amox"]);
    assert.deepEqual(filterCatalogProducts(products, { search: "", branchId: "b", category: "", sort: "name" }).map((product) => product.id), ["panadol"]);
    assert.deepEqual(filterCatalogProducts(products, { search: "", branchId: "a", category: "Pain Relief", sort: "price" }).map((product) => product.id), ["panadol"]);
});

test("builds filter URLs without dropping other state or the hash", () => {
    assert.equal(buildCatalogFilterUrl("https://example.test/catalog?branch=a&sort=price#products", "search", "amox"), "/catalog?branch=a&sort=price&search=amox#products");
    assert.deepEqual(readCatalogFilters("?branch=b&category=Pain+Relief&sort=price&search=panado"), {
        search: "panado",
        branchId: "b",
        category: "Pain Relief",
        sort: "price",
    });
});