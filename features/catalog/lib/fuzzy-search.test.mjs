import assert from "node:assert/strict";
import test from "node:test";
import { searchCatalogProducts } from "./fuzzy-search.ts";

const products = [
  { brandName: "Amoxicillin 500mg x10", strength: null, form: "strip", packLabel: "Pack of 1 strip", ingredientName: "Amoxicillin" },
  { brandName: "Panadol", strength: "500mg", form: "tablet", packLabel: "Pack of 1 tablet", ingredientName: "Paracetamol" },
  { brandName: "Coartem (Artemether/Lumefantrine) x24", strength: null, form: "pack", packLabel: "Pack of 1 pack", ingredientName: null },
  { brandName: "ORS Sachet", strength: null, form: "sachet", packLabel: "Pack of 1 sachet", ingredientName: null },
  { brandName: "Paracetamol 500mg x10", strength: null, form: "strip", packLabel: "Pack of 1 strip", ingredientName: "Paracetamol" },
  { brandName: "Vitamin C", strength: "100mg", form: "tablet", packLabel: "Pack of 30 tablets", ingredientName: null },
];

function namesFor(query) {
  return searchCatalogProducts(products, query).map((product) => product.brandName);
}

test("corrects common misspellings for product names", () => {
  assert.ok(namesFor("amoxcillin").includes("Amoxicillin 500mg x10"));
  assert.ok(namesFor("panado").includes("Panadol"));
  assert.ok(namesFor("paracetmol").includes("Paracetamol 500mg x10"));
  assert.ok(namesFor("coartm").includes("Coartem (Artemether/Lumefantrine) x24"));
});

test("matches short exact tokens without short-token typo noise", () => {
  assert.deepEqual(namesFor("ors"), ["ORS Sachet"]);
  assert.deepEqual(namesFor("xyz"), []);
});

test("searches strength, pack labels, and multi-word queries", () => {
  assert.ok(namesFor("500mg").includes("Panadol"));
  assert.ok(namesFor("pack 30 tablets").includes("Vitamin C"));
  assert.ok(namesFor("paracetamol 500mg").includes("Paracetamol 500mg x10"));
});

test("ranks exact matches before prefixes and fuzzy matches", () => {
  const ranked = searchCatalogProducts([
    { brandName: "Panadoll" },
    { brandName: "XPanadol" },
    { brandName: "Panadol" },
  ], "panadol");
  assert.deepEqual(ranked.map((product) => product.brandName), ["Panadol", "Panadoll", "XPanadol"]);
});

test("normalizes accents and punctuation", () => {
  assert.deepEqual(searchCatalogProducts([{ brandName: "Café-Plus" }], "cafe plus").map((product) => product.brandName), ["Café-Plus"]);
});