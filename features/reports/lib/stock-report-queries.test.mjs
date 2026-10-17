import assert from "node:assert/strict";
import test from "node:test";
import { buildExpiryQuery, buildLowStockQuery } from "./stock-report-queries.ts";

test("low-stock query retains and labels products with no ingredient", () => {
    const query = buildLowStockQuery("branch-1").sql;
    assert.match(query, /LEFT JOIN "Ingredient" ingredient ON ingredient\.id = v\."ingredientId"/);
    assert.match(query, /COALESCE\(ingredient\.name, 'Uncategorized'\) AS "ingredientName"/);
    assert.match(query, /GROUP BY[\s\S]*COALESCE\(ingredient\.name, 'Uncategorized'\)/);
});

test("expiry query retains and labels products with no ingredient", () => {
    const query = buildExpiryQuery("branch-1").sql;
    assert.match(query, /LEFT JOIN "Ingredient" ingredient ON ingredient\.id = v\."ingredientId"/);
    assert.match(query, /COALESCE\(ingredient\.name, 'Uncategorized'\) AS "ingredientName"/);
});